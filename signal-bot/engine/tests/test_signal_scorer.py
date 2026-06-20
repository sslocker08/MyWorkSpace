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
    # BULL + LONG (trend strategies) in safe zone.
    # CHANGED BY DESIGN: the regime factor moved out of ceiling_adjustment into
    # its own auditable regime_adjustment field. In the safe zone the ceiling
    # multiplier for LONG is 1.0, and the BULL trend+LONG regime factor is 1.10
    # (was previously folded into ceiling_adjustment as 1.1). The *effective*
    # product (1.0 * 1.10) is unchanged — the BULL+LONG x1.10 behavior is
    # preserved, only its bookkeeping is now split for auditability.
    sb = _score(scorer, uptrend_df, "LONG", ceiling=30.0, regime="BULL")
    assert sb.ceiling_adjustment == pytest.approx(1.0, abs=1e-6)
    assert sb.regime_adjustment == pytest.approx(1.10, abs=1e-6)
    # Effective combined multiplier is still 1.10, preserving legacy behavior.
    assert sb.ceiling_adjustment * sb.regime_adjustment == pytest.approx(1.10, abs=1e-6)


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


# ---------------------------------------------------------------------------
# Regime-aware scoring (regime x category x direction).
# ---------------------------------------------------------------------------

TREND_LONG = ["momentum_long", "breakout_long"]      # 2 trend, 0 reversion
TREND_SHORT = ["momentum_short", "breakout_short"]   # 2 trend, 0 reversion
REVERSION = ["reversal_long", "rsi_divergence"]       # 0 trend, 2 reversion


def _rscore(scorer, df, direction, strategies, regime, ceiling=30.0):
    """Score in the safe ceiling zone (ceiling<40 -> ceiling mult 1.0 for LONG)
    so the regime_adjustment is the only varying factor under inspection."""
    return scorer.score(
        ticker="TEST",
        df=df,
        direction=direction,
        triggered_strategies=strategies,
        strategy_confidences={s: 0.7 for s in strategies},
        risk_reward=2.0,
        ceiling_score=ceiling,
        sentiment_score=0.5,
        regime=regime,
    )


@pytest.mark.parametrize(
    "regime,strategies,direction,expected",
    [
        # BULL: trend WITH uptrend rewarded, AGAINST penalized, reversion weaker.
        ("BULL", TREND_LONG, "LONG", 1.10),
        ("BULL", TREND_SHORT, "SHORT", 0.85),
        ("BULL", REVERSION, "LONG", 0.95),
        ("BULL", REVERSION, "SHORT", 0.95),
        # BEAR: mirror of BULL.
        ("BEAR", TREND_SHORT, "SHORT", 1.10),
        ("BEAR", TREND_LONG, "LONG", 0.85),
        ("BEAR", REVERSION, "SHORT", 0.95),
        # NEUTRAL: favor reversion, discount trend.
        ("NEUTRAL", TREND_LONG, "LONG", 0.90),
        ("NEUTRAL", REVERSION, "LONG", 1.10),
        ("NEUTRAL", REVERSION, "SHORT", 1.10),
        # HIGH_VOL: defensive, BOTH directions.
        ("HIGH_VOL", TREND_LONG, "LONG", 0.80),
        ("HIGH_VOL", TREND_SHORT, "SHORT", 0.80),
        ("HIGH_VOL", REVERSION, "LONG", 0.95),
        ("HIGH_VOL", REVERSION, "SHORT", 0.95),
    ],
)
def test_regime_multiplier_matrix(scorer, uptrend_df, regime, strategies, direction, expected):
    sb = _rscore(scorer, uptrend_df, direction, strategies, regime)
    assert sb.regime_adjustment == pytest.approx(expected, abs=1e-6)


def test_high_vol_lowers_trend_long_vs_bull(scorer, uptrend_df):
    """HIGH_VOL must lower a trend-LONG score relative to the same setup in BULL."""
    bull = _rscore(scorer, uptrend_df, "LONG", TREND_LONG, "BULL")
    high_vol = _rscore(scorer, uptrend_df, "LONG", TREND_LONG, "HIGH_VOL")
    assert high_vol.regime_adjustment < bull.regime_adjustment
    assert high_vol.total < bull.total


