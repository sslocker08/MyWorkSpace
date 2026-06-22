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

// Risk zone carries a text label + glyph, never color alone (CVD-safe).
// Colors reference OKLCH tokens via var(--color-*) instead of inline hex.
function zoneOf(v: number) {
  if (v > 0.7) return { stroke: 'var(--color-bear)', label: '天井', glyph: '⚠' }
  if (v > 0.4) return { stroke: 'var(--color-warn)', label: '警戒', glyph: '◐' }
  return { stroke: 'var(--color-bull)', label: '安全', glyph: '✓' }
}

export default function CeilingScoreGauge({ score, breakdown }: Props) {
  const zone = zoneOf(score / 100)
  const color = zone.stroke
  const label = `${zone.glyph} ${zone.label}圏`

  return (
    <div className="bg-surface border border-border rounded-lg p-4 h-full min-h-[18rem]">
      <div className="text-muted text-xs mb-3">靴磨き少年指数（天井スコア）</div>

      {/* Gauge arc */}
      <div className="flex flex-col items-center mb-4">
        <svg width="120" height="70" viewBox="0 0 120 70" role="img"
             aria-label={`天井スコア ${score.toFixed(0)} / 100、${zone.label}圏`}>
          <path d="M 10 65 A 50 50 0 0 1 110 65" fill="none" stroke="var(--color-border)" strokeWidth="8" strokeLinecap="round" />
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
        {/* Announce score/zone changes to screen readers */}
        <div style={{ color }} className="text-sm font-bold mt-1" aria-live="polite">{label}</div>
      </div>

      {/* Breakdown bars */}
      <div className="space-y-1">
        {SIGNALS.slice(0, 5).map(({ key, label }) => {
          const val = breakdown[key] ?? 0
          const z = zoneOf(val)
          return (
            <div key={key} className="flex items-center gap-2">
              <div className="text-muted text-xs w-28 truncate">{label}</div>
              <div className="flex-1 h-1.5 bg-border rounded overflow-hidden">
                <motion.div
                  className="h-full rounded"
                  style={{ backgroundColor: z.stroke }}
                  initial={{ width: 0 }}
                  animate={{ width: `${val * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                />
              </div>
              {/* glyph distinguishes zone without relying on color */}
              <div className="text-muted text-xs w-8 text-right tabular-nums" title={`${z.label}圏`}>
                <span aria-hidden="true" className="mr-0.5">{z.glyph}</span>{(val * 100).toFixed(0)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
