'use client'
/*
 * RRGChart — Relative Rotation Graph as a plain SVG scatter.
 *
 * WHY SVG (not canvas/WebGL): only 11 points + short tails. SVG is the right
 * data-visualization tier here — crisp text labels, accessible DOM nodes, no
 * extra deps, no canvas blur. (Per the data-visualization skill: pick the
 * lightest renderer the data volume allows.)
 *
 * a11y / colorblind contract (see app/tokens.css):
 *   - Quadrant identity is carried by POSITION + a text label in each corner,
 *     never by color alone.
 *   - Each sector is carried by its TICKER text label next to the dot, never by
 *     color alone. Dots are tinted by quadrant only as redundant decoration.
 *   - All colors come from OKLCH tokens (var(--color-*)); no inline hex.
 *   - Reduced-motion: the dot/tail draw transition is disabled under
 *     prefers-reduced-motion.
 *   - The <svg> has role="img" + an aria-label summarizing the insight.
 */
import { useMemo } from 'react'

export type RRGTailPoint = { rs_ratio: number; rs_momentum: number }
export type RRGSector = {
  rs_ratio: number
  rs_momentum: number
  quadrant: 'Leading' | 'Weakening' | 'Lagging' | 'Improving' | string
  tail: RRGTailPoint[]
  name: string
}
export type RRGData = {
  ok?: boolean
  as_of?: string
  benchmark?: string
  sectors: Record<string, RRGSector>
}

// Quadrant -> token color (redundant decoration only; label carries meaning).
const QUADRANT_COLOR: Record<string, string> = {
  Leading: 'var(--color-bull)',
  Improving: 'var(--color-accent)',
  Weakening: 'var(--color-warn)',
  Lagging: 'var(--color-bear)',
}

const QUADRANT_JP: Record<string, string> = {
  Leading: '先導 Leading',
  Improving: '改善 Improving',
  Weakening: '後退 Weakening',
  Lagging: '劣後 Lagging',
}

// viewBox is fixed; the SVG scales responsively while keeping an explicit
// aspect (no CLS — the wrapper reserves height).
const VB = 400
const PAD = 44
const PLOT = VB - PAD * 2

function buildScale(values: number[]) {
  // Symmetric domain around 100 so the (100,100) axes sit dead center and a
  // quadrant always maps to the same screen corner. Pad the observed spread.
  let maxDev = 1.5
  for (const v of values) maxDev = Math.max(maxDev, Math.abs(v - 100))
  maxDev *= 1.15
  const lo = 100 - maxDev
  const hi = 100 + maxDev
  return { lo, hi, span: hi - lo }
}

