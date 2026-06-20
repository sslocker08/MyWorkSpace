"""APScheduler for periodic market scanning."""
import asyncio
import logging
from datetime import datetime
from typing import Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from core.config import settings

logger = logging.getLogger(__name__)
_scheduler: AsyncIOScheduler = None

# freshness SLI: a stale feed = silently broken bot. Track the last scan's
# lifecycle so /health/ready can detect "scheduler stopped scanning" — the
# failure mode that is otherwise invisible (the API still answers, but the
# signals it serves are frozen).
_last_scan_started_at: Optional[datetime] = None
_last_scan_completed_at: Optional[datetime] = None
_last_scan_signal_count: Optional[int] = None


def get_scan_health() -> dict:
    """Expose the last-scan freshness SLI for the readiness probe.

    Returns raw timestamps + count; the staleness verdict is computed by the
    health route against scan_interval_minutes so the threshold lives in one place.
    """
    return {
        "last_scan_started_at": (
            _last_scan_started_at.isoformat() if _last_scan_started_at else None
        ),
        "last_scan_completed_at": (
            _last_scan_completed_at.isoformat() if _last_scan_completed_at else None
        ),
        "last_scan_signal_count": _last_scan_signal_count,
    }


async def _run_scan():
    """Periodic scan job."""
    from core.signal_engine import scan_universe
    from universe import UniverseManager

    global _last_scan_started_at, _last_scan_completed_at, _last_scan_signal_count

    # freshness SLI: record start so an in-flight-but-never-completing scan is
    # distinguishable from a scan that finished.
    _last_scan_started_at = datetime.utcnow()

    universe = UniverseManager()
    tickers = await universe.get_high_priority_tickers(200)

    try:
        # scan_universe opens its own per-task sessions; expire_on_commit=False
        # keeps the returned Signals' attributes readable after their sessions close.
        signals = await scan_universe(tickers)
        logger.info(f"Scheduled scan: {len(signals)} signals from {len(tickers)} tickers")

        # freshness SLI: stamp completion + count so readiness can flag staleness.
        _last_scan_completed_at = datetime.utcnow()
        _last_scan_signal_count = len(signals)

        # Send Telegram notifications for high-score signals
        high_score = [s for s in signals if s.score >= 75]
        if high_score:
            await _notify_telegram(high_score)
    except Exception as e:
        logger.error(f"Scheduled scan failed: {e}")


async def _notify_telegram(signals: list):
    """Send Telegram notification for high-score signals."""
    from core.config import settings
    import httpx

    if not settings.telegram_bot_token or not settings.telegram_chat_id:
        return

    for signal in signals[:5]:  # max 5 per run
        message = (
            f"🚨 *{signal.ticker}* {signal.direction} Score: {signal.score:.0f}\n"
            f"Entry: ${signal.entry_price:.2f} | SL: ${signal.stop_loss:.2f}\n"
            f"TP1: ${signal.tp1:.2f} | TP2: ${signal.tp2:.2f}\n"
            f"R:R {signal.risk_reward:.1f} | Ceiling: {signal.ceiling_score:.0f}"
        )
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage",
                    json={
                        "chat_id": settings.telegram_chat_id,
                        "text": message,
                        "parse_mode": "Markdown",
                    },
                    timeout=10,
                )
        except Exception as e:
            logger.warning(f"Telegram notification failed: {e}")


async def start_scheduler():
    global _scheduler
    _scheduler = AsyncIOScheduler()

    # US market hours: scan every 15 min during market hours (Mon-Fri 9:30-16:00 ET)
    _scheduler.add_job(
        _run_scan,
        trigger=IntervalTrigger(minutes=settings.scan_interval_minutes),
        id="market_scan",
        max_instances=1,
        coalesce=True,
    )

    _scheduler.start()
    logger.info(f"Scheduler started: scanning every {settings.scan_interval_minutes} minutes")


async def stop_scheduler():
    global _scheduler
    if _scheduler:
        _scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
