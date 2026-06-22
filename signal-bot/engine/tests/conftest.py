"""Deterministic synthetic OHLCV golden fixtures.

WHY deterministic — and the contract for TRIGGER-CRITICAL fixtures
=================================================================
This is money logic. A strategy that silently stops firing (or starts
false-firing) must surface as a HARD test failure, not as flaky noise. So every
fixture is built without any wall-clock / now() input, and the DatetimeIndex is a
fixed ascending business-day range anchored to a constant date.

There are two CLASSES of fixture, with different determinism guarantees:

1. TRIGGER-CRITICAL fixtures — the ones whose final bar decides whether a
   strategy's `triggers` test passes (momentum_short_df, momentum_long via
   uptrend_df, breakout/breakdown, golden/death cross, oversold/overbought, and
   the reversal selectivity near-miss fixtures). Their price/volume PATH IS BUILT
   ANALYTICALLY — explicit constant segments, linear/exponential ramps, and
   low-amplitude *sinusoid* "noise" (`np.sin`), NEVER `np.random`. The reason is
   reproducibility ACROSS numpy major versions: `numpy.random.default_rng(seed)`
   produces a DIFFERENT bit-stream across numpy releases, so the exact final-bar
   RSI / volume_ratio / EMA values drift and version-sensitive trigger tests
   break in a newer environment (this is exactly what the adversarial review hit
   on numpy 2.x). Analytic paths have no such dependency: `np.cumprod(1+rets)`,
   `np.full`, and `np.sin` are byte-stable functions of their inputs on every
   numpy version. Each builder is tuned so the gating indicator at iloc[-1] lands
   COMFORTABLY MID-BAND (not on a cliff), so small numerical differences cannot
   flip the trigger.

   CONTRACT for trigger-critical fixtures: do NOT introduce `default_rng` (or any
   RNG) into the bars that determine whether the trigger fires. Deterministic
   "noise" is allowed ONLY as a fixed explicit array or a low-amplitude sinusoid.

2. NON-TRIGGER fixtures — flat_df / long_series_df / volatile_df are used only to
   prove a strategy does NOT fire, or to sanity-check indicator bounds. Exact
   final-bar values are irrelevant there, so for variety these MAY still use a
   seeded RNG (a flat wobble that never satisfies any gate on any numpy version).
   Determinism here means "no trigger on any version", which a seeded mean-
   reverting wobble satisfies structurally.

`requirements.txt` additionally PINS numpy/pandas to stable ranges as a defense-
in-depth backstop, but Fix 1 (analytic trigger fixtures) is the real solution:
the trigger tests would hold even if those pins were removed.
"""
import numpy as np
import pandas as pd
import pytest

# Constant anchor — NEVER datetime.now(). Keeps the index (and thus any
# index-derived behavior) byte-stable across runs and machines.
ANCHOR = pd.Timestamp("2020-01-01")


def _index(n: int) -> pd.DatetimeIndex:
    return pd.date_range(start=ANCHOR, periods=n, freq="B")


def _ohlcv_analytic(close: np.ndarray, volume: np.ndarray, wick: float = 0.004) -> pd.DataFrame:
    """Build a valid OHLCV frame from an analytic close path — NO RNG.

    This is the builder for TRIGGER-CRITICAL fixtures (see module docstring). The
    wick is a FIXED fraction (not random), so high/low are a deterministic
    function of the close path on every numpy version:

        open  = previous close (first bar opens at its own close)
        high  = max(open, close) * (1 + wick)
        low   = min(open, close) * (1 - wick)

    which guarantees high >= max(open, close) and low <= min(open, close) so
    TA-Lib's ATR/ADX always receive valid bars.
    """
    close = np.asarray(close, dtype=float)
    n = len(close)
    open_ = np.empty(n)
    open_[0] = close[0]
    open_[1:] = close[:-1]

    base_hi = np.maximum(open_, close)
    base_lo = np.minimum(open_, close)
    high = base_hi * (1.0 + wick)
    low = base_lo * (1.0 - wick)

    return pd.DataFrame(
        {
            "open": open_,
            "high": high,
            "low": low,
            "close": close,
            "volume": np.asarray(volume, dtype=float),
        },
        index=_index(n),
    )


def _ohlcv_from_close(
    close: np.ndarray,
    volume: np.ndarray,
    rng: np.random.Generator,
    wick: float = 0.004,
) -> pd.DataFrame:
    """Build a valid OHLCV frame from a close path, with a seeded-RNG wick.

    Used ONLY by NON-TRIGGER fixtures (flat / long-flat / volatile), where exact
    final-bar values do not matter — only that no trigger fires. The wick is a
    small deterministic-per-seed jitter; it never affects whether a gate is met.
    """
    n = len(close)
    open_ = np.empty(n)
    open_[0] = close[0]
    open_[1:] = close[:-1]

    base_hi = np.maximum(open_, close)
    base_lo = np.minimum(open_, close)
    hi_wick = base_hi * (1.0 + (wick + rng.random(n) * wick))
    lo_wick = base_lo * (1.0 - (wick + rng.random(n) * wick))

    high = np.maximum(base_hi, hi_wick)
    low = np.minimum(base_lo, lo_wick)

    return pd.DataFrame(
        {
            "open": open_,
            "high": high,
            "low": low,
            "close": close,
            "volume": volume.astype(float),
        },
        index=_index(n),
    )


