#!/usr/bin/env python3
"""
Automated database and attachments backup utility for Sticky Mind Grid.
Exports all relational database tables to JSON and bundles uploaded asset files
into a single timestamped gzip-compressed tarball (.tar.gz).
"""
import os
import sys
import json
import tarfile
import tempfile
import argparse
from datetime import datetime, date
import uuid

# Ensure backend directory is in sys.path
backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from config import Config
from app import create_app, db
from app.services.file_service import FileService

def serialize_value(val):
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, uuid.UUID):
        return str(val)
    if isinstance(val, bytes):
        return val.decode("utf-8", errors="ignore")
    return val

def backup(output_path=None, db_url=None, upload_dir=None):
    config_cls = Config
    if db_url:
        config_cls = type("BackupConfig", (Config,), {
            "SQLALCHEMY_DATABASE_URI": db_url,
            "SQLALCHEMY_ENGINE_OPTIONS": {} if "sqlite" in db_url else getattr(Config, "SQLALCHEMY_ENGINE_OPTIONS", {})
        })

    app = create_app(config_cls)
    with app.app_context():
        if not upload_dir:
            upload_dir = FileService.get_upload_dir()

        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        if not output_path:
            repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            backup_dir = os.path.join(repo_root, "backups")
            os.makedirs(backup_dir, exist_ok=True)
            output_path = os.path.join(backup_dir, f"backup_{timestamp}.tar.gz")

        output_dir = os.path.dirname(os.path.abspath(output_path))
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)

        engine = db.engine
        metadata = db.metadata

        # Inspect all tables in topological dependency order
        sorted_tables = metadata.sorted_tables
        table_names = [table.name for table in sorted_tables]

        with tempfile.TemporaryDirectory() as staging_dir:
            data_dir = os.path.join(staging_dir, "data")
            os.makedirs(data_dir, exist_ok=True)

            # Dump table data
            total_records = 0
            with engine.connect() as conn:
                for table in sorted_tables:
                    result = conn.execute(table.select()).mappings().all()
                    rows = []
                    for row in result:
                        serialized_row = {k: serialize_value(v) for k, v in row.items()}
                        rows.append(serialized_row)
                    table_file = os.path.join(data_dir, f"{table.name}.json")
                    with open(table_file, "w", encoding="utf-8") as f:
                        json.dump(rows, f, indent=2)
                    total_records += len(rows)

            # Copy attachments into staging
            staging_uploads = os.path.join(staging_dir, "uploads")
            os.makedirs(staging_uploads, exist_ok=True)
            attachment_count = 0
            if os.path.exists(upload_dir):
                for fname in os.listdir(upload_dir):
                    fpath = os.path.join(upload_dir, fname)
                    if os.path.isfile(fpath):
                        target_path = os.path.join(staging_uploads, fname)
                        with open(fpath, "rb") as src, open(target_path, "wb") as dst:
                            dst.write(src.read())
                        attachment_count += 1

            # Write manifest
            manifest = {
                "version": "1.0",
                "timestamp": timestamp,
                "created_at": datetime.utcnow().isoformat(),
                "dialect": engine.dialect.name,
                "tables": table_names,
                "total_records": total_records,
                "total_attachments": attachment_count
            }
            with open(os.path.join(staging_dir, "manifest.json"), "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2)

            # Create tarball
            with tarfile.open(output_path, "w:gz") as tar:
                tar.add(os.path.join(staging_dir, "manifest.json"), arcname="manifest.json")
                tar.add(data_dir, arcname="data")
                tar.add(staging_uploads, arcname="uploads")

        print(f"Backup created successfully: {output_path}")
        print(f"Backed up {len(table_names)} tables ({total_records} records) and {attachment_count} attachment files.")
        return output_path

def main():
    parser = argparse.ArgumentParser(description="Backup database and uploaded files to .tar.gz archive.")
    parser.add_argument("--output", type=str, default=None, help="Output .tar.gz file path")
    parser.add_argument("--db-url", type=str, default=None, help="Database connection URI")
    parser.add_argument("--upload-dir", type=str, default=None, help="Attachments upload directory")
    args = parser.parse_args()

    try:
        backup(output_path=args.output, db_url=args.db_url, upload_dir=args.upload_dir)
        return 0
    except Exception as e:
        print(f"Error during backup: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())
