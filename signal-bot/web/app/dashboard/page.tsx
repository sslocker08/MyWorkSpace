'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
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

export default function DashboardPage() {
  const [ceiling, setCeiling] = useState<CeilingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/market-intel/ceiling-score')
      .then(r => r.json())
      .then(data => { setCeiling(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">司令室</h1>
          <p className="text-muted text-sm mt-1">AI ネイティブ全市場スキャナー</p>
        </div>
        <div className="flex items-center gap-4">
          {ceiling && <MarketRegimeBadge regime={ceiling.regime} ceilingScore={ceiling.ceiling_score} />}
          <ScanButton />
        </div>
      </div>

      {/* Ceiling score + stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* min-h matches the resolved gauge to avoid CLS during load */}
        <div className="md:col-span-1 min-h-[18rem]">
          {loading ? (
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
          <StatCard label="天井スコア" value={ceiling ? `${ceiling.ceiling_score.toFixed(0)}` : '...'} unit="/100" color={ceiling && ceiling.ceiling_score > 70 ? 'text-bear' : ceiling && ceiling.ceiling_score > 40 ? 'text-warn' : 'text-bull'} live />
          {/* The three below are STATIC June-2026 reference values, NOT live feeds.
              Flagged with `staticRef` so they are never implied to be real-time. */}
          <StatCard label="BofA Bull/Bear" value="8.5" unit="▼ SELL (閾値8.0超)" color="text-bear" staticRef />
          <StatCard label="SOXX MACD" value="NEGATIVE" unit="2026/6/5 転換" color="text-bear" staticRef />
          <StatCard label="Semi B2B" value="0.94" unit="< 1.0 (受注減)" color="text-warn" staticRef />
        </div>
      </div>

      {/* Signal Rankings */}
      <SignalRanking />
    </div>
  )
}

function StatCard({ label, value, unit, color, staticRef, live }: { label: string; value: string; unit: string; color: string; staticRef?: boolean; live?: boolean }) {
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
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted shrink-0" title="リアルタイムではない静的な参考値です">
            参考値 / static
          </span>
        )}
      </div>
      <div className={`text-2xl font-bold tabular-nums ${color}`} aria-live={live ? 'polite' : undefined}>{value}</div>
      <div className="text-muted text-xs mt-1">{unit}</div>
    </motion.div>
  )
}
