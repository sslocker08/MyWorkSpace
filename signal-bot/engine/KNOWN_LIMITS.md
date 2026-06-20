# Known Limits & Tracked Quality Debt

This ledger records quality gaps surfaced by adversarial review that were **accepted
as non-blocking** for the current phase but must be addressed before live capital.
Each item names the location, why it's acceptable now, and the trigger for fixing it.

> Discipline: gates pass on "no blocking issue + tests green", not "zero debt".
> Non-blocking debt is recorded here (not lost in chat) and revisited at the
> Phase-5 backtest-validation gate and the Phase-6 go-live gate.

## Strategies (Phase 2)

### KL-1 — New indicator strategies lack near-boundary selectivity tests
- **Where**: `tests/test_strategies.py` — macd_signal, bollinger_squeeze, adx_trend,
  volume_surge, rsi_divergence have only (extreme-cliff trigger) + (flat/trend no-fire)
  tests. Unlike reversal_long/short, they have no near-boundary fixture proving they
  stay quiet just inside the threshold.
- **Why acceptable now**: direction + trigger + non-fire-on-flat are all verified;
  no live capital. **Fix before**: Phase-5 backtest validation. Add `near_*` fixtures
  (e.g. squeeze tolerance edge, z just under floor, +DI/-DI near-cross).

### KL-2 — rsi_divergence indicator: first-vs-last swing pairing
- **Where**: `core/indicators.py` rsi_divergence uses `min_idxs[0]` vs `min_idxs[-1]`
  (earliest vs latest swing in the window). With 3+ swings it ignores intermediate
  structure and can manufacture a "divergence" across a non-consecutive span.
  Empirically fires on ~21% of random noisy 80-bar series.
- **Why acceptable now**: HARMLESS for reversal_long/reversal_short (divergence only
  *boosts* confidence behind the RSI<30/>70 + Bollinger-band gate). It IS a real
  selectivity concern for the standalone `RSIDivergenceStrategy`, where it is the sole
  gate — that strategy may over-trigger. The composite signal_scorer threshold and
  the direction-vote in signal_engine partially mitigate, but not fully.
- **Fix before**: trusting RSIDivergenceStrategy standalone. Use consecutive-swing
  pairing (last two adjacent pivots) and add a multi-swing/noisy-window selectivity
  test (the current "clean trend" selectivity tests dodge this failure mode).

### KL-3 — bollinger_squeeze SQUEEZE_TOL=1.15 untuned, single-bar coil check
- **Where**: `strategies/bollinger_squeeze.py`. Squeeze read on the single bar before
  breakout rather than requiring sustained multi-bar contraction; tolerance unvalidated.
- **Fix before**: Phase-5. Tune against historical data; require N-bar contraction.

### KL-4 — volume_surge single-spike fixture coverage
- **Where**: `tests/conftest.py` volume_surge fixtures use one isolated spike. Real
  clustered-volume series suppress later z-scores (rolling std inflates). Not modeled.
- **Fix before**: Phase-5. Add a clustered-volume fixture.

### KL-5 — adx_trend backtest allows absurd Sharpe
- **Where**: `tests/test_backtest_engine.py` adx test passed with sharpe=81.42 because
  the synthetic alternating-leg fixture has near-zero return variance; `_assert_bounded`
  only checks `isfinite`. The test proves non-vacuity + finiteness, not sane stats.
- **Fix before**: Phase-5. Either use a realistic fixture or assert a plausible
  Sharpe range.

## Market intelligence (Phase 3)

### KL-11 — macro collectors: live-schema + thresholds unverified
- **Where**: `core/sentiment_macro.py` (aaii_sentiment, put_call, fear_greed,
  margin_debt, yield_curve, vix).
- Parsing heuristics (AAII `skiprows=3` + column match, CBOE 'ratio' column, AAII
  fraction-vs-percent autodetect) are inferred from documented past layouts and could
  NOT be validated against the live files (egress blocked; CBOE returned 403). If a
  provider changes its schema, the collector degrades to ok=False (no wrong data) but
  the signal silently goes neutral. **Fix before** trusting live ceiling score: run
  once against the real endpoints and pin the actual column names/offsets.
- Normalization bands (AAII 35-60, CBOE 0.60-0.90, margin 0/50%) are reasoned with
  provenance but NOT backtested against historical top events. Calibrate at Phase-5.
- FRED margin series `BOGZ1FL663067003Q` is the Z.1 quarterly brokers&dealers margin
  series (FINRA discontinued the classic monthly figure); semantics differ slightly —
  confirm against live FRED.
- Tests mock the network seams: they prove parse/normalize/cache/degrade LOGIC and the
  degradation path (verified no-raise on a real CBOE 403 + absent deps), NOT that the
  live files have the assumed shapes.

## Engine (Phase 1, carried)

### KL-6 — Partial unique index requires migration on existing DBs
- **Where**: `models/signal.py` `uq_active_signal`. `create_tables()` only creates the
  index on a fresh table. **Fix**: introduce Alembic (planned Phase 2/3) and ship a
  migration that adds the partial index to existing deployments.

### KL-8 — regime-aware scoring multipliers are heuristic, not calibrated
- **Where**: `core/signal_scorer.py` `_regime_multiplier` (1.10/0.95/0.90/0.85/0.80).
  Magnitudes encode plausible directionality (BULL favors trend-LONG, NEUTRAL favors
  reversion, HIGH_VOL defensive) but no historical edge measured to justify the exact
  sizes. Tie-break is a crude strict-majority vote (ignores confidence-weighting,
  collapses to "trend" on ties/empty). HIGH_VOL ignores direction (a trend signal
  aligned with a violent move is penalized as hard as one fighting it).
- **Why acceptable now**: directionally sound, bounded [0,100], deterministic,
  no live capital. **Fix before**: Phase-5 — calibrate against backtested
  regime-conditional returns; consider confidence-weighted category vote.

### KL-9 — realtime SSE residuals (non-blocking)
- **Where**: `routes/stream.py`, `core/event_bus.py`.
- Disconnect detection latency ~15s (bounded by heartbeat) — acceptable for this feed.
- Double keep-alive (own 15s ping + sse-starlette ping=15) — harmless redundancy.
- No app-level bounded per-connection queue; backpressure is delegated to uvicorn's
  TCP socket buffer (adversarial review confirmed this BOUNDS per-connection memory —
  not an unbounded-growth hazard). A bounded coalescing queue would only improve
  fairness, not safety.
- Tests use fakeredis (in-memory); real multi-worker pub/sub fan-out and sse-starlette
  HTTP framing are not exercised in CI. **Fix before** production: an integration test
  against a real Redis + multi-worker.
- seq-space reset blind spot (Redis flush/restart → silent event drop) was CLOSED:
  `replay_since` now emits RESYNC when last_id > newest buffered seq. A server
  epoch/run-id prefix on seq would make this fully robust (deferred).

### KL-10 — frontend realtime refetch not debounced
- **Where**: `web/hooks/useSignalStream.ts`. On `scan.completed`/`resync` the hook
  REST-refetches rankings; it has a single-in-flight guard but no debounce, so a
  burst of completed-scan events triggers serial refetches.
- **Why acceptable now**: each refetch is guarded and cheap; dashboard cadence is low.
  **Fix before** high-frequency scanning: add a trailing debounce.

### KL-7 — rate limiter is per-worker / in-memory
- **Where**: `routes/scanner.py`. Best-effort, resets on restart, not shared across
  workers. **Fix before** production: move to a Redis-backed limiter (defense-in-depth
  already noted in code).
