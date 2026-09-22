import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ExpenseRow, type ExpenseRowItem } from '../components/ExpenseRow.js'
import { ListSkeleton } from '../components/ListSkeleton.js'

const FALLBACK_AVAILABLE: ExpenseRowItem[] = [
  {
    id: 'e-100',
    merchant: 'Lufthansa LH 9020',
    category: 'travel',
    date: '2026-04-12T08:30:00Z',
    amountCents: 88_400,
    receiptUrl: null,
  },
  {
    id: 'e-101',
    merchant: 'Hotel Adlon Kempinski',
    category: 'lodging',
    date: '2026-04-13T22:00:00Z',
    amountCents: 92_500,
    receiptUrl: null,
  },
  {
    id: 'e-102',
    merchant: 'Restaurant Tim Raue',
    category: 'meals',
    date: '2026-04-14T20:48:00Z',
    amountCents: 18_650,
    receiptUrl: null,
  },
  {
    id: 'e-103',
    merchant: 'Berlin S-Bahn day pass',
    category: 'transport',
    date: '2026-04-14T07:15:00Z',
    amountCents: 950,
    receiptUrl: null,
  },
  {
    id: 'e-104',
    merchant: 'WeWork Friedrichstraße',
    category: 'supplies',
    date: '2026-04-15T11:00:00Z',
    amountCents: 34_050,
    receiptUrl: null,
  },
]

const formatUsd = (cents: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100)

