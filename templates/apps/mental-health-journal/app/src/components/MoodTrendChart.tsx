import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Mood timeline area chart — primary-color line with 25%-opacity gradient
 * fill, dashed grid, 5 mood-face Y-axis labels, date X-axis. Renders inline
 * SVG so screenshots work without a JS chart library.
 *
 * Translated from habit-tracker/StreakHeroCard sparkline + DESIGN.md "Mood
 * Timeline (Dashboard)" spec — gradient area, white-stroke data points,
 * 5 mood levels with face icons.
 */

interface MoodTrendChartProps {
  points: { date: string; score: number }[]
  height?: number
  title?: string
  caption?: string
}

const MOOD_FACES = [
  { score: 1.0, icon: 'mood', label: 'Radiant' },
  { score: 0.75, icon: 'sentiment_satisfied', label: 'Good' },
  { score: 0.5, icon: 'sentiment_neutral', label: 'Neutral' },
  { score: 0.25, icon: 'sentiment_dissatisfied', label: 'Low' },
  { score: 0.0, icon: 'sentiment_very_dissatisfied', label: 'Struggling' },
] as const

export function MoodTrendChart({ points, height = 240, title, caption }: MoodTrendChartProps) {
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
  const toX = (i: number) => padX + i * stepX
  const toY = (s: number) => padY + (1 - Math.max(0, Math.min(1, s))) * innerH

  const linePath = data.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(p.score)}`).join(' ')
  const areaPath =
    data.length > 0
      ? `${linePath} L${toX(data.length - 1)},${chartH - padY} L${padX},${chartH - padY} Z`
      : ''

  const lastIdx = data.length - 1
  const xLabels =
    data.length > 0
      ? [0, Math.floor(lastIdx / 3), Math.floor((2 * lastIdx) / 3), lastIdx].filter(
          (v, i, a) => a.indexOf(v) === i,
        )
      : []

  return (
    <div className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
        <div>
          <h3
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {title ?? t('moodTrendChart.title', {}, { defaultValue: 'Mood timeline' })}
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
                'moodTrendChart.caption',
                { count: data.length },
                { defaultValue: 'Last {{count}} days' },
              )}
          </p>
        </div>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.fontWeight('bold'),
            'rounded-full uppercase tracking-widest text-[10px]',
          )}
          style={{
            backgroundColor: 'rgba(99, 102, 241, 0.12)',
            color: 'var(--mol-color-primary)',
          }}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            auto_awesome
          </span>
          {t('moodTrendChart.aiBadge', {}, { defaultValue: 'AI insight ready' })}
        </span>
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          width="100%"
          role="img"
          aria-label={t('moodTrendChart.ariaLabel', {}, { defaultValue: 'Mood trend chart' })}
          style={{ display: 'block' }}
        >
          <defs>
            <linearGradient id="moodTrendArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--mol-color-primary)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--mol-color-primary)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {/* Y-axis grid + mood face labels */}
          {MOOD_FACES.map((m) => {
            const y = toY(m.score)
            return (
              <g key={m.label}>
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
                  fontWeight="600"
                  style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}
                >
                  {t(`moodTrendChart.mood.${m.label.toLowerCase()}`, {}, { defaultValue: m.label })}
                </text>
              </g>
            )
          })}
          {/* Area fill + line */}
          {data.length > 0 ? (
            <>
              <path d={areaPath} fill="url(#moodTrendArea)" />
              <path
                d={linePath}
                fill="none"
                stroke="var(--mol-color-primary)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {data.map((p, i) => (
                <circle
                  key={i}
                  cx={toX(i)}
                  cy={toY(p.score)}
                  r="4"
                  fill="var(--mol-color-primary)"
                  stroke="white"
                  strokeWidth="2"
                />
              ))}
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
              {t('moodTrendChart.empty', {}, { defaultValue: 'No mood data yet' })}
            </text>
          )}
          {/* X-axis date labels */}
          {xLabels.map((idx) => (
            <text
              key={idx}
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
