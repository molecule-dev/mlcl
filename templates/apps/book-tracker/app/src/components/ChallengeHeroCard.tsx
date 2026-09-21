import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Gradient hero card — the yearly reading challenge progress ring in
 * 6xl-extrabold numbers, an on-pace badge, decorative blurred orbs, and an
 * inline SVG sparkline of weekly pages.
 *
 * Adapted from habit-tracker/StreakHeroCard.tsx.
 */

export interface ChallengeSnapshot {
  year: number
  goal_books: number
  books_read: number
  percent: number
  on_pace: boolean
  books_behind: number
  pace_needed_per_week: number
}

interface ChallengeHeroCardProps {
  challenge?: ChallengeSnapshot | null
  motivationalMessage: string
  weeklyPages?: { week: string; pages: number }[]
}

export function ChallengeHeroCard({
  challenge,
  motivationalMessage,
  weeklyPages = [],
}: ChallengeHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const read = challenge?.books_read ?? 0
  const goal = challenge?.goal_books ?? 0
  const percent = challenge ? Math.round(challenge.percent * 100) : 0
  const onPace = challenge?.on_pace ?? true
  const hasGoal = goal > 0

  // Sparkline path from weekly pages (normalized to the busiest week).
  const points =
    weeklyPages.length > 0
      ? weeklyPages
      : [
          { week: '', pages: 60 },
          { week: '', pages: 132 },
          { week: '', pages: 98 },
          { week: '', pages: 155 },
          { week: '', pages: 141 },
          { week: '', pages: 187 },
          { week: '', pages: 120 },
          { week: '', pages: 164 },
          { week: '', pages: 96 },
          { week: '', pages: 138 },
          { week: '', pages: 112 },
          { week: '', pages: 90 },
        ]
  const maxPages = Math.max(1, ...points.map((p) => p.pages))
  const w = 400
  const h = 100
  const stepX = points.length > 1 ? w / (points.length - 1) : w
  const linePath = points
    .map((p, i) => {
      const x = i * stepX
      const y = h - (p.pages / maxPages) * h * 0.9 - 5
      return `${i === 0 ? 'M' : 'L'}${x},${y}`
    })
    .join(' ')
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`

  // Progress ring
  const R = 26
  const C = 2 * Math.PI * R
  const dash = hasGoal ? Math.min(C, C * (percent / 100)) : 0

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[320px] rounded-[2rem] text-white relative overflow-hidden',
      )}
      style={{
        background:
          'linear-gradient(135deg, var(--color-gradient-hero-start), var(--color-gradient-hero-end))',
      }}
    >
      <div className={cm.cn('relative z-10')}>
        <h2
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-white/70',
          )}
        >
          {t(
            'challengeHeroCard.title',
            { year: challenge?.year ?? new Date().getFullYear() },
            { defaultValue: '{{year}} reading challenge' },
          )}
        </h2>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'flex-wrap')}>
          <svg width="64" height="64" viewBox="0 0 64 64" className={cm.cn(cm.shrink0)}>
            <circle
              cx="32"
              cy="32"
              r={R}
              fill="none"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="6"
            />
            <circle
              cx="32"
              cy="32"
              r={R}
              fill="none"
              stroke="#ffffff"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${C}`}
              transform="rotate(-90 32 32)"
            />
            <text x="32" y="36" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="bold">
              {hasGoal ? `${percent}%` : '—'}
            </text>
          </svg>
          <div>
            <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'sm' }))}>
              <span className={cm.cn('text-6xl font-extrabold tracking-tighter')}>{read}</span>
              <span
                className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), 'text-white/80')}
              >
                / {hasGoal ? goal : '?'}
              </span>
            </div>
            <p className={cm.cn(cm.textSize('sm'), 'text-white/70 uppercase tracking-widest')}>
              {t('challengeHeroCard.booksSuffix', {}, { defaultValue: 'books finished' })}
            </p>
          </div>
          {hasGoal ? (
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
              <span className={cm.cn('text-sm material-symbols-outlined')}>
                {onPace ? 'trending_up' : 'trending_down'}
              </span>
              {onPace
                ? t('challengeHeroCard.onPace', {}, { defaultValue: 'On pace' })
                : t(
                    'challengeHeroCard.behindPace',
                    { count: challenge?.books_behind ?? 0 },
                    { defaultValue: '{{count}} behind' },
                  )}
            </span>
          ) : null}
        </div>
        <p className={cm.cn(cm.textSize('base'), cm.sp('mt', 3), 'text-white/85 max-w-md')}>
          {motivationalMessage}
        </p>
      </div>

      <div
        className={cm.cn(
          'relative z-10',
          cm.sp('mt', 6),
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
        )}
      >
        <div className={cm.cn(cm.h(20), cm.flex1, 'opacity-80')}>
          <svg
            className={cm.cn(cm.w('full'), cm.h('full'))}
            viewBox={`0 0 ${w} ${h}`}
            preserveAspectRatio="none"
          >
            <path d={areaPath} fill="white" opacity="0.25" />
            <path
              d={linePath}
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.roundedFull,
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'bg-surface/20 backdrop-blur-md whitespace-nowrap',
          )}
        >
          <span className={cm.cn('text-sm material-symbols-outlined')}>menu_book</span>
          {t(
            'challengeHeroCard.paceBadge',
            { rate: challenge?.pace_needed_per_week ?? 0 },
            { defaultValue: '{{rate}} books/wk to goal' },
          )}
        </span>
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
          cm.w(20),
          cm.h(20),
          cm.roundedFull,
          'absolute right-10 top-10 bg-surface/20 blur-xl',
        )}
      />
      <div
        className={cm.cn('absolute -left-10 top-1/2 w-40 h-40 rounded-full blur-3xl')}
        style={{ background: 'rgba(217, 119, 6, 0.25)' }}
      />
    </div>
  )
}