export function NewReport() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [purpose, setPurpose] = useState('')
  const [approverEmail, setApproverEmail] = useState('')
  const [available, setAvailable] = useState<ExpenseRowItem[] | null>(null)
  const [included, setIncluded] = useState<Set<string>>(() => new Set())
  const [submitting, setSubmitting] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    http
      .get<ExpenseRowItem[]>('/api/expenses?status=draft')
      .then((response) => {
        if (cancelled) return
        const data = response?.data
        // An empty draft list is a valid result — the picker just renders
        // zero rows; the curated fallback is only for load failures.
        const drafts = Array.isArray(data) ? data : FALLBACK_AVAILABLE
        setAvailable(drafts)
        // Pre-select up to 3 items so the user sees a populated total.
        setIncluded(new Set(drafts.slice(0, 3).map((e) => e.id)))
        setLoadError(!Array.isArray(data))
      })
      .catch(() => {
        if (cancelled) return
        setAvailable(FALLBACK_AVAILABLE)
        setIncluded(new Set(FALLBACK_AVAILABLE.slice(0, 3).map((e) => e.id)))
        setLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const totalCents = useMemo(
    () =>
      (available ?? [])
        .filter((expense) => included.has(expense.id))
        .reduce((sum, expense) => sum + expense.amountCents, 0),
    [available, included],
  )

  function toggleInclude(id: string): void {
    setIncluded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function createReport(): Promise<{ id: string } | null> {
    const created = await http.post<{ id?: string }>('/api/reports', {
      title,
      purpose,
      description: purpose,
      approver_email: approverEmail || undefined,
      expense_ids: [...included],
    })
    const id = created?.data?.id
    return id ? { id } : null
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const created = await createReport()
      if (!created) {
        setError(
          t(
            'newReport.createFailed',
            {},
            {
              defaultValue: 'Could not create report. Please try again.',
            },
          ),
        )
        return
      }
      // Submit immediately for approval — this transitions status from
      // 'draft' to 'submitted', emails the approver, and drops a
      // notification onto the user's activity feed.
      await http.post(`/api/reports/${encodeURIComponent(created.id)}/submit`, {
        approver_email: approverEmail || undefined,
      })
      // Domain analytics: the core conversion — a report sent for approval.
      void track({
        name: 'report.submitted',
        properties: {
          report_id: created.id,
          expense_count: included.size,
          total_amount_cents: totalCents,
          has_approver_email: Boolean(approverEmail),
        },
      })
      navigate('/reports/list')
    } catch (err) {
      console.warn('Submit report failed', err)
      setError(
        t(
          'newReport.submitFailed',
          {},
          {
            defaultValue: 'Could not submit report. Please try again.',
          },
        ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSaveDraft(): Promise<void> {
    setSavingDraft(true)
    setError(null)
    try {
      const created = await createReport()
      if (!created) {
        setError(
          t(
            'newReport.createFailed',
            {},
            {
              defaultValue: 'Could not create report. Please try again.',
            },
          ),
        )
        return
      }
      // Domain analytics: a report parked as a draft.
      void track({
        name: 'report.created',
        properties: {
          report_id: created.id,
          expense_count: included.size,
          total_amount_cents: totalCents,
        },
      })
      navigate('/reports/list')
    } catch (err) {
      console.warn('Save draft failed', err)
      setError(
        t(
          'newReport.saveDraftFailed',
          {},
          {
            defaultValue: 'Could not save draft. Please try again.',
          },
        ),
      )
    } finally {
      setSavingDraft(false)
    }
  }

  return (
    <div data-mol-id="page-new-report" className={cm.stack(8)}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('newReport.eyebrow', {}, { defaultValue: 'Group expenses · submit for approval' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.sp('mt', 1), 'font-extrabold tracking-tight')}>
          {t('newReport.title', {}, { defaultValue: 'New expense report' })}
        </h1>
      </header>

      {error ? (
        <div
          data-mol-id="new-report-error"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-xl bg-error-container/40 text-on-error-container',
          )}
        >
          {error}
        </div>
      ) : null}

      {loadError ? (
        <div
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-xl bg-warning-container/40 text-on-warning-container',
          )}
        >
          {t(
            'newReport.draftsFallback',
            {},
            { defaultValue: 'Live expense list unavailable — showing curated demo data.' },
          )}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        data-mol-id="form-new-report"
        className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-6')}
      >
        <section className={cm.cn('lg:col-span-2 space-y-6')}>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm space-y-5',
            )}
          >
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <label
                htmlFor="title"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('newReport.titleLabel', {}, { defaultValue: 'Report title' })}
              </label>
              <input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder={t(
                  'newReport.titlePlaceholder',
                  {},
                  { defaultValue: 'Berlin sales offsite' },
                )}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
                )}
              />
            </div>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <label
                htmlFor="purpose"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('newReport.purposeLabel', {}, { defaultValue: 'Business purpose' })}
              </label>
              <textarea
                id="purpose"
                rows={3}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder={t(
                  'newReport.purposePlaceholder',
                  {},
                  {
                    defaultValue:
                      'Describe the trip or project these expenses relate to (visible to your approver and finance).',
                  },
                )}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none',
                )}
              />
            </div>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <label
                htmlFor="approver"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('newReport.approverLabel', {}, { defaultValue: 'Approver email (optional)' })}
              </label>
              <input
                id="approver"
                type="email"
                value={approverEmail}
                onChange={(e) => setApproverEmail(e.target.value)}
                placeholder={t(
                  'newReport.approverPlaceholder',
                  {},
                  { defaultValue: 'manager@yourcompany.com' },
                )}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
                )}
              />
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'newReport.approverHint',
                  {},
                  {
                    defaultValue:
                      'They will receive an email when you submit this report for review.',
                  },
                )}
              </p>
            </div>
          </div>

          <div
            className={cm.cn(
              'rounded-2xl bg-surface border border-outline-variant/40 overflow-hidden',
            )}
          >
            <header
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('px', 5),
                cm.sp('py', 4),
                'border-b border-outline-variant/40 bg-surface-container-low',
              )}
            >
              <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                {t('newReport.availableExpenses', {}, { defaultValue: 'Available expenses' })}
              </h2>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t(
                  'newReport.includedCount',
                  { count: included.size },
                  { defaultValue: '{{count}} included' },
                )}
              </span>
            </header>
            <ul className={cm.cn('divide-y divide-outline-variant/40')}>
              {available === null ? (
                <li>
                  <ListSkeleton rows={4} />
                </li>
              ) : (
                available.map((expense) => {
                  const isIncluded = included.has(expense.id)
                  return (
                    <li
                      key={expense.id}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'sm' }),
                        cm.sp('px', 4),
                        cm.sp('py', 1),
                        isIncluded ? 'bg-primary-container/20' : '',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isIncluded}
                        onChange={() => toggleInclude(expense.id)}
                        className={cm.cn(
                          'h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary/30',
                        )}
                        aria-label={t(
                          'newReport.toggleAria',
                          { merchant: expense.merchant },
                          { defaultValue: 'Include {{merchant}}' },
                        )}
                      />
                      <div className={cm.cn('flex-1')}>
                        <ExpenseRow item={expense} />
                      </div>
                    </li>
                  )
                })
              )}
            </ul>
          </div>
        </section>

        <aside className={cm.cn('space-y-4')}>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm space-y-4',
            )}
          >
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('newReport.summary', {}, { defaultValue: 'Report summary' })}
            </h2>
            <p className={cm.cn('text-4xl font-extrabold tracking-tight tabular-nums')}>
              {formatUsd(totalCents)}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'newReport.summaryHint',
                { count: included.size },
                {
                  defaultValue:
                    '{{count}} expenses included. Approval routes via your manager, then finance.',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              <button
                type="submit"
                disabled={submitting || included.size === 0}
                data-mol-id="btn-submit-report"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-full text-white shadow-md shadow-primary/20 transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-primary-hover), var(--color-gradient-end))',
                }}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  send
                </span>
                {submitting
                  ? t('common.submittingEllipsis', {}, { defaultValue: 'Submitting…' })
                  : t('newReport.submit', {}, { defaultValue: 'Submit for approval' })}
              </button>
              <button
                type="button"
                data-mol-id="btn-save-draft"
                onClick={handleSaveDraft}
                disabled={savingDraft || included.size === 0}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors disabled:opacity-60',
                )}
              >
                {savingDraft
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('newReport.saveDraft', {}, { defaultValue: 'Save as draft' })}
              </button>
            </div>
          </div>
        </aside>
      </form>
    </div>
  )
}
