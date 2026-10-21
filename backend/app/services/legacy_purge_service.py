import os
import json
import logging
from datetime import datetime, timedelta
from app import db
from app.models.user import User
from app.models.board import Board
from app.models.task import Task

logger = logging.getLogger(__name__)

class LegacyPurgeService:
    @classmethod
    def purge_unverified_legacy_accounts(cls, grace_days=90, dry_run=True, archive_dir="backend/archives"):
        """
        Purges accounts that stay unverified 90+ days after their legacy_deadline.
        Exports and archives their data first.
        Never purges accounts that have email_verified == True or legacy_unverified == False.
        """
        now = datetime.utcnow()
        cutoff = now - timedelta(days=grace_days)
        candidates = User.query.filter(
            User.legacy_unverified == True,
            User.email_verified == False,
            User.legacy_deadline != None,
            User.legacy_deadline <= cutoff
        ).all()

        purged_records = []
        for user in candidates:
            # Strict safety guard: never delete verified user
            if user.email_verified or not user.legacy_unverified:
                continue

            archive_data = {
                "user": user.to_dict(),
                "archivedAt": now.isoformat() + "Z",
                "boards": [b.to_dict() for b in Board.query.filter_by(owner_id=user.id).all()],
                "createdTasks": [t.to_dict() for t in Task.query.filter_by(created_by=user.id).all()]
            }

            if not dry_run:
                try:
                    os.makedirs(archive_dir, exist_ok=True)
                    archive_path = os.path.join(archive_dir, f"legacy_archive_{user.id}_{int(now.timestamp())}.json")
                    with open(archive_path, "w", encoding="utf-8") as f:
                        json.dump(archive_data, f, indent=2)

                    from app.services.user_service import UserService
                    UserService.delete_account(user.id)
                    purged_records.append({"userId": user.id, "email": user.email, "archived": True, "path": archive_path})
                except Exception as e:
                    logger.error(f"Failed to purge legacy unverified user {user.id}: {e}")
            else:
                purged_records.append({"userId": user.id, "email": user.email, "dryRun": True})

        return purged_records
