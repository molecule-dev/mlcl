import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Gradient hero card — last night's sleep score in 6xl-extrabold tabular,
 * frosted-glass duration pill, decorative blurred indigo/violet orbs, and
 * a 14-night recovery sparkline rendered as inline SVG.
 *
 * Translated from habit-tracker/StreakHeroCard.tsx (which itself derives
 * from personal-finance/NetWorthCard.tsx). Replaces the streak number with
 * a 0-100 sleep score; the active-streak pill becomes the night's hr/min
 * duration; sparkline charts the past two weeks of nightly scores.
 */

export type SleepQuality = 'excellent' | 'good' | 'fair' | 'poor'

const QUALITY_META: Record<SleepQuality, { icon: string; label: string }> = {
  excellent: { icon: 'auto_awesome', label: 'Excellent' },
  good: { icon: 'mood', label: 'Good' },
  fair: { icon: 'sentiment_neutral', label: 'Fair' },
  poor: { icon: 'sentiment_dissatisfied', label: 'Poor' },
}

interface SleepScoreHeroCardProps {
  score: number
  quality: SleepQuality
  durationMinutes: number
  bedtime: string
  wakeTime: string
  insight: string
  trend?: { date: string; score: number }[]
}

function formatDuration(minutes: number): { hours: number; mins: number } {
  return { hours: Math.floor(minutes / 60), mins: minutes % 60 }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch (_error) {
    // invalid date string — return raw value as fallback
    return iso
  }
}

export function SleepScoreHeroCard({
  score,
  quality,
  durationMinutes,
  bedtime,
  wakeTime,
  insight,
  trend = [],
}: SleepScoreHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const meta = QUALITY_META[quality]
  const { hours, mins } = formatDuration(durationMinutes)

  const points =
    trend.length > 0
      ? trend
      : [
          { date: 'M1', score: 62 },
          { date: 'T1', score: 71 },
          { date: 'W1', score: 68 },
          { date: 'T2', score: 74 },
          { date: 'F1', score: 79 },
          { date: 'S1', score: 71 },
          { date: 'S2', score: 83 },
          { date: 'M2', score: 78 },
          { date: 'T3', score: 80 },
          { date: 'W2', score: 85 },
          { date: 'T4', score: 79 },
          { date: 'F2', score: 87 },
          { date: 'S3', score: 84 },
          { date: 'S4', score: 91 },
        ]
  const w = 480
  const h = 110
  const stepX = points.length > 1 ? w / (points.length - 1) : w
  const linePath = points
    .map((p, i) => {
      const x = i * stepX
      const y = h - (p.score / 100) * h * 0.85 - 10
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
          'linear-gradient(135deg, var(--color-hero-gradient-start) 0%, var(--color-primary) 45%, #6c5ce7 100%)',
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
          {t('sleepScoreHeroCard.title', {}, { defaultValue: 'Last night' })}
        </h2>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'md' }), 'flex-wrap')}>
          <span
            className={cm.cn('text-6xl md:text-7xl font-extrabold tracking-tighter')}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {score}
          </span>
          <span className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), 'text-white/85')}>
            {t('sleepScoreHeroCard.outOf', {}, { defaultValue: '/ 100' })}
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
            {t(`sleepScoreHeroCard.quality.${quality}`, {}, { defaultValue: meta.label })}
          </span>
        </div>
        <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 4), 'text-white/90 max-w-md')}>
          {insight}
        </p>
      </div>

      <div
        className={cm.cn(
          'relative z-10',
          cm.sp('mt', 6),
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          'flex-wrap',
        )}
      >
        <div className={cm.cn(cm.h(20), cm.flex1, 'opacity-90 min-w-[200px]')}>
          <svg
            className={cm.cn(cm.w('full'), cm.h('full'))}
            viewBox={`0 0 ${w} ${h}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="sleepHeroAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="white" stopOpacity="0.4" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#sleepHeroAreaGradient)" />
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
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
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
              bedtime
            </span>
            {t(
              'sleepScoreHeroCard.duration',
              { hours, mins },
              { defaultValue: '{{hours}}h {{mins}}m' },
            )}
          </span>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              'whitespace-nowrap text-white/80',
            )}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              nights_stay
            </span>
            {formatTime(bedtime)} — {formatTime(wakeTime)}
          </span>
        </div>
      </div>

      {/* Decorative blurred orbs in indigo/violet */}
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
        style={{ background: 'rgba(167, 139, 250, 0.45)' }}
      />
      <div
        className={cm.cn(
          cm.w(20),
          cm.h(20),
          cm.roundedFull,
          'absolute right-12 top-10 bg-surface/30 blur-xl',
        )}
      />
      {/* Tiny stars */}
      <div className={cm.cn('absolute top-8 left-12 w-1 h-1 rounded-full bg-surface/80')} />
      <div className={cm.cn('absolute top-20 left-32 w-1 h-1 rounded-full bg-surface/60')} />
      <div className={cm.cn('absolute top-14 right-32 w-1 h-1 rounded-full bg-surface/70')} />
    </div>
  )
}
