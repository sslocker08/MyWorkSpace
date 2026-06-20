'use client'
import { motion } from 'framer-motion'

interface Props {
  score: number
  breakdown: Record<string, number>
}

const SIGNALS = [
  { key: 'baa_bull_bear', label: 'BofA Bull/Bear' },
  { key: 'aaii_sentiment', label: 'AAII センチメント' },
  { key: 'put_call_ratio', label: 'P/C 比率' },
  { key: 'fear_greed', label: 'Fear & Greed' },
  { key: 'margin_debt', label: 'マージンデット' },
  { key: 'breadth', label: 'ブレッド劣化' },
  { key: 'vix_term', label: 'VIX ターム' },
  { key: 'valuation', label: 'バリュエーション' },
  { key: 'sector_rotation', label: 'セクターシフト' },
  { key: 'semi_cycle', label: '半導体サイクル' },
]

export default function CeilingScoreGauge({ score, breakdown }: Props) {
  const color = score > 70 ? '#ef4444' : score > 40 ? '#f59e0b' : '#10b981'
  const label = score > 70 ? '天井圏 ⚠' : score > 40 ? '警戒圏' : '安全圏'

  return (
    <div className="bg-surface border border-border rounded-lg p-4 h-full">
      <div className="text-muted text-xs mb-3">靴磨き少年指数（天井スコア）</div>

      {/* Gauge arc */}
      <div className="flex flex-col items-center mb-4">
        <svg width="120" height="70" viewBox="0 0 120 70">
          <path d="M 10 65 A 50 50 0 0 1 110 65" fill="none" stroke="#1f2937" strokeWidth="8" strokeLinecap="round" />
          <motion.path
            d="M 10 65 A 50 50 0 0 1 110 65"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="157"
            initial={{ strokeDashoffset: 157 }}
            animate={{ strokeDashoffset: 157 * (1 - score / 100) }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
          <text x="60" y="58" textAnchor="middle" fill={color} fontSize="18" fontWeight="bold" fontFamily="monospace">
            {score.toFixed(0)}
          </text>
        </svg>
        <div style={{ color }} className="text-sm font-bold mt-1">{label}</div>
      </div>

      {/* Breakdown bars */}
      <div className="space-y-1">
        {SIGNALS.slice(0, 5).map(({ key, label }) => {
          const val = breakdown[key] ?? 0
          return (
            <div key={key} className="flex items-center gap-2">
              <div className="text-muted text-xs w-28 truncate">{label}</div>
              <div className="flex-1 h-1.5 bg-border rounded overflow-hidden">
                <motion.div
                  className="h-full rounded"
                  style={{ backgroundColor: val > 0.7 ? '#ef4444' : val > 0.4 ? '#f59e0b' : '#10b981' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${val * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                />
              </div>
              <div className="text-muted text-xs w-8 text-right">{(val * 100).toFixed(0)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
