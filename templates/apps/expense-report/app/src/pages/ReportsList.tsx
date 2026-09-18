import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ApprovalBadge, type ApprovalStatus } from '../components/ApprovalBadge.js'

interface ReportSummary {
  id: string
  title: string
  status: ApprovalStatus
  total_amount_cents: number
  reimbursable_cents: number
  expense_count: number
  submitter_name: string
  submitted_at: string
  date_range: string
}

const FALLBACK: ReportSummary[] = [
  {
    id: 'r-2401',
    title: 'Berlin sales offsite',
    status: 'submitted',
    total_amount_cents: 234_550,
    reimbursable_cents: 220_300,
    expense_count: 5,
    submitter_name: 'Maya Okafor',
    submitted_at: '2026-04-21T09:14:00Z',
    date_range: 'Apr 12 – Apr 16',
  },
  {
    id: 'r-2399',
    title: 'Q2 client dinners',
    status: 'approved',
    total_amount_cents: 89_120,
    reimbursable_cents: 89_120,
    expense_count: 4,
    submitter_name: 'Henry Liang',
    submitted_at: '2026-04-19T18:02:00Z',
    date_range: 'Apr 02 – Apr 18',
  },
  {
    id: 'r-2398',
    title: 'NYC product summit',
    status: 'reimbursed',
    total_amount_cents: 412_000,
    reimbursable_cents: 412_000,
    expense_count: 12,
    submitter_name: 'Avery Cole',
    submitted_at: '2026-04-15T13:26:00Z',
    date_range: 'Mar 24 – Apr 01',
  },
  {
    id: 'r-2392',
    title: 'March software stack',
    status: 'rejected',
    total_amount_cents: 67_400,
    reimbursable_cents: 0,
    expense_count: 3,
    submitter_name: 'Jordan Reyes',
    submitted_at: '2026-04-08T10:48:00Z',
    date_range: 'Mar 01 – Mar 31',
  },
  {
    id: 'r-2380',
    title: 'February travel — APAC',
    status: 'reimbursed',
    total_amount_cents: 612_400,
    reimbursable_cents: 612_400,
    expense_count: 21,
    submitter_name: 'Maya Okafor',
    submitted_at: '2026-03-04T08:00:00Z',
    date_range: 'Feb 14 – Feb 26',
  },
]

const STATUS_FILTERS: Array<{ key: 'all' | ApprovalStatus; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Drafts' },
  { key: 'submitted', label: 'In review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'reimbursed', label: 'Reimbursed' },
]

const formatUsd = (cents: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100)

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

export function ReportsList() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [reports, setReports] = useState<ReportSummary[]>(FALLBACK)
  const [filter, setFilter] = useState<'all' | ApprovalStatus>('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<ReportSummary[]>('/api/reports')
      .then((response) => {
        if (cancelled) return
        const data = response?.data
        if (Array.isArray(data) && data.length > 0) setReports(data)
        setError(null)
      })
      .catch(() => {
        if (cancelled) return
        setError('list')
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const filtered = useMemo(
    () => (filter === 'all' ? reports : reports.filter((r) => r.status === filter)),
    [reports, filter],
  )

  return (
    <div data-mol-id="page-reports-list" className={cm.stack(8)}>
      <header className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('reportsList.eyebrow', {}, { defaultValue: 'All reports' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), cm.sp('mt', 1), 'font-extrabold tracking-tight')}
          >
            {t('reportsList.title', {}, { defaultValue: 'Report library' })}
          </h1>
        </div>
        <Link
          to="/reports/new"
          data-mol-id="btn-new-report"
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
            add
          </span>
          {t('reportsList.newReport', {}, { defaultValue: 'New report' })}
        </Link>
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
            'reportsList.listFallback',
            {},
            { defaultValue: 'Live list unavailable — showing curated demo data.' },
          )}
        </div>
      ) : null}

      <ul
        className={cm.cn(
          cm.flex({ wrap: 'wrap', gap: 'xs' }),
          cm.sp('p', 1),
          'rounded-full bg-surface-container-low w-fit',
        )}
      >
        {STATUS_FILTERS.map((s) => {
          const active = filter === s.key
          return (
            <li key={s.key}>
              <button
                type="button"
                data-mol-id={`filter-${s.key}`}
                onClick={() => setFilter(s.key)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'rounded-full uppercase tracking-widest transition-colors',
                  active ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant',
                )}
              >
                {t(`reportsList.filter.${s.key}`, {}, { defaultValue: s.label })}
              </button>
            </li>
          )
        })}
      </ul>

      <section className={cm.cn('grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4')}>
        {filtered.map((report) => {
          const accent =
            report.status === 'approved'
              ? 'var(--color-status-approved)'
              : report.status === 'rejected'
                ? 'var(--color-status-rejected)'
                : report.status === 'reimbursed'
                  ? 'var(--color-status-reimbursed)'
                  : report.status === 'submitted'
                    ? 'var(--color-status-pending)'
                    : 'var(--color-text-muted)'
          return (
            <Link
              key={report.id}
              to={`/reports?id=${encodeURIComponent(report.id)}`}
              data-mol-id={`report-card-${report.id}`}
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'sm' }),
                cm.sp('p', 5),
                'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all',
              )}
              style={{ borderLeft: `4px solid ${accent}` }}
            >
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {report.id}
                </span>
                <ApprovalBadge status={report.status} />
              </div>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{report.title}</h2>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {report.submitter_name} · {report.date_range}
              </p>
              <div
                className={cm.cn(
                  cm.flex({ align: 'baseline', justify: 'between' }),
                  cm.sp('mt', 2),
                )}
              >
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(
                    'reportsList.lineItems',
                    { count: report.expense_count },
                    { defaultValue: '{{count}} expenses' },
                  )}
                </span>
                <span className={cm.cn('text-xl font-extrabold tabular-nums tracking-tight')}>
                  {formatUsd(report.total_amount_cents)}
                </span>
              </div>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'reportsList.submittedOn',
                  { date: formatDate(report.submitted_at) },
                  { defaultValue: 'Submitted {{date}}' },
                )}
              </p>
            </Link>
          )
        })}
        {filtered.length === 0 ? (
          <div
            className={cm.cn(
              cm.sp('p', 8),
              cm.textCenter,
              cm.textSize('sm'),
              'col-span-full text-on-surface-variant',
            )}
          >
            {t('reportsList.empty', {}, { defaultValue: 'No reports match the selected filter.' })}
          </div>
        ) : null}
      </section>
    </div>
  )
}
