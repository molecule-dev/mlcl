import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface MasteryHeroCardProps {
  /** Cards mastered to date. */
  cardsMastered: number
  /** Total cards across all decks. */
  cardsTotal: number
  /** Hours studied this week. */
  hoursThisWeek: number
  /** Optional weekly history series — drives the SVG sparkline. */
  history?: ReadonlyArray<{ date: string; hours: number }>
}

/**
 * Gradient hero card for the dashboard — big mastery percentage in
 * 6xl-extrabold, frosted-glass weekly-hours pill, inline SVG area
 * sparkline of hours studied, decorative blurred orbs.
 *
 * Translated from banking-dashboard's BalanceHeroCard.tsx pattern, in
 * Koan's teal+cream palette and study-domain copy.
 */
export function MasteryHeroCard({
  cardsMastered,
  cardsTotal,
  hoursThisWeek,
  history,
}: MasteryHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const pct = cardsTotal === 0 ? 0 : Math.round((cardsMastered / cardsTotal) * 100)

  const sparklinePaths = (() => {
    if (!history || history.length < 2) {
      return {
        fill: 'M0,80 Q40,70 80,55 T160,40 T240,28 T320,20 T400,12 L400,100 L0,100 Z',
        stroke: 'M0,80 Q40,70 80,55 T160,40 T240,28 T320,20 T400,12',
      }
    }
    const W = 400
    const H = 100
    const values = history.map((p) => p.hours)
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
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[320px] relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-primary-container text-white',
      )}
      data-mol-id="mastery-hero-card"
    >
      <div className="relative z-10">
        <h2
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary-fixed/80',
          )}
        >
          {t('masteryHeroCard.title', {}, { defaultValue: 'Overall Mastery' })}
        </h2>
        <div className={cm.flex({ align: 'baseline', gap: 'md' })}>
          <span className="text-6xl font-extrabold tracking-tighter tabular-nums">
            {pct}
            <span className={'text-3xl ml-1 text-primary-fixed'}>%</span>
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
            <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
              schedule
            </span>
            {t(
              'masteryHeroCard.weeklyHours',
              { hours: hoursThisWeek.toFixed(1) },
              { defaultValue: '{{hours}} hrs this week' },
            )}
          </span>
        </div>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mt', 4),
            'serif-text italic text-primary-fixed/80',
          )}
        >
          {t(
            'masteryHeroCard.cardsMastered',
            { mastered: cardsMastered.toLocaleString(), total: cardsTotal.toLocaleString() },
            { defaultValue: '{{mastered}} of {{total}} cards mastered' },
          )}
        </p>
      </div>

      {/* Mock area-chart sparkline */}
      <div
        className={cm.cn(
          cm.sp('mt', 12),
          cm.h(24),
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

      {/* Decorative blurred orbs */}
      <div
        className={cm.cn(
          cm.w(80),
          cm.h(80),
          cm.roundedFull,
          'absolute -right-20 -bottom-20 bg-surface/10 blur-3xl',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          cm.w(20),
          cm.h(20),
          cm.roundedFull,
          'absolute right-10 top-10 bg-primary-fixed/20 blur-xl',
        )}
        aria-hidden="true"
      />
    </div>
  )
}
