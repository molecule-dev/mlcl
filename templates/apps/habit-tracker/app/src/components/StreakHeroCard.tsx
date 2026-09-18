import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Gradient hero card — today's streak count in 6xl-extrabold flame number,
 * frosted-glass freezes-available pill, decorative blurred orbs, inline SVG
 * sparkline showing weekly completion.
 *
 * Translated from personal-finance/NetWorthCard.tsx.
 */

interface StreakHeroCardProps {
  longestActive: number
  activeStreaks: number
  freezesAvailable: number
  motivationalMessage: string
  weeklyCompletion?: { week: string; rate: number }[]
}

export function StreakHeroCard({
  longestActive,
  activeStreaks,
  freezesAvailable,
  motivationalMessage,
  weeklyCompletion = [],
}: StreakHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  // Build sparkline path from weekly completion rates
  const points =
    weeklyCompletion.length > 0
      ? weeklyCompletion
      : [
          { week: '', rate: 0.62 },
          { week: '', rate: 0.71 },
          { week: '', rate: 0.68 },
          { week: '', rate: 0.74 },
          { week: '', rate: 0.79 },
          { week: '', rate: 0.71 },
          { week: '', rate: 0.83 },
          { week: '', rate: 0.78 },
          { week: '', rate: 0.8 },
          { week: '', rate: 0.85 },
          { week: '', rate: 0.79 },
          { week: '', rate: 0.87 },
        ]
  const w = 400
  const h = 100
  const stepX = points.length > 1 ? w / (points.length - 1) : w
  const linePath = points
    .map((p, i) => {
      const x = i * stepX
      const y = h - p.rate * h * 0.9 - 5
      return `${i === 0 ? 'M' : 'L'}${x},${y}`
    })
    .join(' ')
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`

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
          {t('streakHeroCard.title', {}, { defaultValue: 'Longest active streak' })}
        </h2>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'md' }))}>
          <span className={cm.cn('text-6xl font-extrabold tracking-tighter')}>{longestActive}</span>
          <span className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), 'text-white/80')}>
            {t('streakHeroCard.daysSuffix', {}, { defaultValue: 'days' })}
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
              local_fire_department
            </span>
            {t(
              'streakHeroCard.activeBadge',
              { count: activeStreaks },
              { defaultValue: '{{count}} active' },
            )}
          </span>
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
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>ac_unit</span>
          {t(
            'streakHeroCard.freezesAvailable',
            { count: freezesAvailable },
            { defaultValue: '{{count}} freezes' },
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
        style={{ background: 'rgba(249, 115, 22, 0.25)' }}
      />
    </div>
  )
}
