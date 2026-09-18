import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ApprovalBadge, type ApprovalStatus } from '../components/ApprovalBadge.js'
import { type ApprovalStep, ApprovalTimeline } from '../components/ApprovalTimeline.js'
import { ExpenseRow, type ExpenseRowItem } from '../components/ExpenseRow.js'

interface ReportDetail {
  id: string
  title: string
  status: ApprovalStatus
  total_amount_cents: number
  reimbursable_cents: number
  submitter_name: string
  submitter_role: string
  submitted_at: string
  policy_violation: string | null
  expenses: ExpenseRowItem[]
  timeline: ApprovalStep[]
}

const FALLBACK: ReportDetail = {
  id: 'r-2401',
  title: 'Berlin sales offsite',
  status: 'submitted',
  total_amount_cents: 234_550,
  reimbursable_cents: 220_300,
  submitter_name: 'Maya Okafor',
  submitter_role: 'Account Executive · Sales',
  submitted_at: '2026-04-21T09:14:00Z',
  policy_violation: 'One meal exceeds the daily $80 cap and requires manager justification.',
  expenses: [
    {
      id: 'e-1',
      merchant: 'Lufthansa LH 9020',
      category: 'travel',
      date: '2026-04-12T08:30:00Z',
      amountCents: 88_400,
      receiptUrl: null,
      status: 'submitted',
    },
    {
      id: 'e-2',
      merchant: 'Hotel Adlon Kempinski',
      category: 'lodging',
      date: '2026-04-13T22:00:00Z',
      amountCents: 92_500,
      receiptUrl: null,
      status: 'submitted',
    },
    {
      id: 'e-3',
      merchant: 'Restaurant Tim Raue',
      category: 'meals',
      date: '2026-04-14T20:48:00Z',
      amountCents: 18_650,
      receiptUrl: null,
      status: 'submitted',
    },
    {
      id: 'e-4',
      merchant: 'Berlin S-Bahn day pass',
      category: 'transport',
      date: '2026-04-14T07:15:00Z',
      amountCents: 950,
      receiptUrl: null,
      status: 'submitted',
    },
    {
      id: 'e-5',
      merchant: 'WeWork Friedrichstraße',
      category: 'supplies',
      date: '2026-04-15T11:00:00Z',
      amountCents: 34_050,
      receiptUrl: null,
      status: 'submitted',
    },
  ],
  timeline: [
    {
      id: 't-1',
      label: 'Drafted',
      actor: 'Maya Okafor',
      timestamp: 'Apr 18',
      state: 'completed',
    },
    {
      id: 't-2',
      label: 'Submitted for review',
      actor: 'Maya Okafor',
      timestamp: 'Apr 21',
      state: 'completed',
    },
    {
      id: 't-3',
      label: 'Manager review',
      actor: 'Sergei Volkov',
      timestamp: 'In progress',
      state: 'active',
      note: 'Review the policy violation flag before final approval.',
    },
    {
      id: 't-4',
      label: 'Finance reimbursement',
      timestamp: 'Pending',
      state: 'pending',
    },
  ],
}

