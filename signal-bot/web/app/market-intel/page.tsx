'use client'
import { useEffect, useState } from 'react'

export default function MarketIntelPage() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetch('/api/market-intel/ceiling-score')
      .then(r => r.json())
      .then(setData)
  }, [])

  if (!data) return <div className="p-6 text-muted">読込中...</div>

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-white">マーケットインテリジェンス</h1>

      <div className="bg-surface border border-border rounded-lg p-6 min-h-[8rem]">
        <div className="text-muted text-sm mb-2">靴磨き少年指数（天井スコア）</div>
        <div
          className={`text-5xl font-bold mb-4 tabular-nums ${
            data.ceiling_score > 70 ? 'text-bear' : data.ceiling_score > 40 ? 'text-warn' : 'text-bull'
          }`}
          aria-live="polite"
        >
          <span aria-hidden="true" className="mr-2 text-2xl align-middle">
            {data.ceiling_score > 70 ? '⚠' : data.ceiling_score > 40 ? '◐' : '✓'}
          </span>
          {data.ceiling_score?.toFixed(1)} / 100
        </div>
        <div className="text-muted text-xs">更新: {data.computed_at}</div>
      </div>

      <div className="bg-surface border border-border rounded-lg p-6">
        <h2 className="font-bold mb-4">10軸ブレイクダウン</h2>
        <div className="space-y-3">
          {Object.entries(data.breakdown || {}).map(([key, val]) => {
            const v = val as number
            const zone = v > 0.7 ? { c: 'var(--color-bear)', g: '⚠', l: '天井' } : v > 0.4 ? { c: 'var(--color-warn)', g: '◐', l: '警戒' } : { c: 'var(--color-bull)', g: '✓', l: '安全' }
            return (
              <div key={key} className="flex items-center gap-4">
                <div className="w-40 text-muted text-xs">{key}</div>
                <div className="flex-1 h-2 bg-border rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all"
                    style={{ width: `${v * 100}%`, backgroundColor: zone.c }}
                  />
                </div>
                {/* zone glyph + % so the bar is not color-only (CVD-safe) */}
                <div className="w-16 text-right text-xs text-white tabular-nums" title={`${zone.l}圏`}>
                  <span aria-hidden="true" className="mr-1">{zone.g}</span>{(v * 100).toFixed(0)}%
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg p-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="font-bold text-bear">⚠ 天井シグナル（2026年6月時点）</h2>
          {/* These are static reference values captured for June 2026, NOT a live feed. */}
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted shrink-0" title="リアルタイムではない静的な参考値（2026年6月時点のスナップショット）です">
            参考値 / static estimate
          </span>
        </div>
        <ul className="space-y-2 text-sm text-muted">
          <li className="flex gap-2"><span className="text-bear" aria-hidden="true">⚠</span>BofA Bull/Bear: 8.5（閾値8.0超 = SELL発動中）</li>
          <li className="flex gap-2"><span className="text-bear" aria-hidden="true">⚠</span>SOXX MACD: 2026/6/5にマイナス転換</li>
          <li className="flex gap-2"><span className="text-bear" aria-hidden="true">⚠</span>SEMI Book-to-Bill: 0.94（&lt;1.0 = 受注減少）</li>
          <li className="flex gap-2"><span className="text-warn" aria-hidden="true">◐</span>マージンデット: $1.28兆（前年比+36%）</li>
          <li className="flex gap-2"><span className="text-warn" aria-hidden="true">◐</span>XLK 先物P/E: 5年平均比+118%</li>
        </ul>
      </div>
    </div>
  )
}
