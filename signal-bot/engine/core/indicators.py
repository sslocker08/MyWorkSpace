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


def rsi_divergence(close: pd.Series, rsi_series: pd.Series, lookback: int = 20) -> dict:
    """Detect price vs RSI divergence in the last `lookback` bars.
    Returns {'bullish': bool, 'bearish': bool}.
    """
    if len(close) < lookback:
        return {"bullish": False, "bearish": False}

    price_window = close.iloc[-lookback:]
    rsi_window = rsi_series.iloc[-lookback:].dropna()
    if len(rsi_window) < 2:
        return {"bullish": False, "bearish": False}

    # Bullish divergence: price makes lower low but RSI makes higher low
    price_min_idx = price_window.idxmin()
    price_prev_min = price_window.iloc[0]
    rsi_at_price_min = rsi_window.get(price_min_idx, np.nan)
    rsi_at_start = rsi_window.iloc[0] if len(rsi_window) > 0 else np.nan

    bullish = (price_window.iloc[-1] < price_prev_min) and (rsi_at_price_min > rsi_at_start)

    # Bearish divergence: price makes higher high but RSI makes lower high
    price_max_idx = price_window.idxmax()
    rsi_at_price_max = rsi_window.get(price_max_idx, np.nan)
    bearish = (price_window.iloc[-1] > price_window.iloc[0]) and (rsi_at_price_max < rsi_window.iloc[0])

    return {"bullish": bool(bullish), "bearish": bool(bearish)}
