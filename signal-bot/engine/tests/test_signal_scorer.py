"""SignalScorer correctness — bounds, the ceiling multiplier, and determinism.

The ceiling multiplier is regime-risk insurance: near a market top (ceiling>70) a
LONG score is HALVED and a SHORT is BOOSTED (x1.3). If that inverts or drifts, the
engine would lean long into a top. These tests pin the multiplier behavior and the
0..100 clamp.
"""
import pytest

from core.signal_scorer import SignalScorer, ScoreBreakdown


@pytest.fixture
def scorer():
    return SignalScorer()


def _score(scorer, df, direction, ceiling, regime="NEUTRAL"):
    return scorer.score(
        ticker="TEST",
        df=df,
        direction=direction,
        triggered_strategies=["momentum_long", "ema_crossover"],
        strategy_confidences={"momentum_long": 0.8, "ema_crossover": 0.7},
        risk_reward=2.0,
        ceiling_score=ceiling,
        sentiment_score=0.5,
        regime=regime,
    )


def test_total_bounded(scorer, uptrend_df):
    for direction in ("LONG", "SHORT"):
        for ceiling in (10.0, 50.0, 90.0):
            sb = _score(scorer, uptrend_df, direction, ceiling)
            assert isinstance(sb, ScoreBreakdown)
            assert 0.0 <= sb.total <= 100.0


def test_ceiling_high_halves_long_boosts_short(scorer, uptrend_df):
    long_top = _score(scorer, uptrend_df, "LONG", ceiling=80.0)
    long_safe = _score(scorer, uptrend_df, "LONG", ceiling=10.0)
    short_top = _score(scorer, uptrend_df, "SHORT", ceiling=80.0)

    # >70 ceiling -> LONG multiplier 0.5, SHORT multiplier 1.3.
    assert long_top.ceiling_adjustment == pytest.approx(0.5, abs=1e-6)
    assert short_top.ceiling_adjustment == pytest.approx(1.3, abs=1e-6)
    # A topped LONG must score strictly worse than a safe-regime LONG.
    assert long_top.total < long_safe.total


def test_ceiling_low_leaves_long_at_one(scorer, uptrend_df):
    sb = _score(scorer, uptrend_df, "LONG", ceiling=30.0)  # <40 safe zone
    assert sb.ceiling_adjustment == pytest.approx(1.0, abs=1e-6)


def test_ceiling_mid_long_three_quarters(scorer, uptrend_df):
    sb = _score(scorer, uptrend_df, "LONG", ceiling=50.0)  # >40, <=70
    assert sb.ceiling_adjustment == pytest.approx(0.75, abs=1e-6)


def test_regime_bonus_compounds(scorer, uptrend_df):
    # BULL + LONG in safe zone: 1.0 * 1.1
    sb = _score(scorer, uptrend_df, "LONG", ceiling=30.0, regime="BULL")
    assert sb.ceiling_adjustment == pytest.approx(1.1, abs=1e-6)


def test_determinism(scorer, uptrend_df):
    a = _score(scorer, uptrend_df, "LONG", ceiling=50.0)
    b = _score(scorer, uptrend_df, "LONG", ceiling=50.0)
    assert a == b


def test_no_strategies_low_score(scorer, uptrend_df):
    sb = scorer.score(
        ticker="TEST",
        df=uptrend_df,
        direction="LONG",
        triggered_strategies=[],
        strategy_confidences={},
        risk_reward=1.0,
        ceiling_score=50.0,
        sentiment_score=0.0,
    )
    assert sb.strategy_hits == 0.0
    assert 0.0 <= sb.total <= 100.0