def test_neutral_raises_reversion_vs_trend(scorer, uptrend_df):
    """NEUTRAL must raise a mean-reversion score relative to a trend score."""
    reversion = _rscore(scorer, uptrend_df, "LONG", REVERSION, "NEUTRAL")
    trend = _rscore(scorer, uptrend_df, "LONG", TREND_LONG, "NEUTRAL")
    assert reversion.regime_adjustment > trend.regime_adjustment
    assert reversion.total > trend.total


def test_regime_changes_total_vs_inert_baseline(scorer, uptrend_df):
    """HIGH_VOL and NEUTRAL must actually MOVE the total (no longer inert) vs an
    unknown regime that is a no-op (x1.0)."""
    baseline = _rscore(scorer, uptrend_df, "LONG", TREND_LONG, "UNKNOWN_REGIME")
    assert baseline.regime_adjustment == pytest.approx(1.0, abs=1e-6)

    high_vol = _rscore(scorer, uptrend_df, "LONG", TREND_LONG, "HIGH_VOL")
    neutral_rev = _rscore(scorer, uptrend_df, "LONG", REVERSION, "NEUTRAL")
    assert high_vol.total != baseline.total      # HIGH_VOL is no longer inert
    assert neutral_rev.total != baseline.total   # NEUTRAL is no longer inert


def test_unknown_regime_is_noop(scorer, uptrend_df):
    for regime in ("", "FOO", "bull", None.__class__.__name__):
        sb = _rscore(scorer, uptrend_df, "LONG", TREND_LONG, regime)
        assert sb.regime_adjustment == pytest.approx(1.0, abs=1e-6)


def test_dominant_category_tie_breaks_to_trend(scorer, uptrend_df):
    """Equal trend/reversion counts -> treated as trend (NEUTRAL: trend x0.90)."""
    tied = ["momentum_long", "reversal_long"]  # 1 trend, 1 reversion
    sb = _rscore(scorer, uptrend_df, "LONG", tied, "NEUTRAL")
    assert sb.regime_adjustment == pytest.approx(0.90, abs=1e-6)  # trend branch
    # Empty list is also a tie -> trend.
    sb_empty = _rscore(scorer, uptrend_df, "LONG", [], "NEUTRAL")
    assert sb_empty.regime_adjustment == pytest.approx(0.90, abs=1e-6)


def test_dominant_category_majority(scorer, uptrend_df):
    """Strict reversion majority -> reversion branch (NEUTRAL: x1.10)."""
    rev_majority = ["reversal_long", "rsi_divergence", "momentum_long"]  # 2 rev, 1 trend
    sb = _rscore(scorer, uptrend_df, "LONG", rev_majority, "NEUTRAL")
    assert sb.regime_adjustment == pytest.approx(1.10, abs=1e-6)


def test_bounded_at_extremes(scorer, uptrend_df):
    """Highest multiplier x high raw clamps to <=100; lowest stays >=0."""
    # Highest combined: ceiling SHORT>70 (1.3) x BEAR trend+SHORT (1.10) = 1.43.
    hi = scorer.score(
        ticker="TEST", df=uptrend_df, direction="SHORT",
        triggered_strategies=TREND_SHORT,
        strategy_confidences={s: 1.0 for s in TREND_SHORT},
        risk_reward=5.0, ceiling_score=90.0, sentiment_score=-1.0, regime="BEAR",
    )
    assert 0.0 <= hi.total <= 100.0
    # Lowest combined: ceiling LONG>70 (0.5) x HIGH_VOL trend (0.80) = 0.40.
    lo = scorer.score(
        ticker="TEST", df=uptrend_df, direction="LONG",
        triggered_strategies=[],
        strategy_confidences={},
        risk_reward=1.0, ceiling_score=90.0, sentiment_score=0.0, regime="HIGH_VOL",
    )
    assert lo.total >= 0.0


def test_regime_determinism(scorer, uptrend_df):
    a = _rscore(scorer, uptrend_df, "LONG", TREND_LONG, "HIGH_VOL")
    b = _rscore(scorer, uptrend_df, "LONG", TREND_LONG, "HIGH_VOL")
    assert a == b


# ---------------------------------------------------------------------------
# Degraded ceiling neutralization. A thin/unreliable ceiling (a <4-axis
# composite, or a failed feed) MUST NOT drive the >70 LONG penalty / SHORT boost.
# When ceiling_degraded=True the ceiling multiplier is NEUTRAL 1.0 regardless of
# the numeric ceiling_score, so a missing/low-confidence feed never penalizes a
# LONG nor boosts a SHORT. The regime multiplier is unaffected.
# ---------------------------------------------------------------------------

