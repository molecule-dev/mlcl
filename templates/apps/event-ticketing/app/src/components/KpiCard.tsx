import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Border-left-accent KPI card — uppercase 10px label, extrabold
 * tabular-nums value, optional trend pill (up/down/flat). Used in
 * Dashboard's analytics row and EventDetail's organizer summary.
 *
 * Translated from auction-platform's StatCard.tsx — same composition,
 * with violet/rose accent palette.
 */
interface KpiCardProps {
  label: string
  value: string
  icon?: string
  trend?: 'up' | 'down' | 'flat'
  trendLabel?: string
  accent?: 'primary' | 'rose' | 'success' | 'warning' | 'info' | 'neutral'
}

const ACCENT_COLOR: Record<NonNullable<KpiCardProps['accent']>, string> = {
  primary: 'var(--color-primary)',
  rose: 'var(--color-accent)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  info: 'var(--color-info)',
  neutral: 'var(--color-status-neutral)',
}

export function KpiCard({
  label,
  value,
  icon,
  trend,
  trendLabel,
  accent = 'primary',
}: KpiCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const accentColor = ACCENT_COLOR[accent]

  const trendIcon =
    trend === 'up' ? 'trending_up' : trend === 'down' ? 'trending_down' : 'trending_flat'
  const trendColor =
    trend === 'down'
      ? 'var(--color-error)'
      : trend === 'up'
        ? 'var(--color-success)'
        : 'var(--color-status-neutral)'

  return (
    <div
      className={cm.cn(
        cm.sp('p', 5),
        cm.stack(3),
        'relative bg-surface rounded-2xl border border-outline-variant/40 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all',
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
            className={cm.cn('material-symbols-outlined text-lg p-1.5 rounded-lg')}
            style={{ color: accentColor, background: `${accentColor}1a` }}
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
          <span className={cm.cn(cm.textSize('xs'), 'font-bold')} style={{ color: trendColor }}>
            {trendLabel ?? t('kpiCard.flat', {}, { defaultValue: 'No change' })}
          </span>
        </div>
      ) : null}
    </div>
  )
}

export default KpiCard
