import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ApprovalBadge } from '../components/ApprovalBadge.js'
import { ListSkeleton } from '../components/ListSkeleton.js'
import { StatusKpiCard } from '../components/StatusKpiCard.js'

interface ApprovalQueueItem {
  id: string
  title: string
  submitter_name: string
  submitter_role: string
  total_amount_cents: number
  submitted_at: string
  policy_violation: string | null
  expense_count: number
}

const FALLBACK: ApprovalQueueItem[] = [
  {
    id: 'r-2401',
    title: 'Berlin sales offsite',
    submitter_name: 'Maya Okafor',
    submitter_role: 'Account Executive',
    total_amount_cents: 234_550,
    submitted_at: '2026-04-21T09:14:00Z',
    policy_violation: 'Daily meal cap exceeded by $24.30',
    expense_count: 5,
  },
  {
    id: 'r-2400',
    title: 'Vendor lunch — Stripe',
    submitter_name: 'Henry Liang',
    submitter_role: 'Product Manager',
    total_amount_cents: 18_650,
    submitted_at: '2026-04-20T19:48:00Z',
    policy_violation: null,
    expense_count: 1,
  },
  {
    id: 'r-2398',
    title: 'NYC product summit',
    submitter_name: 'Avery Cole',
    submitter_role: 'Engineering Manager',
    total_amount_cents: 412_000,
    submitted_at: '2026-04-15T13:26:00Z',
    policy_violation: null,
    expense_count: 12,
  },
  {
    id: 'r-2395',
    title: 'Annual SaaS renewals',
    submitter_name: 'Jordan Reyes',
    submitter_role: 'Operations',
    total_amount_cents: 67_400,
    submitted_at: '2026-04-08T10:48:00Z',
    policy_violation: 'Receipt missing for $42.50 line item',
    expense_count: 3,
  },
]

