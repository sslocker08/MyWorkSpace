/**
 * Zustand store for live signals + SSE connection health.
 *
 * One source of truth shared by SignalRanking (live list) and any detail view.
 * The list is kept sorted by score DESC at write time so consumers never re-sort
 * on every render. upsertSignal handles both the "new signal" and "this signal's
 * fields changed" cases (signal.created / signal.updated map to the same action).
 *
 * connectionState drives the small live/degraded/reconnecting indicator. The
 * hook (useSignalStream) owns transitions; components only read it.
 */
import { create } from 'zustand'

/** Mirrors the REST/SSE signal payload (routes.signals._serialize). */
export interface Signal {
  id: string
  ticker: string
  market?: string
  sector?: string
  direction: 'LONG' | 'SHORT'
  score: number
  strategy_hits: { strategies: string[] }
  entry_price: number
  stop_loss: number
  tp1: number
  tp2: number
  tp3?: number
  risk_reward: number
  regime?: string
  ceiling_score: number
  indicators?: Record<string, unknown>
  status?: string
  created_at: string
}

export type ConnectionState = 'connecting' | 'live' | 'degraded' | 'closed'

interface SignalStore {
  signals: Signal[]
  connectionState: ConnectionState
  /** Last SSE event id we processed (the seq). Informational/debug only — the
   *  browser's EventSource owns the real Last-Event-ID resume header. */
  lastEventId: string | null

  /** Insert a new signal or replace an existing one by id; keep sorted by score desc. */
  upsertSignal: (signal: Signal) => void
  /** Bulk replace (REST refetch / resync recovery). */
  setSignals: (signals: Signal[]) => void
  setConnectionState: (state: ConnectionState) => void
  setLastEventId: (id: string | null) => void
}

/** Stable sort by score DESC, then ticker ASC as a deterministic tiebreak so
 *  equal-score rows don't jitter between renders. */
function sortByScore(signals: Signal[]): Signal[] {
  return [...signals].sort(
    (a, b) => b.score - a.score || a.ticker.localeCompare(b.ticker),
  )
}

export const useSignalStore = create<SignalStore>((set) => ({
  signals: [],
  connectionState: 'connecting',
  lastEventId: null,

  upsertSignal: (signal) =>
    set((state) => {
      const idx = state.signals.findIndex((s) => s.id === signal.id)
      const next =
        idx === -1
          ? [...state.signals, signal]
          : state.signals.map((s) => (s.id === signal.id ? signal : s))
      return { signals: sortByScore(next) }
    }),

  setSignals: (signals) => set({ signals: sortByScore(signals) }),
  setConnectionState: (connectionState) => set({ connectionState }),
  setLastEventId: (lastEventId) => set({ lastEventId }),
}))
