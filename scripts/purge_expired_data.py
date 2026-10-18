#!/usr/bin/env python3
"""
CLI utility to purge soft-deleted boards and tasks older than retention period (default 30 days).
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
from app.models.task import Task
from app.services.board_service import BoardService
from app.services.task_service import TaskService

def main():
    parser = argparse.ArgumentParser(description="Purge soft-deleted boards and tasks exceeding retention days.")
    parser.add_argument("--days", type=int, default=30, help="Retention period in days (default: 30)")
    parser.add_argument("--dry-run", action="store_true", help="Print expired records without deleting them")
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        cutoff = datetime.utcnow() - timedelta(days=args.days)
        expired_boards = Board.query.filter(
            Board.is_deleted.is_(True),
            Board.deleted_at.isnot(None),
            Board.deleted_at < cutoff
        ).all()

        expired_tasks = Task.query.filter(
            Task.is_deleted.is_(True),
            Task.deleted_at.isnot(None),
            Task.deleted_at < cutoff
        ).all()

        print(f"Purge scan completed for cutoff: older than {args.days} days.")
        print(f"  - Expired boards found: {len(expired_boards)}")
        for b in expired_boards:
            print(f"    * Board ID: {b.id}, Name: '{b.name}', Deleted At: {b.deleted_at}")

        print(f"  - Expired tasks found: {len(expired_tasks)}")
        for t in expired_tasks:
            print(f"    * Task ID: {t.id}, Title: '{t.title}', Deleted At: {t.deleted_at}")

        if args.dry_run:
            print("[DRY RUN] No records were deleted.")
            return 0

        purged_boards = BoardService.purge_expired_boards(retention_days=args.days)
        purged_tasks = TaskService.purge_expired_tasks(retention_days=args.days)
        print(f"Successfully purged {purged_boards} board(s) and {purged_tasks} task(s) and associated attachments.")
        return 0

if __name__ == "__main__":
    sys.exit(main())
