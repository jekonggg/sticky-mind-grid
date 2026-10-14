import os
import sys
import subprocess
import pytest
from app import create_app, db
from app.models.board import Board
from app.models.task import Task
from app.models.user import User
from tests.conftest import TestConfig

def test_backup_and_restore_cycle_recovers_database_and_attachments(tmp_path):
    """
    scripts/backup_database.py followed by scripts/restore_database.py must
    create a valid backup bundle and restore all tables, rows, and attachment files.
    """
    scripts_dir = os.path.join(os.getcwd(), "scripts")
    if not os.path.exists(scripts_dir):
        scripts_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))
    backup_script = os.path.join(scripts_dir, "backup_database.py")
    restore_script = os.path.join(scripts_dir, "restore_database.py")

    assert os.path.exists(backup_script), f"{backup_script} must exist"
    assert os.path.exists(restore_script), f"{restore_script} must exist"

    db_file = tmp_path / "test_backup.sqlite"
    db_url = f"sqlite:///{db_file}"
    upload_dir = str(tmp_path / "uploads")
    os.makedirs(upload_dir, exist_ok=True)

    custom_config = type("BackupTestConfig", (TestConfig,), {
        "SQLALCHEMY_DATABASE_URI": db_url,
        "SQLALCHEMY_ENGINE_OPTIONS": {},
    })

    test_app = create_app(custom_config)
    with test_app.app_context():
        db.create_all()

        # 1. Seed initial data
        user = User(email="backup_user@example.com", full_name="Backup User")
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()

        board = Board(
            name="Mission Critical Board",
            owner_id=user.id,
            columns=[{"id": "c1", "title": "Done"}]
        )
        db.session.add(board)
        db.session.commit()

        test_file_path = os.path.join(upload_dir, "test_asset.txt")
        with open(test_file_path, "w", encoding="utf-8") as f:
            f.write("Important backup payload data")

        task = Task(
            board_id=board.id,
            title="Restorable Task",
            attachments=[{"name": "test_asset.txt", "url": "/api/files/test_asset.txt", "size": "30 B"}]
        )
        db.session.add(task)
        db.session.commit()

        # 2. Run backup
        backup_dir = str(tmp_path / "backups")
        os.makedirs(backup_dir, exist_ok=True)
        backup_output = str(tmp_path / "backups" / "test_backup.tar.gz")

        res_backup = subprocess.run(
            [sys.executable, backup_script, "--output", backup_output, "--db-url", db_url, "--upload-dir", upload_dir],
            capture_output=True,
            text=True,
            check=False
        )
        assert res_backup.returncode == 0, f"Backup script failed: {res_backup.stderr}\n{res_backup.stdout}"
        assert os.path.exists(backup_output)

        # 3. Simulate disaster: delete task, board, and file
        db.session.delete(task)
        db.session.delete(board)
        db.session.commit()
        if os.path.exists(test_file_path):
            os.remove(test_file_path)

        assert db.session.get(Board, board.id) is None
        assert not os.path.exists(test_file_path)

        # 4. Run restore
        res_restore = subprocess.run(
            [sys.executable, restore_script, "--backup", backup_output, "--db-url", db_url, "--upload-dir", upload_dir],
            capture_output=True,
            text=True,
            check=False
        )
        assert res_restore.returncode == 0, f"Restore script failed: {res_restore.stderr}\n{res_restore.stdout}"

        # 5. Verify data and attachment file recovery
        db.session.expire_all()
        restored_board = db.session.get(Board, board.id)
        assert restored_board is not None
        assert restored_board.name == "Mission Critical Board"

        restored_task = db.session.get(Task, task.id)
        assert restored_task is not None
        assert restored_task.title == "Restorable Task"

        assert os.path.exists(test_file_path)
        with open(test_file_path, "r", encoding="utf-8") as f:
            assert f.read() == "Important backup payload data"
