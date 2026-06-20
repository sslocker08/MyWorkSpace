"""Breakout short: near 52-week low + volume surge + ADX > 25 downtrend.

Mirror of breakout_long: instead of a fresh 52-week high with +DI dominance, we
fire SHORT when price is breaking DOWN to a fresh 52-week low with a confirmed
downtrend (ADX > 25 and -DI > +DI) and a volume surge (>= 2x average). The
thresholds (0.05 proximity band, ADX 25, 2x volume) are kept identical to
breakout_long so the long/short pair is symmetric by construction.
"""
import pandas as pd
from .base import BaseStrategy, StrategyResult
from core.indicators import low_52w, adx, volume_ratio


class BreakoutShortStrategy(BaseStrategy):
    name = "breakout_short"

    def evaluate(self, ticker: str, df: pd.DataFrame) -> StrategyResult:
        if len(df) < 260:
            return StrategyResult(name=self.name, triggered=False)

        close = df["close"]
        high = df["high"]
        low = df["low"]
        volume = df["volume"]

        low_52 = low_52w(low)
        adx_vals, plus_di, minus_di = adx(high, low, close, 14)
        vol_ratio = volume_ratio(volume, 20)

        curr_close = close.iloc[-1]
        curr_low_52 = low_52.iloc[-1]
        curr_adx = adx_vals.iloc[-1]
        curr_plus_di = plus_di.iloc[-1]
        curr_minus_di = minus_di.iloc[-1]
        curr_vol_ratio = vol_ratio.iloc[-1]

        # Guard against NaN/insufficient-warmup at the evaluation point.
        if (
            curr_low_52 == 0
            or pd.isna(curr_low_52)
            or pd.isna(curr_close)
            or pd.isna(curr_adx)
            or pd.isna(curr_plus_di)
            or pd.isna(curr_minus_di)
            or pd.isna(curr_vol_ratio)
        ):
            return StrategyResult(name=self.name, triggered=False)

        # Within 5% ABOVE the 52w low (mirror of "within 5% below the 52w high").
        near_52w_low = (curr_close / curr_low_52) <= 1.05
        trend_confirmed = curr_adx > 25 and curr_minus_di > curr_plus_di
        volume_surge = curr_vol_ratio >= 2.0  # 2x average volume

        if near_52w_low and trend_confirmed and volume_surge:
            pct_above_low = curr_close / curr_low_52  # in (0, 1.05]
            # Closer to the low -> higher confidence (mirror of breakout_long's
            # "closer to the high"). pct_above_low==1.0 (at the low) gives the
            # full 0.3 proximity bonus; ==1.05 gives 0.0.
            proximity = max(0.0, (1.05 - pct_above_low) / 0.05)
            confidence = min(
                0.5 + proximity * 0.3 + (curr_vol_ratio - 2) * 0.05, 1.0
            )
            confidence = max(0.0, confidence)
            return StrategyResult(
                name=self.name,
                triggered=True,
                direction="SHORT",
                confidence=confidence,
                reason=f"Breakdown: {pct_above_low:.1%} of 52w low, ADX={curr_adx:.1f}, vol={curr_vol_ratio:.1f}x",
                indicators={
                    "pct_of_52w_low": pct_above_low,
                    "adx": curr_adx,
                    "plus_di": curr_plus_di,
                    "minus_di": curr_minus_di,
                    "vol_ratio": curr_vol_ratio,
                },
            )

        return StrategyResult(name=self.name, triggered=False)
