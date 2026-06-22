"""Liveness and readiness probes.

/health      = liveness: is the process up at all (no dependency checks).
/health/ready = readiness: are the dependencies the bot needs actually working —
                DB, Redis (if configured), and (the easily-missed one) is the
                scheduler still producing fresh signals. A trading bot whose feed
                silently goes stale still answers HTTP 200 everywhere else, so we
                make staleness explicitly observable here.
"""
from datetime import datetime
from fastapi import APIRouter
from sqlalchemy import text

from core.config import settings
from core.database import engine

router = APIRouter()


@router.get("/health")
async def health():
    """Liveness — process is running. Intentionally checks no dependencies."""
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@router.get("/health/ready")
async def ready():
    """Readiness — report each dependency, never 500 on a down dependency.

    A down dependency yields status:"degraded" (with per-check detail) rather than
    raising, so an orchestrator / on-call can see WHICH dependency broke instead of
    an opaque 500.
    """
    checks: dict = {}
    healthy = True

    # DB reachability: a SELECT 1 round-trip proves the pool can actually serve
    # queries, not just that the URL is configured.
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["database"] = {"ok": True}
    except Exception as e:
        healthy = False
        checks["database"] = {"ok": False, "error": str(e)}

    # Redis reachability — only checked if configured (optional dependency).
    if settings.redis_url:
        try:
            # Import locally so a missing redis dep doesn't break liveness import.
            import redis.asyncio as aioredis

            client = aioredis.from_url(settings.redis_url)
            try:
                await client.ping()
            finally:
                await client.aclose()
            checks["redis"] = {"ok": True}
        except Exception as e:
            healthy = False
            checks["redis"] = {"ok": False, "error": str(e)}
    else:
        checks["redis"] = {"ok": True, "configured": False}

    # freshness SLI: stale feed = silently broken bot. Compare the last completed
    # scan against 2x the scan interval — if the scheduler stopped, this trips
    # even though every other endpoint still looks healthy.
    try:
        from scheduler.main import get_scan_health

        scan = get_scan_health()
        now = datetime.utcnow()
        completed_at = scan.get("last_scan_completed_at")
        age_seconds = None
        stale = True  # no scan yet (e.g. just booted) counts as not-ready-fresh
        if completed_at:
            completed_dt = datetime.fromisoformat(completed_at)
            age_seconds = (now - completed_dt).total_seconds()
            stale_threshold = settings.scan_interval_minutes * 60 * 2
            stale = age_seconds > stale_threshold

        if stale:
            healthy = False

        checks["scheduler"] = {
            "ok": not stale,
            "stale": stale,
            "last_scan_started_at": scan.get("last_scan_started_at"),
            "last_scan_completed_at": completed_at,
            "last_scan_age_seconds": age_seconds,
            "last_scan_signal_count": scan.get("last_scan_signal_count"),
            "scan_interval_minutes": settings.scan_interval_minutes,
        }
    except Exception as e:
        healthy = False
        checks["scheduler"] = {"ok": False, "error": str(e)}

    return {
        "status": "ok" if healthy else "degraded",
        "timestamp": datetime.utcnow().isoformat(),
        "checks": checks,
    }
