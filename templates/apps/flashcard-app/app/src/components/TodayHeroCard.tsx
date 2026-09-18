/**
 * Gradient hero card — daily review status, streak flame, daily-goal progress
 * with inline SVG, decorative blurred orbs, frosted-glass streak pill.
 *
 * Translated from lms's WelcomeBanner.tsx and personal-finance's NetWorthCard.tsx.
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface TodayHeroCardProps {
  date: string
  totalDue: number
  reviewedToday: number
  dailyGoal: number
  currentStreak: number
  motivationalMessage: string
  primaryDeckId?: string | null
}

export function TodayHeroCard({
  date,
  totalDue,
  reviewedToday,
  dailyGoal,
  currentStreak,
  motivationalMessage,
  primaryDeckId,
}: TodayHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const goalPct = dailyGoal > 0 ? Math.min(100, Math.round((reviewedToday / dailyGoal) * 100)) : 0
  const todayLabel = (() => {
    try {
      return new Date(date).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    } catch (_error) {
      // Date parsing failed — fall back to the raw date string as-is
      return date
    }
  })()
  const studyHref = primaryDeckId ? `/study/${primaryDeckId}` : '/decks'

  return (
    <section
      className={cm.cn(
        cm.sp('p', 10),
        'relative overflow-hidden rounded-[2rem] text-white shadow-xl',
        'bg-gradient-to-br from-primary via-primary to-primary-container',
      )}
      data-mol-id="hero-today"
    >
      {/* Decorative blurred orbs */}
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -top-24 -right-16 h-72 w-72 rounded-full bg-surface/15 blur-3xl',
        )}
      />
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-tertiary/40 blur-3xl',
        )}
      />
      <span
        aria-hidden="true"
        className="material-symbols-outlined absolute -bottom-10 -right-8 text-[180px] text-white/10 select-none"
      >
        psychology
      </span>

      <div className={cm.cn('relative z-10', cm.flex({ direction: 'col', gap: 'lg' }))}>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80">
            {t('todayHeroCard.eyebrow', { date: todayLabel }, { defaultValue: 'TODAY · {{date}}' })}
          </p>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              'rounded-full bg-surface/20 backdrop-blur-md text-xs font-bold',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              local_fire_department
            </span>
            {t(
              'todayHeroCard.streakBadge',
              { days: currentStreak },
              { defaultValue: '{{days}}-day streak' },
            )}
          </span>
        </div>

        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          <h1
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-5xl md:text-6xl tracking-tighter leading-[1.0] font-extrabold',
            )}
          >
            {t(
              'todayHeroCard.dueValue',
              { count: totalDue },
              { defaultValue: '{{count}} cards due' },
            )}
          </h1>
          <p className={cm.cn('text-lg text-white/85 max-w-xl italic')}>{motivationalMessage}</p>
        </div>

        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            'flex-wrap',
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'min-w-[260px] flex-1')}>
            <div className={cm.flex({ align: 'center', justify: 'between' })}>
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/75">
                {t('todayHeroCard.goalLabel', {}, { defaultValue: 'Daily goal' })}
              </span>
              <span className={cm.cn('text-xs font-bold text-white/90')}>
                {t(
                  'todayHeroCard.goalProgress',
                  { reviewed: reviewedToday, goal: dailyGoal },
                  { defaultValue: '{{reviewed}} / {{goal}}' },
                )}
              </span>
            </div>
            <div
              className={cm.cn('relative h-2 w-full overflow-hidden rounded-full bg-surface/20')}
            >
              <div
                className={cm.cn('h-full rounded-full bg-surface/95 transition-all duration-500')}
                style={{ width: `${goalPct}%` }}
              />
            </div>
          </div>

          <Link
            to={studyHref}
            className={cm.cn(
              cm.sp('px', 8),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'rounded-xl bg-surface text-primary text-sm shadow-lg hover:scale-[1.02] transition-transform inline-flex items-center gap-2',
            )}
            data-mol-id="cta-study-now"
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              play_arrow
            </span>
            {t('todayHeroCard.studyCta', {}, { defaultValue: 'Start studying' })}
          </Link>
        </div>
      </div>
    </section>
  )
}
