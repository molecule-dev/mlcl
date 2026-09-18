import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Three summary cards — today's completion, active habits, best-ever streak.
 * Each card has a colored icon chip, uppercase 10px label, and font-extrabold
 * value with hover-lift transition.
 *
 * Translated from personal-finance/DashboardAccountOverview.tsx (icon chip
 * pattern) plus project-management/KpiCard.tsx (border accent + lift).
 */

interface HabitStatsTriadProps {
  todayDone: number
  todayTotal: number
  activeHabits: number
  bestEverStreak: number
  bestEverHabit: string
  completionRate: number
}

interface StatProps {
  icon: string
  label: string
  value: string
  caption: string
  accentVar: string
  iconColor: string
}

function StatCard({ icon, label, value, caption, accentVar, iconColor }: StatProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl shadow-sm border-l-4 hover:-translate-y-0.5 transition-transform group',
      )}
      style={{ borderLeftColor: `var(${accentVar})` }}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
        <div
          className={cm.cn(
            cm.sp('p', 3),
            'bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
          )}
          style={{ color: `var(${iconColor})` }}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {icon}
          </span>
        </div>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {label}
        </span>
      </div>
      <p
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          cm.sp('mb', 1),
          'text-on-surface-variant',
        )}
      >
        {caption}
      </p>
      <p className={cm.cn('text-4xl font-extrabold tracking-tight text-on-surface')}>{value}</p>
    </div>
  )
}

export function HabitStatsTriad({
  todayDone,
  todayTotal,
  activeHabits,
  bestEverStreak,
  bestEverHabit,
  completionRate,
}: HabitStatsTriadProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const completionPct = Math.round(completionRate * 100)
  return (
    <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
      <StatCard
        icon="check_circle"
        accentVar="--mol-color-secondary"
        iconColor="--mol-color-secondary"
        label={t('status.today', {}, { defaultValue: 'Today' })}
        caption={t(
          'habitStatsTriad.todayCaption',
          { pct: completionPct },
          { defaultValue: '{{pct}}% completion this week' },
        )}
        value={t(
          'habitStatsTriad.todayValue',
          { done: todayDone, total: todayTotal },
          { defaultValue: '{{done}}/{{total}}' },
        )}
      />
      <StatCard
        icon="self_improvement"
        accentVar="--mol-color-primary"
        iconColor="--mol-color-primary"
        label={t('status.active', {}, { defaultValue: 'Active' })}
        caption={t(
          'habitStatsTriad.activeCaption',
          {},
          { defaultValue: 'Habits running concurrently' },
        )}
        value={String(activeHabits)}
      />
      <StatCard
        icon="local_fire_department"
        accentVar="--color-flame"
        iconColor="--color-flame"
        label={t('habitStatsTriad.bestLabel', {}, { defaultValue: 'Best ever' })}
        caption={bestEverHabit}
        value={t(
          'habitStatsTriad.bestValue',
          { days: bestEverStreak },
          { defaultValue: '{{days}}d' },
        )}
      />
    </section>
  )
}
