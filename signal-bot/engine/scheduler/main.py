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
    from core.signal_engine import scan_universe, _fetcher
    from core.market_regime import compute_market_regime
    from universe import UniverseManager

    global _last_scan_started_at, _last_scan_completed_at, _last_scan_signal_count

    # freshness SLI: record start so an in-flight-but-never-completing scan is
    # distinguishable from a scan that finished.
    _last_scan_started_at = datetime.utcnow()

    universe = UniverseManager()
    tickers = await universe.get_high_priority_tickers(200)

    # Compute the market regime ONCE per scan (not per ticker) and pass it to
    # scan_universe, which forwards it to the scorer's BULL/BEAR alignment bonus.
    regime = await compute_market_regime(_fetcher)
    logger.info(f"Market regime for this scan: {regime}")

    # Compute the Ceiling Score ONCE per scan, BEFORE scanning, so it can be fed
    # into the scorer (and the SAME computed score is persisted below — no double
    # compute). Fully degradation-safe: a compute failure NEVER penalizes signals
    # — we fall back to a neutral 50 flagged degraded=True, which neutralizes the
    # ceiling multiplier in the scorer rather than acting on a missing feed.
    from core.market_intelligence import MarketIntelligenceEngine

    ceiling_engine = MarketIntelligenceEngine(data_fetcher=_fetcher)
    ceiling_score = await _compute_ceiling_safe(ceiling_engine)

    try:
        # scan_universe opens its own per-task sessions; expire_on_commit=False
        # keeps the returned Signals' attributes readable after their sessions close.
        signals = await scan_universe(
            tickers,
            ceiling_score=ceiling_score.total,
            ceiling_degraded=ceiling_score.degraded,
            regime=regime,
        )
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

    # Persist the SAME ceiling score we already computed before the scan (no
    # double compute / no second network round). Fully isolated from the scan: a
    # DB failure here is logged and swallowed (compute_and_persist is internally
    # best-effort), so persistence can never break the scan.
    try:
        from core.database import AsyncSessionLocal

        async with AsyncSessionLocal() as session:
            await ceiling_engine.compute_and_persist(session, score=ceiling_score)
        logger.info(
            "Ceiling-score snapshot persisted: %.1f (%s, %d/%d axes, degraded=%s)",
            ceiling_score.total, ceiling_score.regime, ceiling_score.available_axes,
            len(ceiling_score.breakdown), ceiling_score.degraded,
        )
    except Exception as e:  # noqa: BLE001 — snapshot is best-effort, never fatal
        logger.warning(f"Ceiling-score snapshot failed (non-fatal): {e}")


async def _compute_ceiling_safe(engine) -> "object":
    """Compute the ceiling score, degrading SAFELY on any failure.

    compute_ceiling_score is documented never to raise, but we still wrap it: if
    the ceiling feed is entirely down (or any unexpected error escapes), return a
    neutral CeilingScore flagged degraded=True so the scorer NEUTRALIZES the
    ceiling multiplier. A failed ceiling feed must NEVER penalize signals.
    """
    from core.market_intelligence import CeilingScore

    try:
        return await engine.compute_ceiling_score()
    except Exception as e:  # noqa: BLE001 — ceiling compute must never break the scan
        logger.warning(f"Ceiling-score compute failed; scoring neutrally (degraded): {e}")
        return CeilingScore(
            total=50.0, breakdown={}, weights_used={}, available_axes=0, degraded=True,
        )


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
