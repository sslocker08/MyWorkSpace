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

      <div className="bg-surface border border-border rounded-lg p-6">
        <div className="text-muted text-sm mb-2">靴磨き少年指数（天井スコア）</div>
        <div className={`text-5xl font-bold mb-4 ${
          data.ceiling_score > 70 ? 'text-bear' : data.ceiling_score > 40 ? 'text-warn' : 'text-bull'
        }`}>
          {data.ceiling_score?.toFixed(1)} / 100
        </div>
        <div className="text-muted text-xs">更新: {data.computed_at}</div>
      </div>

      <div className="bg-surface border border-border rounded-lg p-6">
        <h2 className="font-bold mb-4">10軸ブレイクダウン</h2>
        <div className="space-y-3">
          {Object.entries(data.breakdown || {}).map(([key, val]) => (
            <div key={key} className="flex items-center gap-4">
              <div className="w-40 text-muted text-xs">{key}</div>
              <div className="flex-1 h-2 bg-border rounded overflow-hidden">
                <div
                  className="h-full rounded transition-all"
                  style={{
                    width: `${(val as number) * 100}%`,
                    backgroundColor: (val as number) > 0.7 ? '#ef4444' : (val as number) > 0.4 ? '#f59e0b' : '#10b981'
                  }}
                />
              </div>
              <div className="w-12 text-right text-xs text-white">{((val as number) * 100).toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg p-6">
        <h2 className="font-bold mb-4 text-bear">⚠ アクティブ天井シグナル（2026年6月）</h2>
        <ul className="space-y-2 text-sm text-muted">
          <li className="flex gap-2"><span className="text-bear">●</span>BofA Bull/Bear: 8.5（閾値8.0超 = SELL発動中）</li>
          <li className="flex gap-2"><span className="text-bear">●</span>SOXX MACD: 2026/6/5にマイナス転換</li>
          <li className="flex gap-2"><span className="text-bear">●</span>SEMI Book-to-Bill: 0.94（&lt;1.0 = 受注減少）</li>
          <li className="flex gap-2"><span className="text-warn">●</span>マージンデット: $1.28兆（前年比+36%）</li>
          <li className="flex gap-2"><span className="text-warn">●</span>XLK 先物P/E: 5年平均比+118%</li>
        </ul>
      </div>
    </div>
  )
}
