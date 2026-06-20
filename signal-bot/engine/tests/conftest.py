"""Deterministic synthetic OHLCV golden fixtures.

WHY deterministic: this is money logic. Every fixture is built with a FIXED numpy
seed and no wall-clock/now() input, so an indicator or strategy regression shows up
as a hard test failure rather than as flaky noise. The DatetimeIndex is a fixed,
ascending business-day range anchored to a constant date (never datetime.now()).

Each builder returns a DataFrame with columns open/high/low/close/volume and a
proper ascending DatetimeIndex. OHLC invariants (low <= open/close <= high) are
enforced so TA-Lib functions (ATR/ADX) receive valid bars.
"""
import numpy as np
import pandas as pd
import pytest

# Constant anchor — NEVER datetime.now(). Keeps the index (and thus any
# index-derived behavior) byte-stable across runs and machines.
ANCHOR = pd.Timestamp("2020-01-01")


def _index(n: int) -> pd.DatetimeIndex:
    return pd.date_range(start=ANCHOR, periods=n, freq="B")


def _ohlcv_from_close(
    close: np.ndarray,
    volume: np.ndarray,
    rng: np.random.Generator,
    wick: float = 0.004,
) -> pd.DataFrame:
    """Build a valid OHLCV frame from a close path.

    open = previous close (first bar opens at its own close); high/low are pushed
    out from the open/close envelope by a small deterministic wick so that
    high >= max(open, close) and low <= min(open, close) always hold.
    """
    n = len(close)
    open_ = np.empty(n)
    open_[0] = close[0]
    open_[1:] = close[:-1]

    base_hi = np.maximum(open_, close)
    base_lo = np.minimum(open_, close)
    # Deterministic positive wick fractions in [wick, 2*wick].
    hi_wick = base_hi * (1.0 + (wick + rng.random(n) * wick))
    lo_wick = base_lo * (1.0 - (wick + rng.random(n) * wick))

    high = np.maximum(base_hi, hi_wick)
    low = np.minimum(base_lo, lo_wick)

    df = pd.DataFrame(
        {
            "open": open_,
            "high": high,
            "low": low,
            "close": close,
            "volume": volume.astype(float),
        },
        index=_index(n),
    )
    return df


@pytest.fixture
def uptrend_df() -> pd.DataFrame:
    """Clean, low-noise uptrend (~0.3%/bar drift). EMA9>EMA21, rising RSI/MACD.

    Sized at 80 bars so momentum_long (needs >=50) has warmed indicators.
    """
    rng = np.random.default_rng(42)
    n = 80
    drift = 0.003
    noise = rng.normal(0, 0.002, n)
    rets = drift + noise
    close = 100.0 * np.cumprod(1.0 + rets)
    volume = 1_000_000 + rng.integers(0, 50_000, n)
    return _ohlcv_from_close(close, volume, rng)


@pytest.fixture
def downtrend_df() -> pd.DataFrame:
    """Clean downtrend (~-0.3%/bar). Used for death-cross / SHORT cases."""
    rng = np.random.default_rng(7)
    n = 80
    drift = -0.003
    noise = rng.normal(0, 0.002, n)
    rets = drift + noise
    close = 100.0 * np.cumprod(1.0 + rets)
    volume = 1_000_000 + rng.integers(0, 50_000, n)
    return _ohlcv_from_close(close, volume, rng)


@pytest.fixture
def flat_df() -> pd.DataFrame:
    """Flat / choppy series — no sustained trend, no breakout, no clean cross.

    Mean-reverting around 100 so no strategy should fire a real signal.
    """
    rng = np.random.default_rng(123)
    n = 80
    close = 100.0 + rng.normal(0, 0.15, n)  # tiny mean-reverting wobble
    volume = 1_000_000 + rng.integers(0, 20_000, n)
    return _ohlcv_from_close(close, volume, rng, wick=0.0015)