const formatUsd = (cents: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function Reports() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [params] = useSearchParams()
  const reportId = params.get('id')
  const [report, setReport] = useState<ReportDetail>(FALLBACK)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // No `?id=...` query param means the user landed on /reports without
    // selecting a report. Render the fallback skeleton (showcase data)
    // instead of firing a doomed GET against the placeholder id, which
    // would log a 404 in the console even though the UI handles it.
    if (!reportId || !UUID_RE.test(reportId)) {
      setError(null)
      return
    }
    let cancelled = false
    http
      .get<ReportDetail>(`/api/reports/${encodeURIComponent(reportId)}`)
      .then((response) => {
        if (cancelled) return
        const data = response?.data
        if (
          data &&
          typeof data === 'object' &&
          Array.isArray((data as ReportDetail).expenses) &&
          Array.isArray((data as ReportDetail).timeline)
        ) {
          setReport(data as ReportDetail)
        }
        setError(null)
      })
      .catch(() => {
        if (cancelled) return
        setError('detail')
      })
    return () => {
      cancelled = true
    }
  }, [http, reportId])

  return (
    <div data-mol-id="page-reports" className={cm.stack(8)}>
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <Link
          to="/reports/list"
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'inline-flex items-center gap-1 uppercase tracking-widest text-on-surface-variant hover:text-on-surface',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_back
          </span>
          {t('reports.backToList', {}, { defaultValue: 'Back to reports' })}
        </Link>
        <div className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}>
          <div>
            <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}>
              {report.title}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              {report.submitter_name} · {report.submitter_role}
            </p>
          </div>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <ApprovalBadge status={report.status} />
            <a
              data-mol-id="report-export"
              href={`/api/reports/${encodeURIComponent(report.id)}/export.csv`}
              download={`${report.id}.csv`}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors inline-flex items-center gap-2',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                download
              </span>
              {t('common.exportCsv', {}, { defaultValue: 'Export CSV' })}
            </a>
          </div>
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
            'reports.detailFallback',
            {},
            { defaultValue: 'Live report unavailable — showing curated demo data.' },
          )}
        </div>
      ) : null}

      {report.policy_violation ? (
        <aside
          data-mol-id="policy-violation"
          className={cm.cn(
            cm.flex({ gap: 'sm', align: 'start' }),
            cm.sp('p', 4),
            'rounded-xl bg-[var(--color-status-rejected-bg)] border-l-4 border-[var(--color-status-rejected)] text-[var(--color-status-rejected-dark)]',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-xl shrink-0')} aria-hidden="true">
            warning
          </span>
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest',
              )}
            >
              {t('reports.policyTitle', {}, { defaultValue: 'Policy flag' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), cm.fontWeight('medium'))}>
              {report.policy_violation}
            </p>
          </div>
        </aside>
      ) : null}

      <section className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-6')}>
        <article
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm',
          )}
        >
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('reports.summary.total', {}, { defaultValue: 'Reported total' })}
          </p>
          <p className={cm.cn('text-3xl font-extrabold tracking-tight tabular-nums mt-2')}>
            {formatUsd(report.total_amount_cents)}
          </p>
        </article>
        <article
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm',
          )}
        >
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('reports.summary.reimbursable', {}, { defaultValue: 'Reimbursable' })}
          </p>
          <p
            className={cm.cn('text-3xl font-extrabold tracking-tight tabular-nums mt-2')}
            style={{ color: 'var(--color-status-approved)' }}
          >
            {formatUsd(report.reimbursable_cents)}
          </p>
        </article>
        <article
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm',
          )}
        >
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('reports.summary.lineCount', {}, { defaultValue: 'Line items' })}
          </p>
          <p className={cm.cn('text-3xl font-extrabold tracking-tight tabular-nums mt-2')}>
            {report.expenses.length}
          </p>
        </article>
      </section>

      <section className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-6')}>
        <div className={cm.cn('lg:col-span-2')}>
          <header
            className={cm.cn(cm.flex({ align: 'baseline', justify: 'between' }), cm.sp('mb', 4))}
          >
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
              {t('reports.lineItems', {}, { defaultValue: 'Line items' })}
            </h2>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t(
                'reports.lineItemsCount',
                { count: report.expenses.length },
                { defaultValue: '{{count}} expenses' },
              )}
            </span>
          </header>
          <div
            className={cm.cn(
              'rounded-2xl bg-surface border border-outline-variant/40 overflow-hidden divide-y divide-outline-variant/40',
            )}
          >
            {report.expenses.map((expense) => (
              <ExpenseRow key={expense.id} item={expense} />
            ))}
            {report.expenses.length === 0 ? (
              <div
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.textCenter,
                  cm.textSize('sm'),
                  'text-on-surface-variant',
                )}
              >
                {t(
                  'reports.lineItemsEmpty',
                  {},
                  { defaultValue: 'No expenses on this report yet.' },
                )}
              </div>
            ) : null}
          </div>
        </div>

        <aside className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('reports.approvalFlow', {}, { defaultValue: 'Approval flow' })}
          </h2>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm',
            )}
          >
            <ApprovalTimeline steps={report.timeline} />
          </div>
        </aside>
      </section>
    </div>
  )
}
