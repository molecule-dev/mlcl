/**
 * KPI card with left-border accent + uppercase 10px label, large value
 * font-extrabold, optional supporting trend pill. Used in 3-up triads
 * on Inbox + Reports.
 *
 * Translated from personal-finance DashboardAccountOverview cell with
 * the catalog "KPI cards" recipe (border-l-4 accent, hover lift).
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type KpiAccent = 'primary' | 'success' | 'warning' | 'urgent' | 'bot'

interface KpiStatCardProps {
  label: string
  value: string
  /** Optional pre-formatted trend (e.g. "+8% vs last week"). */
  trend?: string
  /** Material symbol icon name. */
  icon: string
  /** Accent color used for the left border + icon. */
  accent?: KpiAccent
  /** Optional tone for the trend label. */
  trendTone?: 'up' | 'down' | 'neutral'
}

const ACCENT_BORDER: Record<KpiAccent, string> = {
  primary: 'border-primary',
  success: 'border-success',
  warning: 'border-warning',
  urgent: 'border-error',
  bot: 'border-[var(--color-bot-accent)]',
}

const ACCENT_TEXT: Record<KpiAccent, string> = {
  primary: 'text-primary-dark',
  success: 'text-success',
  warning: 'text-warning',
  urgent: 'text-error',
  bot: 'text-[var(--color-bot-accent)]',
}

const TREND_TEXT = {
  up: 'text-success',
  down: 'text-error',
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
        'bg-surface-container-lowest rounded-xl shadow-sm border-l-4 hover:-translate-y-0.5 transition-transform duration-200',
        ACCENT_BORDER[accent],
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {label}
        </span>
        <span
          className={cm.cn('material-symbols-outlined', cm.textSize('xl'), ACCENT_TEXT[accent])}
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
