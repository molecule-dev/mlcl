import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ApprovalBadge, type ApprovalStatus } from '../components/ApprovalBadge.js'
import { RecoveredAmountHeroCard } from '../components/RecoveredAmountHeroCard.js'
import { StatusKpiCard } from '../components/StatusKpiCard.js'

interface DashboardReport {
  id: string
  title: string
  status: ApprovalStatus
  total_amount_cents: number
  submitter_name: string
  submitted_at: string
}

interface DashboardSnapshot {
  recovered_cents: number
  recovered_change_cents: number
  pending_count: number
  approved_this_month: number
  rejected_this_month: number
  reimbursed_this_month_cents: number
  awaiting_receipts: number
  recent_reports: DashboardReport[]
}

const FALLBACK: DashboardSnapshot = {
  recovered_cents: 4_829_050,
  recovered_change_cents: 124_000,
  pending_count: 6,
  approved_this_month: 23,
  rejected_this_month: 2,
  reimbursed_this_month_cents: 1_184_500,
  awaiting_receipts: 4,
  recent_reports: [
    {
      id: 'r-2401',
      title: 'Berlin sales offsite',
      status: 'submitted',
      total_amount_cents: 234_550,
      submitter_name: 'Maya Okafor',
      submitted_at: '2026-04-21T09:14:00Z',
    },
    {
      id: 'r-2399',
      title: 'Q2 client dinners',
      status: 'approved',
      total_amount_cents: 89_120,
      submitter_name: 'Henry Liang',
      submitted_at: '2026-04-19T18:02:00Z',
    },
    {
      id: 'r-2398',
      title: 'NYC product summit',
      status: 'reimbursed',
      total_amount_cents: 412_000,
      submitter_name: 'Avery Cole',
      submitted_at: '2026-04-15T13:26:00Z',
    },
    {
      id: 'r-2392',
      title: 'March software stack',
      status: 'rejected',
      total_amount_cents: 67_400,
      submitter_name: 'Jordan Reyes',
      submitted_at: '2026-04-08T10:48:00Z',
    },
  ],
}

const formatUsd = (cents: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100)

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(FALLBACK)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<DashboardSnapshot>('/api/dashboard/summary')
      .then((response) => {
        if (cancelled) return
        const data = response?.data
        if (
          data &&
          typeof data === 'object' &&
          Array.isArray((data as DashboardSnapshot).recent_reports)
        ) {
          setSnapshot(data as DashboardSnapshot)
        }
        setError(null)
      })
      .catch(() => {
        if (cancelled) return
        // Keep FALLBACK fixture while showing a soft error banner.
        setError('summary')
      })
    return () => {
      cancelled = true
    }
  }, [http])

  return (
    <div data-mol-id="page-dashboard" className={cm.stack(8)}>
      <header className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('dashboard.eyebrow', {}, { defaultValue: 'Today, at a glance' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), cm.sp('mt', 1), 'font-extrabold tracking-tight')}
          >
            {t('dashboard.title', {}, { defaultValue: 'Reimbursement workspace' })}
          </h1>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <Link
            to="/expenses/new"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors inline-flex items-center gap-2',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              add
            </span>
            {t('dashboard.addExpense', {}, { defaultValue: 'New expense' })}
          </Link>
          <Link
            to="/reports/new"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-full text-white inline-flex items-center gap-2 transition-colors shadow-sm',
            )}
            style={{
              background:
                'linear-gradient(135deg, var(--color-primary-hover), var(--color-gradient-end))',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              description
            </span>
            {t('dashboard.newReport', {}, { defaultValue: 'New report' })}
          </Link>
        </div>
      </header>

      {error ? (
        <div
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-xl bg-warning-container/40 text-on-warning-container',
          )}
        >
          {t(
            'dashboard.summaryFallback',
            {},
            {
              defaultValue: 'Live summary unavailable — showing curated demo data.',
            },
          )}
        </div>
      ) : null}

      <RecoveredAmountHeroCard
        amountCents={snapshot.recovered_cents}
        changeCents={snapshot.recovered_change_cents}
        pendingCount={snapshot.pending_count}
      />

      <section
        data-mol-id="dashboard-kpis"
        className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4')}
      >
        <StatusKpiCard
          label={t('dashboard.kpi.pendingLabel', {}, { defaultValue: 'Pending review' })}
          value={String(snapshot.pending_count)}
          icon="schedule"
          tone="pending"
          delta={t('dashboard.kpi.pendingDelta', {}, { defaultValue: '+2 this week' })}
          deltaPositive={false}
        />
        <StatusKpiCard
          label={t('dashboard.kpi.approvedLabel', {}, { defaultValue: 'Approved · MTD' })}
          value={String(snapshot.approved_this_month)}
          icon="check_circle"
          tone="approved"
          delta={t('dashboard.kpi.approvedDelta', {}, { defaultValue: '+18%' })}
        />
        <StatusKpiCard
          label={t('dashboard.kpi.reimbursedLabel', {}, { defaultValue: 'Reimbursed · MTD' })}
          value={formatUsd(snapshot.reimbursed_this_month_cents)}
          icon="paid"
          tone="reimbursed"
          delta={t('dashboard.kpi.reimbursedDelta', {}, { defaultValue: '+$2.4k' })}
        />
        <StatusKpiCard
          label={t('dashboard.kpi.receiptsLabel', {}, { defaultValue: 'Awaiting receipts' })}
          value={String(snapshot.awaiting_receipts)}
          icon="warning"
          tone="rejected"
          delta={t('dashboard.kpi.receiptsDelta', {}, { defaultValue: 'Action required' })}
          deltaPositive={false}
        />
      </section>

      <section data-mol-id="dashboard-recent" className={cm.stack(4)}>
        <header className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('dashboard.recent.title', {}, { defaultValue: 'Recent reports' })}
          </h2>
          <Link
            to="/reports/list"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-primary-dark hover:underline',
            )}
          >
            {t('dashboard.recent.viewAll', {}, { defaultValue: 'View all reports' })}
          </Link>
        </header>
        <div
          className={cm.cn(
            'rounded-2xl bg-surface border border-outline-variant/40 overflow-hidden',
          )}
        >
          <ul className={cm.cn('divide-y divide-outline-variant/40')}>
            {snapshot.recent_reports.map((report) => (
              <li
                key={report.id}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('px', 5),
                  cm.sp('py', 4),
                  'hover:bg-surface-container-low transition-colors',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-9 w-9 shrink-0 rounded-lg bg-primary-container text-on-primary-container',
                  )}
                  aria-hidden="true"
                >
                  <span className={cm.cn('material-symbols-outlined text-base')}>description</span>
                </div>
                <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0')}>
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'text-on-surface truncate',
                    )}
                  >
                    {report.title}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {report.submitter_name} · {formatDate(report.submitted_at)}
                  </span>
                </div>
                <ApprovalBadge status={report.status} />
                <span
                  className={cm.cn(
                    'text-base font-bold tabular-nums text-on-surface tracking-tight',
                  )}
                >
                  {formatUsd(report.total_amount_cents)}
                </span>
              </li>
            ))}
          </ul>
          {snapshot.recent_reports.length === 0 ? (
            <div
              className={cm.cn(
                cm.sp('p', 6),
                cm.textCenter,
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              {t(
                'dashboard.recent.empty',
                {},
                { defaultValue: 'No reports yet — start your first one above.' },
              )}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
