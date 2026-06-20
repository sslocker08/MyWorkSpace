"""Prometheus SLI metrics — imported by signal_engine and mounted in main.py."""
from prometheus_client import Counter, Gauge, Histogram

scan_duration = Histogram(
    "scan_ticker_seconds",
    "Per-ticker scan wall-clock duration in seconds",
    ["market"],
)

signals_emitted = Counter(
    "signals_total",
    "Signals that passed the score threshold and were returned",
    ["direction", "regime"],
)

ceiling_score_gauge = Gauge(
    "ceiling_score",
    "Latest market-intelligence ceiling score (0–100)",
)
