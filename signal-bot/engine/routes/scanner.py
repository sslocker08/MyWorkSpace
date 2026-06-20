"""Scanner trigger endpoint."""
import asyncio
import logging
import time
from collections import defaultdict, deque
from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request, HTTPException

from core.signal_engine import scan_universe, _fetcher
from core.market_regime import compute_market_regime
from universe import UniverseManager

router = APIRouter()
logger = logging.getLogger(__name__)
_universe = UniverseManager()
_scan_lock = asyncio.Lock()

# web-security: /scanner/trigger kicks off an expensive market-wide scan, so it is
# a prime target for accidental or hostile flooding. This is a lightweight,
# in-process, per-worker sliding-window limiter (no new deps). It is best-effort
# (per-worker, in-memory) — defense-in-depth, not a substitute for an edge limiter.
_RATE_LIMIT_MAX = 30          # max requests ...
_RATE_LIMIT_WINDOW = 60.0     # ... per this many seconds, per client IP
_rate_hits: dict[str, deque] = defaultdict(deque)
_rate_lock = asyncio.Lock()


async def rate_limit_trigger(request: Request):
    """Sliding-window rate limit for the expensive trigger route (best-effort)."""
    client_ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    async with _rate_lock:
        hits = _rate_hits[client_ip]
        # Drop timestamps outside the window so the deque can't grow unbounded.
        cutoff = now - _RATE_LIMIT_WINDOW
        while hits and hits[0] <= cutoff:
            hits.popleft()
        if len(hits) >= _RATE_LIMIT_MAX:
            retry_after = int(_RATE_LIMIT_WINDOW - (now - hits[0])) + 1
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded for scanner trigger",
                headers={"Retry-After": str(max(retry_after, 1))},
            )
        hits.append(now)


@router.post("/trigger", dependencies=[Depends(rate_limit_trigger)])
async def trigger_scan(
    background_tasks: BackgroundTasks,
    # web-security: bound limit so a caller can't request an absurd universe size.
    limit: int = Query(100, ge=1, le=500),
):
    """Trigger a manual market scan in the background.

    The scan runs after this request returns, so it must not borrow the
    request-scoped DB session (it would already be closed). scan_universe
    opens its own per-task sessions internally.
    """
    if _scan_lock.locked():
        return {"status": "busy", "message": "Scan already in progress"}

    async def run_scan():
        async with _scan_lock:
            try:
                tickers = await _universe.get_high_priority_tickers(limit)
                # Compute the regime ONCE before scanning and pass it through.
                regime = await compute_market_regime(_fetcher)
                # Compute the Ceiling Score ONCE before scanning and feed it in.
                # Degradation-safe: a compute or DB failure NEVER penalizes signals
                # (failure -> neutral 50 flagged degraded -> neutral ceiling mult).
                ceiling_score = await _compute_and_persist_ceiling_safe()
                signals = await scan_universe(
                    tickers,
                    ceiling_score=ceiling_score.total,
                    ceiling_degraded=ceiling_score.degraded,
                    regime=regime,
                )
                logger.info(
                    f"Manual scan complete: {len(signals)} signals "
                    f"(regime={regime}, ceiling={ceiling_score.total:.0f}, "
                    f"degraded={ceiling_score.degraded})"
                )
            except Exception as e:
                logger.error(f"Scan failed: {e}")

    background_tasks.add_task(run_scan)
    return {"status": "started", "message": f"Scanning {limit} tickers in background"}


async def _compute_and_persist_ceiling_safe():
    """Compute the ceiling score ONCE, persist that SAME score, degrade SAFELY.

    Returns a CeilingScore. Compute and persistence are each fully wrapped so a
    feed outage or DB error NEVER breaks the scan and NEVER penalizes signals: on
    a compute failure we return a neutral 50 flagged degraded=True (which the
    scorer treats as a NEUTRAL ceiling multiplier). The same computed score is
    persisted (no double compute); a DB error there is logged and swallowed.
    """
    from core.market_intelligence import MarketIntelligenceEngine, CeilingScore

    engine = MarketIntelligenceEngine(data_fetcher=_fetcher)
    try:
        score = await engine.compute_ceiling_score()
    except Exception as e:  # noqa: BLE001 — ceiling compute must never break the scan
        logger.warning(f"Ceiling compute failed; scoring neutrally (degraded): {e}")
        return CeilingScore(
            total=50.0, breakdown={}, weights_used={}, available_axes=0, degraded=True,
        )

    # Persist the SAME score (best-effort; compute_and_persist swallows DB errors).
    try:
        from core.database import AsyncSessionLocal

        async with AsyncSessionLocal() as session:
            await engine.compute_and_persist(session, score=score)
    except Exception as e:  # noqa: BLE001 — snapshot is best-effort, never fatal
        logger.warning(f"Ceiling snapshot persist failed (non-fatal): {e}")
    return score


@router.get("/status")
async def scan_status():
    return {"scanning": _scan_lock.locked()}
