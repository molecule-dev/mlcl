import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface StreakHeroCardProps {
  streakDays: number
  xpToday: number
  xpGoal: number
  totalXp: number
  /** Optional 7-day xp history for the sparkline. */
  history?: ReadonlyArray<{ day: string; xp: number }>
}

/**
 * Gradient hero card — current streak in 6xl-extrabold, XP-today as a
 * frosted-glass pill, inline SVG sparkline of the last 7 days, decorative
 * blurred orbs in the corners.
 *
 * Translated from banking-dashboard's BalanceHeroCard.tsx — purple-violet
 * gradient swapped for the Parlance palette, "trending_up" replaced with
 * "local_fire_department" for the streak.
 */
export function StreakHeroCard({
  streakDays,
  xpToday,
  xpGoal,
  totalXp,
  history,
}: StreakHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const sparklinePaths = (() => {
    if (!history || history.length < 2) {
      return {
        fill: 'M0,80 L60,70 L120,55 L180,60 L240,40 L300,30 L360,15 L400,10 L400,100 L0,100 Z',
        stroke: 'M0,80 L60,70 L120,55 L180,60 L240,40 L300,30 L360,15 L400,10',
      }
    }
    const W = 400,
      H = 100
    const values = history.map((p) => p.xp)
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

  const goalPercent = Math.min(100, Math.round((xpToday / Math.max(1, xpGoal)) * 100))

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[320px] lg:col-span-8 bg-gradient-to-br from-primary via-primary-dark to-primary-light rounded-[2rem] text-white relative overflow-hidden',
      )}
    >
      <div className={cm.cn('relative z-10')}>
        <p
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary-fixed/90',
          )}
        >
          {t('streakHeroCard.eyebrow', {}, { defaultValue: 'Current streak' })}
        </p>
        <div className={cm.flex({ align: 'baseline', gap: 'md' })}>
          <span className={cm.cn('text-7xl font-extrabold tracking-tighter tabular-nums')}>
            {streakDays}
          </span>
          <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'opacity-90')}>
            {streakDays === 1
              ? t('streakHeroCard.daySuffix', {}, { defaultValue: 'day' })
              : t('streakHeroCard.daysSuffix', {}, { defaultValue: 'days' })}
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
              local_fire_department
            </span>
            {t('streakHeroCard.xpToday', { xp: xpToday }, { defaultValue: '+{{xp}} XP today' })}
          </span>
        </div>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 3), 'opacity-80 max-w-md')}>
          {t(
            'streakHeroCard.tagline',
            { totalXp: totalXp.toLocaleString() },
            {
              defaultValue:
                '{{totalXp}} XP earned. Keep the rhythm — three more days to your weekly badge.',
            },
          )}
        </p>
      </div>

      {/* Daily goal bar */}
      <div className={cm.cn(cm.sp('mt', 6), 'relative z-10')}>
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 2))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary-fixed/90',
            )}
          >
            {t('streakHeroCard.goalLabel', {}, { defaultValue: "Today's goal" })}
          </span>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'tabular-nums')}>
            {t(
              'streakHeroCard.goalProgress',
              { current: xpToday, goal: xpGoal },
              { defaultValue: '{{current}} / {{goal}} XP' },
            )}
          </span>
        </div>
        <div
          className={cm.cn(
            'w-full h-3 rounded-full bg-surface/20 overflow-hidden backdrop-blur-md',
          )}
        >
          <div
            className={cm.cn(
              'h-full bg-gradient-to-r from-secondary to-secondary-light rounded-full transition-all',
            )}
            style={{ width: `${goalPercent}%` }}
          />
        </div>
      </div>

      {/* 7-day xp sparkline */}
      <div
        className={cm.cn(
          cm.sp('mt', 6),
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
          <path
            d={sparklinePaths.stroke}
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
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
      />
      <div
        className={cm.cn(
          cm.w(24),
          cm.h(24),
          cm.roundedFull,
          'absolute right-12 top-8 bg-secondary/40 blur-2xl',
        )}
      />
    </div>
  )
}

export default StreakHeroCard
