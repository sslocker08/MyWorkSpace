"""Deterministic tests for the RRG sector-rotation engine.

NO LIVE NETWORK. The only external seam (``fetcher.get_sector_prices``) is a
stub returning analytic price frames built without any RNG / wall-clock, per the
conftest determinism contract (this is money logic — a silent change must be a
HARD failure, not flaky noise).

The price frames are constructed so the relative-strength relationships are
UNAMBIGUOUS: one sector clearly out-performs SPY with rising momentum (Leading /
Improving), another clearly under-performs with falling momentum (Lagging /
Weakening). Exact RRG values aren't asserted (they depend on the z-score
windows); the QUADRANT and the 100-centering are, which is what the chart and
any downstream consumer actually read.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from core.sector_rotation import (
    calc_rrg,
    calc_sector_momentum,
    compute_sector_momentum,
    compute_sector_rrg,
    quadrant_for,
    sector_name,
    SECTOR_NAMES,
    TAIL_LENGTH,
)


# ---------------------------------------------------------------------------
# Analytic price-frame builders (RNG-free, version-stable)
# ---------------------------------------------------------------------------
def _index(n: int) -> pd.DatetimeIndex:
    return pd.date_range("2020-01-01", periods=n, freq="B")


def _series(n: int, daily_ret: float, start: float = 100.0) -> np.ndarray:
    """A clean compounding path at a constant daily return (deterministic)."""
    return start * np.cumprod(np.full(n, 1.0 + daily_ret))


def _path_from_rets(rets: np.ndarray, start: float = 100.0) -> np.ndarray:
    return start * np.cumprod(1.0 + rets)


def _rrg_frame(n: int = 160) -> pd.DataFrame:
    """A frame with SPY plus a clearly-leading and a clearly-lagging sector.

    The quadrant is decided by BOTH axes: RS-Ratio (level of relative strength,
    >100 == out-performing) and RS-Momentum (rising/falling RS-Ratio, >100 ==
    relative strength still climbing). A sector that steadily out-performs SPY
    has a RS-Ratio that climbs into >100 AND a positive RS-Ratio slope (momentum
    >100) -> Leading. Symmetric steady under-performance -> Lagging.

    * SPY        — gentle steady uptrend (the benchmark).
    * XLK strong — steadily out-performs SPY -> RS-Ratio rising into the top half
                   with positive momentum -> Leading.
    * XLU weak   — steadily under-performs SPY -> RS-Ratio falling into the bottom
                   half with negative momentum -> Lagging.
    """
    spy = _path_from_rets(np.full(n, 0.0003))      # benchmark: slow grind up
    strong = _path_from_rets(np.full(n, 0.0011))   # steady out-performance
    weak = _path_from_rets(np.full(n, -0.0005))    # steady under-performance

    return pd.DataFrame(
        {"SPY": spy, "XLK": strong, "XLU": weak},
        index=_index(n),
    )


class _StubFetcher:
    """Injectable fetcher returning a fixed frame; can be told to fail."""

    def __init__(self, frame: pd.DataFrame | None = None, fail: bool = False):
        self._frame = frame
        self._fail = fail

    async def get_sector_prices(self, tickers, days=365):
        if self._fail:
            raise RuntimeError("sector fetch failed")
        # Mimic the real fetcher: only return columns it "has".
        cols = [t for t in tickers if self._frame is not None and t in self._frame.columns]
        return self._frame[cols] if cols else pd.DataFrame()


# ---------------------------------------------------------------------------
# 1. quadrant_for — all four sign combinations vs 100
# ---------------------------------------------------------------------------
def test_quadrant_four_combinations():
    assert quadrant_for(101.0, 101.0) == "Leading"
    assert quadrant_for(101.0, 99.0) == "Weakening"
    assert quadrant_for(99.0, 99.0) == "Lagging"
    assert quadrant_for(99.0, 101.0) == "Improving"


def test_quadrant_boundary_on_axis_is_deterministic():
    # Exactly 100 counts as the strong/rising side (>=100), so (100,100)->Leading.
    assert quadrant_for(100.0, 100.0) == "Leading"
    assert quadrant_for(100.0, 99.9) == "Weakening"
    assert quadrant_for(99.9, 100.0) == "Improving"


# ---------------------------------------------------------------------------
# 2. calc_rrg — centering at 100 and the strong/weak quadrants
# ---------------------------------------------------------------------------
def test_calc_rrg_centers_near_100():
    rrg = calc_rrg(_rrg_frame())
    assert set(rrg.keys()) == {"XLK", "XLU"}
    for vals in rrg.values():
        # z-score centering keeps values in a tight band around 100 (a few std).
        assert 90.0 < vals["rs_ratio"] < 110.0
        assert 90.0 < vals["rs_momentum"] < 110.0


def test_calc_rrg_strong_sector_is_leading_or_improving():
    rrg = calc_rrg(_rrg_frame())
    assert rrg["XLK"]["quadrant"] in {"Leading", "Improving"}
    # rising RS-momentum -> y above the 100 axis
    assert rrg["XLK"]["rs_momentum"] >= 100.0


def test_calc_rrg_weak_sector_is_lagging_or_weakening():
    rrg = calc_rrg(_rrg_frame())
    assert rrg["XLU"]["quadrant"] in {"Lagging", "Weakening"}
    # falling RS-momentum -> y below the 100 axis
    assert rrg["XLU"]["rs_momentum"] <= 100.0


def test_calc_rrg_tail_is_bounded_and_shaped():
    rrg = calc_rrg(_rrg_frame())
    for vals in rrg.values():
        tail = vals["tail"]
        assert 0 < len(tail) <= TAIL_LENGTH
        last = tail[-1]
        assert set(last.keys()) == {"rs_ratio", "rs_momentum"}
        # last tail point equals the reported latest coordinate
        assert last["rs_ratio"] == pytest.approx(vals["rs_ratio"], rel=1e-6)
        assert last["rs_momentum"] == pytest.approx(vals["rs_momentum"], rel=1e-6)


def test_calc_rrg_deterministic():
    a = calc_rrg(_rrg_frame())
    b = calc_rrg(_rrg_frame())
    assert a == b


def test_calc_rrg_empty_or_missing_benchmark_returns_empty():
    assert calc_rrg(pd.DataFrame()) == {}
    # frame without the benchmark column
    n = 80
    df = pd.DataFrame({"XLK": _series(n, 0.001)}, index=_index(n))
    assert calc_rrg(df, benchmark="SPY") == {}


def test_calc_rrg_skips_short_history():
    # Fewer than MIN_BARS aligned bars -> sector skipped (not errored).
    n = 20
    df = pd.DataFrame(
        {"SPY": _series(n, 0.0003), "XLK": _series(n, 0.001)},
        index=_index(n),
    )
    assert calc_rrg(df) == {}


# ---------------------------------------------------------------------------
# 3. compute_sector_rrg — async wrapper, degrade-not-raise contract
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_compute_sector_rrg_ok():
    # Build a full 11-sector + SPY frame so the wrapper exercises the real list.
    n = 160
    cols = {"SPY": _path_from_rets(np.full(n, 0.0003))}
    for i, t in enumerate(SECTOR_NAMES):
        # spread the sectors across steady out/under-performance vs SPY
        cols[t] = _path_from_rets(np.full(n, 0.0003 + 0.0002 * (i - 5)))
    frame = pd.DataFrame(cols, index=_index(n))

    res = await compute_sector_rrg(_StubFetcher(frame))
    assert res["ok"] is True
    assert res["benchmark"] == "SPY"
    assert "as_of" in res
    assert len(res["sectors"]) >= 1
    for ticker, vals in res["sectors"].items():
        assert vals["name"] == sector_name(ticker)
        assert {"rs_ratio", "rs_momentum", "quadrant", "tail", "name"} <= set(vals)


@pytest.mark.asyncio
async def test_compute_sector_rrg_degrades_on_fetch_failure():
    res = await compute_sector_rrg(_StubFetcher(fail=True))
    assert res["ok"] is False
    assert res["sectors"] == {}
    # still a well-formed, serializable payload (no raise)
    assert res["benchmark"] == "SPY"
    assert "as_of" in res


@pytest.mark.asyncio
async def test_compute_sector_rrg_degrades_on_empty_frame():
    res = await compute_sector_rrg(_StubFetcher(pd.DataFrame()))
    assert res["ok"] is False
    assert res["sectors"] == {}


# ---------------------------------------------------------------------------
# 4. momentum ranking
# ---------------------------------------------------------------------------
def test_calc_sector_momentum_ranks_descending():
    rows = calc_sector_momentum(_rrg_frame())
    tickers = [r["ticker"] for r in rows]
    assert "SPY" not in tickers          # benchmark excluded
    assert set(tickers) == {"XLK", "XLU"}
    # XLK out-performs -> ranked first (descending by 21d return)
    assert rows[0]["ticker"] == "XLK"
    assert rows[0]["ret_21d"] > rows[1]["ret_21d"]
    # quadrant annotation flows through when rrg supplied
    rrg = calc_rrg(_rrg_frame())
    rows2 = calc_sector_momentum(_rrg_frame(), rrg=rrg)
    assert rows2[0]["quadrant"] in {"Leading", "Improving", "Weakening", "Lagging"}


@pytest.mark.asyncio
async def test_compute_sector_momentum_degrades_on_failure():
    res = await compute_sector_momentum(_StubFetcher(fail=True))
    assert res["ok"] is False
    assert res["sectors"] == []


@pytest.mark.asyncio
async def test_compute_sector_momentum_ok():
    res = await compute_sector_momentum(_StubFetcher(_rrg_frame()))
    assert res["ok"] is True
    assert isinstance(res["sectors"], list)
    assert res["sectors"][0]["ticker"] == "XLK"


# ---------------------------------------------------------------------------
# 5. name map
# ---------------------------------------------------------------------------
def test_sector_name_map():
    assert sector_name("XLK") == "Technology"
    assert sector_name("XLRE") == "Real Estate"
    assert sector_name("UNKNOWN") == "UNKNOWN"   # falls back to the ticker
