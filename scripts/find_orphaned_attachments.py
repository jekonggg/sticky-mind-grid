#!/usr/bin/env python3
"""
Find and optionally clean up orphaned attachment files in backend/uploads/.

Usage:
    python scripts/find_orphaned_attachments.py           # Dry-run (lists orphaned files)
    python scripts/find_orphaned_attachments.py --delete  # Deletes orphaned files
"""

import os
import sys
import argparse
from werkzeug.utils import secure_filename

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
sys.path.insert(0, backend_dir)

from app import create_app, db
from app.models.task import Task
from app.models.user import User
from app.models.board import Board

IGNORE_FILES = {'.gitkeep', '.uploaders.json'}

def format_bytes(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    return f"{size_bytes / (1024 * 1024 * 1024):.1f} GB"

def find_referenced_filenames():
    referenced = set()

    # 1. Task attachments
    tasks = Task.query.filter(Task.attachments.isnot(None)).all()
    for t in tasks:
        if isinstance(t.attachments, list):
            for att in t.attachments:
                if isinstance(att, dict):
                    stored_name = att.get('storedName')
                    if not stored_name and att.get('url') and '/api/files/' in str(att.get('url')):
                        stored_name = str(att.get('url')).split('/api/files/', 1)[1].split('?', 1)[0]
                    if stored_name:
                        referenced.add(secure_filename(str(stored_name)))

    # 2. User avatars
    users = User.query.filter(User.avatar_url.isnot(None)).all()
    for u in users:
        if u.avatar_url and '/api/files/' in str(u.avatar_url):
            fname = str(u.avatar_url).split('/api/files/', 1)[1].split('?', 1)[0]
            referenced.add(secure_filename(fname))

    # 3. Board hero images
    boards = Board.query.filter(Board.hero_image_url.isnot(None)).all()
    for b in boards:
        if b.hero_image_url and '/api/files/' in str(b.hero_image_url):
            fname = str(b.hero_image_url).split('/api/files/', 1)[1].split('?', 1)[0]
            referenced.add(secure_filename(fname))

    return referenced

def main():
    parser = argparse.ArgumentParser(description="Find or remove orphaned files in backend/uploads/")
    parser.add_argument("--delete", action="store_true", help="Delete orphaned files (default is dry-run)")
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        upload_folder = app.config.get('UPLOAD_FOLDER', os.path.join(backend_dir, 'uploads'))
        if not os.path.exists(upload_folder):
            print(f"Upload directory does not exist: {upload_folder}")
            return 0

        referenced = find_referenced_filenames()
        all_files = os.listdir(upload_folder)

        orphaned = []
        total_orphaned_bytes = 0

        for fname in all_files:
            if fname in IGNORE_FILES:
                continue
            safe_name = secure_filename(fname)
            fpath = os.path.join(upload_folder, fname)
            if not os.path.isfile(fpath):
                continue

            if safe_name not in referenced:
                size = os.path.getsize(fpath)
                orphaned.append((fname, size, fpath))
                total_orphaned_bytes += size

        mode = "DELETE" if args.delete else "DRY-RUN"
        print(f"=== Orphaned Files Scan [{mode}] ===")
        print(f"Upload directory: {upload_folder}")
        print(f"Total files on disk: {len(all_files)}")
        print(f"Referenced files in database: {len(referenced)}")
        print(f"Orphaned files found: {len(orphaned)} ({format_bytes(total_orphaned_bytes)})\n")

        if not orphaned:
            print("No orphaned files found.")
            return 0

        for fname, size, fpath in orphaned:
            if args.delete:
                try:
                    os.remove(fpath)
                    print(f"[DELETED] {fname} ({format_bytes(size)})")
                except OSError as e:
                    print(f"[ERROR] Failed to delete {fname}: {e}")
            else:
                print(f"[ORPHAN] {fname} ({format_bytes(size)})")

        if not args.delete:
            print("\nRun with --delete to permanently remove these files.")

        return 0

if __name__ == '__main__':
    sys.exit(main())
