"""RiskManager correctness — the RR-gate is the safety-critical invariant.

The whole engine refuses setups below settings.min_risk_reward (1.5). With the
default config SL=1.5*ATR and TP2=3.0*ATR, so risk_reward MUST come out to exactly
2.0 and is_valid_setup MUST pass the 1.5 gate. If a config drift breaks that
relationship, valid trades get silently rejected (or junk gets accepted) — this
file is the tripwire for that.
"""
import math

import pytest

from core.risk_manager import RiskManager, RiskLevels
from core.config import settings


@pytest.fixture
def rm():
    return RiskManager()


# --- the RR-gate consistency (CRITICAL) ------------------------------------

def test_risk_reward_equals_two_with_default_config(rm, uptrend_df):
    # Pre-condition: the config is the one this test reasons about.
    assert settings.atr_sl_multiplier == 1.5
    assert settings.atr_tp2_multiplier == 3.0

    levels = rm.calculate(uptrend_df, "LONG")
    # RR = tp2_dist / sl_dist = 3.0 / 1.5 = 2.0
    assert levels.risk_reward == pytest.approx(2.0, abs=1e-9)


def test_valid_setup_passes_default_gate(rm, uptrend_df):
    levels = rm.calculate(uptrend_df, "LONG")
    assert rm.is_valid_setup(levels) is True
    assert rm.is_valid_setup(levels, min_rr=settings.min_risk_reward) is True


def test_valid_setup_rejects_above_actual_rr(rm, uptrend_df):
    levels = rm.calculate(uptrend_df, "LONG")
    # RR is 2.0; demanding 2.5 must reject.
    assert rm.is_valid_setup(levels, min_rr=2.5) is False


# --- LONG vs SHORT sign correctness ----------------------------------------

def test_long_levels_ordering(rm, uptrend_df):
    lv = rm.calculate(uptrend_df, "LONG")
    # LONG: stop below entry, targets above entry, increasing.
    assert lv.stop_loss < lv.entry_price < lv.tp1 < lv.tp2 < lv.tp3


def test_short_levels_ordering(rm, downtrend_df):
    lv = rm.calculate(downtrend_df, "SHORT")
    # SHORT: stop above entry, targets below entry, decreasing.
    assert lv.tp3 < lv.tp2 < lv.tp1 < lv.entry_price < lv.stop_loss


def test_short_risk_reward_also_two(rm, downtrend_df):
    lv = rm.calculate(downtrend_df, "SHORT")
    assert lv.risk_reward == pytest.approx(2.0, abs=1e-9)


# --- position sizing respects 1% portfolio risk ----------------------------

def test_position_size_respects_portfolio_risk(rm, uptrend_df):
    portfolio = 100_000.0
    lv = rm.calculate(uptrend_df, "LONG", portfolio_value=portfolio)

    risk_per_share = abs(lv.entry_price - lv.stop_loss)
    # Dollar risk = shares * risk_per_share; shares = pct*portfolio/entry.
    shares = lv.position_size_pct * portfolio / lv.entry_price
    dollar_risk = shares * risk_per_share
    max_risk = portfolio * settings.portfolio_risk_pct  # 1%

    # Allow rounding slack from the 4-dp rounding inside calculate().
    assert dollar_risk == pytest.approx(max_risk, rel=1e-3)


def test_position_size_pct_scale_invariant(rm, uptrend_df):
    """position_size_pct is a fraction -> independent of absolute portfolio value."""
    a = rm.calculate(uptrend_df, "LONG", portfolio_value=100_000)
    b = rm.calculate(uptrend_df, "LONG", portfolio_value=1_000_000)
    assert a.position_size_pct == pytest.approx(b.position_size_pct, rel=1e-3)


def test_atr_value_positive(rm, uptrend_df):
    lv = rm.calculate(uptrend_df, "LONG")
    assert lv.atr_value > 0


# --- determinism ------------------------------------------------------------

def test_determinism_same_df_same_levels(rm, uptrend_df):
    a = rm.calculate(uptrend_df, "LONG")
    b = rm.calculate(uptrend_df, "LONG")
    assert a == b  # dataclass equality across every field


def test_all_levels_finite(rm, volatile_df):
    lv = rm.calculate(volatile_df, "LONG")
    for v in (lv.entry_price, lv.stop_loss, lv.tp1, lv.tp2, lv.tp3,
              lv.risk_reward, lv.atr_value, lv.position_size_pct):
        assert math.isfinite(v)
