'use client'
import { useEffect, useState } from 'react'

type ConvergenceItem = { ticker: string; fund_count: number }
type HoldingItem = {
  ticker: string
  manager_name: string
  company_name: string
  value_usd_thousands: number
  pct_portfolio: number
  is_new_position: boolean
}
type Manager = { key: string; name: string; cik: string }

export default function InstitutionalPage() {
  const [convergence, setConvergence] = useState<ConvergenceItem[]>([])
  const [newPositions, setNewPositions] = useState<HoldingItem[]>([])
  const [managers, setManagers] = useState<Manager[]>([])
  const [quarter, setQuarter] = useState<string | null>(null)
  const [selectedManager, setSelectedManager] = useState<string | null>(null)
  const [holdings, setHoldings] = useState<HoldingItem[]>([])
  const [holdingsQuarter, setHoldingsQuarter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/institutional/convergence').then(r => r.json()),
      fetch('/api/institutional/new-positions').then(r => r.json()),
      fetch('/api/institutional/managers').then(r => r.json()),
    ]).then(([conv, newPos, mgrs]) => {
      setConvergence(conv.convergence ?? [])
      setNewPositions(newPos.new_positions ?? [])
      setQuarter(newPos.quarter ?? null)
      setManagers(mgrs.managers ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedManager) return
    setHoldings([])
    fetch(`/api/institutional/holdings/${selectedManager}`)
      .then(r => r.json())
      .then(d => {
        setHoldings(d.holdings ?? [])
        setHoldingsQuarter(d.quarter ?? null)
      })
  }, [selectedManager])

  if (loading) return <div className="p-6 text-muted">読込中...</div>

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">機関投資家 13F ポジション追跡</h1>
        <p className="text-muted text-sm mt-1">
          SEC EDGAR 13F-HR に基づく著名機関投資家のポジション（四半期更新 / 45日ラグ）
        </p>
      </div>

      {/* Convergence */}
      <div className="bg-surface border border-border rounded-lg p-6">
        <h2 className="font-bold mb-4">コンバージェンス銘柄（複数ファンド保有）</h2>
        {convergence.length === 0 ? (
          <div className="text-muted text-sm">
            データなし — <code className="text-xs">/api/institutional/refresh</code> を POST するか、毎週日曜の自動取得を待ってください
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted border-b border-border text-xs">
                  <th className="text-left py-2 pr-6">ティッカー</th>
                  <th className="text-left py-2">保有ファンド数</th>
                </tr>
              </thead>
              <tbody>
                {convergence.map(item => (
                  <tr key={item.ticker} className="border-b border-border/40 hover:bg-border/20">
                    <td className="py-2 pr-6 font-bold text-accent tabular-nums">{item.ticker}</td>
                    <td className="py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-mono ${
                          item.fund_count >= 4
                            ? 'bg-bull/20 text-bull'
                            : item.fund_count >= 2
                            ? 'bg-warn/20 text-warn'
                            : 'text-muted'
                        }`}
                      >
                        {item.fund_count} ファンド
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Positions */}
      <div className="bg-surface border border-border rounded-lg p-6">
        <div className="flex items-baseline gap-3 mb-4">
          <h2 className="font-bold">新規ポジション</h2>
          {quarter && <span className="text-muted text-xs">四半期末: {quarter}</span>}
        </div>
        {newPositions.length === 0 ? (
          <div className="text-muted text-sm">データなし</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted border-b border-border text-xs">
                  <th className="text-left py-2 pr-4">ティッカー</th>
                  <th className="text-left py-2 pr-4">ファンド</th>
                  <th className="text-right py-2 pr-4">評価額</th>
                  <th className="text-right py-2">ポートフォリオ比</th>
                </tr>
              </thead>
              <tbody>
                {newPositions.slice(0, 20).map((p, i) => (
                  <tr key={`${p.ticker}-${i}`} className="border-b border-border/40 hover:bg-border/20">
                    <td className="py-2 pr-4 font-bold text-bull tabular-nums">{p.ticker}</td>
                    <td className="py-2 pr-4 text-muted text-xs">{p.manager_name}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      ${(p.value_usd_thousands / 1000).toFixed(1)}M
                    </td>
                    <td className="py-2 text-right tabular-nums text-muted">
                      {p.pct_portfolio?.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Per-Manager Holdings */}
      <div className="bg-surface border border-border rounded-lg p-6">
        <h2 className="font-bold mb-4">ファンド別ホールディングス</h2>
        <div className="flex gap-2 flex-wrap mb-5">
          {managers.map(m => (
            <button
              key={m.key}
              onClick={() => setSelectedManager(m.key)}
              className={`px-3 py-1 rounded text-xs border transition-colors ${
                selectedManager === m.key
                  ? 'bg-accent text-bg border-accent font-bold'
                  : 'border-border text-muted hover:border-accent hover:text-accent'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>

        {selectedManager && holdings.length === 0 && (
          <div className="text-muted text-sm">データなし（自動取得後に表示されます）</div>
        )}

        {selectedManager && holdings.length > 0 && (
          <>
            {holdingsQuarter && (
              <div className="text-muted text-xs mb-3">四半期末: {holdingsQuarter}</div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted border-b border-border text-xs">
                    <th className="text-left py-2 pr-4">ティッカー</th>
                    <th className="text-left py-2 pr-4">銘柄名</th>
                    <th className="text-right py-2 pr-4">評価額</th>
                    <th className="text-right py-2 pr-4">比率</th>
                    <th className="text-left py-2">新規</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.slice(0, 30).map((h, i) => (
                    <tr key={`${h.ticker}-${i}`} className="border-b border-border/40 hover:bg-border/20">
                      <td className="py-2 pr-4 font-bold text-accent tabular-nums">{h.ticker}</td>
                      <td className="py-2 pr-4 text-muted text-xs truncate max-w-[180px]">{h.company_name}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        ${(h.value_usd_thousands / 1000).toFixed(1)}M
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums text-muted">
                        {h.pct_portfolio?.toFixed(2)}%
                      </td>
                      <td className="py-2">
                        {h.is_new_position && (
                          <span className="text-bull text-xs font-bold">NEW</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
