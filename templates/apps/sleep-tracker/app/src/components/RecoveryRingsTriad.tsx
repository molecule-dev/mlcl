import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Three recovery summary cards — duration, deep-sleep %, and resting HR
 * each as a colored progress ring on the left, an uppercase 10px label,
 * and an extrabold tabular numeric value. Hover lift.
 *
 * Translated from mental-health-journal/WellnessRingsTriad.tsx (which
 * derived from habit-tracker/HabitStatsTriad.tsx + health-records/
 * VitalsHeroCard.tsx). Rings encode the recovery dimensions called out
 * in DESIGN.md: total sleep duration, deep-sleep share, and recovery
 * (resting heart rate vs. baseline).
 */

interface RecoveryRingsTriadProps {
  durationMinutes: number
  durationGoalMinutes: number
  deepSleepPct: number
  deepSleepGoalPct: number
  restingHeartRate: number
  restingHeartRateBaseline: number
}

interface RingProps {
  value: number
  goal: number
  color: string
  size?: number
}

function ProgressRing({ value, goal, color, size = 64 }: RingProps) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(1, value / Math.max(goal, 1))
  const dash = circumference * pct
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeOpacity="0.18"
        strokeWidth="6"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  )
}

interface CardProps {
  ringColor: string
  icon: string
  label: string
  caption: string
  value: string
  pct: number
}

function RingCard({ ringColor, icon, label, caption, value, pct }: CardProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        cm.flex({ align: 'center', gap: 'md' }),
        'bg-surface-container-lowest rounded-2xl shadow-sm border-l-4 hover:-translate-y-0.5 transition-transform group',
      )}
      style={{ borderLeftColor: ringColor }}
    >
      <div className={cm.cn('relative shrink-0')}>
        <ProgressRing value={pct * 100} goal={100} color={ringColor} />
        <span
          className={cm.cn(
            'absolute inset-0 flex items-center justify-center material-symbols-outlined text-2xl',
          )}
          aria-hidden="true"
          style={{ color: ringColor, fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
      </div>
      <div className={cm.flex1}>
        <p
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.sp('mb', 1),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {label}
        </p>
        <p
          className={cm.cn('text-3xl font-extrabold tracking-tight text-on-surface')}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {value}
        </p>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.sp('mt', 1),
            cm.fontWeight('medium'),
            'text-on-surface-variant',
          )}
        >
          {caption}
        </p>
      </div>
    </div>
  )
}

export function RecoveryRingsTriad({
  durationMinutes,
  durationGoalMinutes,
  deepSleepPct,
  deepSleepGoalPct,
  restingHeartRate,
  restingHeartRateBaseline,
}: RecoveryRingsTriadProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const durationHours = durationMinutes / 60
  const durationGoalHours = durationGoalMinutes / 60
  const durationPct = Math.min(1, durationMinutes / Math.max(durationGoalMinutes, 1))
  const deepPct = Math.min(1, deepSleepPct / Math.max(deepSleepGoalPct, 1))
  // For HR — invert so lower-than-baseline shows as fuller (better recovery)
  const hrPct = Math.max(
    0,
    Math.min(1, 1 - (restingHeartRate - restingHeartRateBaseline + 10) / 20),
  )

  return (
    <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
      <RingCard
        ringColor="var(--color-border-focus)"
        icon="bedtime"
        label={t('form.duration', {}, { defaultValue: 'Duration' })}
        caption={t(
          'recoveryRingsTriad.durationCaption',
          { goal: durationGoalHours.toFixed(1) },
          { defaultValue: 'Goal {{goal}}h / night' },
        )}
        value={t(
          'recoveryRingsTriad.durationValue',
          { hours: durationHours.toFixed(1) },
          { defaultValue: '{{hours}}h' },
        )}
        pct={durationPct}
      />
      <RingCard
        ringColor="var(--color-stage-deep)"
        icon="dark_mode"
        label={t('recoveryRingsTriad.deepLabel', {}, { defaultValue: 'Deep sleep' })}
        caption={t(
          'recoveryRingsTriad.deepCaption',
          { goal: deepSleepGoalPct },
          { defaultValue: 'Target {{goal}}% of night' },
        )}
        value={t(
          'recoveryRingsTriad.deepValue',
          { pct: deepSleepPct.toFixed(0) },
          { defaultValue: '{{pct}}%' },
        )}
        pct={deepPct}
      />
      <RingCard
        ringColor="var(--color-quality-excellent-dot)"
        icon="favorite"
        label={t('recoveryRingsTriad.heartLabel', {}, { defaultValue: 'Resting HR' })}
        caption={t(
          'recoveryRingsTriad.heartCaption',
          { baseline: restingHeartRateBaseline },
          { defaultValue: 'Baseline {{baseline}} bpm' },
        )}
        value={t(
          'recoveryRingsTriad.heartValue',
          { bpm: restingHeartRate },
          { defaultValue: '{{bpm}} bpm' },
        )}
        pct={hrPct}
      />
    </section>
  )
}
