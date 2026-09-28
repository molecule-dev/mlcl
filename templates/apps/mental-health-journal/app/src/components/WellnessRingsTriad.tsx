import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Three wellness summary cards — each with a colored progress ring on the
 * left, an uppercase 10px label, and an extrabold numeric value. Hover lift.
 *
 * Translated from habit-tracker/HabitStatsTriad.tsx (border-l-4 accent +
 * lift) crossed with health-records/VitalsHeroCard.tsx (concentric ring
 * pattern). Rings encode the wellness dimensions from DESIGN.md: sleep,
 * mindfulness, journal-streak.
 */

interface WellnessRingsTriadProps {
  sleepHours: number
  sleepGoal: number
  mindfulnessMinutes: number
  mindfulnessGoal: number
  journalStreak: number
  journalGoal: number
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
  const goalForRing = 100
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        cm.flex({ align: 'center', gap: 'md' }),
        cm.accentCard({ tone: 'custom' }),
        'bg-surface-container-lowest rounded-2xl shadow-sm hover:-translate-y-0.5 transition-transform group',
      )}
      style={{ ['--mol-accent' as string]: ringColor }}
    >
      <div className="relative shrink-0">
        <ProgressRing value={pct * goalForRing} goal={goalForRing} color={ringColor} />
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
        <p className={cm.cn(cm.accentCardLabel({ tone: 'custom' }), cm.sp('mb', 1))}>{label}</p>
        <p className={cm.cn('text-3xl font-extrabold tracking-tight text-on-surface')}>{value}</p>
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

export function WellnessRingsTriad({
  sleepHours,
  sleepGoal,
  mindfulnessMinutes,
  mindfulnessGoal,
  journalStreak,
  journalGoal,
}: WellnessRingsTriadProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
      <RingCard
        ringColor="var(--color-mood-mind, #6366f1)"
        icon="bedtime"
        label={t('wellnessRingsTriad.sleepLabel', {}, { defaultValue: 'Sleep' })}
        caption={t(
          'wellnessRingsTriad.sleepCaption',
          { goal: sleepGoal },
          { defaultValue: 'Goal {{goal}}h / night' },
        )}
        value={t(
          'wellnessRingsTriad.sleepValue',
          { hours: sleepHours.toFixed(1) },
          { defaultValue: '{{hours}}h' },
        )}
        pct={Math.min(1, sleepHours / Math.max(sleepGoal, 1))}
      />
      <RingCard
        ringColor="var(--mol-color-secondary, #a78bfa)"
        icon="self_improvement"
        label={t('wellnessRingsTriad.mindfulnessLabel', {}, { defaultValue: 'Mindfulness' })}
        caption={t(
          'wellnessRingsTriad.mindfulnessCaption',
          { goal: mindfulnessGoal },
          { defaultValue: 'Goal {{goal}} min today' },
        )}
        value={t(
          'common.minutesMin',
          { minutes: mindfulnessMinutes },
          { defaultValue: '{{minutes}} min' },
        )}
        pct={Math.min(1, mindfulnessMinutes / Math.max(mindfulnessGoal, 1))}
      />
      <RingCard
        ringColor="var(--mol-color-primary, #6366f1)"
        icon="local_fire_department"
        label={t('wellnessRingsTriad.streakLabel', {}, { defaultValue: 'Journal streak' })}
        caption={t(
          'wellnessRingsTriad.streakCaption',
          { goal: journalGoal },
          { defaultValue: 'Goal {{goal}} days' },
        )}
        value={t(
          'wellnessRingsTriad.streakValue',
          { days: journalStreak },
          { defaultValue: '{{days}}d' },
        )}
        pct={Math.min(1, journalStreak / Math.max(journalGoal, 1))}
      />
    </section>
  )
}
