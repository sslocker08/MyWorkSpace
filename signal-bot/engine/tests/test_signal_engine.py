"""scan_ticker wiring — proves the ceiling_degraded flag reaches the scorer.

This is the engine-boundary counterpart to test_signal_scorer.py: it verifies the
PLUMBING (scan_ticker -> SignalScorer.score) carries `ceiling_degraded` through,
so a degraded high ceiling does NOT halve a LONG score in a real scan.

NO LIVE NETWORK: the data fetcher and strategy set are monkeypatched with
deterministic stubs; scan_ticker is called with db=None (no persistence), so the
test exercises pure fetch -> strategies -> risk -> score wiring.
"""
from __future__ import annotations

import asyncio
import sys
import types

import pandas as pd
import pytest

# core.signal_engine -> core.data_fetcher transitively imports pandas_datareader
# and polygon. Some envs ship a pandas_datareader build incompatible with the
# installed pandas (its module-level @deprecate_kwarg raises TypeError on import),
# and polygon may be absent. Those are environment/dependency issues, not defects
# in the wiring under test. We inject minimal stub modules BEFORE importing the
# engine so this test runs deterministically (it never touches either dep anyway —
# the fetcher is monkeypatched). Only insert a stub if the real import fails, so a
# healthy env still uses the real packages.
def _ensure_importable(name: str) -> None:
    if name in sys.modules:
        return
    try:
        __import__(name)
    except Exception:  # noqa: BLE001 - broken/absent dep -> inject a stub
        sys.modules[name] = types.ModuleType(name)


_ensure_importable("pandas_datareader")
if "polygon" not in sys.modules:
    try:
        __import__("polygon")
    except Exception:  # noqa: BLE001
        _poly = types.ModuleType("polygon")
        _poly.RESTClient = object  # data_fetcher only needs the name at import time
        sys.modules["polygon"] = _poly

import core.signal_engine as se  # noqa: E402
from strategies.base import StrategyResult  # noqa: E402


class _StubStrategy:
    """A strategy that always fires LONG with a fixed confidence."""

    name = "momentum_long"

    def evaluate(self, ticker, df):
        return StrategyResult(
            name=self.name,
            triggered=True,
            direction="LONG",
            confidence=0.8,
            reason="stub",
            indicators={},
        )


def _patch_engine(monkeypatch, df):
    """Patch the module-level fetcher + strategy set for a deterministic scan."""

    class _StubFetcher:
        async def get_ohlcv(self, ticker, days=300):
            return df

    monkeypatch.setattr(se, "_fetcher", _StubFetcher())
    monkeypatch.setattr(se, "ALL_STRATEGIES", [_StubStrategy()])
    # Force a permissive score threshold so a valid setup always returns a Signal.
    import core.config as cfg
    monkeypatch.setattr(cfg.settings, "signal_score_threshold", 0.0, raising=False)


def _capture_scorer(monkeypatch):
    """Wrap the real scorer to capture the kwargs it is called with."""
    calls = {}
    real_score = se._scorer.score

    def _spy(*args, **kwargs):
        calls.update(kwargs)
        return real_score(*args, **kwargs)

    monkeypatch.setattr(se._scorer, "score", _spy)
    return calls


def test_scan_ticker_threads_ceiling_degraded_to_scorer(monkeypatch, uptrend_df):
    """A degraded high ceiling must reach the scorer AND not halve the LONG score.

    Compares a degraded high-ceiling scan against a non-degraded high-ceiling scan
    of the same ticker: the degraded one must score strictly HIGHER (no >70 halving).
    """
    _patch_engine(monkeypatch, uptrend_df)
    calls = _capture_scorer(monkeypatch)

    degraded_sig = asyncio.run(
        se.scan_ticker(
            "TEST", ceiling_score=90.0, ceiling_degraded=True, db=None,
        )
    )
    # The flag actually reached the scorer.
    assert calls.get("ceiling_degraded") is True
    assert calls.get("ceiling_score") == 90.0
    assert degraded_sig is not None

    non_degraded_sig = asyncio.run(
        se.scan_ticker(
            "TEST", ceiling_score=90.0, ceiling_degraded=False, db=None,
        )
    )
    assert calls.get("ceiling_degraded") is False
    assert non_degraded_sig is not None

    # Degraded high ceiling -> NOT halved -> strictly higher score than the
    # non-degraded (penalized) high-ceiling LONG.
    assert degraded_sig.score > non_degraded_sig.score


def test_scan_ticker_default_ceiling_degraded_is_false(monkeypatch, uptrend_df):
    """Public callers that omit ceiling_degraded keep the safe default (False),
    so default behavior is unchanged: the scorer sees ceiling_degraded=False."""
    _patch_engine(monkeypatch, uptrend_df)
    calls = _capture_scorer(monkeypatch)

    sig = asyncio.run(se.scan_ticker("TEST", ceiling_score=90.0, db=None))
    assert sig is not None
    assert calls.get("ceiling_degraded") is False
