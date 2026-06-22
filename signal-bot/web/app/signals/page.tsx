'use client'
import { useEffect, useState } from 'react'

interface Signal {
  id: string
  ticker: string
  direction: string
  score: number
  strategy_hits: { strategies: string[] }
  entry_price: number
  stop_loss: number
  tp1: number
  tp2: number
  tp3: number
  risk_reward: number
  regime: string
  ceiling_score: number
  indicators: Record<string, unknown>
  created_at: string
}

export default function SignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/signals/?limit=50&status=ACTIVE')
      .then(r => r.json())
      .then(d => { setSignals(d.signals || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-6">全シグナル</h1>
      {loading ? (
        <div className="text-muted">読込中...</div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-auto" aria-live="polite">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted text-xs">
                <th className="text-left p-3">銘柄</th>
                <th className="text-left p-3">方向</th>
                <th className="text-right p-3">スコア</th>
                <th className="text-right p-3">エントリー</th>
                <th className="text-right p-3">損切</th>
                <th className="text-right p-3">TP2</th>
                <th className="text-right p-3">R:R</th>
                <th className="text-left p-3">戦略</th>
                <th className="text-right p-3">天井</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {signals.map(s => (
                <tr key={s.id} className="hover:bg-border/20 transition-colors">
                  <td className="p-3 font-bold text-white">{s.ticker}</td>
                  <td className="p-3">
                    {/* Direction encoded by glyph + text, not color alone (CVD-safe) */}
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      s.direction === 'LONG' ? 'bg-bull/20 text-bull' : 'bg-bear/20 text-bear'
                    }`}>{s.direction === 'LONG' ? '▲ LONG' : '▼ SHORT'}</span>
                  </td>
                  <td className="p-3 text-right">
                    <span className={s.score >= 80 ? 'text-bull' : s.score >= 60 ? 'text-warn' : 'text-white'}>
                      {s.score?.toFixed(1)}
                    </span>
                  </td>
                  <td className="p-3 text-right text-white">${s.entry_price?.toFixed(2)}</td>
                  <td className="p-3 text-right text-bear">${s.stop_loss?.toFixed(2)}</td>
                  <td className="p-3 text-right text-bull">${s.tp2?.toFixed(2)}</td>
                  <td className="p-3 text-right">{s.risk_reward?.toFixed(1)}x</td>
                  <td className="p-3 text-muted text-xs">{(s.strategy_hits?.strategies || []).join(', ')}</td>
                  <td className="p-3 text-right">
                    <span className={s.ceiling_score > 70 ? 'text-bear' : s.ceiling_score > 40 ? 'text-warn' : 'text-muted'}>
                      {s.ceiling_score?.toFixed(0)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {signals.length === 0 && (
            <div className="p-8 text-center text-muted">シグナルなし。スキャナーを起動してください。</div>
          )}
        </div>
      )}
    </div>
  )
}
