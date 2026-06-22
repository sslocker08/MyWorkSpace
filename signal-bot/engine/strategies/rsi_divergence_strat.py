"""RSI divergence reversal signal.

Bidirectional, counter-trend. Uses the rsi_divergence() indicator (two-swing
price-vs-RSI slope comparison) directly:
  * bullish divergence (price lower-low while RSI higher-low) -> LONG
  * bearish divergence (price higher-high while RSI lower-high) -> SHORT
Divergence is a leading momentum-exhaustion signal; like the reversal strategies
it is counter-trend and inherently riskier, so it should be sized / gated
downstream. Direction is set by the divergence kind so the long/short pair is
symmetric by construction.
"""
import pandas as pd
from .base import BaseStrategy, StrategyResult
from core.indicators import rsi, rsi_divergence


class RSIDivergenceStrategy(BaseStrategy):
    name = "rsi_divergence"

    LOOKBACK = 20

    def evaluate(self, ticker: str, df: pd.DataFrame) -> StrategyResult:
        # RSI(14) warmup + the divergence lookback + a buffer for two swings.
        if len(df) < 14 + self.LOOKBACK + 5:
            return StrategyResult(name=self.name, triggered=False)

        close = df["close"]
        rsi_vals = rsi(close, 14)

        curr_rsi = rsi_vals.iloc[-1]
        if pd.isna(curr_rsi):
            return StrategyResult(name=self.name, triggered=False)

        div = rsi_divergence(close, rsi_vals, lookback=self.LOOKBACK)
        bullish = div.get("bullish", False)
        bearish = div.get("bearish", False)

        # If both fire (degenerate path), prefer neither — an ambiguous structure
        # is not a clean reversal setup.
        if bullish and not bearish:
            confidence = self._confidence(curr_rsi, bullish_side=True)
            return StrategyResult(
                name=self.name,
                triggered=True,
                direction="LONG",
                confidence=confidence,
                reason=f"Bullish RSI divergence (price lower-low, RSI higher-low), RSI={curr_rsi:.1f}",
                indicators={"rsi": float(curr_rsi), "bullish_divergence": True},
            )

        if bearish and not bullish:
            confidence = self._confidence(curr_rsi, bullish_side=False)
            return StrategyResult(
                name=self.name,
                triggered=True,
                direction="SHORT",
                confidence=confidence,
                reason=f"Bearish RSI divergence (price higher-high, RSI lower-high), RSI={curr_rsi:.1f}",
                indicators={"rsi": float(curr_rsi), "bearish_divergence": True},
            )

        return StrategyResult(name=self.name, triggered=False)

    @staticmethod
    def _confidence(curr_rsi: float, bullish_side: bool) -> float:
        """A more extreme RSI at the divergence point -> a stronger exhaustion read.

        For bullish setups, lower RSI (more oversold) is stronger; for bearish,
        higher RSI (more overbought) is stronger. Base 0.5 + up to 0.3.
        """
        if bullish_side:
            extremity = max(0.0, min((50.0 - curr_rsi) / 50.0, 1.0))
        else:
            extremity = max(0.0, min((curr_rsi - 50.0) / 50.0, 1.0))
        return max(0.0, min(0.5 + extremity * 0.3, 1.0))
