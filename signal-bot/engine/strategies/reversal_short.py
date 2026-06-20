"""Reversal short: overbought mean-reversion (RSI > 70 + close >= upper Bollinger).

COUNTER-TREND STRATEGY and the mirror of reversal_long. Fires a SHORT when price
is statistically over-extended to the UPSIDE and a pullback toward the mean is
likely: RSI above 70 (classic overbought) AND the close at or above the upper
Bollinger Band (2 std above the 20-period mean). A bearish RSI divergence
(price higher-high while RSI lower-high), when present, only BOOSTS confidence —
it is not required to trigger.

Because it is counter-trend, it is inherently riskier than the trend-following
strategies and should be sized / gated accordingly downstream.
"""
import pandas as pd
from .base import BaseStrategy, StrategyResult
from core.indicators import rsi, bbands, rsi_divergence


class ReversalShortStrategy(BaseStrategy):
    name = "reversal_short"

    def evaluate(self, ticker: str, df: pd.DataFrame) -> StrategyResult:
        # Need >=20 for Bollinger + buffer for RSI(14) and the divergence window.
        if len(df) < 35:
            return StrategyResult(name=self.name, triggered=False)

        close = df["close"]

        rsi_vals = rsi(close, 14)
        upper, middle, lower = bbands(close, 20, 2.0)

        curr_close = close.iloc[-1]
        curr_rsi = rsi_vals.iloc[-1]
        curr_upper = upper.iloc[-1]

        # Guard against NaN at the evaluation point.
        if pd.isna(curr_close) or pd.isna(curr_rsi) or pd.isna(curr_upper):
            return StrategyResult(name=self.name, triggered=False)

        overbought = curr_rsi > 70
        at_upper_band = curr_close >= curr_upper

        if overbought and at_upper_band:
            div = rsi_divergence(close, rsi_vals, lookback=20)
            bearish_div = div.get("bearish", False)

            # Symmetric to reversal_long: depth above 70 (0 at RSI=70, full at
            # RSI=100), plus a fixed boost when a bearish divergence is present.
            depth = (curr_rsi - 70) / 30  # in (0, 1]
            confidence = 0.5 + depth * 0.3 + (0.2 if bearish_div else 0.0)
            confidence = max(0.0, min(confidence, 1.0))

            return StrategyResult(
                name=self.name,
                triggered=True,
                direction="SHORT",
                confidence=confidence,
                reason=(
                    f"Reversal SHORT (overbought): RSI={curr_rsi:.1f}>70, "
                    f"close>=upperBB({curr_upper:.2f})"
                    + (", bearish divergence" if bearish_div else "")
                ),
                indicators={
                    "rsi": curr_rsi,
                    "upper_band": curr_upper,
                    "bearish_divergence": bearish_div,
                },
            )

        return StrategyResult(name=self.name, triggered=False)
