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
    def run_purge_now(cls, app):
        with app.app_context():
            from app.services.board_service import BoardService
            purged = BoardService.purge_expired_boards(retention_days=30)
            logger.info(f"[SchedulerService] Purged {purged} expired board(s)")
            return purged

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
