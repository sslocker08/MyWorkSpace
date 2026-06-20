'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import SignalRanking from '@/components/dashboard/SignalRanking'
import MarketRegimeBadge from '@/components/dashboard/MarketRegimeBadge'
import CeilingScoreGauge from '@/components/dashboard/CeilingScoreGauge'
import ScanButton from '@/components/dashboard/ScanButton'

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
        <div className="md:col-span-1">
          {loading ? (
            <div className="bg-surface border border-border rounded-lg p-6 animate-pulse h-48" />
          ) : ceiling ? (
            <CeilingScoreGauge score={ceiling.ceiling_score} breakdown={ceiling.breakdown} />
          ) : (
            <div className="bg-surface border border-border rounded-lg p-6 text-muted text-sm">
              データ取得中...
            </div>
          )}
        </div>
        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          <StatCard label="天井スコア" value={ceiling ? `${ceiling.ceiling_score.toFixed(0)}` : '...'} unit="/100" color={ceiling && ceiling.ceiling_score > 70 ? 'text-bear' : ceiling && ceiling.ceiling_score > 40 ? 'text-warn' : 'text-bull'} />
          <StatCard label="BofA Bull/Bear" value="8.5" unit="🔴 SELL" color="text-bear" />
          <StatCard label="SOXX MACD" value="NEGATIVE" unit="6/5" color="text-bear" />
          <StatCard label="Semi B2B" value="0.94" unit="< 1.0" color="text-warn" />
        </div>
      </div>

      {/* Signal Rankings */}
      <SignalRanking />
    </div>
  )
}

function StatCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-border rounded-lg p-4"
    >
      <div className="text-muted text-xs mb-2">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-muted text-xs mt-1">{unit}</div>
    </motion.div>
  )
}