# ---------------------------------------------------------------------------
# TRIGGER-CRITICAL fixtures (analytic, RNG-free)
# ---------------------------------------------------------------------------

@pytest.fixture
def uptrend_df() -> pd.DataFrame:
    """momentum_long trigger fixture — analytic.

    Sustained moderate uptrend, then a mild pullback, so the final-bar RSI falls
    from "pinned near 100" back into the 60-75 band while close > EMA20 > EMA50
    and MACD stays positive. Mirror of momentum_short_df.

    Verified final bar: RSI ~= 62.5, stack up, MACD > 0, vol_ratio ~= 1.46.
    """
    n = 90
    len_b = 12      # pullback segment
    len_c = 4       # final easing segment
    len_a = n - len_b - len_c
    seg_a = np.full(len_a, 0.006) + 0.0004 * np.sin(np.arange(len_a) / 3.0)
    seg_b = np.full(len_b, -0.0025)   # pullback pulls RSI down off the ceiling
    seg_c = np.full(len_c, 0.0005)    # gentle resume keeps stack up & MACD > 0
    rets = np.concatenate([seg_a, seg_b, seg_c])
    close = 100.0 * np.cumprod(1.0 + rets)
    volume = np.full(n, 1_000_000.0)
    volume[-1] = 1_500_000.0          # final-bar uptick -> vol_ratio >= 1.0
    return _ohlcv_analytic(close, volume)


@pytest.fixture
def momentum_short_df() -> pd.DataFrame:
    """momentum_short trigger fixture — analytic. (Dedicated; NOT downtrend_df.)

    A MODERATE downtrend that recently flattened/bounced slightly. A clean steady
    downtrend pins RSI in single digits (RSI ~ 0.4 on the old downtrend_df, far
    below the 25 floor); this path instead declines, then bounces gently for ~12
    bars, then drifts flat for a few bars, so RSI lifts off single digits into the
    25-40 band while close < EMA20 < EMA50 (stack still down) and MACD < 0.

    Verified final bar: RSI ~= 34.0 (mid-band), stack down, MACD ~= -0.91,
    vol_ratio ~= 1.46 (final-bar volume uptick). Mirror of uptrend_df.
    """
    n = 90
    len_b = 12      # gentle bounce lifts RSI off the floor
    len_c = 4       # final near-flat keeps close just under EMA20
    len_a = n - len_b - len_c
    seg_a = np.full(len_a, -0.006) + 0.0004 * np.sin(np.arange(len_a) / 3.0)
    seg_b = np.full(len_b, 0.0025)    # bounce -> RSI rises into 25-40
    seg_c = np.full(len_c, -0.0005)   # final easing keeps the EMA stack down
    rets = np.concatenate([seg_a, seg_b, seg_c])
    close = 100.0 * np.cumprod(1.0 + rets)
    volume = np.full(n, 1_000_000.0)
    volume[-1] = 1_500_000.0          # final-bar volume uptick -> vol_ratio >= 1.0
    return _ohlcv_analytic(close, volume)


@pytest.fixture
def downtrend_df() -> pd.DataFrame:
    """Clean steady downtrend — used as a NEGATIVE case (momentum_long /
    reversal_short must NOT fire). Analytic so it is version-stable.

    NOTE: this is intentionally a clean downtrend; its final-bar RSI sits in
    single digits, so it does NOT satisfy momentum_short's 25-40 band. That is
    why momentum_short has its own dedicated momentum_short_df.
    """
    n = 80
    rets = np.full(n, -0.003) + 0.0006 * np.sin(np.arange(n) / 4.0)
    close = 100.0 * np.cumprod(1.0 + rets)
    volume = np.full(n, 1_000_000.0)
    return _ohlcv_analytic(close, volume)


@pytest.fixture
def golden_cross_df() -> pd.DataFrame:
    """ema_crossover trigger fixture (LONG) — analytic.

    Down for 50 bars then up for 10 bars, tuned so EMA9 crosses ABOVE EMA21
    exactly on the LAST bar, with a final-bar volume surge so vol_ratio >= 1.3.

    Verified: golden cross on iloc[-1] (margin > 0.12 each side), vol_ratio ~1.9.
    """
    n_down, n_up = 50, 10
    rets = np.concatenate([np.full(n_down, -0.004), np.full(n_up, 0.006)])
    close = 100.0 * np.cumprod(1.0 + rets)
    n = n_down + n_up
    volume = np.full(n, 1_000_000.0)
    volume[-1] = 2_000_000.0
    return _ohlcv_analytic(close, volume)


@pytest.fixture
def death_cross_df() -> pd.DataFrame:
    """ema_crossover trigger fixture (SHORT) — analytic. Mirror of golden_cross_df.

    Up for 50 bars then down for 10 bars so EMA9 crosses BELOW EMA21 exactly on
    the LAST bar, with a final-bar volume surge so vol_ratio >= 1.3.
    """
    n_up, n_down = 50, 10
    rets = np.concatenate([np.full(n_up, 0.004), np.full(n_down, -0.006)])
    close = 100.0 * np.cumprod(1.0 + rets)
    n = n_up + n_down
    volume = np.full(n, 1_000_000.0)
    volume[-1] = 2_000_000.0
    return _ohlcv_analytic(close, volume)


