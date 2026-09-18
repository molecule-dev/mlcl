import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * KPI tile — uppercase 10px label, 3xl extrabold value, hover lift, accent
 * left border (4px) keyed to the metric's semantic state. Used as the
 * dashboard summary triad/quad and on Payments / Reports pages.
 *
 * Translated from personal-finance/DashboardAccountOverview.tsx — added
 * left-border accent + delta pill from DESIGN.md "Dashboard Summary Card".
 */

type Tone = 'revenue' | 'outstanding' | 'overdue' | 'collected' | 'neutral'

const TONE: Record<Tone, { border: string; chip: string; icon: string; iconBg: string }> = {
  revenue: {
    border: 'var(--color-kpi-revenue-border)',
    chip: 'var(--color-kpi-revenue-chip)',
    icon: 'var(--color-kpi-revenue-border)',
    iconBg: 'var(--color-kpi-revenue-icon-bg)',
  },
  outstanding: {
    border: 'var(--color-kpi-outstanding-border)',
    chip: 'var(--color-kpi-outstanding-chip)',
    icon: 'var(--color-kpi-outstanding-border)',
    iconBg: 'var(--color-kpi-outstanding-icon-bg)',
  },
  overdue: {
    border: 'var(--color-kpi-overdue-border)',
    chip: 'var(--color-kpi-overdue-chip)',
    icon: 'var(--color-kpi-overdue-border)',
    iconBg: 'var(--color-kpi-overdue-icon-bg)',
  },
  collected: {
    border: 'var(--color-kpi-collected-border)',
    chip: 'var(--color-kpi-collected-chip)',
    icon: 'var(--color-kpi-collected-border)',
    iconBg: 'var(--color-kpi-collected-icon-bg)',
  },
  neutral: {
    border: 'var(--color-kpi-neutral-border)',
    chip: 'var(--color-kpi-neutral-chip)',
    icon: 'var(--mol-color-text-secondary)',
    iconBg: 'var(--color-kpi-neutral-icon-bg)',
  },
}

interface KpiStatCardProps {
  label: string
  value: string
  icon: string
  tone?: Tone
  deltaLabel?: string
  deltaPositive?: boolean
  caption?: string
}

export function KpiStatCard({
  label,
  value,
  icon,
  tone = 'neutral',
  deltaLabel,
  deltaPositive,
  caption,
}: KpiStatCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const theme = TONE[tone]

  return (
    <div
      data-mol-id={`kpi-${tone}`}
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all',
      )}
      style={{ borderTop: `4px solid ${theme.border}` }}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
        <span
          className={cm.cn(cm.fontWeight('bold'))}
          style={{
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--mol-color-text-secondary)',
          }}
        >
          {label}
        </span>
        <span
          className={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            backgroundColor: theme.iconBg,
            color: theme.icon,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            {icon}
          </span>
        </span>
      </div>
      <div
        className={cm.cn(cm.fontWeight('bold'))}
        style={{
          fontSize: '30px',
          letterSpacing: '-0.025em',
          fontWeight: 800,
          color: 'var(--mol-color-text)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mt', 3))}>
        {deltaLabel ? (
          <span
            className={cm.cn(cm.fontWeight('bold'), cm.flex({ align: 'center', gap: 'xs' }))}
            style={{
              padding: '3px 10px',
              borderRadius: '9999px',
              backgroundColor: theme.chip,
              color: theme.border,
              fontSize: '11px',
              letterSpacing: '0.02em',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
              {deltaPositive === false ? 'trending_down' : 'trending_up'}
            </span>
            {deltaLabel}
          </span>
        ) : null}
        {caption ? (
          <span style={{ fontSize: '12px', color: 'var(--mol-color-text-secondary)' }}>
            {caption ?? t('kpiStatCard.fallback', {}, { defaultValue: '' })}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export default KpiStatCard
