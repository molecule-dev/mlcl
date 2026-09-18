/**
 * Inline-SVG price-history sparkline / area chart with low/high markers,
 * the current price callout pinned to the right edge, and an optional
 * "target alert" dashed line. Colored fill at 0.18 opacity per the
 * DESIGN.md "Price History Chart" spec.
 *
 * Pure SVG so the polish session doesn't need to ship a chart engine —
 * Bargain's hero data viz is just one curve and a couple of markers, which is
 * a perfect fit for the inline-svg sparkline pattern proven on the
 * personal-finance NetWorthCard hero and the team-chat presence dot.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { fmtUsd } from '../lib/unwrap.js'

export interface PriceHistoryPoint {
  /** ISO date or "Mon" label. */
  label: string
  /** Price in cents. */
  price_cents: number
}

export interface PriceHistoryChartProps {
  points: PriceHistoryPoint[]
  /** If supplied, render a horizontal dashed line at this price (target alert). */
  targetCents?: number
  /** Optional eyebrow / heading. */
  eyebrow?: string
  heading?: string
  /** Period selector chips above the chart. */
  periods?: ReadonlyArray<{ key: string; label: string; active?: boolean }>
  onSelectPeriod?: (key: string) => void
}

const W = 600
const H = 220
const PAD_X = 24
const PAD_Y = 24

function buildPath(points: PriceHistoryPoint[], min: number, range: number): string {
  if (points.length < 2) return ''
  const stepX = (W - PAD_X * 2) / (points.length - 1)
  return points
    .map((p, i) => {
      const x = PAD_X + i * stepX
      const y = PAD_Y + (H - PAD_Y * 2) - ((p.price_cents - min) / range) * (H - PAD_Y * 2)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

export function PriceHistoryChart({
  points,
  targetCents,
  eyebrow,
  heading,
  periods,
  onSelectPeriod,
}: PriceHistoryChartProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (points.length === 0) {
    return (
      <section
        className={cm.cn(
          cm.sp('p', 8),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm text-center text-on-surface-variant',
        )}
      >
        {t('priceHistoryChart.empty', {}, { defaultValue: 'No price history yet.' })}
      </section>
    )
  }

  const prices = points.map((p) => p.price_cents)
  const lowVal = Math.min(...prices)
  const highVal = Math.max(...prices)
  const min = lowVal - (highVal - lowVal) * 0.15
  const range = Math.max(highVal - lowVal, 1) * 1.3
  const path = buildPath(points, min, range)
  const areaPath = path ? `${path} L${W - PAD_X},${H - PAD_Y} L${PAD_X},${H - PAD_Y} Z` : ''
  const lowIdx = prices.indexOf(lowVal)
  const highIdx = prices.indexOf(highVal)
  const stepX = (W - PAD_X * 2) / (points.length - 1)
  const yFor = (cents: number) =>
    PAD_Y + (H - PAD_Y * 2) - ((cents - min) / range) * (H - PAD_Y * 2)
  const lowX = PAD_X + lowIdx * stepX
  const highX = PAD_X + highIdx * stepX
  const targetY = targetCents !== undefined ? yFor(targetCents) : null

  return (
    <section
      data-mol-id="price-history-chart"
      className={cm.cn(
        cm.sp('p', 6),
        'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm',
      )}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.sp('mb', 4),
        )}
      >
        <div>
          {eyebrow && (
            <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
              {eyebrow}
            </p>
          )}
          {heading && (
            <h2
              className={cm.cn(
                cm.sp('mt', 1),
                cm.textSize('xl'),
                cm.fontWeight('extrabold'),
                'tracking-tight text-on-surface',
              )}
            >
              {heading}
            </h2>
          )}
        </div>
        {periods && periods.length > 0 && (
          <div className={cm.cn(cm.flex({ gap: 'xs' }), 'rounded-full bg-surface-container p-1')}>
            {periods.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => onSelectPeriod?.(p.key)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'rounded-full uppercase tracking-wider transition-colors',
                  p.active
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:text-on-surface',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className={cm.cn('relative')}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className={cm.cn('block w-full h-56')}
          preserveAspectRatio="none"
          aria-label={t('priceHistoryChart.svgLabel', {}, { defaultValue: 'Price history chart' })}
        >
          <defs>
            <linearGradient id="ph-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(224 90 43)" stopOpacity="0.30" />
              <stop offset="100%" stopColor="rgb(224 90 43)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {targetY !== null && (
            <line
              x1={PAD_X}
              y1={targetY}
              x2={W - PAD_X}
              y2={targetY}
              stroke="rgb(124 58 237)"
              strokeWidth="1.4"
              strokeDasharray="4 4"
              opacity="0.7"
            />
          )}
          {areaPath && <path d={areaPath} fill="url(#ph-fill)" />}
          {path && (
            <path
              d={path}
              fill="none"
              stroke="rgb(224 90 43)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          <circle
            cx={lowX}
            cy={yFor(lowVal)}
            r="6"
            fill="rgb(26 153 96)"
            stroke="white"
            strokeWidth="2"
          />
          <circle
            cx={highX}
            cy={yFor(highVal)}
            r="6"
            fill="rgb(220 38 38)"
            stroke="white"
            strokeWidth="2"
          />
        </svg>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
            cm.sp('mt', 4),
            cm.textSize('xs'),
          )}
        >
          <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <span className={cm.cn('h-2.5 w-2.5 rounded-full bg-secondary')} aria-hidden="true" />
            <span className={cm.cn('font-bold uppercase tracking-widest text-on-surface-variant')}>
              {t('priceHistoryChart.low', {}, { defaultValue: 'Lowest' })}
            </span>
            <span className={cm.cn('font-extrabold tabular-nums text-on-surface')}>
              {fmtUsd(lowVal)}
            </span>
          </span>
          <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <span className={cm.cn('h-2.5 w-2.5 rounded-full bg-error')} aria-hidden="true" />
            <span className={cm.cn('font-bold uppercase tracking-widest text-on-surface-variant')}>
              {t('priceHistoryChart.high', {}, { defaultValue: 'Highest' })}
            </span>
            <span className={cm.cn('font-extrabold tabular-nums text-on-surface')}>
              {fmtUsd(highVal)}
            </span>
          </span>
          {targetCents !== undefined && (
            <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
              <span
                className={cm.cn('inline-block h-0.5 w-4 bg-tertiary')}
                aria-hidden="true"
                style={{ borderTop: '1px dashed rgb(124 58 237)' }}
              />
              <span
                className={cm.cn('font-bold uppercase tracking-widest text-on-surface-variant')}
              >
                {t('priceHistoryChart.target', {}, { defaultValue: 'Alert at' })}
              </span>
              <span className={cm.cn('font-extrabold tabular-nums text-tertiary')}>
                {fmtUsd(targetCents)}
              </span>
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
