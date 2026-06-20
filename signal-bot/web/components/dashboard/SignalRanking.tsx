'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Signal {
  id: string
  ticker: string
  direction: 'LONG' | 'SHORT'
  score: number
  strategy_hits: { strategies: string[] }
  entry_price: number
  stop_loss: number
  tp1: number
  tp2: number
  risk_reward: number
  ceiling_score: number
  regime: string
  created_at: string
}

export default function SignalRanking() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'LONG' | 'SHORT'>('ALL')

  const fetchSignals = () => {
    const params = new URLSearchParams({ limit: '20', status: 'ACTIVE' })
    if (filter !== 'ALL') params.set('direction', filter)

    fetch(`/api/signals/?${params}`)
      .then(r => r.json())
      .then(data => { setSignals(data.signals || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchSignals() }, [filter])

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <h2 className="font-bold text-white">シグナルランキング</h2>
        <div className="flex gap-2" role="group" aria-label="方向フィルター">
          {(['ALL', 'LONG', 'SHORT'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`px-3 py-1 text-xs rounded transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                filter === f
                  ? f === 'LONG' ? 'bg-bull text-bg' : f === 'SHORT' ? 'bg-bear text-bg' : 'bg-accent text-bg'
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
          >↻</button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted text-sm">スキャン中...</div>
      ) : signals.length === 0 ? (
        <div className="p-8 text-center text-muted text-sm">シグナルなし。スキャナーを起動してください。</div>
      ) : (
        <div className="divide-y divide-border" aria-live="polite" aria-busy={loading}>
          <AnimatePresence>
            {signals.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="px-6 py-3 hover:bg-border/30 transition-colors flex items-center gap-4"
              >
                <div className="w-6 text-muted text-xs">{i + 1}</div>
                <div className="w-20">
                  <div className="font-bold text-white">{s.ticker}</div>
                  <div className="text-muted text-xs">{s.created_at?.slice(0, 10)}</div>
                </div>
                {/* Direction encoded by glyph + text, not color alone (CVD-safe) */}
                <span className={`px-2 py-0.5 text-xs rounded font-bold tabular-nums ${
                  s.direction === 'LONG' ? 'bg-bull/20 text-bull' : 'bg-bear/20 text-bear'
                }`}>
                  {s.direction === 'LONG' ? '▲ LONG' : '▼ SHORT'}
                </span>
                <div className="flex-1">
                  <div className="text-xs text-muted">
                    {(s.strategy_hits?.strategies || []).join(' · ')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold">${s.entry_price?.toFixed(2)}</div>
                  <div className="text-muted text-xs">SL ${s.stop_loss?.toFixed(2)}</div>
                </div>
                <div className="w-16 text-right">
                  <div className={`text-lg font-bold ${
                    s.score >= 80 ? 'text-bull' : s.score >= 60 ? 'text-warn' : 'text-muted'
                  }`}>{s.score?.toFixed(0)}</div>
                  <div className="text-muted text-xs">R:{s.risk_reward?.toFixed(1)}</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
