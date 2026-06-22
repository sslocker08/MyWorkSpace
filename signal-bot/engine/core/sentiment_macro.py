"""External macro / sentiment data collectors for the Ceiling Score (market-top).

This module builds the DATA COLLECTORS for the free / auth-light macro & sentiment
sources that a LATER iteration will assemble into the composite "Ceiling Score"
(0-100, high == elevated market-top risk). Each collector is INDEPENDENT and
INDEPENDENTLY DEGRADABLE: the composite must produce a score even if every
external source is down, so a failing collector NEVER raises — it logs a warning
and returns ``ok=False`` with ``normalized=None`` so the composite can skip it or
substitute a neutral default.

Design contract (every collector method)
========================================
* Returns a :class:`CollectorResult` carrying the raw value(s), a ``normalized``
  float in ``[0, 1]`` where **1.0 == maximum market-top / bearish (frothy) signal**
  and **0.0 == maximum fear / capitulation**, plus ``source``, ``as_of`` and
  ``ok``.
* NEVER raises. Any fetch / parse / import error -> WARNING log + ``ok=False`` and
  ``normalized=None``.
* Blocking I/O (``pd.read_excel`` / ``pd.read_csv`` / ``fredapi`` / ``fear_greed``)
  is offloaded with ``asyncio.to_thread`` so it cooperates with the FastAPI loop,
  mirroring ``core/data_fetcher.py``.
* Results are cached in-process with a long TTL. These are DAILY / WEEKLY / QUARTERLY
  series, so re-hitting them every 15-minute scan is pure waste (and risks rate
  limits / IP bans on the free endpoints). TTL is 6h for the daily series and 12h
  for the weekly / quarterly series.

WHY the normalization thresholds (per llm-context-engineering-repo: comment the
WHY, with provenance) — each ``_normalize_*`` helper documents the rationale,
source URL and the empirical band it encodes. These are MAGIC NUMBERS deciding
money logic, so their provenance is recorded inline rather than left implicit.

Optional dependencies (``fredapi``, ``fear-greed``, ``xlrd``) and the network are
all guarded: an ImportError or a missing FRED_API_KEY degrades to ``ok=False``,
never a crash.
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Callable, Optional

import numpy as np
import pandas as pd

from core.config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------
@dataclass
class CollectorResult:
    """A single source's reading.

    Attributes
    ----------
    source : str
        Stable identifier of the source (e.g. ``"aaii_sentiment"``).
    ok : bool
        True iff the fetch+parse succeeded. False == degraded; ``normalized`` is
        then ``None`` and the composite should skip this source / use a neutral
        default.
    normalized : float | None
        Contribution in ``[0, 1]``; ``1.0`` == max market-top/bearish signal,
        ``0.0`` == max fear. ``None`` when ``ok`` is False, or for raw-only
        readings (yield curve / VIX) whose normalized contribution is deferred.
    raw : dict
        Raw value(s) pulled from the source (kept for storage / later re-scoring).
    as_of : datetime | None
        Timestamp the underlying datapoint is "as of" (the series' latest date
        when available, else fetch time). None on failure.
    error : str | None
        Short error description when degraded (for logging / diagnostics).
    """

    source: str
    ok: bool
    normalized: Optional[float] = None
    raw: dict = field(default_factory=dict)
    as_of: Optional[datetime] = None
    error: Optional[str] = None


def _clamp01(x: float) -> float:
    """Clamp to [0, 1]. Centralized so every normalizer is provably bounded."""
    if x != x:  # NaN guard (NaN != NaN)
        raise ValueError("normalized value is NaN")
    return max(0.0, min(1.0, float(x)))


# ---------------------------------------------------------------------------
# Normalization helpers — each encodes a documented empirical band.
# ---------------------------------------------------------------------------
def _normalize_aaii_bull(bull_pct: float) -> float:
    """AAII bullish % -> top-risk in [0, 1].

    AAII Investor Sentiment Survey weekly bullish reading. Its long-run average is
    ~37-38%; readings are a CONTRARIAN indicator — excessive optimism (crowd very
    bullish) tends to mark tops, capitulation (very few bulls) tends to mark
    bottoms. We map roughly one std-dev each side of the mean to the [0,1] edges:

        bull% >= 60  -> ~1.0  (euphoria / excess optimism == top risk)
        bull% <= 35  -> 0.0   (at/below the long-run mean == no froth)

    i.e. clamp((bull-35)/25, 0, 1). (60 is ~+1.5 std above the mean; the spec's
    example "55 -> ~1.0" lands at 0.80 here, still strongly elevated.)
    Source: https://www.aaii.com/sentimentsurvey (historical mean ~37.5%).
    """
    return _clamp01((bull_pct - 35.0) / 25.0)


def _normalize_put_call(pc_ratio: float) -> float:
    """CBOE equity Put/Call ratio (5-day mean) -> top-risk in [0, 1].

    INVERTED vs. fear: a LOW equity put/call means traders are buying calls /
    ignoring downside == complacency == top risk; a HIGH put/call means heavy
    hedging / fear == capitulation. CBOE equity-only P/C historically oscillates
    ~0.55-0.95 (the all-index ratio runs higher). We map:

        ratio <= 0.60 -> ~1.0  (complacency == top risk)
        ratio >= 0.90 -> 0.0   (fear / heavy hedging)

    i.e. clamp((0.90 - ratio)/0.30, 0, 1).
    Source: https://www.cboe.com/us/options/market_statistics/ (equity P/C).
    """
    return _clamp01((0.90 - pc_ratio) / 0.30)


def _normalize_fear_greed(score: float) -> float:
    """CNN Fear & Greed Index (0-100) -> top-risk in [0, 1].

    CNN's index is already oriented so HIGH == greed; greed/euphoria == top risk.
    50 is neutral. We map the greed half of the scale to [0,1]:

        score >= 100 -> 1.0   (extreme greed == top risk)
        score <= 50  -> 0.0   (neutral / fear)

    i.e. clamp((score-50)/50, 0, 1). So 80 (extreme greed) -> 0.60, 75 -> 0.50.
    Source: https://www.cnn.com/markets/fear-and-greed (via the `fear-greed` pkg).
    """
    return _clamp01((score - 50.0) / 50.0)


def _normalize_margin_yoy(yoy: float) -> float:
    """FINRA margin-debt YoY growth (fraction, e.g. 0.45 == +45%) -> top-risk.

    Rapid expansion of margin debt == leveraged speculation == classic late-cycle
    top signal (margin peaks historically lead market peaks). We map:

        YoY >= +50% -> 1.0   (extreme leverage build-up)
        YoY <= 0%   -> 0.0   (flat / contracting margin)

    i.e. clamp(yoy/0.50, 0, 1). So +45% -> 0.90, +40% -> 0.80.
    NOTE input is a FRACTION (0.45), not a percent (45). Source: FRED series
    BOGZ1FL663067003Q (Security brokers & dealers; margin accounts) /
    https://www.finra.org/investors/margin-statistics.
    """
    return _clamp01(yoy / 0.50)


# ---------------------------------------------------------------------------
# Collector
# ---------------------------------------------------------------------------
# Endpoints (recorded here so the magic strings have one provenance point).
AAII_XLS_URL = "https://www.aaii.com/files/surveys/sentiment.xls"
CBOE_EQUITY_PC_URL = (
    "https://cdn.cboe.com/resources/options/volume_and_call_put_ratios/equitypc.csv"
)
# FRED series ids.
FRED_MARGIN_DEBT = "BOGZ1FL663067003Q"  # Z.1 brokers&dealers margin accounts, quarterly
FRED_T10Y2Y = "T10Y2Y"                  # 10Y-2Y Treasury spread (inversion -> recession)
FRED_VIXCLS = "VIXCLS"                  # CBOE VIX close

# Cache TTLs: daily series 6h, weekly/quarterly 12h (see module docstring).
_TTL_DAILY = timedelta(hours=6)
_TTL_SLOW = timedelta(hours=12)


class MacroSentimentCollector:
    """Collects free / auth-light macro & sentiment readings for the Ceiling Score.

    Each ``get_*`` coroutine returns a :class:`CollectorResult` and never raises.
    Results are memoized in a per-instance cache keyed by source name with a
    per-source TTL; a second call within the TTL returns the cached result WITHOUT
    re-invoking the (slow / rate-limited) fetch.
    """

    def __init__(self) -> None:
        # source-name -> (result, fetched_at)
        self._cache: dict[str, tuple[CollectorResult, datetime]] = {}

    # ------------------------------------------------------------------
    # Cache plumbing
    # ------------------------------------------------------------------
    def _cached(self, source: str, ttl: timedelta) -> Optional[CollectorResult]:
        entry = self._cache.get(source)
        if entry is None:
            return None
        result, ts = entry
        if datetime.utcnow() - ts < ttl:
            logger.debug("sentiment_macro cache hit for %s", source)
            return result
        return None

    def _store(self, source: str, result: CollectorResult) -> None:
        self._cache[source] = (result, datetime.utcnow())

    async def _run_cached(
        self,
        source: str,
        ttl: timedelta,
        fetch: Callable[[], CollectorResult],
    ) -> CollectorResult:
        """Shared wrapper: serve cache, else run *fetch* in a thread, store, return.

        *fetch* is a SYNCHRONOUS callable executed via ``asyncio.to_thread`` (it
        does blocking network/parse I/O). It is expected to itself never raise and
        to return a :class:`CollectorResult`; as a final backstop we still catch
        anything so the contract "never raises" holds even if a fetch is buggy.

        Both a cache HIT and an ``ok=True`` result are stored; an ``ok=False``
        (degraded) result is NOT cached, so a transient outage does not pin a
        degraded reading for the whole TTL — the next scan retries the source.
        """
        cached = self._cached(source, ttl)
        if cached is not None:
            return cached
        try:
            result = await asyncio.to_thread(fetch)
        except Exception as exc:  # noqa: BLE001 — backstop; fetch should self-handle
            logger.warning("sentiment_macro %s fetch raised unexpectedly: %s", source, exc)
            return CollectorResult(source=source, ok=False, error=str(exc))
        if result.ok:
            self._store(source, result)
        return result

    # ------------------------------------------------------------------
    # 1. AAII sentiment (weekly)
    # ------------------------------------------------------------------
    async def get_aaii_sentiment(self) -> CollectorResult:
        """Latest AAII weekly bullish % -> contrarian top-risk reading."""
        return await self._run_cached("aaii_sentiment", _TTL_SLOW, self._fetch_aaii)

    @staticmethod
    def _fetch_aaii() -> CollectorResult:
        source = "aaii_sentiment"
        try:
            # xlrd is required by pandas to read legacy .xls; guard the import so a
            # missing optional dep degrades instead of crashing.
            import xlrd  # noqa: F401
        except ImportError as exc:
            logger.warning("aaii: xlrd not installed (%s) — degraded", exc)
            return CollectorResult(source=source, ok=False, error="xlrd not installed")
        try:
            # skiprows=3: the AAII workbook has 3 header/title rows before the table.
            df = pd.read_excel(AAII_XLS_URL, skiprows=3, engine="xlrd")
            bull_pct, as_of = _extract_aaii_bull(df)
            return CollectorResult(
                source=source,
                ok=True,
                normalized=_normalize_aaii_bull(bull_pct),
                raw={"bull_pct": bull_pct},
                as_of=as_of,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("aaii fetch/parse failed: %s — degraded", exc)
            return CollectorResult(source=source, ok=False, error=str(exc))

    # ------------------------------------------------------------------
    # 2. CBOE equity Put/Call (daily) — 5-day mean
    # ------------------------------------------------------------------
    async def get_put_call(self) -> CollectorResult:
        """5-day mean of the CBOE equity put/call ratio -> complacency top-risk."""
        return await self._run_cached("put_call", _TTL_DAILY, self._fetch_put_call)

    @staticmethod
    def _fetch_put_call() -> CollectorResult:
        source = "put_call"
        try:
            df = pd.read_csv(
                CBOE_EQUITY_PC_URL, parse_dates=["DATE"], index_col="DATE"
            )
            ratio_5d, as_of = _extract_put_call_5d(df)
            return CollectorResult(
                source=source,
                ok=True,
                normalized=_normalize_put_call(ratio_5d),
                raw={"put_call_5d": ratio_5d},
                as_of=as_of,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("put_call fetch/parse failed: %s — degraded", exc)
            return CollectorResult(source=source, ok=False, error=str(exc))

    # ------------------------------------------------------------------
    # 3. CNN Fear & Greed (daily)
    # ------------------------------------------------------------------
    async def get_fear_greed(self) -> CollectorResult:
        """CNN Fear & Greed score (0-100) -> greed == top-risk."""
        return await self._run_cached("fear_greed", _TTL_DAILY, self._fetch_fear_greed)

    @staticmethod
    def _fetch_fear_greed() -> CollectorResult:
        source = "fear_greed"
        try:
            import fear_greed
        except ImportError as exc:
            logger.warning("fear_greed: package not installed (%s) — degraded", exc)
            return CollectorResult(source=source, ok=False, error="fear-greed not installed")
        try:
            data = fear_greed.get()
            score = _extract_fear_greed_score(data)
            return CollectorResult(
                source=source,
                ok=True,
                normalized=_normalize_fear_greed(score),
                raw={"score": score},
                as_of=datetime.utcnow(),
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("fear_greed fetch/parse failed: %s — degraded", exc)
            return CollectorResult(source=source, ok=False, error=str(exc))

    # ------------------------------------------------------------------
    # FRED helpers (margin debt / yield curve / VIX) share a client guard.
    # ------------------------------------------------------------------
    @staticmethod
    def _fred_client() -> Any:
        """Build a Fred client or raise a descriptive error.

        Raises ImportError if ``fredapi`` is absent, or ValueError if no
        FRED_API_KEY is configured. Callers translate either into ``ok=False``.
        """
        from fredapi import Fred  # may raise ImportError
        if not settings.fred_api_key:
            raise ValueError("FRED_API_KEY not configured")
        return Fred(api_key=settings.fred_api_key)

    # ------------------------------------------------------------------
    # 4. FRED margin debt YoY
    # ------------------------------------------------------------------
    async def get_margin_debt(self) -> CollectorResult:
        """FINRA/Fed margin-debt YoY growth -> leverage build-up top-risk."""
        return await self._run_cached("margin_debt", _TTL_SLOW, self._fetch_margin_debt)

    @classmethod
    def _fetch_margin_debt(cls) -> CollectorResult:
        source = "margin_debt"
        try:
            fred = cls._fred_client()
        except ImportError as exc:
            logger.warning("margin_debt: fredapi not installed (%s) — degraded", exc)
            return CollectorResult(source=source, ok=False, error="fredapi not installed")
        except ValueError as exc:
            logger.warning("margin_debt: %s — degraded", exc)
            return CollectorResult(source=source, ok=False, error=str(exc))
        try:
            # BOGZ1FL663067003Q is the Z.1 Financial Accounts series for security
            # brokers & dealers margin accounts (quarterly). FALLBACK: if FINRA
            # restores its monthly series under another id, swap it here; the YoY
            # math below is series-agnostic (it just needs a value ~1y prior).
            series = fred.get_series(FRED_MARGIN_DEBT)
            yoy, as_of = _margin_yoy(series)
            return CollectorResult(
                source=source,
                ok=True,
                normalized=_normalize_margin_yoy(yoy),
                raw={"margin_debt_yoy": yoy},
                as_of=as_of,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("margin_debt fetch/parse failed: %s — degraded", exc)
            return CollectorResult(source=source, ok=False, error=str(exc))

    # ------------------------------------------------------------------
    # 5a. FRED yield curve (T10Y2Y) — raw only (normalized contribution deferred)
    # ------------------------------------------------------------------
    async def get_yield_curve(self) -> CollectorResult:
        """Latest 10Y-2Y Treasury spread (T10Y2Y). Raw value for later scoring."""
        return await self._run_cached("yield_curve", _TTL_DAILY, self._fetch_yield_curve)

    @classmethod
    def _fetch_yield_curve(cls) -> CollectorResult:
        return cls._fetch_fred_latest("yield_curve", FRED_T10Y2Y, "t10y2y")

    # ------------------------------------------------------------------
    # 5b. FRED VIX (VIXCLS) — raw only
    # ------------------------------------------------------------------
    async def get_vix(self) -> CollectorResult:
        """Latest VIX close (VIXCLS). Raw value for later scoring."""
        return await self._run_cached("vix", _TTL_DAILY, self._fetch_vix)

    @classmethod
    def _fetch_vix(cls) -> CollectorResult:
        return cls._fetch_fred_latest("vix", FRED_VIXCLS, "vix")

    @classmethod
    def _fetch_fred_latest(cls, source: str, series_id: str, key: str) -> CollectorResult:
        """Shared synchronous fetch of the latest non-NaN value of a FRED series.

        normalized is left None — these two (yield curve, VIX) are returned as raw
        values the composite engine will weight in a later iteration; their direct
        top-risk mapping is intentionally deferred (the spec marks it optional).
        """
        try:
            fred = cls._fred_client()
        except ImportError as exc:
            logger.warning("%s: fredapi not installed (%s) — degraded", source, exc)
            return CollectorResult(source=source, ok=False, error="fredapi not installed")
        except ValueError as exc:
            logger.warning("%s: %s — degraded", source, exc)
            return CollectorResult(source=source, ok=False, error=str(exc))
        try:
            series = fred.get_series(series_id)
            value, as_of = _latest_value(series)
            return CollectorResult(
                source=source,
                ok=True,
                normalized=None,  # raw-only; weighting deferred to composite
                raw={key: value},
                as_of=as_of,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("%s fetch/parse failed: %s — degraded", source, exc)
            return CollectorResult(source=source, ok=False, error=str(exc))


# ---------------------------------------------------------------------------
# Pure parse helpers (separated so they are unit-testable without network)
# ---------------------------------------------------------------------------
def _extract_aaii_bull(df: pd.DataFrame) -> tuple[float, Optional[datetime]]:
    """Pull the latest Bullish % and its date from the AAII workbook frame.

    Robust to column-name drift: AAII labels the column "Bullish" (sometimes
    "Bull"); we find the first column whose name contains "bull" (case-insensitive)
    and that is NOT the 8-week bullish average. Values may be a 0-1 fraction or a
    0-100 percent depending on the export; we normalize to a 0-100 percent.
    """
    bull_col = None
    for col in df.columns:
        name = str(col).strip().lower()
        if "bull" in name and "average" not in name and "8-week" not in name and "8 week" not in name:
            bull_col = col
            break
    if bull_col is None:
        raise ValueError("no Bullish column found in AAII frame")

    series = pd.to_numeric(df[bull_col], errors="coerce").dropna()
    if series.empty:
        raise ValueError("AAII Bullish column has no numeric values")
    bull = float(series.iloc[-1])
    if bull <= 1.5:  # stored as a fraction (e.g. 0.60) -> percent
        bull *= 100.0

    as_of = _row_date(df, series.index[-1])
    return bull, as_of


def _extract_put_call_5d(df: pd.DataFrame) -> tuple[float, Optional[datetime]]:
    """Compute the 5-day mean of the CBOE equity P/C ratio, robust to header name.

    CBOE's equitypc.csv ratio column has been labelled variously ("P/C Ratio",
    "RATIO", "Put/Call Ratio"); rather than hardcode it we pick the column whose
    name contains "ratio" (case-insensitive), falling back to the last numeric
    column. The frame is date-indexed (parse_dates=["DATE"]); we sort ascending
    and take the mean of the last 5 rows.
    """
    df = df.sort_index()
    ratio_col = None
    for col in df.columns:
        if "ratio" in str(col).strip().lower():
            ratio_col = col
            break
    if ratio_col is None:
        numeric = df.select_dtypes("number")
        if numeric.shape[1] == 0:
            raise ValueError("no numeric ratio column in CBOE P/C frame")
        ratio_col = numeric.columns[-1]

    series = pd.to_numeric(df[ratio_col], errors="coerce").dropna()
    if series.empty:
        raise ValueError("CBOE P/C ratio column has no numeric values")
    tail = series.tail(5)
    ratio_5d = float(tail.mean())
    as_of = _index_to_datetime(series.index[-1])
    return ratio_5d, as_of


def _extract_fear_greed_score(data: Any) -> float:
    """Pull the 0-100 score from whatever shape `fear_greed.get()` returns.

    The `fear-greed` package has returned a namedtuple-like object with a
    ``.score`` attribute in some versions and a dict/sequence in others; handle
    the common shapes defensively.
    """
    if hasattr(data, "score"):
        return float(data.score)
    if isinstance(data, dict):
        for k in ("score", "value", "fear_greed"):
            if k in data:
                return float(data[k])
    if isinstance(data, (list, tuple)) and data:
        return float(data[0])
    return float(data)  # last resort: assume it IS the score


def _margin_yoy(series: pd.Series) -> tuple[float, Optional[datetime]]:
    """Year-over-year growth (fraction) of a FRED margin-debt series.

    The series is irregular-but-dated; we drop NaNs, take the latest value and the
    value ~1 year prior. For a QUARTERLY series that is 4 observations back; we use
    the value at-or-before (latest_date - 1 year) to stay frequency-agnostic.
    """
    s = pd.to_numeric(series, errors="coerce").dropna()
    if len(s) < 2:
        raise ValueError("margin-debt series too short for YoY")
    s = s.sort_index()
    latest_date = s.index[-1]
    latest = float(s.iloc[-1])

    year_ago_cut = latest_date - pd.DateOffset(years=1)
    prior_window = s[s.index <= year_ago_cut]
    if prior_window.empty:
        # Fewer than a year of data after the cut; fall back to 4 obs back (quarterly).
        if len(s) < 5:
            raise ValueError("insufficient history for YoY margin-debt")
        prior = float(s.iloc[-5])
    else:
        prior = float(prior_window.iloc[-1])

    if prior == 0:
        raise ValueError("prior margin-debt value is zero (cannot compute YoY)")
    yoy = (latest - prior) / abs(prior)
    return yoy, _index_to_datetime(latest_date)


def _latest_value(series: pd.Series) -> tuple[float, Optional[datetime]]:
    """Latest non-NaN value of a FRED series + its date."""
    s = pd.to_numeric(series, errors="coerce").dropna()
    if s.empty:
        raise ValueError("FRED series has no numeric values")
    s = s.sort_index()
    return float(s.iloc[-1]), _index_to_datetime(s.index[-1])


def _index_to_datetime(idx: Any) -> Optional[datetime]:
    # Only treat genuine date-like labels as an as_of; a bare integer row label
    # (e.g. a default RangeIndex when the source has no date column) is NOT a date
    # and would otherwise convert to a meaningless 1970 epoch timestamp.
    if isinstance(idx, (int, np.integer)):
        return None
    try:
        ts = pd.Timestamp(idx)
        if pd.isna(ts):
            return None
        return ts.to_pydatetime()
    except (ValueError, TypeError, OverflowError):
        return None


def _row_date(df: pd.DataFrame, row_label: Any) -> Optional[datetime]:
    """Best-effort date for an AAII row: a 'Date' column if present, else index."""
    for col in df.columns:
        if "date" in str(col).strip().lower():
            try:
                return pd.Timestamp(df.loc[row_label, col]).to_pydatetime()
            except Exception:  # noqa: BLE001
                pass
    return _index_to_datetime(row_label)


# ---------------------------------------------------------------------------
# Aggregate
# ---------------------------------------------------------------------------
# Module-level singleton so the in-process cache is shared across scans (mirrors
# data_fetcher's module-level cache). A fresh instance can still be created for
# tests to get an isolated cache.
_collector = MacroSentimentCollector()


async def collect_all(collector: Optional[MacroSentimentCollector] = None) -> dict[str, CollectorResult]:
    """Collect EVERY source concurrently, each independently ok / degraded.

    Returns a mapping ``{source_name: CollectorResult}`` covering all sources. A
    failure in one source never affects the others (each collector swallows its
    own errors), and this function itself never raises — any unexpected error from
    a single coroutine is captured as a degraded result for that source.
    """
    c = collector or _collector
    jobs: dict[str, Any] = {
        "aaii_sentiment": c.get_aaii_sentiment(),
        "put_call": c.get_put_call(),
        "fear_greed": c.get_fear_greed(),
        "margin_debt": c.get_margin_debt(),
        "yield_curve": c.get_yield_curve(),
        "vix": c.get_vix(),
    }
    names = list(jobs.keys())
    results = await asyncio.gather(*jobs.values(), return_exceptions=True)
    out: dict[str, CollectorResult] = {}
    for name, res in zip(names, results):
        if isinstance(res, BaseException):
            logger.warning("collect_all: %s raised %s — degraded", name, res)
            out[name] = CollectorResult(source=name, ok=False, error=str(res))
        else:
            out[name] = res
    return out
