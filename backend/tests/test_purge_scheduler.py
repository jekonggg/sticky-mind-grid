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

    env = os.environ.copy()
    env["DATABASE_URL"] = env.get("TEST_DATABASE_URL") or "sqlite:///:memory:"
    env["SCHEDULER_ENABLED"] = "false"

    result = subprocess.run(
        [sys.executable, script_path, "--dry-run"],
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )
    assert result.returncode == 0
    assert "Purge" in result.stdout or "expired" in result.stdout


def test_task_service_purge_expired_tasks_removes_old_tasks_and_files(app, create_test_user, create_test_board):
    """
    TaskService.purge_expired_tasks should permanently delete soft-deleted tasks
    older than retention days and remove their disk attachments, but preserve recent tasks.
    """
    from app.services.task_service import TaskService
    from app.services.file_service import FileService

    user = create_test_user(email="taskpurger@example.com")
    board, _ = create_test_board(owner=user, name="Task Purge Board")

    test_upload_dir = FileService.get_upload_dir()
    os.makedirs(test_upload_dir, exist_ok=True)
    dummy_file = os.path.join(test_upload_dir, "task_attachment_purged.png")
    with open(dummy_file, "wb") as f:
        f.write(b"dummy task attachment content")

    # 1. Expired task (deleted 35 days ago)
    expired_task = Task(
        board_id=board.id,
        title="Expired Task",
        is_deleted=True,
        deleted_at=datetime.utcnow() - timedelta(days=35),
        attachments=[{"name": "task_attachment_purged.png", "url": "/api/files/task_attachment_purged.png", "size": "100 KB"}]
    )
    db.session.add(expired_task)

    # 2. Recent task in trash (deleted 5 days ago)
    recent_task = Task(
        board_id=board.id,
        title="Recent Task",
        is_deleted=True,
        deleted_at=datetime.utcnow() - timedelta(days=5)
    )
    db.session.add(recent_task)
    db.session.commit()

    assert os.path.exists(dummy_file)

    # Execute task purge
    purged_count = TaskService.purge_expired_tasks(retention_days=30)
    assert purged_count == 1

    # Verify expired task was permanently deleted and file removed
    assert db.session.get(Task, expired_task.id) is None
    assert not os.path.exists(dummy_file)

    # Verify recent task is preserved in trash
    preserved = db.session.get(Task, recent_task.id)
    assert preserved is not None
    assert preserved.is_deleted is True


def test_scheduler_service_return_details(app):
    """
    SchedulerService.run_purge_now with return_details=True returns a dictionary
    with detailed metrics for purged boards and tasks.
    """
    from app.services.scheduler_service import SchedulerService

    details = SchedulerService.run_purge_now(app, return_details=True)
    assert isinstance(details, dict)
    assert "purged_boards" in details
    assert "purged_tasks" in details
    assert "total" in details
    assert details["total"] == details["purged_boards"] + details["purged_tasks"]


def test_cli_purge_expired_data_script_runs_successfully():
    """
    Running python scripts/purge_expired_data.py --dry-run returns exit code 0.
    """
    scripts_dir = os.path.join(os.getcwd(), "scripts")
    if not os.path.exists(scripts_dir):
        scripts_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))
    script_path = os.path.join(scripts_dir, "purge_expired_data.py")
    assert os.path.exists(script_path), f"Script {script_path} must exist"

    env = os.environ.copy()
    env["DATABASE_URL"] = env.get("TEST_DATABASE_URL") or "sqlite:///:memory:"
    env["SCHEDULER_ENABLED"] = "false"

    result = subprocess.run(
        [sys.executable, script_path, "--dry-run"],
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )
    assert result.returncode == 0
    assert "Purge scan completed" in result.stdout


def test_internal_jobs_purge_endpoint_auth_and_execution(client, app, create_test_user, create_test_board):
    """
    Tests the secure internal maintenance endpoint POST /api/internal/jobs/purge:
    - 403 when INTERNAL_JOB_SECRET is not configured on the server
    - 401 when X-Internal-Secret is missing or incorrect
    - 200 when X-Internal-Secret matches
    - 200 when Authorization: Bearer <secret> matches
    - 400 when retention_days < 1
    """
    # 1. Server has no secret configured -> 403
    app.config["INTERNAL_JOB_SECRET"] = ""
    res = client.post("/api/internal/jobs/purge")
    assert res.status_code == 403
    assert "disabled" in res.get_json()["error"].lower()

    # Configure server secret
    valid_secret = "test-internal-secret-token-12345"
    app.config["INTERNAL_JOB_SECRET"] = valid_secret

    # 2. Missing secret in request -> 401
    res = client.post("/api/internal/jobs/purge")
    assert res.status_code == 401
    assert "Unauthorized" in res.get_json()["error"]

    # 3. Wrong secret in request -> 401
    res = client.post("/api/internal/jobs/purge", headers={"X-Internal-Secret": "wrong-secret"})
    assert res.status_code == 401

    # 4. Invalid retention days -> 400
    res = client.post(
        "/api/internal/jobs/purge",
        headers={"X-Internal-Secret": valid_secret},
        json={"retention_days": 0}
    )
    assert res.status_code == 400

    # 5. Valid secret via X-Internal-Secret -> 200
    res = client.post(
        "/api/internal/jobs/purge",
        headers={"X-Internal-Secret": valid_secret},
        json={"retention_days": 30}
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert data["job"] == "purge_expired_data"
    assert "purged_boards" in data
    assert "purged_tasks" in data
    assert "total_purged" in data

    # 6. Valid secret via Authorization: Bearer <secret> -> 200
    res = client.post(
        "/api/internal/jobs/purge",
        headers={"Authorization": f"Bearer {valid_secret}"}
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
