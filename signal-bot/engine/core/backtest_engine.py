"""Self-contained backtest harness for proving strategy expectancy on history.

WHY this exists (decision rationale, not a description of the code):
    A trading signal is only trustworthy if it has demonstrated *positive
    expectancy* on out-of-sample-shaped data BEFORE we wire it to real capital.
    This module is the "substantiation / negative-screening" gate from
    ai-native-workflow-planning: instead of building an MVP and trusting a
    strategy because it "looks reasonable", we cheaply simulate it across an
    entire bar series and let the aggregate stats (win rate, average return,
    Sharpe, max drawdown) PRUNE strategies that are sure to fail. It is far
    cheaper to kill a losing edge in simulation than after deployment.

    It is deliberately self-contained: NO network, NO Polygon, NO database. It
    consumes a DataFrame the caller already has (e.g. a golden fixture or cached
    history) so it is deterministic and unit-testable. The exit model is
    intentionally simple and conservative — entry at the NEXT bar's open (never
    the signal bar's close, which would be look-ahead), exit at whichever of
    stop_loss / tp2 / hold-horizon is hit first, evaluated against each bar's
    low/high. We use tp2 (not tp1/tp3) because tp2 is the level the RiskManager's
    risk_reward metric is defined on, so the backtest measures the same edge the
    live RR-gate filters on.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass
class BacktestResult:
    total_trades: int
    win_rate: float       # fraction of trades with return > 0, in [0, 1]
    avg_return: float     # mean per-trade return (fraction, e.g. 0.02 = +2%)
    sharpe: float         # mean/std of per-trade returns (0.0 when undefined)
    max_drawdown: float   # most negative cumulative equity dip, <= 0.0


class BacktestEngine:
    """Vectorized-walk backtest over a single OHLCV series.

    The walk is bar-by-bar because each strategy's .evaluate() needs the trailing
    window up to a given bar; we feed it df.iloc[:i+1] so it can never see the
    future. Trade simulation itself uses slicing (no per-bar Python loop inside a
    trade), keeping it cheap.
    """

    def run(
        self,
        df: pd.DataFrame,
        strategy,
        risk_manager,
        hold_bars: int = 10,
    ) -> BacktestResult:
        n = len(df)
        returns: list[float] = []

        i = 0
        while i < n - 1:  # need at least one bar after the signal to enter
            window = df.iloc[: i + 1]
            res = strategy.evaluate("BT", window)

            if not res.triggered or res.direction is None:
                i += 1
                continue

            levels = risk_manager.calculate(window, res.direction)
            # Respect the same RR-gate the live engine uses; skip junk setups.
            if not risk_manager.is_valid_setup(levels):
                i += 1
                continue

            entry_idx = i + 1  # enter at the NEXT bar's open (no look-ahead)
            if entry_idx >= n:
                break
            entry_price = float(df["open"].iloc[entry_idx])

            ret, exit_idx = self._simulate_trade(
                df, entry_idx, entry_price, res.direction, levels, hold_bars
            )
            returns.append(ret)

            # Resume scanning AFTER the trade closes (no overlapping positions).
            i = exit_idx + 1

        return self._aggregate(returns)

    def _simulate_trade(
        self,
        df: pd.DataFrame,
        entry_idx: int,
        entry_price: float,
        direction: str,
        levels,
        hold_bars: int,
    ) -> tuple[float, int]:
        """Walk forward from entry, exit on stop_loss / tp2 / hold-horizon.

        Returns (signed_return_fraction, exit_bar_index). When both stop and target
        fall inside the same bar we conservatively assume the STOP hit first
        (worst-case fill) — a backtest that flatters itself is worse than useless.
        """
        n = len(df)
        last_idx = min(entry_idx + hold_bars, n - 1)

        stop = levels.stop_loss
        target = levels.tp2

        for j in range(entry_idx, last_idx + 1):
            bar_high = float(df["high"].iloc[j])
            bar_low = float(df["low"].iloc[j])

            if direction == "LONG":
                stop_hit = bar_low <= stop
                target_hit = bar_high >= target
                if stop_hit:  # worst-case-first
                    return self._ret(entry_price, stop, direction), j
                if target_hit:
                    return self._ret(entry_price, target, direction), j
            else:  # SHORT
                stop_hit = bar_high >= stop
                target_hit = bar_low <= target
                if stop_hit:
                    return self._ret(entry_price, stop, direction), j
                if target_hit:
                    return self._ret(entry_price, target, direction), j

        # Timed out: mark-to-close at the horizon bar.
        exit_price = float(df["close"].iloc[last_idx])
        return self._ret(entry_price, exit_price, direction), last_idx

    @staticmethod
    def _ret(entry: float, exit_price: float, direction: str) -> float:
        if entry == 0:
            return 0.0
        raw = (exit_price - entry) / entry
        return raw if direction == "LONG" else -raw

    @staticmethod
    def _aggregate(returns: list[float]) -> BacktestResult:
        total = len(returns)
        if total == 0:
            return BacktestResult(0, 0.0, 0.0, 0.0, 0.0)

        arr = np.asarray(returns, dtype=float)
        win_rate = float((arr > 0).mean())
        avg_return = float(arr.mean())

        std = float(arr.std(ddof=0))
        sharpe = float(avg_return / std) if std > 0 else 0.0

        # Max drawdown of the cumulative (additive) equity curve. Always <= 0.
        equity = np.cumsum(arr)
        running_max = np.maximum.accumulate(equity)
        drawdowns = equity - running_max  # all <= 0
        max_drawdown = float(drawdowns.min()) if len(drawdowns) else 0.0
        if max_drawdown > 0:
            max_drawdown = 0.0

        return BacktestResult(
            total_trades=total,
            win_rate=win_rate,
            avg_return=avg_return,
            sharpe=sharpe,
            max_drawdown=max_drawdown,
        )
