"""Strategy trigger correctness — each strategy fires on its matching golden
fixture with the right direction, and does NOT false-trigger on a flat series.

These are the positive/negative screening cases: a strategy that fires on noise
(false positive) is as dangerous as one that never fires.
"""
import pytest

from strategies.ema_crossover import EMACrossoverStrategy
from strategies.momentum_long import MomentumLongStrategy
from strategies.breakout_long import BreakoutLongStrategy


# --- ema_crossover ----------------------------------------------------------

def test_ema_crossover_golden_cross_long(golden_cross_df):
    res = EMACrossoverStrategy().evaluate("TEST", golden_cross_df)
    assert res.triggered is True
    assert res.direction == "LONG"
    assert 0.0 <= res.confidence <= 1.0


def test_ema_crossover_death_cross_short(death_cross_df):
    res = EMACrossoverStrategy().evaluate("TEST", death_cross_df)
    assert res.triggered is True
    assert res.direction == "SHORT"


def test_ema_crossover_no_trigger_on_flat(flat_df):
    res = EMACrossoverStrategy().evaluate("TEST", flat_df)
    assert res.triggered is False


# --- momentum_long ----------------------------------------------------------

def test_momentum_long_triggers_on_uptrend(uptrend_df):
    res = MomentumLongStrategy().evaluate("TEST", uptrend_df)
    assert res.triggered is True
    assert res.direction == "LONG"
    assert 0.0 <= res.confidence <= 1.0


def test_momentum_long_no_trigger_on_flat(flat_df):
    res = MomentumLongStrategy().evaluate("TEST", flat_df)
    assert res.triggered is False


def test_momentum_long_no_trigger_on_downtrend(downtrend_df):
    res = MomentumLongStrategy().evaluate("TEST", downtrend_df)
    assert res.triggered is False


# --- breakout_long ----------------------------------------------------------

def test_breakout_long_triggers_on_breakout(breakout_df):
    res = BreakoutLongStrategy().evaluate("TEST", breakout_df)
    assert res.triggered is True
    assert res.direction == "LONG"
    assert 0.0 <= res.confidence <= 1.0


def test_breakout_long_length_gate(flat_df):
    # flat_df is only 80 bars < 260 -> must not trigger.
    res = BreakoutLongStrategy().evaluate("TEST", flat_df)
    assert res.triggered is False


def test_breakout_long_no_trigger_on_long_flat(long_series_df):
    # long enough (>260) but the volume-surge/near-high combo is engineered only
    # into breakout_df; a generic climb should not fire on the last bar.
    res = BreakoutLongStrategy().evaluate("TEST", long_series_df)
    # Not asserting it must be False in every world, but with no final-bar volume
    # surge the 2x filter should keep it quiet.
    assert res.triggered is False
