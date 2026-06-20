"""BacktestEngine correctness — stats are bounded, finite, and the known-edge
fixture produces a measurable win rate.

We feed momentum_long a clean uptrend where its edge is real, and assert (a) the
stats are computed and within their mathematical bounds, and (b) the engine
actually opened trades and produced a >0.5 win rate on a series where LONG momentum
should win more than it loses.
"""
import math

import pytest

from core.backtest_engine import BacktestEngine, BacktestResult
from core.risk_manager import RiskManager
from strategies.momentum_long import MomentumLongStrategy
from strategies.breakout_short import BreakoutShortStrategy
from strategies.momentum_short import MomentumShortStrategy
from strategies.reversal_long import ReversalLongStrategy
from strategies.reversal_short import ReversalShortStrategy
from strategies.macd_signal import MACDSignalStrategy
from strategies.bollinger_squeeze import BollingerSqueezeStrategy
from strategies.adx_trend import ADXTrendStrategy
from strategies.volume_surge import VolumeSurgeStrategy
from strategies.rsi_divergence_strat import RSIDivergenceStrategy


@pytest.fixture
def engine():
    return BacktestEngine()


def test_stats_bounded_on_uptrend(engine, long_series_df):
    res = engine.run(long_series_df, MomentumLongStrategy(), RiskManager(), hold_bars=10)
    assert isinstance(res, BacktestResult)
    assert res.total_trades >= 0
    assert 0.0 <= res.win_rate <= 1.0
    assert res.max_drawdown <= 0.0
    assert math.isfinite(res.sharpe)
    assert math.isfinite(res.avg_return)


def test_known_edge_win_rate_above_half(engine, long_series_df):
    """On a clean uptrend, momentum_long LONG entries should win > half the time."""
    res = engine.run(long_series_df, MomentumLongStrategy(), RiskManager(), hold_bars=10)
    assert res.total_trades > 0, "expected the momentum strategy to fire on an uptrend"
    assert res.win_rate > 0.5


def test_determinism(engine, long_series_df):
    a = engine.run(long_series_df, MomentumLongStrategy(), RiskManager(), hold_bars=10)
    b = engine.run(long_series_df, MomentumLongStrategy(), RiskManager(), hold_bars=10)
    assert a == b


def test_empty_when_no_triggers(engine, flat_df):
    """Flat series -> momentum never fires -> zeroed result, no crash."""
    res = engine.run(flat_df, MomentumLongStrategy(), RiskManager(), hold_bars=10)
    assert res.total_trades == 0
    assert res.win_rate == 0.0
    assert res.max_drawdown == 0.0
    assert res.sharpe == 0.0


# --- new strategies: substantiation / negative-screening --------------------
# For each new strategy, run it through the engine on a MULTI-TRIGGER fixture and
# assert (a) the engine actually opened trades (total_trades > 0 — NON-VACUOUS),
# and (b) the stats are computed and within their mathematical bounds (no NaN/inf,
# win_rate in [0,1], drawdown <= 0).
#
# WHY multi-trigger fixtures: the single-engineered-final-bar fixtures used by the
# `triggers` unit tests fire ONLY on the last bar, so the forward-walk backtest
# never opens a position (total_trades == 0) and the bounded-stats checks hold
# VACUOUSLY — they'd pass even if the strategy were broken. The *_series_df /
# reversal_swings_df fixtures trigger repeatedly across the series so the engine
# opens several positions, making the bounds meaningful. We do NOT assert a
# profitable edge for the counter-trend/synthetic fixtures — only that the engine
# exercises real trades and stays within bounds.


def _assert_bounded(res: BacktestResult) -> None:
    assert isinstance(res, BacktestResult)
    assert res.total_trades >= 0
    assert 0.0 <= res.win_rate <= 1.0
    assert res.max_drawdown <= 0.0
    assert math.isfinite(res.sharpe)
    assert math.isfinite(res.avg_return)


def _assert_nonvacuous(res: BacktestResult, min_trades: int = 3) -> None:
    """Bounds checks PLUS proof the engine actually opened trades (non-vacuous)."""
    _assert_bounded(res)
    assert res.total_trades >= min_trades, (
        f"expected >= {min_trades} trades for a non-vacuous backtest, "
        f"got {res.total_trades}"
    )


def test_breakout_short_backtest_nonvacuous(engine, breakdown_series_df):
    res = engine.run(breakdown_series_df, BreakoutShortStrategy(), RiskManager(), hold_bars=10)
    _assert_nonvacuous(res)


def test_momentum_short_backtest_nonvacuous(engine, momentum_short_series_df):
    res = engine.run(momentum_short_series_df, MomentumShortStrategy(), RiskManager(), hold_bars=10)
    _assert_nonvacuous(res)


def test_reversal_long_backtest_nonvacuous(engine, reversal_swings_df):
    res = engine.run(reversal_swings_df, ReversalLongStrategy(), RiskManager(), hold_bars=10)
    _assert_nonvacuous(res)


def test_reversal_short_backtest_nonvacuous(engine, reversal_swings_df):
    res = engine.run(reversal_swings_df, ReversalShortStrategy(), RiskManager(), hold_bars=10)
    _assert_nonvacuous(res)


# --- BATCH 5: new strategies through the engine on multi-trigger fixtures ----

def test_macd_signal_backtest_nonvacuous(engine, macd_waves_df):
    res = engine.run(macd_waves_df, MACDSignalStrategy(), RiskManager(), hold_bars=10)
    _assert_nonvacuous(res)


def test_bollinger_squeeze_backtest_nonvacuous(engine, squeeze_cycles_df):
    res = engine.run(squeeze_cycles_df, BollingerSqueezeStrategy(), RiskManager(), hold_bars=10)
    _assert_nonvacuous(res)


def test_adx_trend_backtest_nonvacuous(engine, adx_reversals_df):
    res = engine.run(adx_reversals_df, ADXTrendStrategy(), RiskManager(), hold_bars=10)
    _assert_nonvacuous(res)


def test_volume_surge_backtest_nonvacuous(engine, volume_spikes_df):
    res = engine.run(volume_spikes_df, VolumeSurgeStrategy(), RiskManager(), hold_bars=10)
    _assert_nonvacuous(res)


def test_rsi_divergence_backtest_nonvacuous(engine, divergence_cycles_df):
    res = engine.run(divergence_cycles_df, RSIDivergenceStrategy(), RiskManager(), hold_bars=10)
    _assert_nonvacuous(res)
