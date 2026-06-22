"""TA-Lib wrapper providing clean, typed indicator functions."""
import numpy as np
import pandas as pd
import talib


def ema(series: pd.Series, period: int) -> pd.Series:
    return pd.Series(talib.EMA(series.values.astype(float), timeperiod=period), index=series.index)


def sma(series: pd.Series, period: int) -> pd.Series:
    return pd.Series(talib.SMA(series.values.astype(float), timeperiod=period), index=series.index)


def rsi(series: pd.Series, period: int = 14) -> pd.Series:
    return pd.Series(talib.RSI(series.values.astype(float), timeperiod=period), index=series.index)


def macd(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> tuple[pd.Series, pd.Series, pd.Series]:
    """Returns (macd_line, signal_line, histogram)."""
    macd_vals, signal_vals, hist_vals = talib.MACD(
        series.values.astype(float), fastperiod=fast, slowperiod=slow, signalperiod=signal
    )
    idx = series.index
    return (
        pd.Series(macd_vals, index=idx),
        pd.Series(signal_vals, index=idx),
        pd.Series(hist_vals, index=idx),
    )


def bbands(series: pd.Series, period: int = 20, std_dev: float = 2.0) -> tuple[pd.Series, pd.Series, pd.Series]:
    """Returns (upper, middle, lower)."""
    upper, middle, lower = talib.BBANDS(
        series.values.astype(float), timeperiod=period, nbdevup=std_dev, nbdevdn=std_dev
    )
    idx = series.index
    return pd.Series(upper, index=idx), pd.Series(middle, index=idx), pd.Series(lower, index=idx)


def atr(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    return pd.Series(
        talib.ATR(high.values.astype(float), low.values.astype(float), close.values.astype(float), timeperiod=period),
        index=close.index,
    )


def adx(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> tuple[pd.Series, pd.Series, pd.Series]:
    """Returns (adx, plus_di, minus_di)."""
    h, l, c = high.values.astype(float), low.values.astype(float), close.values.astype(float)
    return (
        pd.Series(talib.ADX(h, l, c, timeperiod=period), index=close.index),
        pd.Series(talib.PLUS_DI(h, l, c, timeperiod=period), index=close.index),
        pd.Series(talib.MINUS_DI(h, l, c, timeperiod=period), index=close.index),
    )


def volume_ratio(volume: pd.Series, period: int = 20) -> pd.Series:
    """Current volume / rolling mean volume."""
    rolling_mean = volume.rolling(period).mean()
    return volume / rolling_mean.replace(0, np.nan)


def volume_zscore(volume: pd.Series, period: int = 20) -> pd.Series:
    """Z-score of volume."""
    rolling_mean = volume.rolling(period).mean()
    rolling_std = volume.rolling(period).std()
    return (volume - rolling_mean) / rolling_std.replace(0, np.nan)


def high_52w(high: pd.Series) -> pd.Series:
    return high.rolling(252).max()


def low_52w(low: pd.Series) -> pd.Series:
    return low.rolling(252).min()


def bb_width(series: pd.Series, period: int = 20) -> pd.Series:
    """Bollinger Band width — indicator of squeeze."""
    upper, middle, lower = bbands(series, period)
    return (upper - lower) / middle.replace(0, np.nan)


def _local_extrema(values: np.ndarray, order: int, kind: str) -> list[int]:
    """Indices of strict local minima/maxima in `values` (a 1-D array).

    A bar i is a local minimum (kind="min") when it is strictly less than every
    one of the `order` neighbours on BOTH sides; symmetrically for "max". Using a
    symmetric window (not just the global argmin/argmax) is what lets us recover
    TWO distinct swings inside the lookback — the crude proxy this replaces only
    ever had one swing (the window's first bar), so it could not actually compare
    a prior swing against a later swing.

    `order` is the swing strictness: larger -> fewer, more significant pivots.
    NaNs are never selected as extrema.
    """
    idxs: list[int] = []
    n = len(values)
    for i in range(order, n - order):
        v = values[i]
        if np.isnan(v):
            continue
        window = values[i - order : i + order + 1]
        if np.isnan(window).any():
            continue
        if kind == "min" and v == window.min() and (window > v).sum() == len(window) - 1:
            idxs.append(i)
        elif kind == "max" and v == window.max() and (window < v).sum() == len(window) - 1:
            idxs.append(i)
    return idxs


def rsi_divergence(close: pd.Series, rsi_series: pd.Series, lookback: int = 20) -> dict:
    """Detect regular price-vs-RSI divergence from TWO actual swings.

    Returns {'bullish': bool, 'bearish': bool}.

    WHY this design (per llm-context-engineering-repo: encode the *reasoning*, not
    just the mechanic, so a future reader/agent can verify causality):

      A "regular" divergence is defined between two SWING pivots of the same kind,
      not between an arbitrary window edge and the latest bar. The previous
      implementation used `price_window.iloc[0]` (the window's first bar) as the
      "prior swing", which is almost never an actual swing low/high — it is just
      wherever the lookback happens to start, so the signal was noise. This version
      finds two genuine local extrema and compares the PRICE slope against the RSI
      slope between exactly those two pivots:

        * Bullish: price makes a LOWER low (later swing-low price < earlier swing-low
          price) while RSI makes a HIGHER low (RSI at the later swing > RSI at the
          earlier swing). Momentum is improving while price still falls -> a bottom
          may be forming.
        * Bearish: price makes a HIGHER high while RSI makes a LOWER high. Momentum
          is fading while price still rises -> a top may be forming.

    CAUSALITY / NO LEAK: every input is sliced to `close.iloc[-lookback:]` and the
    aligned RSI window; nothing past the final bar is read. The local-extrema scan
    only looks at neighbours INSIDE that window, so the result at bar T is a pure
    function of data at or before T. Same signature and {'bullish','bearish'} shape
    as before, so existing callers (reversal_long / reversal_short) are unchanged.
    """
    if len(close) < lookback:
        return {"bullish": False, "bearish": False}

    price_window = close.iloc[-lookback:]
    rsi_window = rsi_series.iloc[-lookback:]

    price_vals = price_window.to_numpy(dtype=float)
    rsi_vals = rsi_window.to_numpy(dtype=float)

    # Need enough non-NaN RSI to define two swings with a real gap between them.
    if np.isnan(rsi_vals).all() or len(price_vals) < 5:
        return {"bullish": False, "bearish": False}

    # Swing strictness: scale with the lookback but stay small enough that TWO
    # pivots can comfortably fit inside the window. A pivot needs `order` bars on
    # each side, so two pivots need ~ 2*(2*order+1) bars; for lookback=20 that
    # caps order at 2. Keep >=1 so even short windows can detect a swing.
    order = max(1, min(2, lookback // 10))

    bullish = False
    min_idxs = _local_extrema(price_vals, order, "min")
    if len(min_idxs) >= 2:
        # Use the FIRST and LAST swing lows in the window (earliest vs most recent)
        # so the comparison spans the widest causal interval available.
        a, b = min_idxs[0], min_idxs[-1]
        if not (np.isnan(rsi_vals[a]) or np.isnan(rsi_vals[b])):
            price_lower_low = price_vals[b] < price_vals[a]
            rsi_higher_low = rsi_vals[b] > rsi_vals[a]
            bullish = bool(price_lower_low and rsi_higher_low)

    bearish = False
    max_idxs = _local_extrema(price_vals, order, "max")
    if len(max_idxs) >= 2:
        a, b = max_idxs[0], max_idxs[-1]
        if not (np.isnan(rsi_vals[a]) or np.isnan(rsi_vals[b])):
            price_higher_high = price_vals[b] > price_vals[a]
            rsi_lower_high = rsi_vals[b] < rsi_vals[a]
            bearish = bool(price_higher_high and rsi_lower_high)

    return {"bullish": bullish, "bearish": bearish}
