import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { fmtMoney } from '../lib/money.js'

export interface PayRun {
  id: string
  pay_date: string
  /** ISO 8601 string for the start of the pay period. */
  period_start?: string
  /** ISO 8601 string for the end of the pay period. */
  period_end?: string
  /** Legacy alias from /api/pay-runs (DB column name). */
  pay_period_start?: string
  /** Legacy alias from /api/pay-runs (DB column name). */
  pay_period_end?: string
  status: 'draft' | 'approved' | 'processed' | string
  total_gross: number | string
  total_net: number | string
  employee_count: number
}

interface PayRunsListProps {
  payRuns: PayRun[]
  /** When true, renders skeleton rows instead. */
  loading?: boolean
  /** Show a max number of rows (default unlimited). */
  limit?: number
  /** When provided, renders a "View all" footer linking here. */
  viewAllTo?: string
}

const STATUS_STYLES: Record<
  string,
  { strip: string; pillBg: string; pillFg: string; defaultLabel: string }
> = {
  pending: {
    strip: 'border-t-warning',
    pillBg: 'var(--mol-color-warning-light)',
    pillFg: 'var(--mol-color-warning)',
    defaultLabel: 'PENDING',
  },
  approved: {
    strip: 'border-t-warning',
    pillBg: 'var(--mol-color-warning-light)',
    pillFg: 'var(--mol-color-warning)',
    defaultLabel: 'APPROVED',
  },
  processed: {
    strip: 'border-t-primary',
    pillBg: 'var(--mol-color-info-light)',
    pillFg: 'var(--mol-color-info)',
    defaultLabel: 'PROCESSED',
  },
  draft: {
    strip: 'border-t-on-surface-variant',
    pillBg: 'var(--mol-color-border)',
    pillFg: 'var(--mol-color-text-secondary)',
    defaultLabel: 'DRAFT',
  },
  error: {
    strip: 'border-t-error',
    pillBg: 'var(--mol-color-error-light)',
    pillFg: 'var(--mol-color-error)',
    defaultLabel: 'NEEDS REVIEW',
  },
}

/**
 * Compact pay-run card list — colored top status strip, period label,
 * extrabold gross + net, employee count chip, status pill on the right.
 *
 * Translated from crm/RecentActivitiesCard pattern + DESIGN.md "Pay Run
 * Card" recipe (12px lg radii, 4px top status strip, hover shadow).
 */
export function PayRunsList({ payRuns, loading = false, limit, viewAllTo }: PayRunsListProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const rows = limit ? payRuns.slice(0, limit) : payRuns

  if (loading) {
    return (
      <div className={cm.stack(3)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={cm.cn(
              cm.sp('p', 5),
              'rounded-xl bg-surface-container-lowest border-t-4 border-t-surface-container shadow-sm animate-pulse',
            )}
          >
            <div className={cm.cn(cm.h(3), cm.w(24), 'rounded bg-surface-container')} />
            <div
              className={cm.cn(cm.sp('mt', 3), cm.h(6), cm.w(40), 'rounded bg-surface-container')}
            />
          </div>
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className={cm.cn(cm.sp('py', 10), cm.textCenter, 'text-on-surface-variant')}>
        {t(
          'payRunsList.empty',
          {},
          { defaultValue: 'No pay runs yet. Schedule your first cycle.' },
        )}
      </div>
    )
  }

  return (
    <div className={cm.stack(3)}>
      {rows.map((run) => {
        const style = STATUS_STYLES[run.status] ?? STATUS_STYLES.draft
        const dateLabel = new Date(run.pay_date).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
        const periodStart = run.period_start ?? run.pay_period_start
        const periodEnd = run.period_end ?? run.pay_period_end
        const periodLabel =
          periodStart && periodEnd
            ? `${new Date(periodStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${new Date(periodEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
            : null
        const grossNum =
          typeof run.total_gross === 'string' ? Number(run.total_gross) : run.total_gross
        const netNum = typeof run.total_net === 'string' ? Number(run.total_net) : run.total_net

        return (
          <Link
            key={run.id}
            to={`/pay-runs/${run.id}`}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'lg' }),
              cm.sp('p', 5),
              'rounded-xl bg-surface-container-lowest border-t-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all',
              style.strip,
            )}
          >
            <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0')}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t(
                  'payRunsList.payDate',
                  { date: dateLabel },
                  { defaultValue: 'Pay date · {{date}}' },
                )}
              </p>
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.sp('mt', 1),
                  cm.fontWeight('bold'),
                  'text-on-surface tabular-nums',
                )}
              >
                {fmtMoney(grossNum)}
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('ml', 2),
                    cm.fontWeight('normal'),
                    'text-on-surface-variant',
                  )}
                >
                  {t(
                    'payRunsList.netLabel',
                    { net: fmtMoney(netNum) },
                    { defaultValue: 'net {{net}}' },
                  )}
                </span>
              </p>
              {periodLabel ? (
                <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                  {t(
                    'payRunsList.period',
                    { period: periodLabel },
                    { defaultValue: 'Period {{period}}' },
                  )}
                </p>
              ) : null}
            </div>

            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'shrink-0')}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  cm.roundedFull,
                  'bg-surface-container text-on-surface-variant',
                )}
              >
                <span className={cm.cn(`material-symbols-outlined text-sm`)} aria-hidden="true">
                  group
                </span>
                {t(
                  'payRunsList.employeeCount',
                  { count: run.employee_count },
                  { defaultValue: '{{count}}' },
                )}
              </span>
              <span
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'uppercase tracking-widest',
                )}
                style={{ backgroundColor: style.pillBg, color: style.pillFg }}
              >
                {t(`payRunsList.status.${run.status}`, {}, { defaultValue: style.defaultLabel })}
              </span>
              <span
                className="material-symbols-outlined text-on-surface-variant"
                aria-hidden="true"
              >
                chevron_right
              </span>
            </div>
          </Link>
        )
      })}

      {viewAllTo ? (
        <Link
          to={viewAllTo}
          className={cm.cn(
            cm.sp('mt', 2),
            cm.sp('py', 4),
            cm.textCenter,
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'block text-on-surface-variant hover:text-primary transition-colors',
          )}
        >
          {t('payRunsList.viewAll', {}, { defaultValue: 'View all pay runs →' })}
        </Link>
      ) : null}
    </div>
  )
}
