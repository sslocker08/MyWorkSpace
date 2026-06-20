"""Breakout long: near 52-week high + volume surge + ADX > 25."""
import pandas as pd
from .base import BaseStrategy, StrategyResult
from core.indicators import high_52w, adx, volume_ratio


class BreakoutLongStrategy(BaseStrategy):
    name = "breakout_long"

    def evaluate(self, ticker: str, df: pd.DataFrame) -> StrategyResult:
        if len(df) < 260:
            return StrategyResult(name=self.name, triggered=False)

        close = df["close"]
        high = df["high"]
        low = df["low"]
        volume = df["volume"]

        high_52 = high_52w(high)
        adx_vals, plus_di, minus_di = adx(high, low, close, 14)
        vol_ratio = volume_ratio(volume, 20)

        curr_close = close.iloc[-1]
        curr_high_52 = high_52.iloc[-1]
        curr_adx = adx_vals.iloc[-1]
        curr_plus_di = plus_di.iloc[-1]
        curr_minus_di = minus_di.iloc[-1]
        curr_vol_ratio = vol_ratio.iloc[-1]

        if curr_high_52 == 0 or pd.isna(curr_high_52):
            return StrategyResult(name=self.name, triggered=False)

        near_52w_high = (curr_close / curr_high_52) >= 0.95
        trend_confirmed = curr_adx > 25 and curr_plus_di > curr_minus_di
        volume_surge = curr_vol_ratio >= 2.0  # 2x average volume

        if near_52w_high and trend_confirmed and volume_surge:
            pct_from_high = curr_close / curr_high_52
            confidence = min(0.5 + (pct_from_high - 0.95) / 0.05 * 0.3 + (curr_vol_ratio - 2) * 0.05, 1.0)
            return StrategyResult(
                name=self.name,
                triggered=True,
                direction="LONG",
                confidence=confidence,
                reason=f"Breakout: {pct_from_high:.1%} of 52w high, ADX={curr_adx:.1f}, vol={curr_vol_ratio:.1f}x",
                indicators={
                    "pct_of_52w_high": pct_from_high,
                    "adx": curr_adx,
                    "plus_di": curr_plus_di,
                    "minus_di": curr_minus_di,
                    "vol_ratio": curr_vol_ratio,
                },
            )

        return StrategyResult(name=self.name, triggered=False)
