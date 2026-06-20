'use client'
/**
 * CandleChart — TradingView Lightweight Charts v5.2 candlestick + volume pane.
 *
 * IMPORTANT — v5 API (differs from v4):
 *   v4: chart.addCandlestickSeries(opts)  /  chart.addHistogramSeries(opts)
 *   v5: import { createChart, CandlestickSeries, HistogramSeries } and call
 *       chart.addSeries(CandlestickSeries, opts)   (series-CONSTRUCTOR pattern)
 *       chart.addSeries(HistogramSeries, opts, paneIndex)
 *   The 3rd arg to addSeries is the pane index (v5 multi-pane API), so the
 *   volume histogram lives in its own pane (index 1) below the candles.
 *
 * web-performance: this file is heavy (the charting lib) and touches `document`,
 * so it is ALWAYS loaded through CandleChartDynamic.tsx via next/dynamic with
 * { ssr: false }. It never SSRs and never ships in the initial bundle.
 *
 * Token discipline: NO hardcoded hex. Colors are read from the OKLCH CSS custom
 * properties (app/tokens.css) at runtime via getComputedStyle, so the chart
 * tracks the design system. Direction semantics stay CVD-safe at the data layer
 * (the surrounding UI carries the ▲/▼ glyphs; the chart is decoration).
 */
import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type IPriceLine,
  type UTCTimestamp,
  ColorType,
  LineStyle,
  CrosshairMode,
} from 'lightweight-charts'

export interface PriceLevel {
  /** Price to draw the horizontal line at. */
  price: number
  /** Short label shown on the price scale (e.g. "Entry", "SL", "TP1"). */
  title: string
  /** Token color name to use. */
  tone: 'accent' | 'bull' | 'bear' | 'warn'
}

interface CandleChartProps {
  ticker: string
  days?: number
  /** Optional entry / SL / TP markers drawn as horizontal price lines. */
  levels?: PriceLevel[]
  /** Explicit height in px (no CLS — caller reserves the same height). */
  height?: number
}

interface OhlcvResponse {
  ticker: string
  candles: Array<{ time: number; open: number; high: number; low: number; close: number }>
  volume: Array<{ time: number; value: number }>
}

/** Read an OKLCH token from :root so the chart uses the design system, not hex. */
function token(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
  return v || fallback
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )
}

export default function CandleChart({
  ticker,
  days = 180,
  levels = [],
  height = 420,
}: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const priceLinesRef = useRef<IPriceLine[]>([])

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  // ---- Chart lifecycle: create once on mount, dispose on unmount. ----
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const reduceMotion = prefersReducedMotion()

    const chart = createChart(container, {
      width: container.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: token('--color-bg', '#0d0d0d') },
        textColor: token('--color-muted', '#6b7280'),
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: token('--color-border', '#1f1f1f') },
        horzLines: { color: token('--color-border', '#1f1f1f') },
      },
      rightPriceScale: { borderColor: token('--color-border', '#1f1f1f') },
      timeScale: {
        borderColor: token('--color-border', '#1f1f1f'),
        timeVisible: false,
        secondsVisible: false,
      },
      crosshair: { mode: CrosshairMode.Normal },
      // Respect reduced-motion: disable the kinetic scroll/scale animations.
      kineticScroll: { touch: !reduceMotion, mouse: false },
    })
    chartRef.current = chart

    // v5 series-constructor pattern (NOT v4's addCandlestickSeries).
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: token('--color-bull', '#10b981'),
      downColor: token('--color-bear', '#ef4444'),
      borderUpColor: token('--color-bull', '#10b981'),
      borderDownColor: token('--color-bear', '#ef4444'),
      wickUpColor: token('--color-bull', '#10b981'),
      wickDownColor: token('--color-bear', '#ef4444'),
    })
    candleSeriesRef.current = candleSeries

    // Volume histogram in its own pane (v5 paneIndex = 3rd arg of addSeries).
    const volumeSeries = chart.addSeries(
      HistogramSeries,
      {
        priceFormat: { type: 'volume' },
        // Decorative single-tone bars (the candle pane already carries the
        // up/down direction); cyan accent keeps it visually subordinate.
        color: token('--color-accent', '#22d3ee'),
        priceScaleId: '',
      },
      1, // pane index 1 = the volume pane below the candles
    )
    volumeSeriesRef.current = volumeSeries

    // Keep the volume pane compact relative to the price pane.
    try {
      const panes = chart.panes()
      if (panes.length > 1) panes[1].setHeight(Math.round(height * 0.22))
    } catch {
      // panes() unavailable in an older patch — non-fatal, default layout used.
    }

    // ResizeObserver -> applyOptions width (and height tracks the container too).
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry || !chartRef.current) return
      const { width } = entry.contentRect
      chartRef.current.applyOptions({ width: Math.floor(width) })
    })
    ro.observe(container)

    // ---- Fetch real OHLCV; render or show the error state. ----
    const controller = new AbortController()
    ;(async () => {
      try {
        const res = await fetch(`/api/ohlcv/${encodeURIComponent(ticker)}?days=${days}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`OHLCV ${res.status}`)
        const data = (await res.json()) as OhlcvResponse

        const candles: CandlestickData[] = data.candles.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
        const volume: HistogramData[] = data.volume.map((v) => ({
          time: v.time as UTCTimestamp,
          value: v.value,
        }))

        if (controller.signal.aborted) return
        candleSeries.setData(candles)
        volumeSeries.setData(volume)

        // Entry / SL / TP horizontal price lines (createPriceLine, v5).
        for (const lvl of levels) {
          const line = candleSeries.createPriceLine({
            price: lvl.price,
            color: token(`--color-${lvl.tone}`, '#22d3ee'),
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: lvl.title,
          })
          priceLinesRef.current.push(line)
        }

        chart.timeScale().fitContent()
        setStatus('ready')
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return
        setStatus('error')
      }
    })()

    return () => {
      controller.abort()
      ro.disconnect()
      // Dispose the chart — prevents leaks in a long-running terminal session.
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
      priceLinesRef.current = []
    }
    // Re-create when the ticker/days/height change (fresh data + clean dispose).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, days, height])

  return (
    <div className="relative w-full" style={{ height }}>
      {/* The chart mounts here. Explicit height on the wrapper = no CLS. */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        role="img"
        aria-label={`${ticker} のローソク足チャート（出来高付き）`}
      />

      {status === 'loading' && (
        <div
          className="absolute inset-0 bg-surface border border-border rounded-lg animate-pulse"
          aria-hidden="true"
        />
      )}

      {status === 'error' && (
        <div
          className="absolute inset-0 bg-surface border border-border rounded-lg flex flex-col items-center justify-center gap-2 text-center px-6"
          role="alert"
        >
          <div className="text-bear font-bold">データ取得不可</div>
          <div className="text-muted text-xs">
            {ticker} の価格データを取得できませんでした。
          </div>
        </div>
      )}
    </div>
  )
}
