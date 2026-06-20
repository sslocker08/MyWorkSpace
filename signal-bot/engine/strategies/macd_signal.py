"""MACD signal-line crossover with zero-line confirmation.

Bidirectional. Fires LONG when the MACD line crosses ABOVE its signal line, and
SHORT when it crosses BELOW. The zero-line side CONFIRMS conviction (it does not
gate): a bullish cross that happens with MACD already > 0 is a stronger, in-trend
signal than one struggling up from below zero, and symmetrically for the bearish
side. We fold that into confidence (a small boost when the zero-line agrees),
keeping the trigger itself driven purely by the cross so the long/short pair is
symmetric by construction.
"""
import pandas as pd
from .base import BaseStrategy, StrategyResult
from core.indicators import macd


class MACDSignalStrategy(BaseStrategy):
    name = "macd_signal"

    def evaluate(self, ticker: str, df: pd.DataFrame) -> StrategyResult:
        # MACD(12,26,9) needs ~26 bars to seed + 9 for the signal line; require a
        # comfortable buffer so the final two bars are both fully populated.
        if len(df) < 40:
            return StrategyResult(name=self.name, triggered=False)

        close = df["close"]
        macd_line, signal_line, hist = macd(close)

        curr_macd = macd_line.iloc[-1]
        prev_macd = macd_line.iloc[-2]
        curr_signal = signal_line.iloc[-1]
        prev_signal = signal_line.iloc[-2]
        curr_hist = hist.iloc[-1]

        # Guard against NaN at the evaluation point.
        if (
            pd.isna(curr_macd)
            or pd.isna(prev_macd)
            or pd.isna(curr_signal)
            or pd.isna(prev_signal)
        ):
            return StrategyResult(name=self.name, triggered=False)

        bullish_cross = (prev_macd <= prev_signal) and (curr_macd > curr_signal)
        bearish_cross = (prev_macd >= prev_signal) and (curr_macd < curr_signal)

        if bullish_cross:
            above_zero = curr_macd > 0
            # Base 0.5; histogram spread scales conviction; zero-line agreement
            # adds a fixed confirmation boost.
            spread = min(abs(curr_hist) / (abs(curr_macd) + 1e-9), 1.0)
            confidence = 0.5 + spread * 0.2 + (0.2 if above_zero else 0.0)
            confidence = max(0.0, min(confidence, 1.0))
            return StrategyResult(
                name=self.name,
                triggered=True,
                direction="LONG",
                confidence=confidence,
                reason=(
                    f"MACD crossed above signal ({curr_macd:.3f}>{curr_signal:.3f}), "
                    f"{'above' if above_zero else 'below'} zero"
                ),
                indicators={
                    "macd": float(curr_macd),
                    "signal": float(curr_signal),
                    "hist": float(curr_hist),
                    "above_zero": bool(above_zero),
                },
            )

        if bearish_cross:
            below_zero = curr_macd < 0
            spread = min(abs(curr_hist) / (abs(curr_macd) + 1e-9), 1.0)
            confidence = 0.5 + spread * 0.2 + (0.2 if below_zero else 0.0)
            confidence = max(0.0, min(confidence, 1.0))
            return StrategyResult(
                name=self.name,
                triggered=True,
                direction="SHORT",
                confidence=confidence,
                reason=(
                    f"MACD crossed below signal ({curr_macd:.3f}<{curr_signal:.3f}), "
                    f"{'below' if below_zero else 'above'} zero"
                ),
                indicators={
                    "macd": float(curr_macd),
                    "signal": float(curr_signal),
                    "hist": float(curr_hist),
                    "below_zero": bool(below_zero),
                },
            )

        return StrategyResult(name=self.name, triggered=False)
