import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Sleep trend area chart — primary-color line with 25%-opacity gradient
 * fill, dashed grid, hour-based Y-axis (4..10h range), and tick labels
 * on the X-axis. Renders inline SVG so screenshots work without a chart
 * library. Optional secondary score-line overlay (stroke only, accent
 * colour) shown when the caller passes scoreValues.
 *
 * Translated from mental-health-journal/MoodTrendChart.tsx (which itself
 * derives from habit-tracker/StreakHeroCard sparkline). Y-axis labels
 * are hours-of-sleep markers per DESIGN.md "Trend Chart Panel".
 */

interface SleepTrendChartProps {
  points: { date: string; durationHours: number; score?: number }[]
  height?: number
  title?: string
  caption?: string
  yMin?: number
  yMax?: number
}

export function SleepTrendChart({
  points,
  height = 280,
  title,
  caption,
  yMin = 4,
  yMax = 10,
}: SleepTrendChartProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const padX = 56
  const padY = 24
  const chartW = 720
  const chartH = height
  const innerW = chartW - padX - 16
  const innerH = chartH - padY * 2

  const data = points.length > 0 ? points : []
  const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW
  const range = Math.max(0.001, yMax - yMin)
  const toX = (i: number) => padX + i * stepX
  const toY = (hours: number) =>
    padY + (1 - (Math.max(yMin, Math.min(yMax, hours)) - yMin) / range) * innerH

  const linePath = data
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(p.durationHours)}`)
    .join(' ')
  const areaPath =
    data.length > 0
      ? `${linePath} L${toX(data.length - 1)},${chartH - padY} L${padX},${chartH - padY} Z`
      : ''

  const scoreData = data.filter((p) => typeof p.score === 'number')
  const scoreLinePath = scoreData
    .map((p, i) => {
      const x = toX(data.indexOf(p))
      // Map 0..100 score to chart space using its own scale (top half)
      const yPad = padY + 6
      const y = yPad + (1 - (p.score ?? 0) / 100) * (innerH * 0.5)
      return `${i === 0 ? 'M' : 'L'}${x},${y}`
    })
    .join(' ')

  const yTicks = [yMax, yMax - (yMax - yMin) / 3, yMax - (2 * (yMax - yMin)) / 3, yMin]

  const lastIdx = data.length - 1
  const xLabels =
    data.length > 0
      ? Array.from(new Set([0, Math.floor(lastIdx / 3), Math.floor((2 * lastIdx) / 3), lastIdx]))
      : []

  return (
    <div className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('mb', 4),
          'flex-wrap gap-3',
        )}
      >
        <div>
          <h3
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {title ?? t('sleepTrendChart.title', {}, { defaultValue: 'Duration trend' })}
          </h3>
          <p
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              cm.sp('mt', 1),
              'text-on-surface',
            )}
          >
            {caption ??
              t(
                'sleepTrendChart.caption',
                { count: data.length },
                { defaultValue: 'Last {{count}} nights' },
              )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            <span
              className={cm.cn('rounded-sm')}
              style={{ width: 12, height: 3, backgroundColor: 'var(--color-border-focus)' }}
            />
            {t('sleepTrendChart.legendDuration', {}, { defaultValue: 'Hours' })}
          </span>
          {scoreData.length > 0 ? (
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              <span
                className={cm.cn('rounded-sm')}
                style={{ width: 12, height: 3, backgroundColor: 'var(--color-accent-amber)' }}
              />
              {t('sleepTrendChart.legendScore', {}, { defaultValue: 'Score' })}
            </span>
          ) : null}
        </div>
      </div>
      <div className={cm.cn('overflow-x-auto')}>
        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          width="100%"
          role="img"
          aria-label={t('sleepTrendChart.ariaLabel', {}, { defaultValue: 'Sleep trend chart' })}
          style={{ display: 'block' }}
        >
          <defs>
            <linearGradient id="sleepTrendArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-border-focus)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--color-border-focus)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {yTicks.map((hours, i) => {
            const y = toY(hours)
            return (
              <g key={`ytick-${i}`}>
                <line
                  x1={padX}
                  x2={chartW - 16}
                  y1={y}
                  y2={y}
                  stroke="var(--color-outline-variant)"
                  strokeOpacity="0.5"
                  strokeDasharray="3 5"
                />
                <text
                  x={padX - 8}
                  y={y + 4}
                  fontSize="10"
                  textAnchor="end"
                  fill="var(--color-on-surface-variant)"
                  fontWeight="700"
                  style={{
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {hours.toFixed(0)}h
                </text>
              </g>
            )
          })}
          {data.length > 0 ? (
            <>
              <path d={areaPath} fill="url(#sleepTrendArea)" />
              <path
                d={linePath}
                fill="none"
                stroke="var(--color-border-focus)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {data.map((p, i) => (
                <circle
                  key={`d-${i}`}
                  cx={toX(i)}
                  cy={toY(p.durationHours)}
                  r="4"
                  fill="var(--color-border-focus)"
                  stroke="var(--color-surface)"
                  strokeWidth="2"
                />
              ))}
              {scoreData.length > 0 ? (
                <path
                  d={scoreLinePath}
                  fill="none"
                  stroke="var(--color-accent-amber)"
                  strokeWidth="2"
                  strokeDasharray="5 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
            </>
          ) : (
            <text
              x={chartW / 2}
              y={chartH / 2}
              fontSize="14"
              textAnchor="middle"
              fill="var(--color-on-surface-variant)"
              fontWeight="600"
            >
              {t('sleepTrendChart.empty', {}, { defaultValue: 'No sleep data yet' })}
            </text>
          )}
          {xLabels.map((idx, i) => (
            <text
              key={`x-${i}`}
              x={toX(idx)}
              y={chartH - 4}
              fontSize="10"
              textAnchor="middle"
              fill="var(--color-on-surface-variant)"
              fontWeight="600"
            >
              {data[idx]?.date ?? ''}
            </text>
          ))}
        </svg>
      </div>
    </div>
  )
}
