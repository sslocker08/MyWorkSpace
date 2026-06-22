'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useSignalStore, type Signal } from '@/lib/signalStore'
import { useSignalStream } from '@/hooks/useSignalStream'
import ConnectionIndicator from './ConnectionIndicator'

export default function SignalRanking() {
  // Signals live in the shared store so the realtime stream (useSignalStream)
  // and this list stay in sync; new signals appear live via upsertSignal.
  const signals = useSignalStore((s) => s.signals)
  const setSignals = useSignalStore((s) => s.setSignals)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'LONG' | 'SHORT'>('ALL')

  // Open the SSE stream once; it pushes live signals into the store and exposes
  // the connection state for the indicator. EventSource auto-reconnects itself.
  const { connectionState } = useSignalStream()

  const fetchSignals = () => {
    // The REST list is the authoritative seed; the stream layers live deltas on
    // top. We fetch without a direction filter and filter client-side so live
    // upserts for the other direction aren't dropped from the store.
    setLoading(true)
    fetch(`/api/signals/?limit=50&status=ACTIVE`)
      .then((r) => r.json())
      .then((data) => {
        setSignals((data.signals as Signal[]) || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  // Seed once on mount; the stream keeps it fresh afterward.
  useEffect(() => {
    fetchSignals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visible = signals.filter((s) => filter === 'ALL' || s.direction === filter)

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-white">シグナルランキング</h2>
          {/* Live connection status — text+shape, not color alone (CVD-safe). */}
          <ConnectionIndicator state={connectionState} />
        </div>
        <div className="flex gap-2" role="group" aria-label="方向フィルター">
          {(['ALL', 'LONG', 'SHORT'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`px-3 py-1 text-xs rounded transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                filter === f
                  ? f === 'LONG'
                    ? 'bg-bull text-bg'
                    : f === 'SHORT'
                    ? 'bg-bear text-bg'
                    : 'bg-accent text-bg'
                  : 'bg-border text-muted hover:text-white'
              }`}
            >
              {f === 'LONG' ? '▲ LONG' : f === 'SHORT' ? '▼ SHORT' : 'ALL'}
            </button>
          ))}
          <button
            onClick={fetchSignals}
            aria-label="シグナルを再取得"
            className="px-3 py-1 text-xs rounded bg-border text-muted hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            ↻
          </button>
        </div>
      </div>

      {loading && signals.length === 0 ? (
        <div className="p-8 text-center text-muted text-sm">スキャン中...</div>
      ) : visible.length === 0 ? (
        <div className="p-8 text-center text-muted text-sm">
          シグナルなし。スキャナーを起動してください。
        </div>
      ) : (
        <div className="divide-y divide-border" aria-live="polite" aria-busy={loading}>
          <AnimatePresence>
            {visible.map((s, i) => (
              <motion.div
                key={s.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: Math.min(i, 10) * 0.03 }}
              >
                {/* Whole row is a link to the signal's candlestick detail view. */}
                <Link
                  href={`/signals/${s.id}`}
                  className="px-6 py-3 hover:bg-border/30 transition-colors flex items-center gap-4 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus"
                >
                  <div className="w-6 text-muted text-xs">{i + 1}</div>
                  <div className="w-20">
                    <div className="font-bold text-white">{s.ticker}</div>
                    <div className="text-muted text-xs">{s.created_at?.slice(0, 10)}</div>
                  </div>
                  {/* Direction encoded by glyph + text, not color alone (CVD-safe) */}
                  <span
                    className={`px-2 py-0.5 text-xs rounded font-bold tabular-nums ${
                      s.direction === 'LONG'
                        ? 'bg-bull/20 text-bull'
                        : 'bg-bear/20 text-bear'
                    }`}
                  >
                    {s.direction === 'LONG' ? '▲ LONG' : '▼ SHORT'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted truncate">
                      {(s.strategy_hits?.strategies || []).join(' · ')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold">${s.entry_price?.toFixed(2)}</div>
                    <div className="text-muted text-xs">SL ${s.stop_loss?.toFixed(2)}</div>
                  </div>
                  <div className="w-16 text-right">
                    <div
                      className={`text-lg font-bold ${
                        s.score >= 80
                          ? 'text-bull'
                          : s.score >= 60
                          ? 'text-warn'
                          : 'text-muted'
                      }`}
                    >
                      {s.score?.toFixed(0)}
                    </div>
                    <div className="text-muted text-xs">R:{s.risk_reward?.toFixed(1)}</div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