@pytest.fixture
def breakout_df() -> pd.DataFrame:
    """breakout_long trigger fixture — analytic. >=260 bars.

    Steady ~0.25%/bar climb (with a small sinusoid wobble for valid ADX bars) so
    the last close is a fresh 252-day high, a confirmed ADX uptrend (+DI > -DI,
    ADX > 25), and a >=2x volume surge on the final bar.

    Verified final bar: pct_of_52w_high ~= 0.997, ADX > 25 with +DI > -DI,
    vol_ratio ~= 2.7.
    """
    n = 300
    rets = np.full(n, 0.0025) + 0.0006 * np.sin(np.arange(n) / 5.0)
    close = 50.0 * np.cumprod(1.0 + rets)
    volume = np.full(n, 1_000_000.0)
    volume[-1] = 3_000_000.0          # >=2x average -> volume_surge
    return _ohlcv_analytic(close, volume, wick=0.003)


@pytest.fixture
def breakdown_df() -> pd.DataFrame:
    """breakout_short trigger fixture — analytic. Mirror of breakout_df. >=260 bars.

    Steady ~-0.25%/bar decline so the last close is a fresh 252-day low, a
    confirmed ADX downtrend (-DI > +DI, ADX > 25), and a >=2x volume surge on the
    final bar.

    Verified final bar: pct_of_52w_low ~= 1.003, ADX > 25 with -DI > +DI,
    vol_ratio ~= 2.7.
    """
    n = 300
    rets = np.full(n, -0.0025) + 0.0006 * np.sin(np.arange(n) / 5.0)
    close = 200.0 * np.cumprod(1.0 + rets)
    volume = np.full(n, 1_000_000.0)
    volume[-1] = 3_000_000.0          # >=2x average -> volume_surge
    return _ohlcv_analytic(close, volume, wick=0.003)


@pytest.fixture
def oversold_df() -> pd.DataFrame:
    """reversal_long trigger fixture — analytic. RSI < 30 AND close <= lower BB.

    A quiet base (tight Bollinger band), then a steep accelerating drop to slam
    RSI deep oversold and push close below the 2-std lower band.

    Verified final bar: RSI ~1.5 (< 30) and close <= lower BB -> fires LONG.
    """
    n = 60
    base = 100.0 + 0.5 * np.sin(np.arange(50) / 4.0)
    cliff = base[-1] * np.cumprod(1.0 + np.full(10, -0.025))
    close = np.concatenate([base, cliff])
    volume = np.full(n, 1_000_000.0)
    return _ohlcv_analytic(close, volume, wick=0.0015)


@pytest.fixture
def overbought_df() -> pd.DataFrame:
    """reversal_short trigger fixture — analytic. Mirror of oversold_df.

    A quiet base then a steep accelerating climb -> RSI > 70 AND close >= upper BB.

    Verified final bar: RSI ~98.8 (> 70) and close >= upper BB -> fires SHORT.
    """
    n = 60
    base = 100.0 + 0.5 * np.sin(np.arange(50) / 4.0)
    cliff = base[-1] * np.cumprod(1.0 + np.full(10, 0.025))
    close = np.concatenate([base, cliff])
    volume = np.full(n, 1_000_000.0)
    return _ohlcv_analytic(close, volume, wick=0.0015)


# ---------------------------------------------------------------------------
# Reversal SELECTIVITY near-miss fixtures (analytic) — prove the strategies do
# NOT fire when conditions are CLOSE but not met (Fix 3). RSI lands just on the
# safe side of the threshold AND close lands just inside the band, so BOTH gates
# narrowly fail.
# ---------------------------------------------------------------------------

@pytest.fixture
def near_oversold_df() -> pd.DataFrame:
    """reversal_long near-miss — must NOT fire.

    A moderate decline then a final UP bounce that lifts RSI just ABOVE 30 and
    lifts close back just ABOVE the lower band.

    Verified final bar: RSI ~= 32.6 (> 30) and close ~= 87.2 > lowerBB ~= 80.5,
    so neither gate is met -> reversal_long does NOT fire.
    """
    base = 100.0 + 0.5 * np.sin(np.arange(45) / 4.0)
    drop = base[-1] * np.cumprod(1.0 + np.full(11, -0.018))
    last = drop[-1] * (1.0 + 0.07)   # final bounce -> RSI back above 30, off band
    close = np.concatenate([base, drop, [last]])
    volume = np.full(len(close), 1_000_000.0)
    return _ohlcv_analytic(close, volume, wick=0.0015)


@pytest.fixture
def near_overbought_df() -> pd.DataFrame:
    """reversal_short near-miss — must NOT fire. Mirror of near_oversold_df.

    A moderate rally then a final DOWN tick that pulls RSI just BELOW 70 and pulls
    close back just BELOW the upper band.

    Verified final bar: RSI ~= 69.5 (< 70) and close ~= 115.0 < upperBB ~= 121.4,
    so neither gate is met -> reversal_short does NOT fire.
    """
    base = 100.0 + 0.5 * np.sin(np.arange(45) / 4.0)
    rise = base[-1] * np.cumprod(1.0 + np.full(11, 0.018))
    last = rise[-1] * (1.0 - 0.05)   # final dip -> RSI back below 70, off band
    close = np.concatenate([base, rise, [last]])
    volume = np.full(len(close), 1_000_000.0)
    return _ohlcv_analytic(close, volume, wick=0.0015)


