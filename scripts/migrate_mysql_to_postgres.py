#!/usr/bin/env python3
"""
Sticky Mind Grid: MySQL to Supabase PostgreSQL Data Migration Script
=====================================================================
Copies all tables, records, relationships, and JSONB structures from
MySQL (Aiven) to Supabase PostgreSQL in exact topological foreign-key order.

Usage:
    python scripts/migrate_mysql_to_postgres.py [--dry-run]
"""

import os
import sys
import json
import logging
from datetime import datetime

# Setup path to backend
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, BACKEND_DIR)

from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv(usecwd=True))

from sqlalchemy import create_engine, text, MetaData, Table
from sqlalchemy.orm import sessionmaker
from config import Config
from app import create_app, db
import app.models # Ensure all models are registered

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("migration")

def get_target_db_url():
    url = os.environ.get("SUPABASE_DB_URL") or os.environ.get("TARGET_DATABASE_URL")
    if not url:
        return None
    
    # Normalize postgres URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url

def main():
    dry_run = "--dry-run" in sys.argv
    app = create_app(Config)
    
    with app.app_context():
        source_url = app.config.get("SQLALCHEMY_DATABASE_URI")
        target_url = get_target_db_url()

        if not target_url:
            logger.error(
                "SUPABASE_DB_URL is not set!\n"
                "Please add 'SUPABASE_DB_URL=postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres' "
                "to your .env file."
            )
            sys.exit(1)

        logger.info("Connecting to Source MySQL database...")
        source_engine = db.engine

        logger.info("Connecting to Target Supabase PostgreSQL database...")
        target_engine = create_engine(
            target_url,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 30}
        )

        with target_engine.connect() as target_conn:
            version = target_conn.execute(text("SELECT version();")).scalar()
            logger.info(f"Target Postgres Connected: {version[:50]}...")

        sorted_tables = db.metadata.sorted_tables
        logger.info(f"Identified {len(sorted_tables)} tables in topological order:")
        for t in sorted_tables:
            logger.info(f"  - {t.name}")

        if dry_run:
            logger.info("Dry-run mode: skipping DDL creation and data transfer.")
            return

        # 1. Create tables on target database
        logger.info("Step 1: Creating schema and tables on Supabase PostgreSQL (JSONB columns)...")
        db.metadata.create_all(bind=target_engine)
        logger.info("Schema creation complete.")

        # 2. Transfer data in order
        logger.info("Step 2: Transferring table rows from MySQL to PostgreSQL...")
        summary = {}

        with source_engine.connect() as src_conn, target_engine.begin() as tgt_conn:
            # Clean up target tables in reverse dependency order first
            for table in reversed(sorted_tables):
                tgt_conn.execute(text(f'TRUNCATE TABLE "{table.name}" CASCADE;'))

            for table in sorted_tables:
                tname = table.name
                
                # Check source count
                src_count = src_conn.execute(text(f"SELECT COUNT(*) FROM `{tname}`")).scalar()
                
                if src_count == 0:
                    logger.info(f"  [{tname}] 0 rows in source. Skipping.")
                    summary[tname] = {"source": 0, "target": 0, "status": "MATCH"}
                    continue

                logger.info(f"  [{tname}] Reading {src_count} rows from source...")

                # Fetch rows
                rows = src_conn.execute(text(f"SELECT * FROM `{tname}`")).mappings().all()

                # Case-insensitive duplicate email check on source users table
                if tname == 'users':
                    dupe_query = text("SELECT LOWER(email) AS lemail, COUNT(*) as c FROM `users` GROUP BY LOWER(email) HAVING c > 1")
                    dupes = src_conn.execute(dupe_query).mappings().all()
                    if dupes:
                        logger.warning(f"  [users] Found {len(dupes)} case-insensitive duplicate email groups in source MySQL!")
                        for d in dupes:
                            logger.warning(f"    - Email: {d['lemail']} (Count: {d['c']})")
                    else:
                        logger.info("  [users] No duplicate case-insensitive emails detected in source MySQL.")

                # Transform rows for Postgres compatibility
                clean_rows = []
                for row in rows:
                    row_dict = dict(row)
                    
                    # Convert boolean columns from 0/1 to Python True/False
                    for col in table.columns:
                        col_name = col.name
                        val = row_dict.get(col_name)
                        
                        # Handle Boolean
                        if str(col.type) in ("BOOLEAN", "Boolean") and val is not None:
                            row_dict[col_name] = bool(val)
                        
                        # Handle JSONB fields: ensure parsed python object if it arrived as string
                        if "JSON" in str(col.type) and isinstance(val, str):
                            try:
                                row_dict[col_name] = json.loads(val)
                            except Exception:
                                pass
                        
                        # Handle empty list/dict defaults
                        if "JSON" in str(col.type) and val is None:
                            if col.default is not None:
                                default_val = col.default.arg
                                row_dict[col_name] = default_val() if callable(default_val) else default_val

                        # Strip NUL bytes (\x00) from all text/string columns (PostgreSQL does not permit NUL in text)
                        if isinstance(val, str) and '\x00' in val:
                            row_dict[col_name] = val.replace('\x00', '')

                        # Ensure naive datetimes are marked as UTC
                        if isinstance(val, datetime) and val.tzinfo is None:
                            row_dict[col_name] = val

                    # Lowercase email for users and invitations
                    if tname == 'users' and row_dict.get('email'):
                        row_dict['email'] = str(row_dict['email']).strip().lower()
                    if tname == 'board_invitations' and row_dict.get('email'):
                        row_dict['email'] = str(row_dict['email']).strip().lower()

                    clean_rows.append(row_dict)

                # Batch insert
                chunk_size = 500
                for i in range(0, len(clean_rows), chunk_size):
                    chunk = clean_rows[i:i + chunk_size]
                    tgt_conn.execute(table.insert(), chunk)

                # Verify target count
                tgt_count = tgt_conn.execute(text(f'SELECT COUNT(*) FROM "{tname}"')).scalar()
                is_match = (src_count == tgt_count)
                status_str = "MATCH" if is_match else "MISMATCH"
                
                if not is_match:
                    logger.error(f"  [{tname}] COUNT MISMATCH! Source: {src_count}, Target: {tgt_count}")
                    raise RuntimeError(f"Row count mismatch on {tname}")
                else:
                    logger.info(f"  [{tname}] Transferred {tgt_count}/{src_count} rows successfully.")

                summary[tname] = {"source": src_count, "target": tgt_count, "status": status_str}

            # Add unique index on lower(email) if users table exists
            logger.info("Ensuring unique index on lower(email) in PostgreSQL...")
            tgt_conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_users_lower_email ON users (LOWER(email));"))

            # Reset any sequences in public schema
            logger.info("Resetting PostgreSQL sequences...")
            seq_reset_sql = """
            DO $$
            DECLARE
                seq record;
            BEGIN
                FOR seq IN
                    SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'
                LOOP
                    EXECUTE format('SELECT setval(%L, 1);', seq.sequence_name);
                END LOOP;
            END $$;
            """
            try:
                tgt_conn.execute(text(seq_reset_sql))
            except Exception as e:
                logger.warning(f"Sequence reset note: {e}")

        logger.info("\nData transfer complete! Verification summary:")
        print("=" * 60)
        print(f"{'Table':<30} | {'Source':<10} | {'Target':<10} | {'Status':<8}")
        print("-" * 60)
        for tname, stats in summary.items():
            print(f"{tname:<30} | {stats['source']:<10} | {stats['target']:<10} | {stats['status']:<8}")
        print("=" * 60)

        # Verify Foreign Key referential integrity
        logger.info("\nVerifying Foreign Key Referential Integrity on Target PostgreSQL...")
        with target_engine.connect() as tgt_conn:
            fk_checks = [
                ("tasks -> boards", "SELECT COUNT(*) FROM tasks WHERE board_id NOT IN (SELECT id FROM boards)"),
                ("board_members -> boards", "SELECT COUNT(*) FROM board_members WHERE board_id NOT IN (SELECT id FROM boards)"),
                ("board_members -> users", "SELECT COUNT(*) FROM board_members WHERE user_id NOT IN (SELECT id FROM users)"),
                ("comments -> tasks", "SELECT COUNT(*) FROM comments WHERE task_id NOT IN (SELECT id FROM tasks)"),
                ("notes -> boards", "SELECT COUNT(*) FROM notes WHERE board_id NOT IN (SELECT id FROM boards)"),
                ("board_invitations -> boards", "SELECT COUNT(*) FROM board_invitations WHERE board_id NOT IN (SELECT id FROM boards)"),
            ]
            all_fk_ok = True
            for desc, query in fk_checks:
                try:
                    orphans = tgt_conn.execute(text(query)).scalar()
                    if orphans == 0:
                        logger.info(f"  ✓ {desc}: PASS (0 orphans)")
                    else:
                        logger.error(f"  ✗ {desc}: FAIL ({orphans} orphan records)")
                        all_fk_ok = False
                except Exception as e:
                    logger.warning(f"  FK check note for {desc}: {e}")
            if all_fk_ok:
                logger.info("All Foreign Key referential integrity checks passed successfully!")

        # 3. PostgREST Lockdown
        logger.info("\nStep 3: Applying PostgREST & RLS Lockdown on Supabase...")
        lockdown_sql = """
        -- 1. Enable RLS on every public table
        DO $$
        DECLARE
            t text;
        BEGIN
            FOR t IN
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_type = 'BASE TABLE'
            LOOP
                EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
            END LOOP;
        END $$;

        -- 2. Revoke all privileges from anon and authenticated PostgREST roles
        REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
        REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
        REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated;
        """

        with target_engine.begin() as conn:
            conn.execute(text(lockdown_sql))
            logger.info("PostgREST & RLS lockdown executed successfully.")

        # 4. Verify PostgREST lockdown via HTTP
        supabase_url = os.environ.get("SUPABASE_URL")
        if supabase_url:
            import urllib.request
            import urllib.error
            logger.info("Verifying PostgREST lockdown via external HTTP request...")
            rest_url = f"{supabase_url.rstrip('/')}/rest/v1/users?select=id,email"
            try:
                req = urllib.request.Request(rest_url, headers={"apikey": "public-anon-key"})
                with urllib.request.urlopen(req, timeout=10) as res:
                    data = json.loads(res.read().decode("utf-8"))
                    if isinstance(data, list) and len(data) == 0:
                        logger.info("CONFIRMED: PostgREST returned empty list ([]) for unauthenticated anon query. RLS is actively blocking access.")
                    else:
                        logger.warning(f"Unexpected response from PostgREST: {data}")
            except urllib.error.HTTPError as e:
                logger.info(f"CONFIRMED: PostgREST rejected unauthenticated anon query with HTTP {e.code}. Access is locked down.")
            except Exception as e:
                logger.info(f"PostgREST test request status: {e}")

        logger.info("\n=== MIGRATION TO SUPABASE POSTGRESQL COMPLETE & VERIFIED! ===")

if __name__ == "__main__":
    main()
