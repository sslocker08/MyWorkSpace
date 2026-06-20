"""Reversal long: oversold mean-reversion (RSI < 30 + close <= lower Bollinger).

COUNTER-TREND STRATEGY. Unlike momentum/breakout (which trade WITH the trend),
this fires a LONG when price is statistically over-extended to the DOWNSIDE and a
bounce back toward the mean is likely: RSI below 30 (classic oversold) AND the
close at or below the lower Bollinger Band (2 std below the 20-period mean).
A bullish RSI divergence (price lower-low while RSI higher-low), when present,
only BOOSTS confidence — it is not required to trigger.

Because it is counter-trend, it is inherently riskier than the trend-following
strategies and should be sized / gated accordingly downstream.
"""
import pandas as pd
from .base import BaseStrategy, StrategyResult
from core.indicators import rsi, bbands, rsi_divergence


class ReversalLongStrategy(BaseStrategy):
    name = "reversal_long"

    def evaluate(self, ticker: str, df: pd.DataFrame) -> StrategyResult:
        # Need >=20 for Bollinger + a buffer for RSI(14) warmup. Use 35 so the
        # rsi_divergence(lookback=20) window is also fully populated.
        if len(df) < 35:
            return StrategyResult(name=self.name, triggered=False)

        close = df["close"]

        rsi_vals = rsi(close, 14)
        upper, middle, lower = bbands(close, 20, 2.0)

        curr_close = close.iloc[-1]
        curr_rsi = rsi_vals.iloc[-1]
        curr_lower = lower.iloc[-1]

        # Guard against NaN at the evaluation point.
        if pd.isna(curr_close) or pd.isna(curr_rsi) or pd.isna(curr_lower):
            return StrategyResult(name=self.name, triggered=False)

        oversold = curr_rsi < 30
        at_lower_band = curr_close <= curr_lower

        if oversold and at_lower_band:
            div = rsi_divergence(close, rsi_vals, lookback=20)
            bullish_div = div.get("bullish", False)

            # Base on how deep RSI is below 30 (0 at RSI=30, full at RSI=0),
            # then add a fixed boost when a bullish divergence is present.
            depth = (30 - curr_rsi) / 30  # in (0, 1]
            confidence = 0.5 + depth * 0.3 + (0.2 if bullish_div else 0.0)
            confidence = max(0.0, min(confidence, 1.0))

            return StrategyResult(
                name=self.name,
                triggered=True,
                direction="LONG",
                confidence=confidence,
                reason=(
                    f"Reversal LONG (oversold): RSI={curr_rsi:.1f}<30, "
                    f"close<=lowerBB({curr_lower:.2f})"
                    + (", bullish divergence" if bullish_div else "")
                ),
                indicators={
                    "rsi": curr_rsi,
                    "lower_band": curr_lower,
                    "bullish_divergence": bullish_div,
                },
            )

        return StrategyResult(name=self.name, triggered=False)