# ---------------------------------------------------------------------------
# MULTI-TRADE backtest fixtures (analytic) — trigger MANY times so the backtest
# opens >=3 positions, de-vacuuming the bounded-stats tests (Fix 2).
# ---------------------------------------------------------------------------

@pytest.fixture
def reversal_swings_df() -> pd.DataFrame:
    """Repeating sharp oversold/overbought swings for reversal back-testing.

    Cycles of: quiet flat (tightens the Bollinger band) -> sharp drop (RSI<30 +
    below lower band) -> quiet flat -> sharp rise (RSI>70 + above upper band).
    Each leg is steep enough to breach the (now-tight) band, so BOTH reversal_long
    and reversal_short trigger MANY times across the series.

    Verified: reversal_long opens ~10 trades, reversal_short ~9 trades.
    """
    cycles, flat, leg = 6, 10, 6
    segs = []
    for _ in range(cycles):
        segs.append(np.zeros(flat))            # quiet -> tightens BB
        segs.append(np.full(leg, -0.03))       # sharp drop -> oversold
        segs.append(np.full(flat, 0.0))        # quiet
        segs.append(np.full(leg, 0.03))        # sharp rise -> overbought
    rets = np.concatenate(segs)
    close = 100.0 * np.cumprod(1.0 + rets)
    volume = np.full(len(rets), 1_000_000.0)
    return _ohlcv_analytic(close, volume, wick=0.002)


@pytest.fixture
def momentum_short_series_df() -> pd.DataFrame:
    """Repeating decline+bounce sawtooth on a declining baseline for momentum_short
    back-testing. The downtrend keeps EMA20<EMA50 and MACD<0 throughout while
    periodic mild bounces re-enter the RSI 25-40 band, so momentum_short triggers
    MANY times across the series.

    Verified: momentum_short opens ~7 trades.
    """
    n = 240
    period = 30
    t = np.arange(n)
    decline = -0.0015 * t
    osc = 0.04 * np.arcsin(np.sin(2 * np.pi * t / period)) * (2 / np.pi)
    close = 100.0 * np.exp(decline) * (1.0 + osc)
    volume = np.full(n, 1_000_000.0)
    volume[::period] = 1_400_000.0   # periodic volume upticks -> vol_ratio >= 1.0
    return _ohlcv_analytic(close, volume, wick=0.003)


@pytest.fixture
def breakdown_series_df() -> pd.DataFrame:
    """Steady decline making continual fresh 52w lows, with volume spikes spaced
    > hold_bars (10) apart after the 260-bar warmup, so breakout_short triggers
    MULTIPLE times across the series for back-testing.

    Verified: breakout_short opens ~4 trades.
    """
    n = 320
    rets = np.full(n, -0.004) + 0.0006 * np.sin(np.arange(n) / 5.0)
    close = 200.0 * np.cumprod(1.0 + rets)
    volume = np.full(n, 1_000_000.0)
    for i in range(265, n, 15):       # spikes spaced 15 bars > hold_bars=10
        volume[i] = 3_000_000.0
    return _ohlcv_analytic(close, volume, wick=0.003)


# ---------------------------------------------------------------------------
# BATCH 5 — TRIGGER-CRITICAL fixtures for the new bidirectional strategies
# (macd_signal / bollinger_squeeze / adx_trend / volume_surge / rsi_divergence).
# All analytic / RNG-free; each final-bar gating value is tuned to land
# COMFORTABLY mid-band (verified numbers in each docstring) so numerical drift
# across numpy/TA-Lib versions cannot flip the trigger.
# ---------------------------------------------------------------------------

@pytest.fixture
def macd_bull_cross_df() -> pd.DataFrame:
    """macd_signal LONG trigger — analytic.

    An ACCELERATING decline (keeps MACD line genuinely below the signal line, i.e.
    histogram negative) for 50 bars, then a sharp 3-bar up-leg so the MACD line
    crosses ABOVE the signal line EXACTLY on the final bar. (A constant-rate
    decline flips the histogram positive right at the inflection, so we use an
    accelerating decline to keep the cross real.)

    Verified final bar: prev (macd-signal) ~= -0.025, curr ~= +0.183 -> a clean
    bullish cross with comfortable margin on both sides. MACD ~= -3.9 (below zero,
    so this is a below-zero bullish cross -> direction LONG, no zero-line boost).
    """
    n_down, n_up = 50, 3
    down = -(0.001 + 0.0002 * np.arange(n_down))   # increasingly negative
    rets = np.concatenate([down, np.full(n_up, 0.012)])
    close = 100.0 * np.cumprod(1.0 + rets)
    volume = np.full(len(rets), 1_000_000.0)
    return _ohlcv_analytic(close, volume)


@pytest.fixture
def macd_bear_cross_df() -> pd.DataFrame:
    """macd_signal SHORT trigger — analytic. Mirror of macd_bull_cross_df.

    An ACCELERATING rally for 50 bars (MACD line above signal) then a sharp 3-bar
    down-leg so the MACD line crosses BELOW the signal line EXACTLY on the final
    bar.

    Verified final bar: prev (macd-signal) ~= +0.025, curr ~= -0.183 -> a clean
    bearish cross; MACD ~= +3.9 (above zero, below-zero confirm absent).
    """
    n_up, n_down = 50, 3
    up = (0.001 + 0.0002 * np.arange(n_up))        # increasingly positive
    rets = np.concatenate([up, np.full(n_down, -0.012)])
    close = 100.0 * np.cumprod(1.0 + rets)
    volume = np.full(len(rets), 1_000_000.0)
    return _ohlcv_analytic(close, volume)


