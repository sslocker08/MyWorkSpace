'use client'
import { useEffect, useState } from 'react'
import RRGChart, { RRGData } from '@/components/sectors/RRGChart'

type MomentumRow = {
  ticker: string
  name: string
  ret_21d: number
  ret_63d: number | null
  quadrant: string | null
}
type MomentumData = {
  ok?: boolean
  as_of?: string
  benchmark?: string
  sectors: MomentumRow[]
}

const QUADRANT_JP: Record<string, string> = {
  Leading: '先導 Leading',
  Improving: '改善 Improving',
  Weakening: '後退 Weakening',
  Lagging: '劣後 Lagging',
}

function pct(v: number | null): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  return `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}%`
}

// Direction is shown by a glyph + sign, never color alone (CVD-safe).
function RetCell({ v }: { v: number | null }) {
  if (v === null || v === undefined || Number.isNaN(v)) {
    return <span className="text-muted tabular-nums">—</span>
  }
  const up = v >= 0
  return (
    <span className={`tabular-nums ${up ? 'text-bull' : 'text-bear'}`}>
      <span aria-hidden="true" className="mr-1">{up ? '▲' : '▼'}</span>
      {pct(v)}
    </span>
  )
}

export default function SectorsPage() {
  const [rrg, setRrg] = useState<RRGData | null>(null)
  const [mom, setMom] = useState<MomentumData | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/sectors/rrg?days=300').then((r) => r.json()),
      fetch('/api/sectors/momentum?days=300').then((r) => r.json()),
    ])
      .then(([rrgRes, momRes]) => {
        if (!alive) return
        setRrg(rrgRes)
        setMom(momRes)
      })
      .catch(() => alive && setErr(true))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const rrgDegraded = !loading && (!rrg || rrg.ok === false || !rrg.sectors || Object.keys(rrg.sectors).length === 0)
  const momRows = mom?.sectors ?? []
  const momDegraded = !loading && (!mom || mom.ok === false || momRows.length === 0)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">セクターローテーション</h1>
        <p className="text-muted text-sm mt-1">
          11 GICS セクター ETF の相対力 (Relative Rotation Graph) と短期モメンタム。基準 = SPY。
        </p>
      </div>

      {err && (
        <div className="bg-surface border border-border rounded-lg p-6 text-bear text-sm" role="alert">
          <span aria-hidden="true" className="mr-2">⚠</span>
          データの取得に失敗しました。時間をおいて再読込してください。
        </div>
      )}

      {/* RRG chart (handles its own loading + degraded empty state) */}
      <RRGChart data={rrg} loading={loading} />

      {/* momentum table */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <h2 className="font-bold text-white text-sm mb-3">セクター モメンタム ランキング</h2>

        {loading ? (
          <div className="space-y-2 animate-pulse" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-6 bg-border/50 rounded" />
            ))}
          </div>
        ) : momDegraded ? (
          <div className="text-muted text-sm py-6 text-center" role="status">
            <span aria-hidden="true" className="mr-2">○</span>
            セクターデータ取得不可
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <caption className="sr-only">
                セクター別 21日・63日トータルリターンと RRG 象限（21日リターン降順）
              </caption>
              <thead>
                <tr className="text-muted text-xs border-b border-border">
                  <th scope="col" className="text-left font-medium py-2 pr-3">セクター</th>
                  <th scope="col" className="text-right font-medium py-2 px-3 tabular-nums">21日</th>
                  <th scope="col" className="text-right font-medium py-2 px-3 tabular-nums">63日</th>
                  <th scope="col" className="text-left font-medium py-2 pl-3">象限</th>
                </tr>
              </thead>
              <tbody>
                {momRows.map((row) => (
                  <tr key={row.ticker} className="border-b border-border/50 last:border-0">
                    <th scope="row" className="text-left font-normal py-2 pr-3">
                      <span className="text-white font-bold">{row.ticker}</span>
                      <span className="text-muted ml-2 text-xs">{row.name}</span>
                    </th>
                    <td className="text-right py-2 px-3"><RetCell v={row.ret_21d} /></td>
                    <td className="text-right py-2 px-3"><RetCell v={row.ret_63d} /></td>
                    <td className="text-left py-2 pl-3 text-muted text-xs">
                      {row.quadrant ? (QUADRANT_JP[row.quadrant] ?? row.quadrant) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
