'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SignalRanking from '@/components/dashboard/SignalRanking'
import MarketRegimeBadge from '@/components/dashboard/MarketRegimeBadge'
import CeilingScoreGauge from '@/components/dashboard/CeilingScoreGauge'
import ScanButton from '@/components/dashboard/ScanButton'

// TODO (Phase 2 — web-performance): when the historical ceiling-score chart lands,
// load TradingView Lightweight Charts via next/dynamic with { ssr: false } so the
// charting lib (~45KB) is code-split out of the initial bundle and never blocks LCP:
//   const CeilingChart = dynamic(() => import('@/components/dashboard/CeilingChart'), {
//     ssr: false, loading: () => <div className="h-48 bg-surface rounded-lg animate-pulse" />,
//   })
// Do NOT add the library now.

interface CeilingData {
  ceiling_score: number
  regime: string
  breakdown: Record<string, number>
  computed_at: string
}

interface AnomalyItem {
  ticker: string
  anomaly_type: string
  volume_zscore: number
  price_change_pct: number
  is_flagged: boolean
  message: string
}

interface SectorRow {
  ticker: string
  name: string
  ret_21d: number
  ret_63d: number | null
  quadrant: string | null
}

const CEILING_REFRESH_MS = 60_000   // 60 s
const ANOMALY_REFRESH_MS = 300_000  // 5 min (matches server cache TTL)

function useFetchInterval<T>(
  url: string,
  intervalMs: number,
): { data: T | null; loading: boolean; updatedAt: Date | null } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let alive = true
    const run = () =>
      fetch(url)
        .then(r => r.json())
        .then(d => {
          if (alive) { setData(d); setLoading(false); setUpdatedAt(new Date()) }
        })
        .catch(() => { if (alive) setLoading(false) })

    run()
    timerRef.current = setInterval(run, intervalMs)
    return () => { alive = false; clearInterval(timerRef.current ?? undefined) }
  }, [url, intervalMs])

  return { data, loading, updatedAt }
}

