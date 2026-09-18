/**
 * Gradient hero card — total open roles in 6xl-extrabold, frosted-glass
 * trend pill, decorative blurred orbs, inline SVG mock sparkline. Used on
 * Dashboard above the KPI row, and mirrored as a sample card on Landing
 * so logged-out visitors see what the auth'd hero looks like.
 *
 * Translated from banking-dashboard's BalanceHeroCard / personal-finance's
 * NetWorthCard — same gradient + decorative-orb anatomy, with role count
 * + tagline instead of dollar balance.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface OpportunitiesHeroProps {
  /** Total active job postings on the platform. */
  totalRoles: number
  /** Day-over-day delta in posted roles (signed). */
  deltaRoles: number
  /** Optional weekly history series — drives the SVG sparkline if provided. */
  history?: ReadonlyArray<{ date: string; count: number }>
  /** Optional eyebrow (e.g. "Today" / "This week"). */
  eyebrow?: string
  /** Optional override for the headline (defaults to a tagline-ish line). */
  heading?: string
  /** Optional sub-line below the count (defaults to "open right now"). */
  caption?: string
}

export function OpportunitiesHero({
  totalRoles,
  deltaRoles,
  history,
  eyebrow,
  heading,
  caption,
}: OpportunitiesHeroProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const positive = deltaRoles >= 0

  const sparklinePaths = (() => {
    if (!history || history.length < 2) {
      return {
        fill: 'M0,80 Q50,60 100,68 T200,40 T300,55 T400,18 L400,100 L0,100 Z',
        stroke: 'M0,80 Q50,60 100,68 T200,40 T300,55 T400,18',
      }
    }
    const W = 400
    const H = 100
    const values = history.map((p) => p.count)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    const pts = values.map((v, i) => {
      const x = (i / (values.length - 1)) * W
      const y = H - ((v - min) / range) * (H * 0.85) - H * 0.1
      return [x, y]
    })
    const stroke = pts
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(' ')
    const fill = `${stroke} L${W},${H} L0,${H} Z`
    return { fill, stroke }
  })()

  return (
    <section
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[280px] bg-gradient-to-br from-primary to-secondary rounded-[2rem] text-white relative overflow-hidden',
      )}
    >
      <div className={cm.cn('relative z-10')}>
        <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-white/70')}>
          {eyebrow ?? t('opportunitiesHero.eyebrow', {}, { defaultValue: 'Open today' })}
        </p>
        <div
          className={cm.cn(cm.sp('mt', 2), cm.flex({ align: 'baseline', gap: 'md', wrap: 'wrap' }))}
        >
          <span className={cm.cn('text-6xl font-extrabold tracking-tighter tabular-nums')}>
            {totalRoles.toLocaleString()}
          </span>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'bg-surface/20 backdrop-blur-md',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
              {positive ? 'trending_up' : 'trending_down'}
            </span>
            {t(
              'opportunitiesHero.delta',
              { sign: positive ? '+' : '', amount: deltaRoles.toLocaleString() },
              { defaultValue: '{{sign}}{{amount}} this week' },
            )}
          </span>
        </div>
        <p
          className={cm.cn(
            cm.sp('mt', 3),
            cm.textSize('lg'),
            cm.maxW('xl'),
            'font-medium text-white/85',
          )}
        >
          {heading ??
            t(
              'opportunitiesHero.heading',
              {},
              {
                defaultValue: 'Roles in motion across every team, every region, every level.',
              },
            )}
        </p>
        <p className={cm.cn('mt-1 text-sm font-medium text-white/70')}>
          {caption ??
            t(
              'opportunitiesHero.caption',
              {},
              { defaultValue: 'Curated by recruiters. Surfaced by signal.' },
            )}
        </p>
      </div>

      <div
        className={cm.cn(
          cm.sp('mt', 8),
          cm.h(20),
          cm.w('full'),
          cm.flex({ align: 'end' }),
          'relative z-10',
        )}
      >
        <svg
          className={cm.cn(cm.w('full'), cm.h('full'))}
          viewBox="0 0 400 100"
          preserveAspectRatio="none"
        >
          <path d={sparklinePaths.fill} fill="white" opacity="0.3" />
          <path d={sparklinePaths.stroke} fill="none" stroke="white" strokeWidth="3" />
        </svg>
      </div>

      <div
        className={cm.cn(
          'absolute -right-20 -bottom-20 h-80 w-80 rounded-full bg-surface/10 blur-3xl',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn('absolute -left-16 -top-20 h-64 w-64 rounded-full bg-success/30 blur-3xl')}
        aria-hidden="true"
      />
    </section>
  )
}
