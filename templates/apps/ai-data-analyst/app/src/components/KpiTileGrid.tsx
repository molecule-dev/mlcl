/**
 * Editorial KPI tile grid — uppercase 10px label, 3xl extrabold value,
 * tabular-nums delta caption, inline 64px sparkline. Each tile uses
 * an inset accent bar with a per-key accent and a subtle hover lift.
 *
 * Translated from personal-finance's DashboardAccountOverview.tsx (icon +
 * uppercase eyebrow + extrabold value + hover-scale glyph) and crossed
 * with the Sweep-1 KPI-card recipe (accent bar + sparkline).
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface KpiTile {
  key: string
  label: string
  value: string
  delta_pct: number
  sparkline: number[]
}

const ACCENT: Record<string, { accent: string; glyph: string; icon: string; stroke: string }> = {
  queries: {
    accent: 'var(--color-primary)',
    glyph: 'text-primary',
    icon: 'query_stats',
    stroke: 'var(--color-primary)',
  },
  datasets: {
    accent: 'var(--color-secondary)',
    glyph: 'text-secondary',
    icon: 'database',
    stroke: 'var(--color-secondary)',
  },
  insights: {
    accent: 'var(--color-tertiary-container)',
    glyph: 'text-tertiary-container',
    icon: 'auto_awesome',
    stroke: 'var(--color-tertiary-container)',
  },
  shared: {
    accent: 'var(--color-success)',
    glyph: 'text-success',
    icon: 'ios_share',
    stroke: 'var(--color-success)',
  },
}
const FALLBACK = {
  accent: 'var(--color-outline-variant)',
  glyph: 'text-on-surface-variant',
  icon: 'insights',
  stroke: 'var(--color-primary)',
}

function deltaTone(n: number): string {
  if (n > 0) return 'text-success'
  if (n < 0) return 'text-error'
  return 'text-on-surface-variant'
}

export interface KpiTileGridProps {
  tiles: KpiTile[]
}

export function KpiTileGrid({ tiles }: KpiTileGridProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section
      className={cm.cn(cm.grid({ cols: 1, gap: 5 }), 'sm:grid-cols-2 lg:grid-cols-4')}
      aria-label={t('kpiTileGrid.label', {}, { defaultValue: 'Key metrics' })}
    >
      {tiles.map((tile) => {
        const accent = ACCENT[tile.key] ?? FALLBACK
        const max = Math.max(...tile.sparkline, 1)
        const min = Math.min(...tile.sparkline, 0)
        const range = Math.max(1, max - min)
        const points = tile.sparkline
          .map((p, i, arr) => {
            const x = (i / Math.max(1, arr.length - 1)) * 120
            const y = 30 - ((p - min) / range) * 24
            return `${x.toFixed(1)},${y.toFixed(1)}`
          })
          .join(' ')
        const areaPath = `M0,32 L${points.split(' ').join(' L')} L120,32 Z`
        const positive = tile.delta_pct >= 0

        return (
          <article
            key={tile.key}
            className={cm.cn(
              cm.sp('p', 5),
              cm.flex({ direction: 'col', gap: 3 }),
              'rounded-2xl bg-surface-container-lowest shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200',
              cm.accentCard({ tone: 'custom' }),
            )}
            style={{ ['--mol-accent' as string]: accent.accent }}
          >
            <div className={cm.flex({ align: 'center', justify: 'between' })}>
              <h3 className={cm.cn(cm.accentCardLabel({ tone: 'custom' }))}>{tile.label}</h3>
              <span
                className={cm.cn('material-symbols-outlined', cm.textSize('lg'), accent.glyph)}
                aria-hidden="true"
              >
                {accent.icon}
              </span>
            </div>

            <div>
              <p
                className={cm.cn(
                  cm.textSize('3xl'),
                  cm.fontWeight('bold'),
                  'font-headline tabular-nums leading-none text-on-surface tracking-tight',
                )}
              >
                {tile.value}
              </p>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.sp('mt', 2),
                  cm.fontWeight('semibold'),
                  'tabular-nums',
                  deltaTone(tile.delta_pct),
                )}
              >
                {positive ? '+' : ''}
                {tile.delta_pct.toFixed(1)}%{' '}
                <span className={cm.cn(cm.fontWeight('normal'), 'text-on-surface-variant')}>
                  {t('kpiTileGrid.momSuffix', {}, { defaultValue: 'vs last month' })}
                </span>
              </p>
            </div>

            <svg
              viewBox="0 0 120 32"
              preserveAspectRatio="none"
              className={'w-full h-12'}
              aria-hidden="true"
            >
              <path d={areaPath} fill={accent.stroke} opacity="0.12" />
              <polyline
                points={points}
                fill="none"
                stroke={accent.stroke}
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </article>
        )
      })}
    </section>
  )
}

export default KpiTileGrid
