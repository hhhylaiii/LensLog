from celery import Celery
from app.core.config import settings

celery_app = Celery("lenslog", broker=settings.REDIS_URL)


@celery_app.task(name="tasks.send_maintenance_reminder")
def send_maintenance_reminder_task(user_email: str, gear_model: str, days_overdue: int):
    """發送器材保養提醒 Email"""
    # TODO: 整合 FastAPI-Mail
    print(f"Sending maintenance reminder to {user_email} for {gear_model} ({days_overdue} days overdue)")


@celery_app.task(name="tasks.check_maintenance_due")
def check_maintenance_due_task():
    """定時掃描器材保養到期日（Celery Beat 排程）"""
    # TODO: 查詢所有到期器材，呼叫 send_maintenance_reminder_task
    pass
