'use client'
/**
 * Signal detail view — candlestick chart for one signal, with its entry / SL /
 * TP levels drawn as horizontal price lines.
 *
 * The heavy chart loads via CandleChartDynamic (next/dynamic, ssr:false) so the
 * charting lib stays out of the initial bundle and never SSRs.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import CandleChartDynamic from '@/components/chart/CandleChartDynamic'
import type { PriceLevel } from '@/components/chart/CandleChart'
import type { Signal } from '@/lib/signalStore'

const CHART_HEIGHT = 460

export default function SignalDetailPage({ params }: { params: { id: string } }) {
  const [signal, setSignal] = useState<Signal | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    fetch(`/api/signals/${encodeURIComponent(params.id)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`signal ${r.status}`)
        return r.json()
      })
      .then((data: Signal) => {
        if (cancelled) return
        setSignal(data)
        setState('ready')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [params.id])

  // Build entry/SL/TP price lines once the signal is loaded. Only include levels
  // that are real finite numbers (no fabricated markers).
  const levels: PriceLevel[] = signal
    ? (
        [
          { price: signal.entry_price, title: 'Entry', tone: 'accent' },
          { price: signal.stop_loss, title: 'SL', tone: 'bear' },
          { price: signal.tp1, title: 'TP1', tone: 'bull' },
          { price: signal.tp2, title: 'TP2', tone: 'bull' },
          { price: signal.tp3, title: 'TP3', tone: 'bull' },
        ] as Array<{ price: number | undefined; title: string; tone: PriceLevel['tone'] }>
      ).filter(
        (l): l is PriceLevel =>
          typeof l.price === 'number' && Number.isFinite(l.price),
      )
    : []

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link
            href="/dashboard"
            className="text-muted text-xs hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus rounded"
          >
            ← 司令室へ戻る
          </Link>
          <h1 className="text-xl font-bold text-white mt-1">
            {signal ? signal.ticker : '...'}
            {signal && (
              <span
                className={`ml-3 px-2 py-0.5 text-xs rounded font-bold align-middle ${
                  signal.direction === 'LONG'
                    ? 'bg-bull/20 text-bull'
                    : 'bg-bear/20 text-bear'
                }`}
              >
                {signal.direction === 'LONG' ? '▲ LONG' : '▼ SHORT'}
              </span>
            )}
          </h1>
        </div>
        {signal && (
          <div className="text-right">
            <div
              className={`text-2xl font-bold tabular-nums ${
                signal.score >= 80
                  ? 'text-bull'
                  : signal.score >= 60
                  ? 'text-warn'
                  : 'text-muted'
              }`}
            >
              {signal.score?.toFixed(0)}
            </div>
            <div className="text-muted text-xs">スコア / R:R {signal.risk_reward?.toFixed(1)}</div>
          </div>
        )}
      </div>

      {state === 'error' ? (
        <div
          className="bg-surface border border-border rounded-lg p-8 text-center"
          role="alert"
        >
          <div className="text-bear font-bold">データ取得不可</div>
          <div className="text-muted text-xs mt-1">
            このシグナルを読み込めませんでした。
          </div>
        </div>
      ) : (
        <>
          {/* Chart wrapper reserves height explicitly = no CLS. */}
          <div className="bg-surface border border-border rounded-lg p-4">
            {signal ? (
              <CandleChartDynamic
                ticker={signal.ticker}
                days={180}
                levels={levels}
                height={CHART_HEIGHT}
              />
            ) : (
              <div
                className="w-full bg-border/30 rounded-lg animate-pulse"
                style={{ height: CHART_HEIGHT }}
                aria-hidden="true"
              />
            )}
          </div>

          {/* Level summary table mirrors the chart's price lines. */}
          {signal && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <LevelCard label="Entry" value={signal.entry_price} tone="text-accent" />
              <LevelCard label="損切 (SL)" value={signal.stop_loss} tone="text-bear" />
              <LevelCard label="TP1" value={signal.tp1} tone="text-bull" />
              <LevelCard label="TP2" value={signal.tp2} tone="text-bull" />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function LevelCard({
  label,
  value,
  tone,
}: {
  label: string
  value?: number
  tone: string
}) {
  return (
    <div className="bg-surface border border-border rounded-lg p-3">
      <div className="text-muted text-xs mb-1">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${tone}`}>
        {typeof value === 'number' && Number.isFinite(value)
          ? `$${value.toFixed(2)}`
          : '—'}
      </div>
    </div>
  )
}
