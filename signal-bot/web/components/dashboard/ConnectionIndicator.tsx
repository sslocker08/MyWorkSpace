'use client'
/**
 * Small live-connection status pill for the realtime signal stream.
 *
 * a11y: status is carried by TEXT + a shape, not color alone (CVD-safe, same
 * contract as the ▲/▼ direction glyphs). aria-live="polite" announces transitions
 * (live -> reconnecting) without stealing focus. The pulsing dot respects
 * prefers-reduced-motion via the motion-safe: variant.
 */
import type { ConnectionState } from '@/lib/signalStore'

const MAP: Record<
  ConnectionState,
  { label: string; dot: string; text: string; glyph: string }
> = {
  connecting: { label: '接続中', dot: 'bg-warn', text: 'text-warn', glyph: '◌' },
  live: { label: 'ライブ', dot: 'bg-bull', text: 'text-bull', glyph: '●' },
  degraded: { label: '再接続中', dot: 'bg-warn', text: 'text-warn', glyph: '◐' },
  closed: { label: '切断', dot: 'bg-bear', text: 'text-bear', glyph: '○' },
}

export default function ConnectionIndicator({ state }: { state: ConnectionState }) {
  const s = MAP[state]
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs border border-border bg-surface tabular-nums"
      role="status"
      aria-live="polite"
      aria-label={`リアルタイム接続: ${s.label}`}
    >
      <span
        aria-hidden="true"
        className={`inline-block w-2 h-2 rounded-full ${s.dot} ${
          state === 'live' ? 'motion-safe:animate-pulse' : ''
        }`}
      />
      {/* Glyph + text so status never relies on color alone. */}
      <span className={s.text}>
        <span aria-hidden="true" className="mr-1">
          {s.glyph}
        </span>
        {s.label}
      </span>
    </span>
  )
}