def _dscore(scorer, df, direction, ceiling, degraded, regime="NEUTRAL"):
    return scorer.score(
        ticker="TEST",
        df=df,
        direction=direction,
        triggered_strategies=["momentum_long", "ema_crossover"],
        strategy_confidences={"momentum_long": 0.8, "ema_crossover": 0.7},
        risk_reward=2.0,
        ceiling_score=ceiling,
        ceiling_degraded=degraded,
        sentiment_score=0.5,
        regime=regime,
    )


def test_degraded_high_ceiling_does_not_penalize_long(scorer, uptrend_df):
    """ceiling_degraded=True at a high ceiling (90) must NEUTRALIZE the LONG
    penalty: ceiling_adjustment==1.0 and the total is UNPENALIZED vs the same
    high ceiling WITHOUT degrade (which IS halved)."""
    degraded = _dscore(scorer, uptrend_df, "LONG", ceiling=90.0, degraded=True)
    penalized = _dscore(scorer, uptrend_df, "LONG", ceiling=90.0, degraded=False)

    assert degraded.ceiling_adjustment == pytest.approx(1.0, abs=1e-6)
    assert penalized.ceiling_adjustment == pytest.approx(0.5, abs=1e-6)  # >70 LONG penalty
    # Degraded LONG must NOT be halved -> strictly higher than the penalized one.
    assert degraded.total > penalized.total
    # And it must equal the unpenalized (safe-zone, mult 1.0) LONG with same regime.
    safe = _dscore(scorer, uptrend_df, "LONG", ceiling=30.0, degraded=False)
    assert degraded.total == pytest.approx(safe.total, abs=1e-6)


def test_degraded_low_ceiling_no_short_change(scorer, uptrend_df):
    """ceiling_degraded=True with a low ceiling (20) must also be NEUTRAL 1.0 on
    the SHORT side: no SHORT boost/cut from the ceiling either. Non-degraded at
    ceiling 20 (<40) gives SHORT a 0.9 multiplier; degraded must be 1.0."""
    degraded = _dscore(scorer, uptrend_df, "SHORT", ceiling=20.0, degraded=True)
    non_degraded = _dscore(scorer, uptrend_df, "SHORT", ceiling=20.0, degraded=False)

    assert degraded.ceiling_adjustment == pytest.approx(1.0, abs=1e-6)
    assert non_degraded.ceiling_adjustment == pytest.approx(0.9, abs=1e-6)  # <40 SHORT cut
    # Neutral 1.0 > 0.9 cut -> degraded SHORT scores strictly higher.
    assert degraded.total > non_degraded.total


def test_degraded_high_ceiling_no_short_boost(scorer, uptrend_df):
    """A degraded high ceiling must NOT boost a SHORT either (no >70 x1.3)."""
    degraded = _dscore(scorer, uptrend_df, "SHORT", ceiling=90.0, degraded=True)
    boosted = _dscore(scorer, uptrend_df, "SHORT", ceiling=90.0, degraded=False)

    assert degraded.ceiling_adjustment == pytest.approx(1.0, abs=1e-6)
    assert boosted.ceiling_adjustment == pytest.approx(1.3, abs=1e-6)  # >70 SHORT boost
    assert degraded.total < boosted.total  # no boost -> strictly lower


def test_degraded_default_is_false_unchanged(scorer, uptrend_df):
    """Omitting ceiling_degraded (default False) must reproduce the legacy path
    byte-for-byte: identical ScoreBreakdown to an explicit degraded=False."""
    implicit = _score(scorer, uptrend_df, "LONG", ceiling=90.0)  # no degraded kwarg
    explicit = _dscore(scorer, uptrend_df, "LONG", ceiling=90.0, degraded=False)
    assert implicit == explicit
    assert implicit.ceiling_adjustment == pytest.approx(0.5, abs=1e-6)


def test_degraded_leaves_regime_multiplier_untouched(scorer, uptrend_df):
    """Neutralizing the ceiling must NOT touch the regime multiplier: a BULL
    trend+LONG still earns its 1.10 regime_adjustment even when degraded."""
    sb = _dscore(scorer, uptrend_df, "LONG", ceiling=90.0, degraded=True, regime="BULL")
    assert sb.ceiling_adjustment == pytest.approx(1.0, abs=1e-6)
    assert sb.regime_adjustment == pytest.approx(1.10, abs=1e-6)
