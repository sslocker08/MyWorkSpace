"""Orchestrates scanning: fetch data → run strategies → score → save."""
import asyncio
import logging
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from core.data_fetcher import DataFetcher
from core.signal_scorer import SignalScorer
from core.risk_manager import RiskManager
from strategies import ALL_STRATEGIES
from models.signal import Signal, Direction, Market, SignalStatus

logger = logging.getLogger(__name__)

_fetcher = DataFetcher()
_scorer = SignalScorer()
_risk_mgr = RiskManager()


async def scan_ticker(
    ticker: str,
    market: str = "US",
    sector: Optional[str] = None,
    ceiling_score: float = 50.0,
    regime: str = "NEUTRAL",
    db: Optional[AsyncSession] = None,
) -> Optional[Signal]:
    """Run all strategies on a ticker and return a Signal if score >= threshold."""
    from core.config import settings

    try:
        df = await _fetcher.get_ohlcv(ticker, days=300)
    except Exception as e:
        logger.warning(f"Cannot fetch data for {ticker}: {e}")
        return None

    if df is None or len(df) < 60:
        return None

    triggered = []
    confidences = {}
    directions = {}
    all_indicators = {}

    for strategy in ALL_STRATEGIES:
        try:
            result = strategy.evaluate(ticker, df)
            if result.triggered:
                triggered.append(result.name)
                confidences[result.name] = result.confidence
                directions[result.name] = result.direction or "LONG"
                all_indicators.update(result.indicators)
        except Exception as e:
            logger.warning(f"Strategy {strategy.name} failed on {ticker}: {e}")

    if not triggered:
        return None

    # Derive direction by confidence-weighted vote across triggered strategies.
    # A bearish (SHORT) signal must not be silently recorded as LONG.
    long_weight = sum(confidences[s] for s in triggered if directions[s] == "LONG")
    short_weight = sum(confidences[s] for s in triggered if directions[s] == "SHORT")
    direction = "SHORT" if short_weight > long_weight else "LONG"

    # Keep only the strategies that agree with the winning direction so the
    # score, risk levels, and ceiling penalty all reflect a single coherent side.
    triggered = [s for s in triggered if directions[s] == direction]
    confidences = {s: confidences[s] for s in triggered}

    risk = _risk_mgr.calculate(df, direction)
    if not _risk_mgr.is_valid_setup(risk):
        return None

    score_breakdown = _scorer.score(
        ticker=ticker,
        df=df,
        direction=direction,
        triggered_strategies=triggered,
        strategy_confidences=confidences,
        risk_reward=risk.risk_reward,
        ceiling_score=ceiling_score,
        regime=regime,
    )

    if score_breakdown.total < settings.signal_score_threshold:
        return None

    signal = Signal(
        ticker=ticker,
        market=market,
        sector=sector,
        direction=direction,
        score=score_breakdown.total,
        strategy_hits={"strategies": triggered, "confidences": confidences},
        entry_price=risk.entry_price,
        stop_loss=risk.stop_loss,
        tp1=risk.tp1,
        tp2=risk.tp2,
        tp3=risk.tp3,
        risk_reward=risk.risk_reward,
        regime=regime,
        ceiling_score=ceiling_score,
        indicators={**all_indicators, "atr": risk.atr_value, "score_breakdown": {
            "strategy_hits": score_breakdown.strategy_hits,
            "trend_strength": score_breakdown.trend_strength,
            "volume_confirm": score_breakdown.volume_confirm,
            "risk_reward": score_breakdown.risk_reward,
        }},
        timeframe="1D",
        status=SignalStatus.ACTIVE,
    )

    if db:
        db.add(signal)
        await db.commit()
        await db.refresh(signal)

    return signal


async def scan_universe(
    tickers: list[str],
    market: str = "US",
    ceiling_score: float = 50.0,
    regime: str = "NEUTRAL",
    persist: bool = True,
    max_concurrent: int = 20,
) -> list[Signal]:
    """Scan a list of tickers concurrently.

    Each concurrent task gets its own AsyncSession — an AsyncSession is not safe
    to share across tasks that commit/refresh in parallel, so we never fan a
    single session out to the worker pool.
    """
    from core.database import AsyncSessionLocal

    semaphore = asyncio.Semaphore(max_concurrent)
    results = []

    async def scan_one(ticker):
        async with semaphore:
            if persist:
                async with AsyncSessionLocal() as session:
                    signal = await scan_ticker(
                        ticker, market=market, ceiling_score=ceiling_score,
                        regime=regime, db=session,
                    )
            else:
                signal = await scan_ticker(
                    ticker, market=market, ceiling_score=ceiling_score,
                    regime=regime, db=None,
                )
            if signal:
                results.append(signal)

    await asyncio.gather(*[scan_one(t) for t in tickers])
    results.sort(key=lambda s: s.score, reverse=True)
    logger.info(f"Scan complete: {len(results)} signals from {len(tickers)} tickers")
    return results
