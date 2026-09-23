/**
 * Glint stats hero — gradient purple→cyan card with extrabold KPI numbers,
 * frosted-glass change pills, decorative blurred orbs, and an inline SVG
 * sparkline showing the last 7 days of views.
 *
 * Translated from team-chat's ActivityCard (gradient + bg-white/10 KPI tiles)
 * and personal-finance NetWorthCard's sparkline + decorative-orb treatment.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface LibraryStatsHeroProps {
  totalRecordings: number
  totalViews: number
  averageWatchPercent: number
  trend7d: number[]
  weeklyChangePercent: number
}

function buildSparklinePath(
  values: number[],
  width: number,
  height: number,
): { line: string; area: string } {
  if (values.length < 2) return { line: '', area: '' }
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = Math.max(1, max - min)
  const stepX = width / (values.length - 1)
  const points = values.map((v, i) => {
    const x = i * stepX
    const y = height - ((v - min) / range) * height
    return [x, y] as const
  })
  const line = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ')
  const area = `${line} L ${width} ${height} L 0 ${height} Z`
  return { line, area }
}

export function LibraryStatsHero({
  totalRecordings,
  totalViews,
  averageWatchPercent,
  trend7d,
  weeklyChangePercent,
}: LibraryStatsHeroProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { line, area } = buildSparklinePath(trend7d, 320, 70)
  const trendUp = weeklyChangePercent >= 0

  return (
    <section
      className={cm.cn(
        cm.sp('p', 8),
        'relative overflow-hidden rounded-[2rem] text-white shadow-xl shadow-[var(--color-brand-gradient-from)]/20',
        'bg-gradient-to-br from-[var(--color-brand-gradient-from)] via-[var(--color-brand-gradient-mid)] to-[var(--color-brand-gradient-to)]',
      )}
    >
      <div
        className={cm.cn(
          'pointer-events-none absolute -top-24 -right-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
        )}
      />
      <div
        className={cm.cn(
          'pointer-events-none absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-cyan-300/20 blur-3xl',
        )}
      />

      <div
        className={cm.cn(
          cm.flex({ align: 'start', justify: 'between', gap: 6 }),
          'relative flex-wrap',
        )}
      >
        <div className={cm.stack(2)}>
          <span
            className={cm.cn(
              'inline-flex items-center gap-2 rounded-full bg-surface/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.25em] w-fit',
            )}
          >
            <span
              className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'bg-emerald-300 animate-pulse')}
            />
            {t('library.heroBadge', {}, { defaultValue: 'Workspace overview' })}
          </span>
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-3xl sm:text-4xl md:text-5xl tracking-tight leading-[1.05] font-extrabold break-words',
            )}
          >
            {t(
              'library.heroTitle',
              { count: totalRecordings },
              { defaultValue: '{{count}} recordings, ready to share' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-white/80 max-w-md')}>
            {t(
              'library.heroSubtitle',
              {},
              { defaultValue: 'Capture, share, and measure async screencasts across your team.' },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'min-w-0 max-w-full')}>
          <span
            className={cm.cn(
              'inline-flex items-center gap-1 rounded-full bg-surface/20 backdrop-blur-md px-3 py-1 text-xs font-bold whitespace-nowrap',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')}>
              {trendUp ? 'trending_up' : 'trending_down'}
            </span>
            {t(
              'library.weeklyChange',
              { value: Math.abs(weeklyChangePercent).toFixed(1) },
              { defaultValue: '{{value}}% vs last week' },
            )}
          </span>
        </div>
      </div>

      <div
        className={cm.cn(
          cm.grid({ cols: 1, gap: 'md' }),
          cm.sp('mt', 8),
          'relative sm:grid-cols-3',
        )}
      >
        <div className={cm.cn(cm.sp('p', 4), 'rounded-2xl bg-surface/10 backdrop-blur-md')}>
          <span className={cm.cn('text-3xl sm:text-4xl font-extrabold tracking-tight block')}>
            {totalRecordings.toLocaleString()}
          </span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'uppercase tracking-widest font-semibold opacity-80',
            )}
          >
            {t('library.heroStat.recordings', {}, { defaultValue: 'Recordings' })}
          </span>
        </div>
        <div className={cm.cn(cm.sp('p', 4), 'rounded-2xl bg-surface/10 backdrop-blur-md')}>
          <span className={cm.cn('text-3xl sm:text-4xl font-extrabold tracking-tight block')}>
            {totalViews.toLocaleString()}
          </span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'uppercase tracking-widest font-semibold opacity-80',
            )}
          >
            {t('library.heroStat.views', {}, { defaultValue: 'Total views' })}
          </span>
        </div>
        <div className={cm.cn(cm.sp('p', 4), 'rounded-2xl bg-surface/10 backdrop-blur-md')}>
          <span className={cm.cn('text-3xl sm:text-4xl font-extrabold tracking-tight block')}>
            {averageWatchPercent}%
          </span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'uppercase tracking-widest font-semibold opacity-80',
            )}
          >
            {t('library.heroStat.avgWatch', {}, { defaultValue: 'Avg watch' })}
          </span>
        </div>
      </div>

      {line && (
        <div className={cm.cn(cm.sp('mt', 6), 'relative h-[80px]')}>
          <svg
            viewBox="0 0 320 70"
            preserveAspectRatio="none"
            className={cm.cn(cm.w('full'), cm.h('full'))}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="glint-spark" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#glint-spark)" />
            <path
              d={line}
              stroke="#ffffff"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </section>
  )
}