@pytest.fixture
def squeeze_breakout_up_df() -> pd.DataFrame:
    """bollinger_squeeze LONG trigger — analytic.

    A long quiet coil (low-amplitude sinusoid -> contracting BB width near its
    20-bar low) for 60 bars, then a single sharp +6% close on the final bar that
    breaks ABOVE the upper band. The squeeze is read on the bar BEFORE the
    breakout (the breakout bar itself expands the bands).

    Verified final bar: prev_width ~ recent-min width (squeeze True) and
    close (~106) > upper band (~103) -> fires LONG.
    """
    flat = 0.0005 * np.sin(np.arange(60) / 2.0)
    rets = np.concatenate([flat, np.array([0.06])])
    close = 100.0 * np.cumprod(1.0 + rets)
    volume = np.full(len(rets), 1_000_000.0)
    return _ohlcv_analytic(close, volume, wick=0.001)


@pytest.fixture
def squeeze_breakout_down_df() -> pd.DataFrame:
    """bollinger_squeeze SHORT trigger — analytic. Mirror of squeeze_breakout_up_df.

    A long quiet coil for 60 bars then a single sharp -6% close on the final bar
    that breaks BELOW the lower band.

    Verified final bar: squeeze True and close (~94) < lower band (~97) -> SHORT.
    """
    flat = 0.0005 * np.sin(np.arange(60) / 2.0)
    rets = np.concatenate([flat, np.array([-0.06])])
    close = 100.0 * np.cumprod(1.0 + rets)
    volume = np.full(len(rets), 1_000_000.0)
    return _ohlcv_analytic(close, volume, wick=0.001)


@pytest.fixture
def adx_bull_cross_df() -> pd.DataFrame:
    """adx_trend LONG trigger — analytic.

    A strong 50-bar downtrend builds a high ADX with -DI dominant, then a 12-bar
    up-leg so +DI crosses ABOVE -DI EXACTLY on the final bar while ADX is still
    well above 30 and EMA20 has turned up.

    Verified final bar: ADX ~= 61.8 (comfortably > 30), +DI ~= 31.6 just above
    -DI ~= 27.8 (fresh cross), EMA rising -> fires LONG.
    """
    n_down, n_up = 50, 12
    rets = np.concatenate([np.full(n_down, -0.01), np.full(n_up, 0.009)])
    close = 100.0 * np.cumprod(1.0 + rets)
    volume = np.full(len(rets), 1_000_000.0)
    return _ohlcv_analytic(close, volume, wick=0.003)


@pytest.fixture
def adx_bear_cross_df() -> pd.DataFrame:
    """adx_trend SHORT trigger — analytic. Mirror of adx_bull_cross_df.

    A strong 50-bar uptrend builds a high ADX with +DI dominant, then an 11-bar
    down-leg so -DI crosses ABOVE +DI EXACTLY on the final bar while ADX is still
    well above 30 and EMA20 has turned down.

    Verified final bar: ADX ~= 63.1 (> 30), -DI ~= 31.4 just above +DI ~= 27.5
    (fresh cross), EMA falling -> fires SHORT.
    """
    n_up, n_down = 50, 11
    rets = np.concatenate([np.full(n_up, 0.01), np.full(n_down, -0.009)])
    close = 100.0 * np.cumprod(1.0 + rets)
    volume = np.full(len(rets), 1_000_000.0)
    return _ohlcv_analytic(close, volume, wick=0.003)


@pytest.fixture
def volume_surge_up_df() -> pd.DataFrame:
    """volume_surge LONG trigger — analytic.

    A calm baseline (low-amplitude sinusoid price, flat 1M volume) for 39 bars,
    then a final bar with a ~9x volume spike and an UP close (close > open).

    Verified final bar: volume_zscore ~= 4.2 (comfortably > 3) and close > open
    -> fires LONG.
    """
    n = 40
    close = 100.0 + 0.5 * np.sin(np.arange(n) / 3.0)
    close[-1] = close[-2] * 1.03          # up day (close > open == prev close)
    volume = np.full(n, 1_000_000.0)
    volume[-1] = 9_000_000.0              # abnormal spike -> z >> 3
    return _ohlcv_analytic(close, volume, wick=0.001)


@pytest.fixture
def volume_surge_down_df() -> pd.DataFrame:
    """volume_surge SHORT trigger — analytic. Mirror of volume_surge_up_df.

    A calm baseline then a final bar with a ~9x volume spike and a DOWN close.

    Verified final bar: volume_zscore ~= 4.2 (> 3) and close < open -> fires SHORT.
    """
    n = 40
    close = 100.0 + 0.5 * np.sin(np.arange(n) / 3.0)
    close[-1] = close[-2] * 0.97          # down day
    volume = np.full(n, 1_000_000.0)
    volume[-1] = 9_000_000.0
    return _ohlcv_analytic(close, volume, wick=0.001)


