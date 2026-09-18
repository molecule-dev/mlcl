import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * KPI stat card — left orange accent, uppercase 10px label, extrabold
 * tabular-nums value, optional delta pill. Translated from the
 * personal-finance KpiCard treatment.
 */
interface StatCardProps {
  label: string
  value: string
  icon?: string
  trend?: 'up' | 'down' | 'flat'
  trendLabel?: string
  accent?: 'primary' | 'accent' | 'urgent' | 'ending' | 'neutral'
}

const ACCENT_COLOR: Record<NonNullable<StatCardProps['accent']>, string> = {
  primary: 'var(--color-stat-primary)',
  accent: 'var(--color-stat-accent)',
  urgent: 'var(--color-stat-urgent)',
  ending: 'var(--color-stat-ending)',
  neutral: 'var(--color-stat-neutral)',
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  trendLabel,
  accent = 'primary',
}: StatCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const accentColor = ACCENT_COLOR[accent]

  const trendIcon =
    trend === 'up' ? 'trending_up' : trend === 'down' ? 'trending_down' : 'trending_flat'
  const trendColor =
    trend === 'down'
      ? 'var(--color-trend-down)'
      : trend === 'up'
        ? 'var(--color-trend-up)'
        : 'var(--color-trend-flat)'

  return (
    <div
      className={cm.cn(
        cm.sp('p', 5),
        cm.stack(3),
        'relative bg-surface rounded-xl border border-outline-variant/40 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all',
      )}
      style={{ borderLeft: `4px solid ${accentColor}` }}
    >
      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            'font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {label}
        </p>
        {icon ? (
          <span
            className={cm.cn('material-symbols-outlined text-base')}
            style={{ color: accentColor }}
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className={cm.cn('text-3xl font-extrabold tracking-tight tabular-nums text-on-surface')}>
        {value}
      </p>
      {trend ? (
        <div className={cm.flex({ align: 'center', gap: 'xs' })}>
          <span
            className={cm.cn('material-symbols-outlined text-base')}
            style={{ color: trendColor }}
            aria-hidden="true"
          >
            {trendIcon}
          </span>
          <span className={cm.cn(cm.textSize('xs'), 'font-semibold')} style={{ color: trendColor }}>
            {trendLabel ?? t('statCard.flat', {}, { defaultValue: 'No change' })}
          </span>
        </div>
      ) : null}
    </div>
  )
}

export default StatCard
