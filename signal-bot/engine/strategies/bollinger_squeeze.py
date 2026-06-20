"""Bollinger squeeze breakout.

Bidirectional. A "squeeze" is a volatility contraction — Bollinger Band width
falls toward a recent low — and squeezes resolve with an expansion (breakout).
We require that the band width on the PRIOR bar sat near its N-bar low (the coil),
THEN the latest close breaks OUT of the bands: close above the upper band -> LONG,
close below the lower band -> SHORT. Direction is set purely by the breakout side
so the long/short pair is symmetric by construction.

We test the squeeze on the bar BEFORE the breakout, because the breakout bar
itself expands the bands (width jumps), so reading width on the breakout bar would
mask the very coil we are keying on.
"""
import pandas as pd
from .base import BaseStrategy, StrategyResult
from core.indicators import bbands, bb_width


class BollingerSqueezeStrategy(BaseStrategy):
    name = "bollinger_squeeze"

    # How many bars of width history define "the recent low", and how close to it
    # the prior bar's width must sit to count as a squeeze.
    SQUEEZE_LOOKBACK = 20
    SQUEEZE_TOL = 1.15  # prior width within 15% of the lookback-min width

    def evaluate(self, ticker: str, df: pd.DataFrame) -> StrategyResult:
        # 20 for Bollinger + SQUEEZE_LOOKBACK of width history + a warmup buffer.
        if len(df) < 20 + self.SQUEEZE_LOOKBACK + 5:
            return StrategyResult(name=self.name, triggered=False)

        close = df["close"]
        upper, middle, lower = bbands(close, 20, 2.0)
        width = bb_width(close, 20)

        curr_close = close.iloc[-1]
        curr_upper = upper.iloc[-1]
        curr_lower = lower.iloc[-1]
        prev_width = width.iloc[-2]
        width_hist = width.iloc[-(self.SQUEEZE_LOOKBACK + 1) : -1]  # exclude breakout bar

        if (
            pd.isna(curr_close)
            or pd.isna(curr_upper)
            or pd.isna(curr_lower)
            or pd.isna(prev_width)
            or width_hist.isna().any()
            or len(width_hist) < self.SQUEEZE_LOOKBACK
        ):
            return StrategyResult(name=self.name, triggered=False)

        min_width = float(width_hist.min())
        # Squeeze: the bar before the breakout coiled near its recent-low width.
        was_squeezed = prev_width <= min_width * self.SQUEEZE_TOL

        breakout_up = curr_close > curr_upper
        breakout_down = curr_close < curr_lower

        if was_squeezed and breakout_up:
            confidence = self._confidence(prev_width, min_width)
            return StrategyResult(
                name=self.name,
                triggered=True,
                direction="LONG",
                confidence=confidence,
                reason=(
                    f"Squeeze breakout UP: prev_width={prev_width:.4f} "
                    f"(min={min_width:.4f}), close>{curr_upper:.2f}"
                ),
                indicators={
                    "prev_width": float(prev_width),
                    "min_width": min_width,
                    "upper_band": float(curr_upper),
                    "lower_band": float(curr_lower),
                },
            )

        if was_squeezed and breakout_down:
            confidence = self._confidence(prev_width, min_width)
            return StrategyResult(
                name=self.name,
                triggered=True,
                direction="SHORT",
                confidence=confidence,
                reason=(
                    f"Squeeze breakout DOWN: prev_width={prev_width:.4f} "
                    f"(min={min_width:.4f}), close<{curr_lower:.2f}"
                ),
                indicators={
                    "prev_width": float(prev_width),
                    "min_width": min_width,
                    "upper_band": float(curr_upper),
                    "lower_band": float(curr_lower),
                },
            )

        return StrategyResult(name=self.name, triggered=False)

    @staticmethod
    def _confidence(prev_width: float, min_width: float) -> float:
        """Tighter coil (prev_width closer to the recent min) -> higher conviction."""
        if prev_width <= 0:
            return 0.5
        tightness = min(min_width / prev_width, 1.0)  # ->1.0 when at the min
        return max(0.0, min(0.5 + tightness * 0.4, 1.0))