@pytest.fixture
def bullish_divergence_df() -> pd.DataFrame:
    """rsi_divergence LONG trigger — analytic. Two real swing lows in the lookback.

    Construction encodes a genuine REGULAR bullish divergence:
      swing low 1: a sharp 2-bar drop -> price ~92 with RSI pinned ~0 (deep
        momentum), then a modest bounce that separates the two lows,
      swing low 2: a longer SHALLOW grind to a LOWER price (~91.2) but with a
        HIGHER RSI (~28) because the decline is gentle, then a small uptick so the
        low is a strict local minimum (not the final bar).

    Verified (lookback=20): swing1 (price 92.16, RSI 0.0) vs swing2
    (price 91.20 LOWER, RSI 28.0 HIGHER) -> bullish=True, bearish=False -> LONG.
    """
    segs = [
        np.full(25, 0.0),       # warmup so RSI(14) is defined
        np.full(2, -0.04),      # sharp drop -> swing low 1 (low RSI)
        np.full(3, 0.025),      # modest bounce separates the two lows
        np.full(7, -0.012),     # shallow grind to a LOWER price (higher RSI)
        np.full(3, 0.012),      # uptick so swing low 2 is a strict local min
    ]
    rets = np.concatenate(segs)
    close = 100.0 * np.cumprod(1.0 + rets)
    volume = np.full(len(rets), 1_000_000.0)
    return _ohlcv_analytic(close, volume, wick=0.002)


@pytest.fixture
def bearish_divergence_df() -> pd.DataFrame:
    """rsi_divergence SHORT trigger — analytic. Mirror of bullish_divergence_df.

    Two real swing highs: high 1 sharp (RSI ~100), high 2 a HIGHER price reached
    via a shallow grind so its RSI is LOWER (~71).

    Verified (lookback=20): swing1 (price 108.16, RSI 100.0) vs swing2
    (price 108.98 HIGHER, RSI 71.3 LOWER) -> bearish=True, bullish=False -> SHORT.
    """
    segs = [
        np.full(25, 0.0),
        np.full(2, 0.04),       # sharp rally -> swing high 1 (high RSI)
        np.full(3, -0.025),     # modest dip
        np.full(7, 0.012),      # shallow grind to a HIGHER price (lower RSI)
        np.full(3, -0.012),     # downtick so swing high 2 is a strict local max
    ]
    rets = np.concatenate(segs)
    close = 100.0 * np.cumprod(1.0 + rets)
    volume = np.full(len(rets), 1_000_000.0)
    return _ohlcv_analytic(close, volume, wick=0.002)


# ---------------------------------------------------------------------------
# BATCH 5 — MULTI-TRADE backtest fixtures (analytic) for the new strategies.
# Each repeats its trigger MANY times across the series so the forward-walk
# backtest opens >= 3 positions (non-vacuous bounded-stats tests).
# ---------------------------------------------------------------------------

@pytest.fixture
def macd_waves_df() -> pd.DataFrame:
    """Alternating up/down drift waves -> repeated MACD signal-line crosses.

    Verified: macd_signal opens ~15 trades.
    """
    period, cycles = 24, 10
    t = np.arange(period * cycles)
    rets = 0.006 * np.sign(np.sin(2 * np.pi * t / period))
    close = 100.0 * np.cumprod(1.0 + rets)
    volume = np.full(len(t), 1_000_000.0)
    return _ohlcv_analytic(close, volume)


@pytest.fixture
def squeeze_cycles_df() -> pd.DataFrame:
    """Repeating quiet-coil -> breakout cycles (alternating up/down breakouts) so
    bollinger_squeeze triggers MANY times.

    Verified: bollinger_squeeze opens ~7 trades.
    """
    cycles = 8
    segs = []
    for k in range(cycles):
        segs.append(0.0004 * np.sin(np.arange(25) / 2.0))        # quiet coil
        segs.append(np.array([0.06 if k % 2 == 0 else -0.06]))  # alt breakout
        segs.append(0.0004 * np.sin(np.arange(12) / 2.0))        # settle
    rets = np.concatenate(segs)
    close = 100.0 * np.cumprod(1.0 + rets)
    volume = np.full(len(rets), 1_000_000.0)
    return _ohlcv_analytic(close, volume, wick=0.001)


@pytest.fixture
def adx_reversals_df() -> pd.DataFrame:
    """Repeating strong trend reversals (alternating 20-bar up/down legs) so a
    high-ADX +DI/-DI cross recurs and adx_trend triggers MULTIPLE times.

    Verified: adx_trend opens ~5 trades.
    """
    cycles = 8
    segs = [np.full(20, 0.01 if k % 2 == 0 else -0.01) for k in range(cycles)]
    rets = np.concatenate(segs)
    close = 100.0 * np.cumprod(1.0 + rets)
    volume = np.full(len(rets), 1_000_000.0)
    return _ohlcv_analytic(close, volume, wick=0.003)


@pytest.fixture
def volume_spikes_df() -> pd.DataFrame:
    """Periodic abnormal volume spikes spaced 25 bars apart (> the 20-bar zscore
    window AND > hold_bars=10) on a gentle price wave, so each spike re-clears
    z > 3 and volume_surge triggers MANY times.

    Verified: volume_surge opens ~9 trades (z ~= 4.2 at each spike).
    """
    n = 260
    t = np.arange(n)
    close = 100.0 + 1.5 * np.sin(t / 6.0)
    volume = np.full(n, 1_000_000.0)
    for i in range(40, n, 25):
        volume[i] = 9_000_000.0
    return _ohlcv_analytic(close, volume, wick=0.001)


