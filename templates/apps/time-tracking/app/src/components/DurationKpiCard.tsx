import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * KPI tile — left-border-accent + uppercase-widest label + extrabold value
 * (mono tabular-nums for time/money) + small trend indicator. Hover lift.
 *
 * Translated from project-management's KpiCard.tsx and personal-finance's
 * SavingsCard treatment.
 */

export type DurationKpiAccent = 'primary' | 'emerald' | 'violet' | 'amber' | 'rose'

const ACCENT_CLASSES: Record<
  DurationKpiAccent,
  { border: string; chip: string; icon: string; trend: string }
> = {
  primary: {
    border: 'border-blue-500',
    chip: 'bg-blue-100 text-blue-700',
    icon: 'text-blue-600',
    trend: 'text-blue-700',
  },
  emerald: {
    border: 'border-emerald-500',
    chip: 'bg-success-light text-success',
    icon: 'text-success',
    trend: 'text-success',
  },
  violet: {
    border: 'border-violet-500',
    chip: 'bg-violet-100 text-violet-700',
    icon: 'text-violet-600',
    trend: 'text-violet-700',
  },
  amber: {
    border: 'border-amber-500',
    chip: 'bg-warning-light text-warning',
    icon: 'text-warning',
    trend: 'text-warning',
  },
  rose: {
    border: 'border-rose-500',
    chip: 'bg-rose-100 text-error',
    icon: 'text-error',
    trend: 'text-error',
  },
}

export interface DurationKpiCardProps {
  label: string
  value: string
  icon: string
  trend?: string
  trendDirection?: 'up' | 'down' | 'flat'
  accent?: DurationKpiAccent
  mono?: boolean
}

export function DurationKpiCard({
  label,
  value,
  icon,
  trend,
  trendDirection = 'up',
  accent = 'primary',
  mono = true,
}: DurationKpiCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tone = ACCENT_CLASSES[accent]
  const trendIcon =
    trendDirection === 'down'
      ? 'trending_down'
      : trendDirection === 'flat'
        ? 'trending_flat'
        : 'trending_up'

  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface rounded-xl border-l-4 shadow-sm hover:-translate-y-0.5 transition-transform duration-200',
        tone.border,
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
        <span
          className={cm.cn(
            cm.sp('p', 2),
            'material-symbols-outlined rounded-lg',
            tone.chip,
            tone.icon,
          )}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
        {trend && (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              'text-[10px] uppercase tracking-widest font-black',
              tone.trend,
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
              {trendIcon}
            </span>
            {t('durationKpiCard.trend', { trend }, { defaultValue: '{{trend}}' })}
          </span>
        )}
      </div>
      <p
        className={cm.cn(
          cm.fontWeight('bold'),
          cm.sp('mb', 1),
          'text-[10px] uppercase tracking-widest text-foreground-secondary',
        )}
      >
        {t('durationKpiCard.label', { label }, { defaultValue: '{{label}}' })}
      </p>
      <p
        className={cm.cn(
          cm.textSize('3xl'),
          'font-extrabold text-foreground',
          mono && 'font-mono tabular-nums',
        )}
      >
        {t('durationKpiCard.value', { value }, { defaultValue: '{{value}}' })}
      </p>
    </div>
  )
}

export default DurationKpiCard
