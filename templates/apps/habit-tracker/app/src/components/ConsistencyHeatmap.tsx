import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * GitHub-style year heatmap. 53 weeks × 7 days, each cell colored by intensity
 * 0..4 using --color-heatmap-* tokens defined in theme.css. Inline SVG for
 * crisp rendering at any size.
 *
 * Bespoke (no direct sibling) — visual treatment inspired by polished tables
 * in personal-finance with token-driven coloring.
 */

interface ConsistencyHeatmapProps {
  // Intensity 0..4 for each day, ordered oldest → newest
  cells: number[]
  weeks?: number
  title?: string
  caption?: string
}

const CELL = 12
const GAP = 3

export function ConsistencyHeatmap({ cells, weeks = 26, title, caption }: ConsistencyHeatmapProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const days = weeks * 7
  // Pad or trim to exactly `days` entries
  const data =
    cells.length >= days
      ? cells.slice(cells.length - days)
      : [...Array(days - cells.length).fill(0), ...cells]

  const width = weeks * (CELL + GAP) - GAP
  const height = 7 * (CELL + GAP) - GAP

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
            {title ?? t('consistencyHeatmap.title', {}, { defaultValue: 'Consistency' })}
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
              t('consistencyHeatmap.caption', { weeks }, { defaultValue: 'Last {{weeks}} weeks' })}
          </p>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            'text-on-surface-variant',
          )}
        >
          <span className={cm.cn(cm.fontWeight('semibold'))}>
            {t('consistencyHeatmap.lessLabel', {}, { defaultValue: 'Less' })}
          </span>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={cm.cn('rounded-sm')}
              style={{
                width: `${CELL}px`,
                height: `${CELL}px`,
                backgroundColor: `var(--color-heatmap-${i})`,
              }}
            />
          ))}
          <span className={cm.cn(cm.fontWeight('semibold'))}>
            {t('consistencyHeatmap.moreLabel', {}, { defaultValue: 'More' })}
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={t(
            'consistencyHeatmap.ariaLabel',
            {},
            { defaultValue: 'Daily consistency heatmap' },
          )}
        >
          {data.map((intensity, i) => {
            const week = Math.floor(i / 7)
            const day = i % 7
            const x = week * (CELL + GAP)
            const y = day * (CELL + GAP)
            const clamped = Math.max(0, Math.min(4, intensity))
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={CELL}
                height={CELL}
                rx={2}
                fill={`var(--color-heatmap-${clamped})`}
              />
            )
          })}
        </svg>
      </div>
    </div>
  )
}