@pytest.fixture
def divergence_cycles_df() -> pd.DataFrame:
    """Repeating bullish/bearish divergence structures so rsi_divergence triggers
    MANY times across the series.

    Verified: rsi_divergence opens ~13 trades.
    """
    cycles = 8
    segs = [np.full(25, 0.0)]
    for k in range(cycles):
        if k % 2 == 0:  # bullish divergence block
            segs += [np.full(2, -0.04), np.full(3, 0.025), np.full(7, -0.012), np.full(3, 0.012)]
        else:           # bearish divergence block
            segs += [np.full(2, 0.04), np.full(3, -0.025), np.full(7, 0.012), np.full(3, -0.012)]
    rets = np.concatenate(segs)
    close = 100.0 * np.cumprod(1.0 + rets)
    volume = np.full(len(rets), 1_000_000.0)
    return _ohlcv_analytic(close, volume, wick=0.002)


# ---------------------------------------------------------------------------
# NON-TRIGGER fixtures — used only to prove a strategy does NOT fire, or for
# indicator-bound sanity. Exact final-bar values are irrelevant, so a seeded RNG
# wobble is acceptable here (it never satisfies any gate on any numpy version).
# ---------------------------------------------------------------------------

@pytest.fixture
def flat_df() -> pd.DataFrame:
    """Flat / choppy series — no sustained trend, no breakout, no clean cross.

    Mean-reverting around 100 so no strategy should fire a real signal. Only 80
    bars, so it also exercises the >=260 length gate on breakout strategies.
    """
    rng = np.random.default_rng(123)
    n = 80
    close = 100.0 + rng.normal(0, 0.15, n)
    volume = 1_000_000 + rng.integers(0, 20_000, n)
    return _ohlcv_from_close(close, volume, rng, wick=0.0015)


@pytest.fixture
def long_series_df() -> pd.DataFrame:
    """Generic >260-bar uptrend for backtest / length-gated tests.

    momentum_long has a real edge here (used by the known-edge backtest), while
    breakout_short must stay quiet (no fresh-low/volume-surge combo).
    """
    rng = np.random.default_rng(31337)
    n = 320
    rets = 0.002 + rng.normal(0, 0.004, n)
    close = 40.0 * np.cumprod(1.0 + rets)
    volume = 1_200_000 + rng.integers(0, 60_000, n)
    return _ohlcv_from_close(close, volume, rng)


@pytest.fixture
def volatile_df() -> pd.DataFrame:
    """High-amplitude series for ATR>0 sanity (large true ranges)."""
    rng = np.random.default_rng(555)
    n = 60
    rets = rng.normal(0, 0.03, n)
    close = 100.0 * np.cumprod(1.0 + rets)
    volume = 1_000_000 + rng.integers(0, 100_000, n)
    return _ohlcv_from_close(close, volume, rng, wick=0.01)


@pytest.fixture
def constant_df() -> pd.DataFrame:
    """Perfectly flat close == 100 for the 'EMA of a constant == constant' check."""
    n = 60
    close = np.full(n, 100.0)
    volume = np.full(n, 1_000_000.0)
    return pd.DataFrame(
        {
            "open": close,
            "high": close,
            "low": close,
            "close": close,
            "volume": volume,
        },
        index=_index(n),
    )


# ---------------------------------------------------------------------------
# BATCH 5 — NEAR-BOUNDARY (SELECTIVITY) fixtures for the bidirectional strategies
# (macd_signal / bollinger_squeeze / adx_trend / volume_surge / rsi_divergence).
# Each fixture is TRIGGER-CRITICAL: the final-bar indicator value must land
# CLEARLY on the non-fire side of the threshold to keep the test stable across
# numpy/TA-Lib versions. The strategy's key gate fails by a deliberate margin.
# ---------------------------------------------------------------------------


@pytest.fixture
def near_macd_df() -> pd.DataFrame:
    """macd_signal near-miss — MACD is one bar short of the bullish cross.

    Identical construction to macd_bull_cross_df (accelerating decline for 50
    bars, then a +0.012/bar up-leg) except only TWO bars of recovery are
    appended instead of three. The trigger fixture's docstring documents that
    the cross flips from negative to positive histogram EXACTLY on the THIRD
    recovery bar; after two bars, (macd - signal) ≈ -0.025 (still negative) —
    the MACD line is below the signal line on the final bar.

    Verified: the pre-cross state is captured by the trigger fixture's prev-bar
    reading: prev (macd-signal) ~= -0.025 -> the final bar here has MACD still
    below signal -> bullish_cross=False, bearish_cross=False -> no trigger.
    """
    n_down, n_up = 50, 2  # trigger uses n_up=3; one bar short of the cross
    down = -(0.001 + 0.0002 * np.arange(n_down))
    rets = np.concatenate([down, np.full(n_up, 0.012)])
    close = 100.0 * np.cumprod(1.0 + rets)
    volume = np.full(len(rets), 1_000_000.0)
    return _ohlcv_analytic(close, volume)


