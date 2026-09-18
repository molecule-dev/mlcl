import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface TodayHeroCardProps {
  /** Number of bookings on the calendar today. */
  todayCount: number
  /** Total bookings across the visible week (Mon–Sun). */
  weekCount: number
  /** Optional 7-point series — drives the SVG sparkline if provided. */
  history?: ReadonlyArray<{ day: string; bookings: number }>
  /** Display name of the next meeting (used in the frosted-glass pill). */
  nextInvitee?: string
  /** Time-until-next as a short, pre-formatted string ("in 42m"). */
  nextStartIn?: string
}

/**
 * Gradient hero card — today's booking count in 6xl-extrabold, frosted-
 * glass "next meeting" pill, inline SVG sparkline of weekly volume, and
 * decorative blurred orbs in the corners.
 *
 * Translated from banking-dashboard's BalanceHeroCard.tsx.
 */
export function TodayHeroCard({
  todayCount,
  weekCount,
  history,
  nextInvitee,
  nextStartIn,
}: TodayHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const sparklinePaths = (() => {
    if (!history || history.length < 2) {
      return {
        fill: 'M0,80 Q50,50 100,55 T200,30 T300,40 T400,15 L400,100 L0,100 Z',
        stroke: 'M0,80 Q50,50 100,55 T200,30 T300,40 T400,15',
      }
    }
    const W = 400,
      H = 100
    const values = history.map((p) => p.bookings)
    const min = Math.min(...values),
      max = Math.max(...values)
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
        'min-h-[320px] lg:col-span-8 bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-white relative overflow-hidden',
      )}
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
          {t('todayHeroCard.title', {}, { defaultValue: "Today's schedule" })}
        </h2>
        <div className={cm.flex({ align: 'baseline', gap: 'md' })}>
          <span className="text-6xl font-extrabold tracking-tighter tabular-nums">
            {todayCount}
          </span>
          <span
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-primary-fixed/90')}
          >
            {t(
              'todayHeroCard.weekCount',
              { count: weekCount },
              { defaultValue: '{{count}} this week' },
            )}
          </span>
        </div>
        {nextInvitee ? (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.sp('mt', 5),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'inline-flex bg-surface/20 backdrop-blur-md',
            )}
          >
            <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
              event_upcoming
            </span>
            {t(
              'todayHeroCard.nextMeeting',
              { invitee: nextInvitee, when: nextStartIn ?? '' },
              { defaultValue: 'Next: {{invitee}} {{when}}' },
            )}
          </span>
        ) : null}
      </div>

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

      <div
        className={cm.cn(
          cm.w(80),
          cm.h(80),
          cm.roundedFull,
          'absolute -right-20 -bottom-20 bg-surface/10 blur-3xl',
        )}
      />
      <div
        className={cm.cn(
          cm.w(20),
          cm.h(20),
          cm.roundedFull,
          'absolute right-10 top-10 bg-primary-fixed/20 blur-xl',
        )}
      />
    </div>
  )
}

export default TodayHeroCard
