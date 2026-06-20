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

## Engine (Phase 1, carried)

### KL-6 — Partial unique index requires migration on existing DBs
- **Where**: `models/signal.py` `uq_active_signal`. `create_tables()` only creates the
  index on a fresh table. **Fix**: introduce Alembic (planned Phase 2/3) and ship a
  migration that adds the partial index to existing deployments.

### KL-7 — rate limiter is per-worker / in-memory
- **Where**: `routes/scanner.py`. Best-effort, resets on restart, not shared across
  workers. **Fix before** production: move to a Redis-backed limiter (defense-in-depth
  already noted in code).
