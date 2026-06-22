"""Relative Rotation Graph (RRG) — sector rotation vs a benchmark.

WHAT this computes
==================
An RRG (Julius de Kempenaer, RRG Research / StockCharts) plots each sector ETF
on two axes, both centered at 100:

  * X = **RS-Ratio**     — is the sector OUT/UNDER-performing the benchmark?
  * Y = **RS-Momentum**  — is that relative performance ACCELERATING or fading?

The (x, y) position relative to (100, 100) places each sector in one of four
quadrants that describe a typical clockwise rotation cycle:

    RS-Mom > 100 │ Improving (<100, >100) │ Leading   (>100, >100)
                 │ (recovering laggards)  │ (out-perform & rising)
    ─────────────┼────────────────────────┼───────────────────────  RS-Ratio = 100
    RS-Mom < 100 │ Lagging   (<100, <100) │ Weakening (>100, <100)
                 │ (under-perform & worse)│ (out-perform but fading)

THE FORMULA (and why these windows) — provenance
================================================
There is no single public "official" RRG formula; RRG Research keeps the exact
normalization proprietary. This module implements the WIDELY-DOCUMENTED,
deterministic reconstruction used across the open-source RRG community (e.g.
StockCharts' published description, PineScript/Python RRG ports). Steps:

  1. RS (relative strength) = sector_price / benchmark_price * 100.
     (The *100 is cosmetic — it cancels in the normalization below — but keeps
     RS on a familiar scale.)
  2. Smooth RS with a **Weighted Moving Average** WMA(``wma_window``=10). A WMA
     (linearly weighted, recent bars weigh more) is the de-facto RRG smoother:
     it is more responsive than an SMA yet far less jumpy than raw RS, which
     keeps the tails readable. 10 bars ≈ two trading weeks — the JdK-style short
     smoother. (DEBT/choice: 10 is the common community default; a longer window
     gives smoother, slower-rotating tails.)
  3. RS-Ratio = 100-centered z-score of the smoothed RS over a rolling window:
        RS-Ratio = 100 + (RS_wma - rolling_mean(RS_wma)) / rolling_std(RS_wma)
     so a sector trading at its own recent-average relative strength sits at 100;
     +1 std of relative out-performance reads ~101, etc. Centering on the
     security's OWN rolling distribution (not a cross-sectional one) matches the
     JdK property that 100 == "in line with the benchmark trend".
  4. RS-Momentum = 100-based **rate-of-change of the smoothed raw RS** over
     ``mom_period`` (=12) bars, scaled onto the RS-Ratio's ~±points scale:
        RS-Mom = 100 + MOM_SCALE * (RS_wma / RS_wma.shift(mom_period) - 1)
     12 bars ≈ the standard JdK momentum horizon (about half a trading month).
     IMPORTANT: momentum is measured off the RAW smoothed RS, NOT off the
     z-scored RS-Ratio. A rolling z-score of a steadily-trending series PLATEAUS
     and then mean-reverts (the rolling mean catches up), so the change of
     RS-Ratio collapses to ~0 — or even flips sign — for a sector that is in fact
     still out-performing, which would invert the quadrant. The pct-change of raw
     smoothed RS is monotone in the true relative trend: still gaining on the
     benchmark -> momentum >100, still losing -> <100.

  The RS-Ratio z-score uses a rolling window = ``norm_window`` (derived from the
  data length, default ≈ the full usable history, min-bounded) so the centering
  is stable. Determinism: every step is pure pandas math on the input prices —
  no RNG, no wall-clock — so identical prices always yield identical output.

DEGRADE, NEVER RAISE
====================
``compute_sector_rrg`` is wired into a public endpoint and the scheduler-style
flows, so (like ``market_intelligence``) it NEVER raises: a fetch failure or a
too-short / empty frame returns ``{"ok": False, "sectors": {}}`` (degraded) and
the UI shows an explicit empty state.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tuning constants (documented choices — see module docstring "provenance")
# ---------------------------------------------------------------------------
DEFAULT_WMA_WINDOW = 10     # WMA smoother for RS (≈2 trading weeks, JdK-style)
DEFAULT_MOM_PERIOD = 12     # rate-of-change horizon for RS-Momentum (~½ month)
MOM_SCALE = 100.0           # maps the raw-RS pct-change onto the ~±points RS-Ratio scale
TAIL_LENGTH = 8             # last N RRG points drawn as each sector's trajectory
MIN_BARS = 40               # below this the z-score normalization is too thin

# Human-readable names for the 11 SPDR GICS sector ETFs (XLK -> Technology, …).
SECTOR_NAMES: dict[str, str] = {
    "XLK": "Technology",
    "XLV": "Health Care",
    "XLF": "Financials",
    "XLY": "Consumer Discretionary",
    "XLP": "Consumer Staples",
    "XLE": "Energy",
    "XLI": "Industrials",
    "XLB": "Materials",
    "XLRE": "Real Estate",
    "XLU": "Utilities",
    "XLC": "Communication Services",
}


def sector_name(ticker: str) -> str:
    """Human-readable sector name for an ETF ticker (falls back to the ticker)."""
    return SECTOR_NAMES.get(ticker.upper(), ticker)


def _wma(series: pd.Series, window: int) -> pd.Series:
    """Linearly-weighted moving average (recent bars weigh more).

    weights = 1,2,…,window (normalized). Deterministic; NaN until ``window``
    bars exist. This is the standard RRG RS-smoother.
    """
    if window <= 1:
        return series.astype(float)
    weights = np.arange(1, window + 1, dtype=float)
    weights /= weights.sum()
    return series.rolling(window).apply(
        lambda x: float(np.dot(x, weights)), raw=True
    )


def _zscore_centered(series: pd.Series, window: int, center: float = 100.0) -> pd.Series:
    """Center the RS-Ratio at ``center`` using a rolling z-score.

    center + (x - rolling_mean) / rolling_std — measures where the smoothed RS
    sits in its OWN recent distribution, so "in line with its recent relative
    strength" reads 100, +1 std of out-performance reads ~101, etc. A zero/NaN
    rolling-std bar (perfectly flat history) yields exactly ``center`` so a flat
    sector lands on the axis rather than producing inf/NaN.
    """
    roll = series.rolling(window, min_periods=max(2, window // 2))
    std = roll.std(ddof=0)
    z = (series - roll.mean()) / std
    z = z.where(np.isfinite(z), 0.0)  # flat std -> 0 deviation -> sits at center
    return center + z


def quadrant_for(rs_ratio: float, rs_momentum: float) -> str:
    """Map an (RS-Ratio, RS-Momentum) point to its RRG quadrant label.

    Boundary convention: the >=100 side is treated as the "strong"/"rising"
    half so a point sitting exactly on an axis is classified deterministically
    (>=100 counts as Leading-side / rising-side).
    """
    strong = rs_ratio >= 100.0
    rising = rs_momentum >= 100.0
    if strong and rising:
        return "Leading"
    if strong and not rising:
        return "Weakening"
    if not strong and rising:
        return "Improving"
    return "Lagging"


def calc_rrg(
    prices_df: pd.DataFrame,
    benchmark: str = "SPY",
    wma_window: int = DEFAULT_WMA_WINDOW,
    mom_period: int = DEFAULT_MOM_PERIOD,
    tail_length: int = TAIL_LENGTH,
) -> dict:
    """Compute RRG coordinates for every sector column vs the benchmark column.

    Parameters
    ----------
    prices_df : DataFrame
        Wide frame of CLOSE prices, ascending DatetimeIndex, one column per
        ticker. MUST contain ``benchmark`` plus >=1 sector column.
    benchmark : str
        Benchmark column name (default ``"SPY"``).
    wma_window, mom_period, tail_length : int
        See module docstring. Windows for the RS smoother, the momentum
        rate-of-change horizon, and how many trailing points the tail keeps.

    Returns
    -------
    dict[ticker -> {rs_ratio, rs_momentum, quadrant, tail}]
        ``rs_ratio`` / ``rs_momentum`` are the latest finite values (centered at
        100). ``tail`` is a list of ``{rs_ratio, rs_momentum}`` for the last
        ``tail_length`` bars (oldest→newest) for the chart trajectory. Sectors
        with insufficient/blank data are omitted (NOT errored).

    This is PURE math (no I/O); it may propagate a programming error but does not
    fetch. The network-facing wrapper ``compute_sector_rrg`` swallows everything.
    """
    out: dict[str, dict] = {}
    if prices_df is None or prices_df.empty or benchmark not in prices_df.columns:
        return out

    bench = pd.to_numeric(prices_df[benchmark], errors="coerce")
    if bench.dropna().empty:
        return out

    # Rolling window for the z-score centering: use most of the usable history so
    # the "100 == own recent average" centering is stable, but cap it so very
    # long frames don't make the center drift too slowly. Bounded to [20, 100].
    usable = int(bench.dropna().shape[0])
    norm_window = int(min(100, max(20, usable - mom_period)))

    for ticker in prices_df.columns:
        if ticker == benchmark:
            continue
        price = pd.to_numeric(prices_df[ticker], errors="coerce")

        # Align sector & benchmark on shared non-NaN bars.
        pair = pd.concat([price, bench], axis=1, keys=["p", "b"]).dropna()
        if len(pair) < MIN_BARS:
            continue

        rs = pair["p"] / pair["b"] * 100.0
        rs_wma = _wma(rs, wma_window)

        rs_ratio = _zscore_centered(rs_wma, norm_window, center=100.0)
        # RS-Momentum = 100-based rate-of-change of the smoothed RAW relative
        # strength over ``mom_period`` bars, scaled by ``MOM_SCALE``:
        #     rs_mom = 100 + MOM_SCALE * (rs_wma / rs_wma.shift(mom_period) - 1)
        # We measure momentum off the RAW smoothed RS — NOT off the z-scored
        # RS-Ratio — on purpose: a rolling z-score of a steadily-trending series
        # PLATEAUS and then mean-reverts (the rolling mean catches up), so the
        # change of RS-Ratio collapses to ~0 or even flips sign for a genuinely
        # still-out-performing sector, inverting the quadrant. The pct-change of
        # raw smoothed RS is monotone in the true relative trend: a sector still
        # gaining on the benchmark reads momentum >100, one still losing <100 —
        # the JdK property the chart relies on. MOM_SCALE puts a typical monthly
        # relative move on the same ~±a-few-points scale as the RS-Ratio axis.
        rs_mom = 100.0 + MOM_SCALE * (rs_wma / rs_wma.shift(mom_period) - 1.0)

        # Combined valid tail (both series finite).
        joined = pd.concat([rs_ratio, rs_mom], axis=1, keys=["ratio", "mom"]).dropna()
        joined = joined[np.isfinite(joined["ratio"]) & np.isfinite(joined["mom"])]
        if joined.empty:
            continue

        last_ratio = float(joined["ratio"].iloc[-1])
        last_mom = float(joined["mom"].iloc[-1])
        tail_df = joined.iloc[-tail_length:]
        tail = [
            {"rs_ratio": round(float(r), 4), "rs_momentum": round(float(m), 4)}
            for r, m in zip(tail_df["ratio"], tail_df["mom"])
        ]

        out[ticker] = {
            "rs_ratio": round(last_ratio, 4),
            "rs_momentum": round(last_mom, 4),
            "quadrant": quadrant_for(last_ratio, last_mom),
            "tail": tail,
        }

    return out


async def compute_sector_rrg(
    fetcher,
    days: int = 300,
    benchmark: str = "SPY",
    wma_window: int = DEFAULT_WMA_WINDOW,
    mom_period: int = DEFAULT_MOM_PERIOD,
) -> dict:
    """Fetch the 11 sector ETFs + benchmark and compute their RRG. NEVER raises.

    On ANY failure (fetch error, empty frame, no benchmark, too-short history)
    returns the degraded shape ``{"ok": False, "sectors": {}}`` so the endpoint
    can serve a 200 with an explicit empty state instead of a 500.

    Returns
    -------
    {
      "ok": bool,                # False == degraded (no usable data)
      "as_of": ISO-8601 str,
      "benchmark": str,
      "sectors": {
         ticker: {rs_ratio, rs_momentum, quadrant, tail, name}, …
      }
    }
    """
    from universe.etf_universe import get_sector_etfs  # local: avoid import cycles

    as_of = datetime.utcnow().isoformat()
    try:
        sector_tickers = get_sector_etfs()
        tickers = list(dict.fromkeys(sector_tickers + [benchmark]))
        prices = await fetcher.get_sector_prices(tickers, days=days)
    except Exception as exc:  # noqa: BLE001 — degrade, never raise
        logger.warning("compute_sector_rrg: fetch failed (%s) — degraded", exc)
        return {"ok": False, "as_of": as_of, "benchmark": benchmark, "sectors": {}}

    try:
        rrg = calc_rrg(
            prices,
            benchmark=benchmark,
            wma_window=wma_window,
            mom_period=mom_period,
        )
    except Exception as exc:  # noqa: BLE001 — compute bug must not 500 the endpoint
        logger.warning("compute_sector_rrg: calc failed (%s) — degraded", exc)
        return {"ok": False, "as_of": as_of, "benchmark": benchmark, "sectors": {}}

    if not rrg:
        return {"ok": False, "as_of": as_of, "benchmark": benchmark, "sectors": {}}

    sectors = {
        ticker: {**vals, "name": sector_name(ticker)}
        for ticker, vals in rrg.items()
    }
    return {"ok": True, "as_of": as_of, "benchmark": benchmark, "sectors": sectors}


# ---------------------------------------------------------------------------
# Simpler per-sector momentum ranking (21d / 63d total return) — same prices.
# ---------------------------------------------------------------------------
MOM_SHORT_LOOKBACK = 21   # ~1 trading month
MOM_LONG_LOOKBACK = 63    # ~1 trading quarter


def calc_sector_momentum(
    prices_df: pd.DataFrame,
    benchmark: str = "SPY",
    short_lb: int = MOM_SHORT_LOOKBACK,
    long_lb: int = MOM_LONG_LOOKBACK,
    rrg: Optional[dict] = None,
) -> list[dict]:
    """Per-sector 21d / 63d total-return ranking (descending by 21d return).

    Pure math. ``rrg`` (output of :func:`calc_rrg`) is optional; when supplied
    each row is annotated with the sector's RRG quadrant. Sectors lacking enough
    bars for the SHORT lookback are skipped.
    """
    rrg = rrg or {}
    rows: list[dict] = []
    if prices_df is None or prices_df.empty:
        return rows

    def total_return(s: pd.Series, lb: int) -> Optional[float]:
        s = pd.to_numeric(s, errors="coerce").dropna()
        if len(s) <= lb:
            return None
        start = float(s.iloc[-(lb + 1)])
        end = float(s.iloc[-1])
        if start == 0 or not np.isfinite(start) or not np.isfinite(end):
            return None
        return (end - start) / start

    for ticker in prices_df.columns:
        if ticker == benchmark:
            continue
        r21 = total_return(prices_df[ticker], short_lb)
        if r21 is None:
            continue
        r63 = total_return(prices_df[ticker], long_lb)
        rows.append(
            {
                "ticker": ticker,
                "name": sector_name(ticker),
                "ret_21d": round(r21, 4),
                "ret_63d": round(r63, 4) if r63 is not None else None,
                "quadrant": (rrg.get(ticker, {}) or {}).get("quadrant"),
            }
        )

    rows.sort(key=lambda x: x["ret_21d"], reverse=True)
    return rows


async def compute_sector_momentum(
    fetcher,
    days: int = 300,
    benchmark: str = "SPY",
) -> dict:
    """Fetch sectors + benchmark and rank their 21d/63d momentum. NEVER raises.

    Degraded shape on any failure: ``{"ok": False, "sectors": []}``.
    """
    from universe.etf_universe import get_sector_etfs

    as_of = datetime.utcnow().isoformat()
    try:
        tickers = list(dict.fromkeys(get_sector_etfs() + [benchmark]))
        prices = await fetcher.get_sector_prices(tickers, days=days)
    except Exception as exc:  # noqa: BLE001 — degrade, never raise
        logger.warning("compute_sector_momentum: fetch failed (%s) — degraded", exc)
        return {"ok": False, "as_of": as_of, "benchmark": benchmark, "sectors": []}

    try:
        rrg = calc_rrg(prices, benchmark=benchmark)
        rows = calc_sector_momentum(prices, benchmark=benchmark, rrg=rrg)
    except Exception as exc:  # noqa: BLE001
        logger.warning("compute_sector_momentum: calc failed (%s) — degraded", exc)
        return {"ok": False, "as_of": as_of, "benchmark": benchmark, "sectors": []}

    if not rows:
        return {"ok": False, "as_of": as_of, "benchmark": benchmark, "sectors": []}
    return {"ok": True, "as_of": as_of, "benchmark": benchmark, "sectors": rows}