@pytest.fixture
def death_cross_df() -> pd.DataFrame:
    """An up-then-down path engineered so EMA9 crosses BELOW EMA21 on the LAST bar,
    with a volume surge on that bar so ema_crossover's vol filter (>=1.3) passes.

    First half rises (EMA9 above EMA21), second half falls hard enough that the
    fast EMA dives under the slow EMA right at the end -> direction == 'SHORT'.
    """
    rng = np.random.default_rng(99)
    n = 60
    up = 100.0 * np.cumprod(1.0 + (0.004 + rng.normal(0, 0.001, 30)))
    down = up[-1] * np.cumprod(1.0 + (-0.006 + rng.normal(0, 0.001, 30)))
    close = np.concatenate([up, down])
    volume = 1_000_000 + rng.integers(0, 30_000, n)
    volume[-1] = 2_000_000  # surge on the crossover bar -> vol_ratio >= 1.3
    return _ohlcv_from_close(close, volume, rng)


@pytest.fixture
def golden_cross_df() -> pd.DataFrame:
    """Down-then-up path so EMA9 crosses ABOVE EMA21 on the last bar with a volume
    surge -> ema_crossover returns direction == 'LONG'."""
    rng = np.random.default_rng(101)
    n = 60
    down = 100.0 * np.cumprod(1.0 + (-0.004 + rng.normal(0, 0.001, 30)))
    up = down[-1] * np.cumprod(1.0 + (0.006 + rng.normal(0, 0.001, 30)))
    close = np.concatenate([down, up])
    volume = 1_000_000 + rng.integers(0, 30_000, n)
    volume[-1] = 2_000_000
    return _ohlcv_from_close(close, volume, rng)


@pytest.fixture
def breakout_df() -> pd.DataFrame:
    """52-week-high breakout: >260 bars, a long steady climb so the LAST close is
    a fresh 252-day high (>=95% of the rolling max), a strong ADX uptrend
    (+DI>-DI, ADX>25), and a >=2x volume surge on the final bar.

    Built so breakout_long.evaluate fires LONG. >260 bars also satisfies the
    strategy's hard length gate (len(df) < 260 -> no trigger).
    """
    rng = np.random.default_rng(2024)
    n = 300
    # Steady monotone-ish climb so each new close tends to be the running high.
    rets = 0.0025 + rng.normal(0, 0.0008, n)
    close = 50.0 * np.cumprod(1.0 + rets)
    volume = 1_000_000 + rng.integers(0, 40_000, n)
    volume[-1] = 3_000_000  # >=2x average -> volume_surge
    df = _ohlcv_from_close(close, volume, rng, wick=0.003)
    return df


@pytest.fixture
def volatile_df() -> pd.DataFrame:
    """High-amplitude series for ATR>0 sanity (large true ranges)."""
    rng = np.random.default_rng(555)
    n = 60
    rets = rng.normal(0, 0.03, n)  # 3% daily vol
    close = 100.0 * np.cumprod(1.0 + rets)
    volume = 1_000_000 + rng.integers(0, 100_000, n)
    return _ohlcv_from_close(close, volume, rng, wick=0.01)


@pytest.fixture
def constant_df() -> pd.DataFrame:
    """Perfectly flat close == 100 for the 'EMA of a constant == constant' check."""
    n = 60
    rng = np.random.default_rng(0)
    close = np.full(n, 100.0)
    volume = np.full(n, 1_000_000.0)
    df = pd.DataFrame(
        {
            "open": close,
            "high": close,
            "low": close,
            "close": close,
            "volume": volume,
        },
        index=_index(n),
    )
    return df


@pytest.fixture
def long_series_df() -> pd.DataFrame:
    """Generic >260-bar uptrend for backtest/length-gated tests."""
    rng = np.random.default_rng(31337)
    n = 320
    rets = 0.002 + rng.normal(0, 0.004, n)
    close = 40.0 * np.cumprod(1.0 + rets)
    volume = 1_200_000 + rng.integers(0, 60_000, n)
    return _ohlcv_from_close(close, volume, rng)
