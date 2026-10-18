import os
import logging
try:
    from apscheduler.schedulers.background import BackgroundScheduler
except ImportError:
    BackgroundScheduler = None

logger = logging.getLogger(__name__)

class SchedulerService:
    _scheduler = None

    @classmethod
    def get_scheduler(cls):
        if BackgroundScheduler is None:
            return None
        if cls._scheduler is None:
            cls._scheduler = BackgroundScheduler(daemon=True)
        return cls._scheduler

    @classmethod
    def run_purge_now(cls, app, retention_days=30, return_details=False):
        with app.app_context():
            from app.services.board_service import BoardService
            from app.services.task_service import TaskService
            purged_boards = BoardService.purge_expired_boards(retention_days=retention_days)
            purged_tasks = TaskService.purge_expired_tasks(retention_days=retention_days)
            logger.info(f"[SchedulerService] Purged {purged_boards} expired board(s) and {purged_tasks} expired task(s)")
            if return_details:
                return {
                    "purged_boards": purged_boards,
                    "purged_tasks": purged_tasks,
                    "total": purged_boards + purged_tasks
                }
            return purged_boards + purged_tasks

    @classmethod
    def start_scheduler(cls, app):
        scheduler = cls.get_scheduler()
        if scheduler is None:
            logger.warning("[SchedulerService] apscheduler not installed; background jobs disabled")
            return
        if not scheduler.running:
            interval_hours = int(os.environ.get("PURGE_SCHEDULE_HOURS", "24"))
            scheduler.add_job(
                func=cls.run_purge_now,
                args=[app],
                trigger="interval",
                hours=interval_hours,
                id="purge_expired_boards",
                replace_existing=True
            )
            scheduler.start()
            logger.info(f"[SchedulerService] Started background scheduler with {interval_hours}h purge interval")

    @classmethod
    def stop_scheduler(cls):
        if cls._scheduler and cls._scheduler.running:
            cls._scheduler.shutdown(wait=False)
            logger.info("[SchedulerService] Stopped background scheduler")
