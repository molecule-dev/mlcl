/**
 * KPI card with the inset accent bar + uppercase label in its color, large value
 * font-extrabold, optional supporting trend pill. Used in 3-up triads
 * across Surveys, SurveyDetail, Analytics.
 *
 * Translated from customer-support-chat KpiStatCard, palette aligned
 * with DESIGN.md "Analytics Stat Card" + "Semantic" colors.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type KpiAccent = 'primary' | 'secondary' | 'success' | 'warning' | 'detractor'

interface KpiStatCardProps {
  label: string
  value: string
  /** Optional pre-formatted trend (e.g. "+8% vs last week"). */
  trend?: string
  /** Material symbol icon name. */
  icon: string
  /** Accent color used for the accent bar, its label and the icon. */
  accent?: KpiAccent
  /** Optional tone for the trend label. */
  trendTone?: 'up' | 'down' | 'neutral'
}

/** The accent bar's color (read by `cm.accentCard({ tone: 'custom' })` via `--mol-accent`). */
const ACCENT_VAR: Record<KpiAccent, string> = {
  primary: 'var(--color-primary)',
  secondary: 'var(--color-secondary)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  detractor: 'var(--color-danger)',
}

const ACCENT_TEXT: Record<KpiAccent, string> = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  success: 'text-success',
  warning: 'text-warning',
  detractor: 'text-danger',
}

const TREND_TEXT = {
  up: 'text-success',
  down: 'text-danger',
  neutral: 'text-on-surface-variant',
} as const

function KpiStatCard({
  label,
  value,
  trend,
  icon,
  accent = 'primary',
  trendTone = 'neutral',
}: KpiStatCardProps) {
  const cm = getClassMap()
  useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 5),
        cm.flex({ direction: 'col', gap: 3 }),
        cm.accentCard({ tone: 'custom' }),
        'bg-surface rounded-xl shadow-sm hover:-translate-y-0.5 transition-transform duration-200',
      )}
      style={{ ['--mol-accent' as string]: ACCENT_VAR[accent] }}
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
        <span className={cm.accentCardLabel({ tone: 'custom' })}>{label}</span>
        <span
          className={cm.cn('material-symbols-outlined', cm.textSize('xl'), ACCENT_TEXT[accent])}
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>
      <span
        className={cm.cn(
          cm.textSize('3xl'),
          'font-extrabold tracking-tight text-on-surface tabular-nums',
        )}
      >
        {value}
      </span>
      {trend && (
        <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), TREND_TEXT[trendTone])}>
          {trend}
        </span>
      )}
    </div>
  )
}

export default KpiStatCard
export { KpiStatCard }
