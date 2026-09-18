import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * KPI summary card — uppercase 10px label, large extrabold tabular value,
 * left status accent stripe, sparkline placeholder.
 *
 * Translated from crm/KpiCard.tsx — adapted to use Recoup's status palette
 * (approved/pending/rejected/reimbursed) for the left border accent so a
 * row of KPIs visually communicates the workflow state at a glance.
 */
export type StatusTone = 'approved' | 'pending' | 'rejected' | 'reimbursed' | 'neutral'

export interface StatusKpiCardProps {
  label: string
  value: string
  delta?: string
  deltaPositive?: boolean
  tone?: StatusTone
  icon?: string
}

const TONE_BORDER: Record<StatusTone, string> = {
  approved: 'border-l-[var(--color-status-approved)]',
  pending: 'border-l-[var(--color-status-pending)]',
  rejected: 'border-l-[var(--color-status-rejected)]',
  reimbursed: 'border-l-[var(--color-status-reimbursed)]',
  neutral: 'border-l-primary',
}

const TONE_ICON_BG: Record<StatusTone, string> = {
  approved: 'bg-[var(--color-status-approved-bg)] text-[var(--color-status-approved)]',
  pending: 'bg-[var(--color-status-pending-bg)] text-[var(--color-status-pending)]',
  rejected: 'bg-[var(--color-status-rejected-bg)] text-[var(--color-status-rejected)]',
  reimbursed: 'bg-[var(--color-secondary-light)] text-[var(--color-status-reimbursed)]',
  neutral: 'bg-primary-container text-on-primary-container',
}

export function StatusKpiCard({
  label,
  value,
  delta,
  deltaPositive = true,
  tone = 'neutral',
  icon,
}: StatusKpiCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <article
      data-mol-id={`kpi-${tone}`}
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('p', 5),
        'rounded-2xl bg-surface border-l-4 shadow-sm hover:-translate-y-0.5 transition-transform',
        TONE_BORDER[tone],
      )}
    >
      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {label}
        </span>
        {icon ? (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-8 w-8 rounded-lg',
              TONE_ICON_BG[tone],
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              {icon}
            </span>
          </span>
        ) : null}
      </div>
      <div className={cm.cn(cm.sp('mt', 3), cm.flex({ align: 'baseline', gap: 'sm' }))}>
        <span
          className={cm.cn('text-3xl font-extrabold tracking-tight tabular-nums text-on-surface')}
        >
          {value}
        </span>
        {delta ? (
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('px', 2),
              cm.sp('py', 0),
              'rounded-full',
              deltaPositive
                ? 'bg-[var(--color-status-approved-bg)] text-[var(--color-status-approved)]'
                : 'bg-[var(--color-status-rejected-bg)] text-[var(--color-status-rejected)]',
            )}
          >
            {delta}
          </span>
        ) : null}
      </div>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.sp('mt', 2),
          cm.fontWeight('medium'),
          'text-on-surface-variant',
        )}
      >
        {t('statusKpiCard.footnote', {}, { defaultValue: 'Tracked against current period' })}
      </p>
    </article>
  )
}

export default StatusKpiCard
