'use client'
/**
 * Dynamic, client-only wrapper around CandleChart.
 *
 * web-performance: the charting library is heavy and touches `document`, so we
 * load it via next/dynamic with { ssr: false }. This keeps lightweight-charts
 * OUT of the initial JS bundle (code-split) and guarantees it never runs during
 * SSR. The `loading` skeleton reserves the SAME height the chart will occupy, so
 * there is no Cumulative Layout Shift when the lib finishes loading.
 *
 * Import THIS component (not CandleChart directly) everywhere in the app.
 */
import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'
import type CandleChartComponent from './CandleChart'

// Props are derived from the real component's type (type-only import, erased at
// build time so the heavy module is never pulled into this chunk).
type CandleChartProps = ComponentProps<typeof CandleChartComponent>

const DEFAULT_HEIGHT = 420

const LazyCandleChart = dynamic(() => import('./CandleChart'), {
  ssr: false,
  loading: () => (
    <div
      className="w-full bg-surface border border-border rounded-lg animate-pulse"
      style={{ height: DEFAULT_HEIGHT }}
      aria-hidden="true"
    />
  ),
})

export default function CandleChartDynamic(props: CandleChartProps) {
  return <LazyCandleChart {...props} />
}