const formatUsd = (cents: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100)

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export function Approvals() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [pending, setPending] = useState<ApprovalQueueItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<ApprovalQueueItem[]>('/api/approvals/pending')
      .then((response) => {
        if (cancelled) return
        const data = response?.data
        // Accept an empty queue too — a cleared queue must show the empty
        // state, not the curated fallback rows.
        setPending(Array.isArray(data) ? data : FALLBACK)
        setError(null)
      })
      .catch(() => {
        if (cancelled) return
        setPending(FALLBACK)
        setError('queue')
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const queue = pending ?? []
  const totalPendingCents = queue.reduce((sum, item) => sum + item.total_amount_cents, 0)
  const flaggedCount = queue.filter((p) => p.policy_violation !== null).length

  async function handleApprove(id: string): Promise<void> {
    setBusyId(id)
    setError(null)
    try {
      await http.post(`/api/approvals/${encodeURIComponent(id)}/approve`, {})
      // Domain analytics: a manager decision.
      void track({
        name: 'report.approved',
        properties: {
          report_id: id,
          amount_cents: queue.find((r) => r.id === id)?.total_amount_cents,
        },
      })
      setPending((prev) => (prev ?? []).filter((item) => item.id !== id))
    } catch (err) {
      console.warn('Approve failed', err)
      setError('approve')
    } finally {
      setBusyId(null)
    }
  }

  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  function beginReject(id: string): void {
    setRejectingId(id)
    setRejectReason('')
  }

  function cancelReject(): void {
    setRejectingId(null)
    setRejectReason('')
  }

  async function handleReject(id: string): Promise<void> {
    const trimmed = rejectReason.trim()
    if (!trimmed) return
    setBusyId(id)
    setError(null)
    try {
      await http.post(`/api/approvals/${encodeURIComponent(id)}/reject`, {
        reason: trimmed,
      })
      // Domain analytics: a manager decision (with the reason, no PII).
      void track({
        name: 'report.rejected',
        properties: { report_id: id },
      })
      setPending((prev) => (prev ?? []).filter((item) => item.id !== id))
      cancelReject()
    } catch (err) {
      console.warn('Reject failed', err)
      setError('reject')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div data-mol-id="page-approvals" className={cm.stack(8)}>
      <header className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('approvals.eyebrow', {}, { defaultValue: 'Manager queue' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), cm.sp('mt', 1), 'font-extrabold tracking-tight')}
          >
            {t('approvals.title', {}, { defaultValue: 'Pending approvals' })}
          </h1>
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
            'approvals.queueFallback',
            {},
            { defaultValue: 'Live queue unavailable — showing curated demo data.' },
          )}
        </div>
      ) : null}

      <section className={cm.cn('grid grid-cols-1 sm:grid-cols-3 gap-4')}>
        <StatusKpiCard
          label={t('approvals.kpi.queueLabel', {}, { defaultValue: 'Awaiting review' })}
          value={String(queue.length)}
          icon="schedule"
          tone="pending"
        />
        <StatusKpiCard
          label={t('approvals.kpi.totalLabel', {}, { defaultValue: 'Pending value' })}
          value={formatUsd(totalPendingCents)}
          icon="payments"
          tone="reimbursed"
        />
        <StatusKpiCard
          label={t('approvals.kpi.flaggedLabel', {}, { defaultValue: 'Policy flagged' })}
          value={String(flaggedCount)}
          icon="flag"
          tone="rejected"
          deltaPositive={false}
        />
      </section>

      <section
        data-mol-id="approval-queue"
        className={cm.cn('rounded-2xl bg-surface border border-outline-variant/40 overflow-hidden')}
      >
        {pending === null ? (
          <ListSkeleton rows={3} />
        ) : (
          <ul className={cm.cn('divide-y divide-outline-variant/40')}>
            {pending.map((item) => (
              <li
                key={item.id}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('px', 5),
                  cm.sp('py', 4),
                  'hover:bg-surface-container-low transition-colors max-md:flex-col max-md:items-stretch',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-10 w-10 shrink-0 rounded-xl bg-primary-container text-on-primary-container',
                  )}
                  aria-hidden="true"
                >
                  <span className={cm.cn('material-symbols-outlined text-base')}>approval</span>
                </div>

                <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0')}>
                  <Link
                    to={`/reports?id=${encodeURIComponent(item.id)}`}
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('bold'),
                      'text-on-surface truncate hover:underline',
                    )}
                  >
                    {item.title}
                  </Link>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {item.submitter_name} · {item.submitter_role} · {formatDate(item.submitted_at)}{' '}
                    ·{' '}
                    {t(
                      'approvals.lineCount',
                      { count: item.expense_count },
                      { defaultValue: '{{count}} expenses' },
                    )}
                  </span>
                  {item.policy_violation ? (
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        cm.sp('mt', 1),
                        'inline-flex items-center gap-1 text-[var(--color-status-rejected)]',
                      )}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-[14px]')}
                        aria-hidden="true"
                      >
                        flag
                      </span>
                      {item.policy_violation}
                    </span>
                  ) : null}
                </div>

                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    'max-md:w-full max-md:justify-between max-md:items-center',
                  )}
                >
                  <span
                    className={cm.cn(
                      'text-base font-bold tabular-nums text-on-surface tracking-tight whitespace-nowrap',
                    )}
                  >
                    {formatUsd(item.total_amount_cents)}
                  </span>

                  <div className={cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' })}>
                    {rejectingId === item.id ? (
                      <>
                        <input
                          data-mol-id={`reject-reason-${item.id}`}
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              void handleReject(item.id)
                            } else if (e.key === 'Escape') {
                              cancelReject()
                            }
                          }}
                          placeholder={t(
                            'approvals.rejectPlaceholder',
                            {},
                            { defaultValue: 'Reason (required)' },
                          )}
                          aria-label={t(
                            'approvals.rejectPrompt',
                            {},
                            { defaultValue: 'Why are you rejecting this report?' },
                          )}
                          className={cm.cn(
                            cm.sp('px', 3),
                            cm.sp('py', 2),
                            cm.textSize('xs'),
                            'rounded-full bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none w-44',
                          )}
                        />
                        <button
                          type="button"
                          data-mol-id={`btn-confirm-reject-${item.id}`}
                          disabled={busyId === item.id || !rejectReason.trim()}
                          onClick={() => void handleReject(item.id)}
                          className={cm.cn(
                            cm.sp('px', 3),
                            'py-2.5',
                            cm.textSize('xs'),
                            cm.fontWeight('semibold'),
                            'rounded-full text-white transition-colors disabled:opacity-60',
                          )}
                          style={{ background: 'var(--color-status-rejected)' }}
                        >
                          {busyId === item.id
                            ? t('approvals.rejecting', {}, { defaultValue: 'Rejecting…' })
                            : t('approvals.confirmReject', {}, { defaultValue: 'Confirm reject' })}
                        </button>
                        <button
                          type="button"
                          data-mol-id={`btn-cancel-reject-${item.id}`}
                          disabled={busyId === item.id}
                          onClick={cancelReject}
                          className={cm.cn(
                            cm.sp('px', 3),
                            'py-2.5',
                            cm.textSize('xs'),
                            cm.fontWeight('semibold'),
                            'rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors',
                          )}
                        >
                          {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          to={`/reports?id=${encodeURIComponent(item.id)}`}
                          data-mol-id={`btn-review-${item.id}`}
                          className={cm.cn(
                            cm.sp('px', 3),
                            'py-2.5',
                            cm.textSize('xs'),
                            cm.fontWeight('semibold'),
                            'rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors',
                          )}
                        >
                          {t('approvals.review', {}, { defaultValue: 'Review' })}
                        </Link>
                        <button
                          type="button"
                          data-mol-id={`btn-reject-${item.id}`}
                          disabled={busyId === item.id}
                          onClick={() => beginReject(item.id)}
                          className={cm.cn(
                            cm.sp('px', 3),
                            'py-2.5',
                            cm.textSize('xs'),
                            cm.fontWeight('semibold'),
                            'rounded-full text-white transition-colors disabled:opacity-60',
                          )}
                          style={{ background: 'var(--color-status-rejected)' }}
                        >
                          {t('approvals.reject', {}, { defaultValue: 'Reject' })}
                        </button>
                        <button
                          type="button"
                          data-mol-id={`btn-approve-${item.id}`}
                          disabled={busyId === item.id}
                          onClick={() => void handleApprove(item.id)}
                          className={cm.cn(
                            cm.sp('px', 3),
                            'py-2.5',
                            cm.textSize('xs'),
                            cm.fontWeight('semibold'),
                            'rounded-full text-white transition-colors disabled:opacity-60',
                          )}
                          style={{ background: 'var(--color-status-approved)' }}
                        >
                          {busyId === item.id
                            ? t('approvals.approving', {}, { defaultValue: 'Approving…' })
                            : t('approvals.approve', {}, { defaultValue: 'Approve' })}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {pending !== null && pending.length === 0 ? (
          <div
            className={cm.cn(
              cm.sp('p', 8),
              cm.textCenter,
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            <ApprovalBadge status="approved" className={cm.cn('mx-auto mb-3')} />
            {t(
              'approvals.empty',
              {},
              { defaultValue: "You're all caught up — no reports waiting." },
            )}
          </div>
        ) : null}
      </section>
    </div>
  )
}