@pytest.fixture
def near_squeeze_df() -> pd.DataFrame:
    """bollinger_squeeze near-miss — coil present but close stays inside bands.

    Same low-amplitude sinusoid coil as squeeze_breakout_up_df (60 bars,
    amplitude 0.0005/bar) so the coil condition is met (prev_width near its
    20-bar minimum -> was_squeezed=True), but the final bar advances only
    +0.03% (3 basis points). The bands are extremely tight after the coil
    (2-sigma upper band ≈ 100.07); close ≈ 100.03 stays well inside ->
    breakout_up=False, breakout_down=False -> no trigger.
    """
    flat = 0.0005 * np.sin(np.arange(60) / 2.0)
    rets = np.concatenate([flat, np.array([0.0003])])  # 3bps: inside tight bands
    close = 100.0 * np.cumprod(1.0 + rets)
    volume = np.full(len(rets), 1_000_000.0)
    return _ohlcv_analytic(close, volume, wick=0.001)


@pytest.fixture
def near_adx_df() -> pd.DataFrame:
    """adx_trend near-miss — recovery too short for the +DI/-DI cross to occur.

    A strong 50-bar downtrend (same as adx_bull_cross_df) builds high ADX with
    -DI dominant. Only 5 bars of +0.009/bar recovery are appended (the trigger
    fixture uses 12). After 5 bars, +DI is still tracking below -DI — the cross
    needs approximately 12 bars to complete — so bull_cross=False on the final
    bar. ADX >> 30 and EMA is beginning to rise, but both of those conditions
    are irrelevant without the directional cross -> no trigger.

    Verified: adx_bull_cross_df fires LONG after EXACTLY 12 bars of recovery;
    with only 5 the DI cross has not yet occurred.
    """
    n_flat, n_down, n_up = 7, 50, 5
    rets = np.concatenate([
        np.zeros(n_flat),
        np.full(n_down, -0.01),
        np.full(n_up, 0.009),
    ])
    close = 100.0 * np.cumprod(1.0 + rets)
    volume = np.full(len(rets), 1_000_000.0)
    return _ohlcv_analytic(close, volume, wick=0.003)


@pytest.fixture
def near_volume_surge_df() -> pd.DataFrame:
    """volume_surge near-miss — prior spike inflates rolling std, keeping z < 3.

    A calm baseline (close oscillates, volume flat at 1M) for 39 bars. A prior
    spike is planted at bar index 29 (5M volume) — within the 20-bar rolling
    window of the final bar — which inflates the rolling standard deviation.
    The final bar has a 4M spike (4x normal, clearly abnormal in isolation) and
    an UP close, but the inflated std from the prior spike brings the z-score to
    approximately 2.43:

        window (bars 20-39): 9 bars × 1M + 1 bar × 5M + 9 bars × 1M + 1 bar × 4M
        mean  = 27M / 20 = 1.35M
        std   = sqrt(22.55M² / 19) ≈ 1.089M
        z     = (4M - 1.35M) / 1.089M ≈ 2.43 < 3.0 -> no trigger.
    """
    n = 40
    close = 100.0 + 0.5 * np.sin(np.arange(n) / 3.0)
    close[-1] = close[-2] * 1.03   # up day (close > open = prev close)
    volume = np.full(n, 1_000_000.0)
    volume[29] = 5_000_000.0       # prior spike inflates rolling std
    volume[-1] = 4_000_000.0       # final spike: z ≈ 2.43 < 3.0
    return _ohlcv_analytic(close, volume, wick=0.001)


@pytest.fixture
def near_rsi_divergence_df() -> pd.DataFrame:
    """rsi_divergence near-miss — two swing lows but BOTH price and RSI confirm
    the downtrend (no divergence structure).

    Construction:
      20 flat bars (warmup) + 5-bar rally (+1.5%/bar, builds gain memory so
      RSI at swing low 1 is NOT pinned at zero) + swing low 1 (3 bars,
      -3.0%/bar -> price ≈ 98.3, RSI ≈ 38) + 3-bar bounce (+2.0%/bar, separates
      the lows) + swing low 2 (5 bars, -3.5%/bar, STEEPER -> price ≈ 86.8 LOWER
      AND RSI ≈ 21 also LOWER) + 3-bar uptick (+1.0%/bar, makes swing low 2 a
      strict local min).

    Divergence check (lookback=20, order=2):
      * Bullish: price_lower_low=True (86.8 < 98.3) but rsi_higher_low=False
        (21 < 38) -> bullish=False.
      * Bearish: swing highs are rally peak (≈107.7) > bounce peak (≈104.3) ->
        price_higher_high=False -> bearish=False.
    Both flags False -> no trigger.
    """
    segs = [
        np.full(20, 0.0),      # flat warmup
        np.full(5, 0.015),     # rally -> gain memory for non-zero RSI at swing low 1
        np.full(3, -0.03),     # drop -> swing low 1 (price ≈ 98.3, RSI ≈ 38)
        np.full(3, 0.02),      # bounce -> separates the two lows
        np.full(5, -0.035),    # steeper drop -> swing low 2 (price ≈ 86.8, RSI ≈ 21)
        np.full(3, 0.01),      # uptick -> makes swing low 2 a strict local minimum
    ]
    rets = np.concatenate(segs)
    close = 100.0 * np.cumprod(1.0 + rets)
    volume = np.full(len(rets), 1_000_000.0)
    return _ohlcv_analytic(close, volume, wick=0.002)
