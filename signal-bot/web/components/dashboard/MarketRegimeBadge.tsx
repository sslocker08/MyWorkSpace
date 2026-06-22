'use client'
import { motion } from 'framer-motion'

interface Props {
  regime: string
  ceilingScore: number
}

export default function MarketRegimeBadge({ regime, ceilingScore }: Props) {
  const config = ({
    BULL: { color: 'text-bull border-bull', label: '強気相場', bg: 'bg-bull/10' },
    BEAR: { color: 'text-bear border-bear', label: '弱気相場', bg: 'bg-bear/10' },
    CAUTION: { color: 'text-warn border-warn', label: '⚠ 警戒', bg: 'bg-warn/10' },
    NEUTRAL: { color: 'text-muted border-border', label: 'ニュートラル', bg: 'bg-surface' },
    HIGH_VOL: { color: 'text-accent border-accent', label: '高ボラ', bg: 'bg-accent/10' },
  } as Record<string, { color: string; label: string; bg: string }>)[regime] || { color: 'text-muted border-border', label: regime, bg: 'bg-surface' }

  return (
    <motion.div
      initial={{ scale: 0.95 }}
      animate={{ scale: 1 }}
      className={`border rounded-lg px-4 py-2 ${config.color} ${config.bg}`}
    >
      <div className="text-xs text-muted">レジーム</div>
      <div className="font-bold">{config.label}</div>
      <div className="text-xs mt-1">天井 {ceilingScore.toFixed(0)}/100</div>
    </motion.div>
  )
}
