'use client'
import ScanButton from '@/components/dashboard/ScanButton'

export default function ScannerPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-white">スキャナー</h1>
      <div className="bg-surface border border-border rounded-lg p-6">
        <p className="text-muted text-sm mb-4">全市場スキャン（S&P500 500銘柄 + ETF 30）を手動起動します。</p>
        <ScanButton />
      </div>
    </div>
  )
}
