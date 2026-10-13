#!/usr/bin/env python3
"""
CLI utility to purge soft-deleted boards older than retention period (30 days).
Supports --days <N> and --dry-run.
"""
import os
import sys
import argparse
from datetime import datetime, timedelta

# Ensure backend directory is in python path
backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import create_app, db
from app.models.board import Board
from app.services.board_service import BoardService

def main():
    parser = argparse.ArgumentParser(description="Purge soft-deleted boards exceeding retention days.")
    parser.add_argument("--days", type=int, default=30, help="Retention period in days (default: 30)")
    parser.add_argument("--dry-run", action="store_true", help="Print expired boards without deleting them")
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        cutoff = datetime.utcnow() - timedelta(days=args.days)
        expired_boards = Board.query.filter(
            Board.is_deleted.is_(True),
            Board.deleted_at.isnot(None),
            Board.deleted_at < cutoff
        ).all()

        print(f"Purge scan completed. Found {len(expired_boards)} expired board(s) (older than {args.days} days).")
        for b in expired_boards:
            print(f"  - Board ID: {b.id}, Name: '{b.name}', Deleted At: {b.deleted_at}")

        if args.dry_run:
            print("[DRY RUN] No records were deleted.")
            return 0

        purged_count = BoardService.purge_expired_boards(retention_days=args.days)
        print(f"Successfully purged {purged_count} board(s) and associated attachments.")
        return 0

if __name__ == "__main__":
    sys.exit(main())
