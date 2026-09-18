import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Gentle gradient hero card — today's mood, current streak in 6xl-extrabold,
 * frosted-glass mood pill, decorative blurred orbs in the indigo→violet
 * Lucid palette, inline SVG mood-trend sparkline.
 *
 * Translated from habit-tracker/StreakHeroCard.tsx (which itself derived
 * from personal-finance/NetWorthCard.tsx). Mood pill replaces the active-
 * streak badge; sparkline charts the past two weeks of mood scores.
 */

export type MoodLevel = 'radiant' | 'good' | 'neutral' | 'low' | 'struggling'

const MOOD_META: Record<MoodLevel, { icon: string; label: string }> = {
  radiant: { icon: 'mood', label: 'Radiant' },
  good: { icon: 'sentiment_satisfied', label: 'Good' },
  neutral: { icon: 'sentiment_neutral', label: 'Neutral' },
  low: { icon: 'sentiment_dissatisfied', label: 'Low' },
  struggling: { icon: 'sentiment_very_dissatisfied', label: 'Struggling' },
}

interface MoodHeroCardProps {
  mood: MoodLevel
  streakDays: number
  entriesThisWeek: number
  reflectionPrompt: string
  trend?: { day: string; score: number }[]
}

export function MoodHeroCard({
  mood,
  streakDays,
  entriesThisWeek,
  reflectionPrompt,
  trend = [],
}: MoodHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const meta = MOOD_META[mood]

  const points =
    trend.length > 0
      ? trend
      : [
          { day: 'M1', score: 0.55 },
          { day: 'T1', score: 0.62 },
          { day: 'W1', score: 0.58 },
          { day: 'T2', score: 0.7 },
          { day: 'F1', score: 0.74 },
          { day: 'S1', score: 0.68 },
          { day: 'S2', score: 0.75 },
          { day: 'M2', score: 0.81 },
          { day: 'T3', score: 0.78 },
          { day: 'W2', score: 0.86 },
          { day: 'T4', score: 0.83 },
          { day: 'F2', score: 0.88 },
          { day: 'S3', score: 0.84 },
          { day: 'S4', score: 0.91 },
        ]
  const w = 480
  const h = 110
  const stepX = points.length > 1 ? w / (points.length - 1) : w
  const linePath = points
    .map((p, i) => {
      const x = i * stepX
      const y = h - p.score * h * 0.85 - 10
      return `${i === 0 ? 'M' : 'L'}${x},${y}`
    })
    .join(' ')
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[340px] rounded-[2rem] text-white relative overflow-hidden',
      )}
      style={{
        background:
          'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--color-mood-radiant, var(--mol-color-secondary)) 50%, var(--color-mood-mind, var(--mol-color-primary)) 100%)',
      }}
    >
      <div className={cm.cn('relative z-10')}>
        <h2
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-white/75',
          )}
        >
          {t('moodHeroCard.title', {}, { defaultValue: 'Today’s reflection' })}
        </h2>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'md' }), 'flex-wrap')}>
          <span className={cm.cn('text-6xl md:text-7xl font-extrabold tracking-tighter')}>
            {streakDays}
          </span>
          <span className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), 'text-white/85')}>
            {t('moodHeroCard.streakSuffix', { count: streakDays }, { defaultValue: 'day streak' })}
          </span>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'bg-surface/20 backdrop-blur-md uppercase tracking-widest',
            )}
          >
            <span
              className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
              aria-hidden="true"
            >
              {meta.icon}
            </span>
            {t(`moodHeroCard.mood.${mood}`, {}, { defaultValue: meta.label })}
          </span>
        </div>
        <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 4), 'text-white/90 max-w-md italic')}>
          “{reflectionPrompt}”
        </p>
      </div>

      <div
        className={cm.cn(
          'relative z-10',
          cm.sp('mt', 6),
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
        )}
      >
        <div className={cm.cn(cm.h(20), cm.flex1, 'opacity-90')}>
          <svg
            className={cm.cn(cm.w('full'), cm.h('full'))}
            viewBox={`0 0 ${w} ${h}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="moodAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="white" stopOpacity="0.4" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#moodAreaGradient)" />
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
            'bg-surface/20 backdrop-blur-md whitespace-nowrap uppercase tracking-widest',
          )}
        >
          <span
            className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
            aria-hidden="true"
          >
            edit_note
          </span>
          {t(
            'moodHeroCard.entriesThisWeek',
            { count: entriesThisWeek },
            { defaultValue: '{{count}} this week' },
          )}
        </span>
      </div>

      {/* Decorative blurred orbs in soft Lucid violet/indigo */}
      <div
        className={cm.cn(
          cm.w(80),
          cm.h(80),
          cm.roundedFull,
          'absolute -right-20 -bottom-20 bg-surface/15 blur-3xl',
        )}
      />
      <div
        className={cm.cn(
          'absolute -left-20 top-1/4 w-56 h-56 rounded-full blur-3xl pointer-events-none',
        )}
        style={{ background: 'rgba(167, 139, 250, 0.35)' }}
      />
      <div
        className={cm.cn(
          cm.w(20),
          cm.h(20),
          cm.roundedFull,
          'absolute right-12 top-10 bg-surface/25 blur-xl',
        )}
      />
    </div>
  )
}