export default function RRGChart({
  data,
  loading = false,
}: {
  data?: RRGData | null
  loading?: boolean
}) {
  const sectors = data?.sectors ?? {}
  const entries = Object.entries(sectors)

  const scales = useMemo(() => {
    const xs: number[] = []
    const ys: number[] = []
    for (const [, s] of entries) {
      xs.push(s.rs_ratio)
      ys.push(s.rs_momentum)
      for (const t of s.tail ?? []) {
        xs.push(t.rs_ratio)
        ys.push(t.rs_momentum)
      }
    }
    return { x: buildScale(xs), y: buildScale(ys) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  // --- loading skeleton ---------------------------------------------------
  if (loading) {
    return (
      <div
        className="bg-surface border border-border rounded-lg p-4 animate-pulse"
        style={{ minHeight: '24rem' }}
        aria-busy="true"
        aria-label="RRG チャート読込中"
      >
        <div className="h-4 w-40 bg-border rounded mb-4" />
        <div className="h-72 bg-border/50 rounded" />
      </div>
    )
  }

  // --- empty / degraded state --------------------------------------------
  if (!entries.length) {
    return (
      <div
        className="bg-surface border border-border rounded-lg p-6 flex items-center justify-center text-muted text-sm"
        style={{ minHeight: '24rem' }}
        role="status"
      >
        <span>
          <span aria-hidden="true" className="mr-2">○</span>
          セクターデータ取得不可（RRGを描画できません）
        </span>
      </div>
    )
  }

  const px = (v: number) =>
    PAD + ((v - scales.x.lo) / scales.x.span) * PLOT
  // y is inverted: higher RS-Momentum -> nearer the top of the SVG.
  const py = (v: number) =>
    PAD + (1 - (v - scales.y.lo) / scales.y.span) * PLOT

  const cx100 = px(100)
  const cy100 = py(100)

  // Summarize the insight for the aria-label: which sectors lead/lag.
  const leading = entries.filter(([, s]) => s.quadrant === 'Leading').map(([t]) => t)
  const lagging = entries.filter(([, s]) => s.quadrant === 'Lagging').map(([t]) => t)
  const ariaLabel =
    `セクターローテーション RRG。横軸=相対力(RS-Ratio)、縦軸=相対モメンタム(RS-Momentum)、中心は ${data?.benchmark ?? 'SPY'} と同等の100。` +
    `先導(Leading)象限: ${leading.join(', ') || 'なし'}。劣後(Lagging)象限: ${lagging.join(', ') || 'なし'}。`

  // Faint quadrant background tints + corner labels. Corners are fixed by
  // position; the text label is what conveys quadrant identity (CVD-safe).
  const quadrants = [
    { key: 'Leading', x: cx100, y: PAD, w: PAD + PLOT - cx100, h: cy100 - PAD, lx: PAD + PLOT - 4, ly: PAD + 12, anchor: 'end' as const },
    { key: 'Improving', x: PAD, y: PAD, w: cx100 - PAD, h: cy100 - PAD, lx: PAD + 4, ly: PAD + 12, anchor: 'start' as const },
    { key: 'Lagging', x: PAD, y: cy100, w: cx100 - PAD, h: PAD + PLOT - cy100, lx: PAD + 4, ly: PAD + PLOT - 6, anchor: 'start' as const },
    { key: 'Weakening', x: cx100, y: cy100, w: PAD + PLOT - cx100, h: PAD + PLOT - cy100, lx: PAD + PLOT - 4, ly: PAD + PLOT - 6, anchor: 'end' as const },
  ]

  return (
    <div className="bg-surface border border-border rounded-lg p-4" style={{ minHeight: '24rem' }}>
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="font-bold text-white text-sm">
          セクターローテーション (RRG) <span className="text-muted font-normal">vs {data?.benchmark ?? 'SPY'}</span>
        </h2>
        {data?.as_of && (
          <span className="text-[10px] text-muted tabular-nums">{data.as_of.slice(0, 10)}</span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        width="100%"
        role="img"
        aria-label={ariaLabel}
        className="rrg-svg"
        style={{ display: 'block', height: 'auto', aspectRatio: '1 / 1' }}
      >
        {/* faint quadrant backgrounds */}
        {quadrants.map((q) => (
          <g key={q.key}>
            <rect
              x={q.x}
              y={q.y}
              width={q.w}
              height={q.h}
              fill={QUADRANT_COLOR[q.key]}
              opacity={0.06}
            />
            <text
              x={q.lx}
              y={q.ly}
              textAnchor={q.anchor}
              fontSize={11}
              fill="var(--color-muted)"
              style={{ fontFamily: 'inherit' }}
            >
              {QUADRANT_JP[q.key] ?? q.key}
            </text>
          </g>
        ))}

        {/* axes crossing at (100,100) */}
        <line x1={PAD} y1={cy100} x2={PAD + PLOT} y2={cy100} stroke="var(--color-border)" strokeWidth={1.5} />
        <line x1={cx100} y1={PAD} x2={cx100} y2={PAD + PLOT} stroke="var(--color-border)" strokeWidth={1.5} />
        {/* outer frame */}
        <rect x={PAD} y={PAD} width={PLOT} height={PLOT} fill="none" stroke="var(--color-border)" strokeWidth={1} />

        {/* axis labels */}
        <text x={PAD + PLOT / 2} y={VB - 12} textAnchor="middle" fontSize={11} fill="var(--color-muted)" style={{ fontFamily: 'inherit' }}>
          RS-Ratio (相対力) →
        </text>
        <text x={14} y={PAD + PLOT / 2} textAnchor="middle" fontSize={11} fill="var(--color-muted)" transform={`rotate(-90 14 ${PAD + PLOT / 2})`} style={{ fontFamily: 'inherit' }}>
          RS-Momentum (モメンタム) →
        </text>
        <text x={cx100} y={cy100 + 14} textAnchor="middle" fontSize={9} fill="var(--color-muted)" style={{ fontFamily: 'inherit' }}>100</text>

        {/* sector trajectories (tail) + dots */}
        {entries.map(([ticker, s]) => {
          const color = QUADRANT_COLOR[s.quadrant] ?? 'var(--color-accent)'
          const tail = s.tail ?? []
          const polyPts = tail.map((t) => `${px(t.rs_ratio)},${py(t.rs_momentum)}`).join(' ')
          const cx = px(s.rs_ratio)
          const cy = py(s.rs_momentum)
          return (
            <g key={ticker} className="rrg-node">
              {tail.length > 1 && (
                <polyline
                  points={polyPts}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.25}
                  strokeOpacity={0.55}
                  strokeLinejoin="round"
                />
              )}
              {/* small tail markers so the trajectory direction is legible */}
              {tail.slice(0, -1).map((t, i) => (
                <circle key={i} cx={px(t.rs_ratio)} cy={py(t.rs_momentum)} r={1.4} fill={color} fillOpacity={0.4} />
              ))}
              {/* head dot — sized small (11 points), ticker text carries identity */}
              <circle cx={cx} cy={cy} r={4.5} fill={color} stroke="var(--color-bg)" strokeWidth={1} />
              <text
                x={cx + 7}
                y={cy + 3.5}
                fontSize={10}
                fontWeight={700}
                fill="var(--color-text)"
                style={{ fontFamily: 'inherit' }}
              >
                {ticker}
              </text>
              {/* accessible per-point description */}
              <title>
                {`${ticker} (${s.name}) — ${QUADRANT_JP[s.quadrant] ?? s.quadrant} · RS-Ratio ${s.rs_ratio.toFixed(1)} / RS-Mom ${s.rs_momentum.toFixed(1)}`}
              </title>
            </g>
          )
        })}
      </svg>

      {/* honest legend: quadrant identity is by label, color is redundant */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
        {(['Leading', 'Improving', 'Weakening', 'Lagging'] as const).map((q) => (
          <span key={q} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: QUADRANT_COLOR[q] }}
            />
            {QUADRANT_JP[q]}
          </span>
        ))}
      </div>

      <style jsx>{`
        .rrg-node circle,
        .rrg-node polyline {
          transition: opacity 200ms ease;
        }
        @media (prefers-reduced-motion: reduce) {
          .rrg-node circle,
          .rrg-node polyline {
            transition: none;
          }
        }
      `}</style>
    </div>
  )
}
