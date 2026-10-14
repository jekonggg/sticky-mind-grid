import os
import subprocess
import sys
from datetime import datetime, timedelta
import pytest
from app import db
from app.models.board import Board
from app.models.task import Task
from app.models.user import User

def test_board_service_purge_expired_boards_removes_old_boards_and_files(app, create_test_user, tmp_path):
    """
    BoardService.purge_expired_boards should permanently delete boards soft-deleted
    > 30 days ago and clean up their attachments, but preserve boards deleted < 30 days ago.
    """
    from app.services.board_service import BoardService
    from app.services.file_service import FileService

    user = create_test_user(email="purger@example.com")

    # 1. Old expired board (deleted 35 days ago)
    old_board = Board(name="Expired Board", owner_id=user.id)
    old_board.is_deleted = True
    old_board.deleted_at = datetime.utcnow() - timedelta(days=35)
    db.session.add(old_board)
    db.session.commit()

    # Create dummy attachment file on disk
    test_upload_dir = FileService.get_upload_dir()
    os.makedirs(test_upload_dir, exist_ok=True)
    dummy_file = os.path.join(test_upload_dir, "to_be_purged.png")
    with open(dummy_file, "wb") as f:
        f.write(b"fake image data")

    old_task = Task(
        board_id=old_board.id,
        title="Old Task",
        attachments=[{"name": "to_be_purged.png", "url": "/api/files/to_be_purged.png", "size": "100 KB"}]
    )
    db.session.add(old_task)

    # 2. Recent board in trash (deleted 10 days ago)
    recent_board = Board(name="Recent Trashed Board", owner_id=user.id)
    recent_board.is_deleted = True
    recent_board.deleted_at = datetime.utcnow() - timedelta(days=10)
    db.session.add(recent_board)
    db.session.commit()

    assert os.path.exists(dummy_file)

    # Execute purge
    purged_count = BoardService.purge_expired_boards(retention_days=30)
    assert purged_count == 1

    # Verify old board and its tasks are gone
    assert db.session.get(Board, old_board.id) is None
    assert db.session.get(Task, old_task.id) is None
    assert not os.path.exists(dummy_file)

    # Verify recent board is preserved in trash
    preserved = db.session.get(Board, recent_board.id)
    assert preserved is not None
    assert preserved.is_deleted is True

def test_scheduler_service_lifecycle_and_execution(app):
    """
    SchedulerService initializes APScheduler, registers the purge job,
    and supports safe lifecycle management.
    """
    from app.services.scheduler_service import SchedulerService

    assert hasattr(SchedulerService, "start_scheduler")
    assert hasattr(SchedulerService, "stop_scheduler")

    scheduler = SchedulerService.get_scheduler()
    assert scheduler is not None

    # Test explicit programmatic execution of the purge job
    purged = SchedulerService.run_purge_now(app)
    assert isinstance(purged, int)

def test_cli_purge_script_runs_successfully():
    """
    Running python scripts/purge_expired_boards.py returns exit code 0.
    """
    scripts_dir = os.path.join(os.getcwd(), "scripts")
    if not os.path.exists(scripts_dir):
        scripts_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))
    script_path = os.path.join(scripts_dir, "purge_expired_boards.py")
    assert os.path.exists(script_path), f"Script {script_path} must exist"

    result = subprocess.run(
        [sys.executable, script_path, "--dry-run"],
        capture_output=True,
        text=True,
        check=False
    )
    assert result.returncode == 0
    assert "Purge" in result.stdout or "expired" in result.stdout
