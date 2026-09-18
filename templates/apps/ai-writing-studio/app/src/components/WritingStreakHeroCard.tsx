import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Gradient hero card surfacing the writer's weekly streak: words written,
 * day-streak counter, frosted-glass pill, decorative blurred orbs and a
 * mock area-chart silhouette. Sits at the top of the Dashboard.
 *
 * Translated from personal-finance's NetWorthCard.tsx with Plume's
 * literary purple gradient and serif tagline.
 */
export interface WritingStreakHeroCardProps {
  /** Total words drafted this week. */
  wordsThisWeek: number
  /** Consecutive days with at least one writing session. */
  dayStreak: number
  /** Word change vs the previous week (signed integer). */
  wordsChange: number
  /** Writer's display name (used in the greeting). */
  writerName: string
}

export function WritingStreakHeroCard({
  wordsThisWeek,
  dayStreak,
  wordsChange,
  writerName,
}: WritingStreakHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const positive = wordsChange >= 0
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[320px] bg-gradient-to-br from-primary to-primary-dark rounded-[2rem] text-white relative overflow-hidden',
      )}
    >
      <div className={cm.cn('relative z-10')}>
        <p
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-white/70',
          )}
        >
          {t(
            'writingStreakHeroCard.greeting',
            { name: writerName },
            { defaultValue: 'Good day, {{name}}' },
          )}
        </p>
        <h2
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.sp('mb', 6),
            'font-serif italic text-2xl text-white/90',
          )}
        >
          {t(
            'writingStreakHeroCard.tagline',
            {},
            { defaultValue: 'A page a day keeps the muse engaged.' },
          )}
        </h2>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'md' }))}>
          <span className={cm.cn('text-6xl font-extrabold tracking-tighter')}>
            {wordsThisWeek.toLocaleString()}
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
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
              {positive ? 'trending_up' : 'trending_down'}
            </span>
            {t(
              'writingStreakHeroCard.change',
              { sign: positive ? '+' : '', amount: wordsChange.toLocaleString() },
              { defaultValue: '{{sign}}{{amount}} words' },
            )}
          </span>
        </div>
        <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-white/70')}>
          {t(
            'writingStreakHeroCard.subtitle',
            { count: dayStreak },
            { defaultValue: 'Words written this week — {{count}}-day streak' },
          )}
        </p>
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
        <div className={cm.cn(cm.h('full'), cm.w('full'), 'opacity-30')}>
          <svg
            className={cm.cn(cm.w('full'), cm.h('full'))}
            viewBox="0 0 400 100"
            preserveAspectRatio="none"
          >
            <path d="M0,80 Q50,60 100,70 T200,30 T300,50 T400,10 L400,100 L0,100 Z" fill="white" />
            <path
              d="M0,80 Q50,60 100,70 T200,30 T300,50 T400,10"
              fill="none"
              stroke="white"
              strokeWidth="3"
            />
          </svg>
        </div>
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
          'absolute right-10 top-10 bg-secondary/30 blur-xl',
        )}
      />
    </div>
  )
}

export default WritingStreakHeroCard