export default function DashboardPage() {
  const { data: ceiling, loading: ceilLoading, updatedAt: ceilUpdatedAt } =
    useFetchInterval<CeilingData>('/api/market-intel/ceiling-score', CEILING_REFRESH_MS)

  const { data: anomalyResp } =
    useFetchInterval<{ anomalies: AnomalyItem[] }>('/api/anomaly', ANOMALY_REFRESH_MS)

  const [sectors, setSectors] = useState<SectorRow[]>([])
  useEffect(() => {
    fetch('/api/sectors/momentum')
      .then(r => r.json())
      .then(d => { if (d.ok && Array.isArray(d.sectors)) setSectors(d.sectors) })
      .catch(() => {})
  }, [])

  const flagged = (anomalyResp?.anomalies ?? []).filter(a => a.is_flagged)
  const topSectors = sectors.slice(0, 3)
  const bottomSectors = sectors.slice(-3).reverse()

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">司令室</h1>
          <p className="text-muted text-sm mt-0.5">
            AI ネイティブ全市場スキャナー
            {ceilUpdatedAt && (
              <span className="ml-2 opacity-60">
                最終更新 {ceilUpdatedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {ceiling && <MarketRegimeBadge regime={ceiling.regime} ceilingScore={ceiling.ceiling_score} />}
          <ScanButton />
        </div>
      </div>

      {/* Anomaly alert strip — only shown when at least one flag fires */}
      <AnimatePresence>
        {flagged.length > 0 && (
          <motion.div
            key="anomaly-strip"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 flex-wrap bg-surface border border-border rounded-lg px-4 py-2.5">
              <span className="text-xs text-muted shrink-0">🚨 異常検知</span>
              {flagged.map(a => (
                <AnomalyBadge key={a.ticker} item={a} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ceiling score + stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* min-h matches the resolved gauge to avoid CLS during load */}
        <div className="md:col-span-1 min-h-[18rem]">
          {ceilLoading ? (
            <div className="bg-surface border border-border rounded-lg p-6 animate-pulse min-h-[18rem] h-full" />
          ) : ceiling ? (
            <CeilingScoreGauge score={ceiling.ceiling_score} breakdown={ceiling.breakdown} />
          ) : (
            <div className="bg-surface border border-border rounded-lg p-6 text-muted text-sm min-h-[18rem]">
              データ取得中...
            </div>
          )}
        </div>
        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          {/* 天井スコア = live (from API). Announced via aria-live. */}
          <StatCard
            label="天井スコア"
            value={ceiling ? `${ceiling.ceiling_score.toFixed(0)}` : '...'}
            unit="/100"
            color={
              ceiling && ceiling.ceiling_score > 70 ? 'text-bear'
              : ceiling && ceiling.ceiling_score > 40 ? 'text-warn'
              : 'text-bull'
            }
            live
          />
          {/* The three below are STATIC June-2026 reference values, NOT live feeds.
              Flagged with `staticRef` so they are never implied to be real-time. */}
          <StatCard label="BofA Bull/Bear" value="8.5" unit="▼ SELL (閾値8.0超)" color="text-bear" staticRef />
          <StatCard label="SOXX MACD" value="NEGATIVE" unit="2026/6/5 転換" color="text-bear" staticRef />
          <StatCard label="Semi B2B" value="0.94" unit="< 1.0 (受注減)" color="text-warn" staticRef />
        </div>
      </div>

      {/* Sector momentum strip — top 3 gaining / bottom 3 lagging */}
      {sectors.length > 0 && (
        <div className="bg-surface border border-border rounded-lg px-4 py-3">
          <div className="text-xs text-muted mb-2">セクターモメンタム（21日）</div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted shrink-0">上昇</span>
              {topSectors.map(s => (
                <SectorChip key={s.ticker} row={s} up />
              ))}
            </div>
            <div className="w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted shrink-0">下落</span>
              {bottomSectors.map(s => (
                <SectorChip key={s.ticker} row={s} up={false} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Signal Rankings */}
      <SignalRanking />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function AnomalyBadge({ item }: { item: AnomalyItem }) {
  const isPump = item.anomaly_type === 'PUMP_PHASE'
  const isDump = item.anomaly_type === 'DUMP_SIGNAL'
  const pctStr = (item.price_change_pct >= 0 ? '+' : '') + item.price_change_pct.toFixed(1) + '%'
  const typeLabel = isPump ? 'PUMP' : isDump ? 'DUMP' : 'ACC'
  const colorClass = isPump
    ? 'border-bull text-bull'
    : isDump
    ? 'border-bear text-bear'
    : 'border-warn text-warn'

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs border rounded px-2 py-0.5 ${colorClass}`}
      title={item.message}
    >
      <span className="font-semibold">{item.ticker}</span>
      <span className="opacity-80">{typeLabel} {pctStr}</span>
    </span>
  )
}

function SectorChip({ row, up }: { row: SectorRow; up: boolean }) {
  const pct = (row.ret_21d * 100).toFixed(1)
  const sign = up ? '▲' : '▼'
  const color = up ? 'text-bull' : 'text-bear'
  return (
    <span className={`text-xs tabular-nums ${color}`}>
      {sign} {row.ticker} {pct}%
    </span>
  )
}

function StatCard({
  label, value, unit, color, staticRef, live,
}: {
  label: string; value: string; unit: string; color: string; staticRef?: boolean; live?: boolean
}) {
  return (
    // min-h prevents CLS when the value swaps from "..." to data.
    // Animate opacity/transform only (no layout properties).
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-border rounded-lg p-4 min-h-[6.5rem]"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-muted text-xs">{label}</div>
        {staticRef && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted shrink-0"
            title="リアルタイムではない静的な参考値です"
          >
            参考値 / static
          </span>
        )}
      </div>
      <div
        className={`text-2xl font-bold tabular-nums ${color}`}
        aria-live={live ? 'polite' : undefined}
      >
        {value}
      </div>
      <div className="text-muted text-xs mt-1">{unit}</div>
    </motion.div>
  )
}
