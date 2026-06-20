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
