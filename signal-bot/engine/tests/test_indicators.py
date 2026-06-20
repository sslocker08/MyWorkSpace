"""Indicator correctness: shape/index preservation, no look-ahead, known-value sanity.

Money logic — each indicator must (a) return a Series aligned to the input index,
(b) not leak future data into past bars (recomputing on a truncated frame must give
the same historical values), and (c) satisfy mathematical invariants (RSI in [0,100],
EMA of a constant == that constant, ATR>0 on a volatile series).
"""
import numpy as np
import pandas as pd

from core import indicators as ind


# --- shape / index preservation --------------------------------------------

def test_ema_shape_and_index(uptrend_df):
    out = ind.ema(uptrend_df["close"], 9)
    assert isinstance(out, pd.Series)
    assert len(out) == len(uptrend_df)
    assert out.index.equals(uptrend_df.index)


def test_macd_returns_three_aligned_series(uptrend_df):
    macd_line, signal_line, hist = ind.macd(uptrend_df["close"])
    for s in (macd_line, signal_line, hist):
        assert isinstance(s, pd.Series)
        assert s.index.equals(uptrend_df.index)


def test_bbands_three_series_ordered(uptrend_df):
    upper, middle, lower = ind.bbands(uptrend_df["close"], 20)
    valid = upper.dropna().index.intersection(lower.dropna().index)
    assert len(valid) > 0
    assert (upper.loc[valid] >= middle.loc[valid]).all()
    assert (middle.loc[valid] >= lower.loc[valid]).all()


def test_adx_three_series(uptrend_df):
    adx_s, plus_di, minus_di = ind.adx(
        uptrend_df["high"], uptrend_df["low"], uptrend_df["close"], 14
    )
    for s in (adx_s, plus_di, minus_di):
        assert s.index.equals(uptrend_df.index)


# --- known-value sanity -----------------------------------------------------

def test_ema_of_constant_is_constant(constant_df):
    out = ind.ema(constant_df["close"], 9).dropna()
    assert np.allclose(out.values, 100.0, atol=1e-6)


def test_sma_of_constant_is_constant(constant_df):
    out = ind.sma(constant_df["close"], 20).dropna()
    assert np.allclose(out.values, 100.0, atol=1e-6)


def test_rsi_bounded_0_100(uptrend_df, downtrend_df, flat_df):
    for df in (uptrend_df, downtrend_df, flat_df):
        r = ind.rsi(df["close"], 14).dropna()
        assert len(r) > 0
        assert (r >= 0).all() and (r <= 100).all()


def test_rsi_uptrend_above_downtrend(uptrend_df, downtrend_df):
    up = ind.rsi(uptrend_df["close"], 14).dropna().iloc[-1]
    down = ind.rsi(downtrend_df["close"], 14).dropna().iloc[-1]
    assert up > 50 > down


def test_atr_positive_on_volatile(volatile_df):
    a = ind.atr(volatile_df["high"], volatile_df["low"], volatile_df["close"], 14).dropna()
    assert len(a) > 0
    assert (a > 0).all()


def test_volume_ratio_around_one_for_flat_volume(constant_df):
    vr = ind.volume_ratio(constant_df["volume"], 20).dropna()
    assert np.allclose(vr.values, 1.0, atol=1e-6)


def test_volume_zscore_finite(uptrend_df):
    z = ind.volume_zscore(uptrend_df["volume"], 20).dropna()
    assert np.isfinite(z.values).all()


def test_high_low_52w(long_series_df):
    hi = ind.high_52w(long_series_df["high"]).dropna()
    lo = ind.low_52w(long_series_df["low"]).dropna()
    assert len(hi) > 0 and len(lo) > 0
    # rolling max >= rolling min at the same bar
    common = hi.index.intersection(lo.index)
    assert (hi.loc[common] >= lo.loc[common]).all()


def test_bb_width_nonnegative(uptrend_df):
    w = ind.bb_width(uptrend_df["close"], 20).dropna()
    assert (w >= 0).all()


# --- no look-ahead ----------------------------------------------------------

def test_ema_no_lookahead(uptrend_df):
    """Truncating future bars must not change historical EMA values."""
    full = ind.ema(uptrend_df["close"], 9)
    cut = 60
    truncated = ind.ema(uptrend_df["close"].iloc[:cut], 9)
    a = full.iloc[:cut].dropna()
    b = truncated.dropna()
    common = a.index.intersection(b.index)
    assert len(common) > 0
    assert np.allclose(a.loc[common].values, b.loc[common].values, atol=1e-8)


def test_rsi_no_lookahead(uptrend_df):
    full = ind.rsi(uptrend_df["close"], 14)
    cut = 60
    truncated = ind.rsi(uptrend_df["close"].iloc[:cut], 14)
    a = full.iloc[:cut].dropna()
    b = truncated.dropna()
    common = a.index.intersection(b.index)
    assert len(common) > 0
    assert np.allclose(a.loc[common].values, b.loc[common].values, atol=1e-8)


def test_atr_no_lookahead(volatile_df):
    full = ind.atr(volatile_df["high"], volatile_df["low"], volatile_df["close"], 14)
    cut = 45
    trunc = ind.atr(
        volatile_df["high"].iloc[:cut],
        volatile_df["low"].iloc[:cut],
        volatile_df["close"].iloc[:cut],
        14,
    )
    a = full.iloc[:cut].dropna()
    b = trunc.dropna()
    common = a.index.intersection(b.index)
    assert len(common) > 0
    assert np.allclose(a.loc[common].values, b.loc[common].values, atol=1e-8)


# --- rsi_divergence contract ------------------------------------------------

def test_rsi_divergence_returns_bool_dict(uptrend_df):
    r = ind.rsi(uptrend_df["close"], 14)
    out = ind.rsi_divergence(uptrend_df["close"], r, lookback=20)
    assert set(out.keys()) == {"bullish", "bearish"}
    assert isinstance(out["bullish"], bool)
    assert isinstance(out["bearish"], bool)


def test_rsi_divergence_short_series_safe():
    s = pd.Series([1.0, 2.0, 3.0])
    out = ind.rsi_divergence(s, s, lookback=20)
    assert out == {"bullish": False, "bearish": False}
