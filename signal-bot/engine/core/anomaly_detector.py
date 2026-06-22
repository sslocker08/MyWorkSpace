"""3-layer pump/dump/accumulation anomaly detector.

Layers
------
1. Volume Z-score vs 20-day rolling mean/std  (z > 3.0 → flagged)
2. Price+volume classification: PUMP_PHASE / DUMP_SIGNAL / ACCUMULATION_SILENCE / NORMAL
3. IsolationForest on [price_change, vol_ratio, high_low_range, close_to_open]
   — skipped when len(df) < 30; is_flagged falls back to layers 1+2 only.

ported from: sklearn.ensemble.IsolationForest (contamination=0.05, random_state=42)
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
_VOL_ZSCORE_WINDOW = 20
_VOL_ZSCORE_THRESHOLD = 3.0
_PRICE_PUMP_PCT = 2.0    # +2% price change
_PRICE_DUMP_PCT = -2.0   # -2% price change
_VOL_RATIO_SPIKE = 4.0   # volume ratio vs 20-day average
_ACCUM_AVG_VOL_RATIO = 0.3   # 5-day avg vol_ratio below this → accumulation silence
_ML_MIN_ROWS = 30            # minimum rows required for IsolationForest
_IF_CONTAMINATION = 0.05
_IF_RANDOM_STATE = 42

# Anomaly type labels
PUMP_PHASE = "PUMP_PHASE"
DUMP_SIGNAL = "DUMP_SIGNAL"
ACCUMULATION_SILENCE = "ACCUMULATION_SILENCE"
NORMAL = "NORMAL"


# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------
@dataclass
class AnomalyResult:
    ticker: str
    anomaly_type: str          # PUMP_PHASE | DUMP_SIGNAL | ACCUMULATION_SILENCE | NORMAL
    volume_zscore: float
    volume_ratio: float
    price_change_pct: float
    isolation_score: Optional[float]   # None if ML was skipped
    is_flagged: bool
    message: str


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _compute_features(df: pd.DataFrame) -> pd.DataFrame:
    """Compute derived feature columns on a copy of *df*.

    ported from: standard OHLCV feature engineering for anomaly detection
    """
    out = df.copy()
    out["price_change"] = out["close"].pct_change() * 100.0  # %
    out["vol_20d_mean"] = out["volume"].rolling(_VOL_ZSCORE_WINDOW).mean()
    out["vol_20d_std"] = out["volume"].rolling(_VOL_ZSCORE_WINDOW).std()
    safe_mean = out["vol_20d_mean"].replace(0, np.nan)
    safe_std = out["vol_20d_std"].replace(0, np.nan)
    out["vol_ratio"] = out["volume"] / safe_mean
    out["vol_zscore"] = (out["volume"] - out["vol_20d_mean"]) / safe_std
    safe_close = out["close"].replace(0, np.nan)
    safe_open = out["open"].replace(0, np.nan)
    out["high_low_range"] = (out["high"] - out["low"]) / safe_close * 100.0
    out["close_to_open"] = (out["close"] - out["open"]) / safe_open * 100.0
    return out


def _classify_layer2(price_change_pct: float, vol_ratio: float, df_feat: pd.DataFrame) -> str:
    """Layer 2: price+volume pattern classification.

    ported from: pump-and-dump detection heuristics (SEC research + academic literature)
    """
    if price_change_pct > _PRICE_PUMP_PCT and vol_ratio > _VOL_RATIO_SPIKE:
        return PUMP_PHASE
    if price_change_pct < _PRICE_DUMP_PCT and vol_ratio > _VOL_RATIO_SPIKE:
        return DUMP_SIGNAL
    # Accumulation silence: 5-day average vol_ratio below threshold
    recent_5d = df_feat["vol_ratio"].iloc[-5:].dropna()
    if len(recent_5d) >= 3 and recent_5d.mean() < _ACCUM_AVG_VOL_RATIO:
        return ACCUMULATION_SILENCE
    return NORMAL


def _run_isolation_forest(df_feat: pd.DataFrame) -> Optional[float]:
    """Layer 3: IsolationForest anomaly score for the last bar.

    Fits on the full df, scores the last bar.
    Returns the decision_function score (negative = more anomalous) or None
    on any failure.

    ported from: sklearn.ensemble.IsolationForest (contamination=0.05, random_state=42)
    """
    try:
        from sklearn.ensemble import IsolationForest  # lazy import

        feature_cols = ["price_change", "vol_ratio", "high_low_range", "close_to_open"]
        feat_df = df_feat[feature_cols].dropna()
        # Need at least 10 clean rows for a meaningful fit; outer gate (len(df) >= 30)
        # already handled in detect_anomaly. Rolling window eats the first ~20 rows so
        # feat_df is typically shorter than df.
        if len(feat_df) < 10:
            return None

        X = feat_df.values.astype(float)
        clf = IsolationForest(
            contamination=_IF_CONTAMINATION,
            random_state=_IF_RANDOM_STATE,
            n_estimators=100,
        )
        clf.fit(X)
        # Score the last bar (last row of feat_df)
        last_bar = X[[-1], :]
        score: float = float(clf.decision_function(last_bar)[0])
        return score
    except Exception as exc:
        logger.warning("IsolationForest failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect_anomaly(
    ticker: str,
    df: pd.DataFrame,
    *,
    small_cap_threshold_bn: float = 100.0,
    low_float_ratio: float = 0.30,
    low_avg_vol: int = 1_000_000,
) -> AnomalyResult:
    """Detect pump/dump/accumulation anomalies in *df* for *ticker*.

    Args:
        ticker: Ticker symbol.
        df: Standard OHLCV DataFrame with columns [open, high, low, close, volume],
            sorted ascending, DatetimeIndex. Must have at least 2 rows.
        small_cap_threshold_bn: Market-cap ceiling (¥100B) for JP filter context.
        low_float_ratio: Float ratio threshold for JP filter context.
        low_avg_vol: Average daily volume threshold for JP filter context.

    Returns:
        AnomalyResult with all three layers computed.
    """
    if df is None or len(df) < 2:
        return AnomalyResult(
            ticker=ticker,
            anomaly_type=NORMAL,
            volume_zscore=0.0,
            volume_ratio=1.0,
            price_change_pct=0.0,
            isolation_score=None,
            is_flagged=False,
            message="Insufficient data for anomaly detection",
        )

    df_feat = _compute_features(df)
    last = df_feat.iloc[-1]

    # Layer 1: Volume Z-score
    _zscore_raw = last.get("vol_zscore")
    vol_zscore: float = float(_zscore_raw) if pd.notna(_zscore_raw) else 0.0
    _ratio_raw = last.get("vol_ratio")
    vol_ratio: float = float(_ratio_raw) if pd.notna(_ratio_raw) else 1.0
    _pchange_raw = last.get("price_change")
    price_change_pct: float = float(_pchange_raw) if pd.notna(_pchange_raw) else 0.0

    layer1_flagged = vol_zscore > _VOL_ZSCORE_THRESHOLD

    # Layer 2: Price+volume classification
    anomaly_type = _classify_layer2(price_change_pct, vol_ratio, df_feat)

    # Layer 3: IsolationForest (skipped when df too short)
    isolation_score: Optional[float] = None
    if len(df) >= _ML_MIN_ROWS:
        isolation_score = _run_isolation_forest(df_feat)

    # Consolidate is_flagged
    layer2_flagged = anomaly_type in (PUMP_PHASE, DUMP_SIGNAL)
    layer3_flagged = isolation_score is not None and isolation_score < 0.0

    is_flagged = layer1_flagged or layer2_flagged or layer3_flagged

    # Build human-readable message
    parts: list[str] = []
    if layer1_flagged:
        parts.append(f"Vol Z-score={vol_zscore:.2f} > {_VOL_ZSCORE_THRESHOLD}")
    if layer2_flagged:
        parts.append(
            f"Pattern={anomaly_type} (price={price_change_pct:+.2f}%, vol_ratio={vol_ratio:.1f}x)"
        )
    if layer3_flagged:
        parts.append(f"IsolationForest score={isolation_score:.4f} (anomalous)")
    if anomaly_type == ACCUMULATION_SILENCE and not layer1_flagged:
        parts.append(f"Quiet accumulation (5d avg vol_ratio < {_ACCUM_AVG_VOL_RATIO})")

    message = "; ".join(parts) if parts else f"No anomaly detected (type={anomaly_type})"

    return AnomalyResult(
        ticker=ticker,
        anomaly_type=anomaly_type,
        volume_zscore=vol_zscore,
        volume_ratio=vol_ratio,
        price_change_pct=price_change_pct,
        isolation_score=isolation_score,
        is_flagged=is_flagged,
        message=message,
    )
