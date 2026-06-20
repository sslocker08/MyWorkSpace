'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'

export default function ScanButton() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState('')

  const triggerScan = async () => {
    setScanning(true)
    setResult('')
    try {
      const res = await fetch('/api/scanner/trigger', { method: 'POST' })
      const data = await res.json()
      setResult(data.status === 'started' ? '✓ スキャン開始' : '⏳ 実行中')
    } catch {
      setResult('エラー')
    } finally {
      setTimeout(() => { setScanning(false); setResult('') }, 3000)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <motion.button
        onClick={triggerScan}
        disabled={scanning}
        aria-busy={scanning}
        whileHover={scanning ? undefined : { scale: 1.02 }}
        whileTap={scanning ? undefined : { scale: 0.98 }}
        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-70 ${
          scanning
            ? 'bg-muted text-bg cursor-not-allowed'
            : 'bg-accent text-bg hover:bg-cyan-300'
        }`}
      >
        {scanning ? '⟳ スキャン中...' : '▶ スキャン起動'}
      </motion.button>
      {result && <div className="text-xs text-bull" role="status" aria-live="polite">{result}</div>}
    </div>
  )
}
