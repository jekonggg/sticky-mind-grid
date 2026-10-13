#!/usr/bin/env python3
"""
Automated database and attachments restore utility for Sticky Mind Grid.
Extracts a .tar.gz backup archive, restores database tables with type conversion,
and recovers file attachments in the upload directory.
"""
import os
import sys
import json
import tarfile
import tempfile
import argparse
from datetime import datetime

backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from config import Config
from app import create_app, db
from app.services.file_service import FileService

def restore(backup_path, db_url=None, upload_dir=None):
    if not os.path.exists(backup_path):
        raise FileNotFoundError(f"Backup file not found: {backup_path}")

    config_cls = Config
    if db_url:
        config_cls = type("RestoreConfig", (Config,), {
            "SQLALCHEMY_DATABASE_URI": db_url,
            "SQLALCHEMY_ENGINE_OPTIONS": {} if "sqlite" in db_url else getattr(Config, "SQLALCHEMY_ENGINE_OPTIONS", {})
        })

    app = create_app(config_cls)
    with app.app_context():
        if not upload_dir:
            upload_dir = FileService.get_upload_dir()
        os.makedirs(upload_dir, exist_ok=True)

        engine = db.engine
        metadata = db.metadata
        db.create_all()

        with tempfile.TemporaryDirectory() as staging_dir:
            with tarfile.open(backup_path, "r:gz") as tar:
                tar.extractall(staging_dir)

            manifest_file = os.path.join(staging_dir, "manifest.json")
            if not os.path.exists(manifest_file):
                raise ValueError("Invalid backup archive: manifest.json missing")

            with open(manifest_file, "r", encoding="utf-8") as f:
                manifest = json.load(f)

            table_names = manifest.get("tables", [])
            data_dir = os.path.join(staging_dir, "data")
            dialect = engine.dialect.name

            with engine.begin() as conn:
                # 1. Temporarily disable foreign keys
                if dialect == "mysql":
                    conn.execute(db.text("SET FOREIGN_KEY_CHECKS = 0;"))
                elif dialect == "sqlite":
                    conn.execute(db.text("PRAGMA foreign_keys = OFF;"))

                # 2. Clear existing records in reverse order
                for tname in reversed(table_names):
                    if tname in metadata.tables:
                        conn.execute(metadata.tables[tname].delete())

                # 3. Populate rows in topological order
                restored_records = 0
                for tname in table_names:
                    if tname not in metadata.tables:
                        continue
                    table = metadata.tables[tname]
                    t_file = os.path.join(data_dir, f"{tname}.json")
                    if not os.path.exists(t_file):
                        continue
                    with open(t_file, "r", encoding="utf-8") as f:
                        rows = json.load(f)

                    if not rows:
                        continue

                    # Type conversion for DateTime / Date
                    col_types = {col.name: col.type for col in table.columns}
                    cleaned_rows = []
                    for row in rows:
                        row_copy = dict(row)
                        for col_name, val in row_copy.items():
                            if val is not None and col_name in col_types:
                                col_type = col_types[col_name]
                                if isinstance(col_type, (db.DateTime, db.Date)) and isinstance(val, str):
                                    try:
                                        row_copy[col_name] = datetime.fromisoformat(val)
                                    except Exception:
                                        pass
                        cleaned_rows.append(row_copy)

                    conn.execute(table.insert(), cleaned_rows)
                    restored_records += len(cleaned_rows)

                # 4. Re-enable foreign keys
                if dialect == "mysql":
                    conn.execute(db.text("SET FOREIGN_KEY_CHECKS = 1;"))
                elif dialect == "sqlite":
                    conn.execute(db.text("PRAGMA foreign_keys = ON;"))

            # 5. Restore uploads
            restored_files = 0
            uploads_dir = os.path.join(staging_dir, "uploads")
            if os.path.exists(uploads_dir):
                for fname in os.listdir(uploads_dir):
                    src_file = os.path.join(uploads_dir, fname)
                    if os.path.isfile(src_file):
                        dest_file = os.path.join(upload_dir, fname)
                        with open(src_file, "rb") as sf, open(dest_file, "wb") as df:
                            df.write(sf.read())
                        restored_files += 1

        print(f"Restore completed successfully from: {backup_path}")
        print(f"Restored {len(table_names)} tables ({restored_records} records) and {restored_files} file attachments.")
        return True

def main():
    parser = argparse.ArgumentParser(description="Restore database and uploaded files from .tar.gz archive.")
    parser.add_argument("--backup", type=str, required=True, help="Path to backup .tar.gz file")
    parser.add_argument("--db-url", type=str, default=None, help="Database connection URI")
    parser.add_argument("--upload-dir", type=str, default=None, help="Attachments upload directory")
    args = parser.parse_args()

    try:
        restore(backup_path=args.backup, db_url=args.db_url, upload_dir=args.upload_dir)
        return 0
    except Exception as e:
        print(f"Error during restore: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())
