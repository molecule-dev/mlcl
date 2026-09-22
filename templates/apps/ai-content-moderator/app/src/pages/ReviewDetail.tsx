import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AiVerdictPanel } from '../components/AiVerdictPanel.js'
import { SiftLayout } from '../components/SiftLayout.js'
import type { Verdict } from '../components/VerdictBadge.js'
import { VerdictBadge } from '../components/VerdictBadge.js'

// API-side statuses (from `flagged_content.status`):
//   queued | in_review | decided | escalated
// UI-side statuses (legacy): pending | reviewing | approved | rejected
// We accept both shapes so a freshly-submitted item ('queued') doesn't crash
// the page lookup. `approved` / `rejected` are derived from `decision` on the
// `decided` rows in `normalizeStatus()` below.
type ApiStatus = 'queued' | 'in_review' | 'decided' | 'escalated'
type LegacyStatus = 'pending' | 'reviewing' | 'approved' | 'rejected'
type ContentStatus = ApiStatus | LegacyStatus
type AiDecision = 'approve' | 'reject' | 'escalate'

interface AiReview {
  id: string
  decision: AiDecision
  confidence: number
  categories: string[]
  reasoning: string
  policy_violations: string[]
  recommended_action: string
  model: string
  created_at: string
}

interface AuditEntry {
  id: string
  action: string
  actor_id: string
  notes: string
  created_at: string
}

interface FlaggedItem {
  id: string
  content_type: string
  content_id: string
  content_text: string | null
  content_url: string | null
  reporter_id: string | null
  reason: string | null
  status: ContentStatus
  decision?: 'approve' | 'reject' | 'escalate' | null
  automated_flagged: boolean
  automated_categories: string | null
  automated_reasoning: string | null
  rejection_reason: string | null
  review_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  ai_reviews: AiReview[]
  audit_log: AuditEntry[]
}

// Resolve the API/legacy status into the badge/UI status name. `escalated`
// keeps its own badge (matching the queue table) rather than collapsing
// into `reviewing`.
function normalizeStatus(
  item: Pick<FlaggedItem, 'status' | 'decision'>,
): LegacyStatus | 'escalated' {
  switch (item.status) {
    case 'queued':
      return 'pending'
    case 'in_review':
      return 'reviewing'
    case 'decided':
      return item.decision === 'reject' ? 'rejected' : 'approved'
    case 'escalated':
      return 'escalated'
    default:
      // Legacy values pass through unchanged.
      return item.status as LegacyStatus
  }
}

const STATUS_TO_VERDICT: Record<LegacyStatus | 'escalated', Verdict> = {
  pending: 'pending',
  reviewing: 'reviewing',
  approved: 'approved',
  rejected: 'rejected',
  escalated: 'escalated',
}

const REJECT_REASONS = [
  ['hate', 'Hate speech'],
  ['violence', 'Violence / threats'],
  ['sexual', 'Explicit sexual content'],
  ['harassment', 'Harassment / bullying'],
  ['spam', 'Spam'],
  ['dangerous', 'Dangerous / illegal content'],
  ['other', 'Other policy violation'],
] as const

export function ReviewDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id: itemId } = useParams<{ id: string }>()
  const http = useHttpClient()

  const [item, setItem] = useState<FlaggedItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [notes, setNotes] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!itemId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get<FlaggedItem>(`/api/moderation/${itemId}`)
      .then((response) => {
        if (cancelled) return
        setItem(parseStringArrays(response.data))
      })
      .catch(() => {
        if (cancelled) return
        setError(t('review.loadError', {}, { defaultValue: 'Failed to load content item.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [itemId, http, t])

  async function runAiReview() {
    if (!itemId) return
    setAiLoading(true)
    setError(null)
    try {
      const response = await http.post<{ ai_review: AiReview; status: ContentStatus }>(
        `/api/moderation/${itemId}/ai-review`,
        {},
      )
      const data = response.data
      if (!data?.ai_review) return
      const review = parseAiReview(data.ai_review)
      setItem((prev) =>
        prev
          ? {
              ...prev,
              status: data.status,
              ai_reviews: [review, ...(prev.ai_reviews ?? [])],
            }
          : prev,
      )
      track({
        name: 'content.ai_reviewed',
        properties: { id: itemId, decision: review.decision, confidence: review.confidence },
      })
    } catch (error) {
      logError('review.requestAiReview', error)
      setError(t('review.aiError', {}, { defaultValue: 'AI review failed. Please try again.' }))
    } finally {
      setAiLoading(false)
    }
  }

  async function refreshItem() {
    if (!itemId) return
    try {
      const response = await http.get<FlaggedItem>(`/api/moderation/${itemId}`)
      setItem(parseStringArrays(response.data))
    } catch (_error) {
      // Silent — the original item still shows; a failed refresh is non-fatal.
    }
  }

  async function approve() {
    if (!itemId) return
    setActionLoading(true)
    setError(null)
    try {
      await http.post(`/api/moderation/${itemId}/approve`, { notes: notes || undefined })
      await refreshItem()
      setNotes('')
      track({ name: 'content.approved', properties: { id: itemId, status: 'decided' } })
    } catch (error) {
      logError('review.approve', error)
      setError(t('review.approveError', {}, { defaultValue: 'Failed to approve content.' }))
    } finally {
      setActionLoading(false)
    }
  }

  async function escalate() {
    if (!itemId) return
    setActionLoading(true)
    setError(null)
    try {
      await http.post(`/api/moderation/${itemId}/decide`, {
        decision: 'escalate',
        notes: notes || undefined,
      })
      await refreshItem()
      setNotes('')
      track({ name: 'content.escalated', properties: { id: itemId, status: 'escalated' } })
    } catch (error) {
      logError('review.escalate', error)
      setError(t('review.escalateError', {}, { defaultValue: 'Failed to escalate content.' }))
    } finally {
      setActionLoading(false)
    }
  }

  async function reject() {
    if (!itemId) return
    if (!rejectReason.trim()) {
      setError(
        t(
          'review.rejectReasonRequired',
          {},
          {
            defaultValue: 'Please choose a rejection reason.',
          },
        ),
      )
      return
    }
    setActionLoading(true)
    setError(null)
    try {
      await http.post(`/api/moderation/${itemId}/reject`, {
        reason: rejectReason,
        notes: notes || undefined,
      })
      await refreshItem()
      setRejectReason('')
      setNotes('')
      setShowRejectForm(false)
      track({
        name: 'content.rejected',
        properties: { id: itemId, status: 'decided', reason: rejectReason },
      })
    } catch (error) {
      logError('review.reject', error)
      setError(t('review.rejectError', {}, { defaultValue: 'Failed to reject content.' }))
    } finally {
      setActionLoading(false)
    }
  }

  async function reopen() {
    if (!itemId) return
    setActionLoading(true)
    setError(null)
    try {
      await http.post(`/api/moderation/${itemId}/reopen`, {})
      await refreshItem()
      track({ name: 'content.reopened', properties: { id: itemId, status: 'queued' } })
    } catch (error) {
      logError('review.reopen', error)
      setError(t('review.reopenError', {}, { defaultValue: 'Failed to re-open the review.' }))
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <SiftLayout>
        <div
          className={cm.cn(
            'rounded-xl bg-surface-container-lowest shadow-sm p-12 text-center text-on-surface-variant',
          )}
        >
          {t('review.loading', {}, { defaultValue: 'Loading content item…' })}
        </div>
      </SiftLayout>
    )
  }

  if (!item) {
    return (
      <SiftLayout>
        <div className={cm.cn('rounded-xl bg-surface-container-lowest shadow-sm p-12 text-center')}>
          <p className={cm.cn('text-on-surface-variant mb-4')}>
            {error ?? t('review.notFound', {}, { defaultValue: 'Content item not found.' })}
          </p>
          <Link
            to="/queue"
            className={cm.cn(
              'inline-flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider hover:underline',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-[18px]')}>
              arrow_back
            </span>
            {t('review.backToQueue', {}, { defaultValue: 'Back to queue' })}
          </Link>
        </div>
      </SiftLayout>
    )
  }

  const latestAiReview = item.ai_reviews?.[0] ?? null
  const normalizedStatus = normalizeStatus(item)
  const isResolved = normalizedStatus === 'approved' || normalizedStatus === 'rejected'

  return (
    <SiftLayout>
      <header className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), 'gap-4 flex-wrap')}>
        <div>
          <Link
            to="/queue"
            className={cm.cn(
              'inline-flex items-center gap-1 text-xs uppercase tracking-widest font-bold text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-[14px]')}>
              arrow_back
            </span>
            {t('review.backToQueue', {}, { defaultValue: 'Back to queue' })}
          </Link>
          <h1
            className={cm.cn(
              'text-3xl md:text-4xl font-bold tracking-tight font-headline text-on-surface mt-3',
            )}
          >
            {t('review.heading', {}, { defaultValue: 'Review content' })}{' '}
            <span className={cm.cn('font-mono text-on-surface-variant text-base align-middle')}>
              #{item.id.slice(-6)}
            </span>
          </h1>
        </div>
        <VerdictBadge verdict={STATUS_TO_VERDICT[normalizedStatus]} />
      </header>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            'rounded-lg border-l-4 border-red-500 bg-error-light px-4 py-3 text-sm text-error',
          )}
        >
          {error}
        </div>
      )}

      <div className={cm.cn(cm.grid({ cols: 12, gap: 6 }))}>
        <section className={cm.cn('col-span-12 lg:col-span-8 space-y-6')}>
          <article
            className={cm.cn('rounded-xl bg-surface-container-lowest shadow-sm p-6 space-y-4')}
          >
            <h2
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label',
              )}
            >
              {t('review.contentDetails', {}, { defaultValue: 'Content details' })}
            </h2>
            <dl className={cm.cn('grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm')}>
              <Field label={t('form.type', {}, { defaultValue: 'Type' })}>
                <span
                  className={cm.cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant text-xs font-semibold',
                  )}
                >
                  {item.content_type}
                </span>
              </Field>
              <Field label={t('review.field.contentId', {}, { defaultValue: 'Content ID' })}>
                <code className={cm.cn('font-mono text-xs')}>{item.content_id}</code>
              </Field>
              {item.reporter_id && (
                <Field label={t('review.field.reporter', {}, { defaultValue: 'Reporter' })}>
                  {item.reporter_id}
                </Field>
              )}
              {item.reason && (
                <Field label={t('review.field.reason', {}, { defaultValue: 'Reason' })}>
                  {item.reason}
                </Field>
              )}
              <Field label={t('review.field.submitted', {}, { defaultValue: 'Submitted' })}>
                {new Date(item.created_at).toLocaleString()}
              </Field>
            </dl>

            {item.content_text && (
              <div>
                <p
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label mb-2',
                  )}
                >
                  {t('review.field.contentText', {}, { defaultValue: 'Content text' })}
                </p>
                <pre
                  className={cm.cn(
                    'bg-surface-container-low border border-surface-container rounded-lg p-4 text-sm font-body whitespace-pre-wrap break-words max-h-72 overflow-y-auto',
                  )}
                >
                  {item.content_text}
                </pre>
              </div>
            )}

            {item.content_url && (
              <div>
                <p
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label mb-2',
                  )}
                >
                  {t('review.field.contentUrl', {}, { defaultValue: 'Content URL' })}
                </p>
                <a
                  href={item.content_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cm.cn('text-sm text-primary break-all hover:underline')}
                >
                  {item.content_url}
                </a>
              </div>
            )}

            {item.automated_flagged && item.automated_reasoning && (
              <div
                className={cm.cn(
                  'rounded-lg border-l-4 border-amber-500 bg-warning-light px-4 py-3 text-sm text-warning',
                )}
              >
                <p className={cm.cn('font-bold mb-1')}>
                  {t(
                    'review.autoFlaggedNotice',
                    {},
                    { defaultValue: 'Auto-flagged by safety system' },
                  )}
                </p>
                <p>{item.automated_reasoning}</p>
              </div>
            )}
          </article>

          {item.audit_log?.length > 0 && (
            <article className={cm.cn('rounded-xl bg-surface-container-lowest shadow-sm p-6')}>
              <h2
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label mb-4',
                )}
              >
                {t('nav.auditLog', {}, { defaultValue: 'Audit log' })}
              </h2>
              <ol className={cm.cn('space-y-3')}>
                {item.audit_log.map((entry) => (
                  <li
                    key={entry.id}
                    className={cm.cn(
                      'flex flex-col gap-1 border-l-2 border-surface-container pl-4',
                    )}
                  >
                    <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2 text-xs')}>
                      <span
                        className={cm.cn(
                          'px-2 py-0.5 rounded-full bg-surface-container-low font-semibold text-on-surface uppercase tracking-wide',
                        )}
                      >
                        {entry.action}
                      </span>
                      <span className={cm.cn('text-on-surface-variant')}>{entry.actor_id}</span>
                      <span className={cm.cn('text-on-surface-variant ml-auto')}>
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className={cm.cn('text-sm text-on-surface-variant')}>{entry.notes}</p>
                    )}
                  </li>
                ))}
              </ol>
            </article>
          )}
        </section>

        <aside className={cm.cn('col-span-12 lg:col-span-4 space-y-6')}>
          {latestAiReview && (
            <AiVerdictPanel
              decision={latestAiReview.decision}
              confidence={latestAiReview.confidence}
              reasoning={latestAiReview.reasoning}
              categories={latestAiReview.categories}
              policyViolations={latestAiReview.policy_violations}
              recommendedAction={latestAiReview.recommended_action}
              modelName={latestAiReview.model}
              createdAt={latestAiReview.created_at}
            />
          )}

          {!isResolved && (
            <article
              className={cm.cn(
                'rounded-xl bg-surface-container-lowest shadow-sm p-6 space-y-4 sticky top-24',
              )}
            >
              <h2
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label',
                )}
              >
                {t('nav.actions', {}, { defaultValue: 'Actions' })}
              </h2>

              <button
                type="button"
                onClick={runAiReview}
                disabled={aiLoading}
                className={cm.cn(
                  'w-full inline-flex items-center justify-center gap-2 border border-primary text-primary font-bold text-sm uppercase tracking-wider px-4 py-3 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-60',
                )}
              >
                <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-[18px]')}>
                  smart_toy
                </span>
                {aiLoading
                  ? t('review.aiReviewing', {}, { defaultValue: 'Running AI review…' })
                  : t('review.runAi', {}, { defaultValue: 'Run AI review' })}
              </button>

              <div>
                <label
                  htmlFor="review-notes"
                  className={cm.cn(
                    'block text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label mb-2',
                  )}
                >
                  {t('review.notes', {}, { defaultValue: 'Notes (optional)' })}
                </label>
                <textarea
                  id="review-notes"
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder={t('review.notesHint', {}, { defaultValue: 'Add reviewer notes…' })}
                  className={cm.cn(
                    'w-full bg-surface-container-low border border-surface-container rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors',
                  )}
                />
              </div>

              <button
                type="button"
                onClick={approve}
                disabled={actionLoading}
                data-mol-id="approve-content"
                className={cm.cn(
                  'w-full bg-emerald-600 text-white font-bold text-sm uppercase tracking-wider px-4 py-3 rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-60',
                )}
              >
                {actionLoading
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('review.approve', {}, { defaultValue: 'Approve content' })}
              </button>

              {normalizedStatus !== 'escalated' && (
                <button
                  type="button"
                  onClick={escalate}
                  disabled={actionLoading}
                  data-mol-id="escalate-content"
                  className={cm.cn(
                    'w-full border border-purple-500 text-purple-500 font-bold text-sm uppercase tracking-wider px-4 py-3 rounded-lg hover:bg-purple-500/10 transition-colors disabled:opacity-60',
                  )}
                >
                  {t('review.escalate', {}, { defaultValue: 'Escalate to senior moderator' })}
                </button>
              )}

              {!showRejectForm ? (
                <button
                  type="button"
                  onClick={() => setShowRejectForm(true)}
                  className={cm.cn(
                    'w-full border border-red-500 text-error font-bold text-sm uppercase tracking-wider px-4 py-3 rounded-lg hover:bg-error-light transition-colors',
                  )}
                >
                  {t('review.reject', {}, { defaultValue: 'Reject content' })}
                </button>
              ) : (
                <div
                  className={cm.cn(
                    'rounded-lg border-l-4 border-red-500 bg-error-light/40 p-4 space-y-3',
                  )}
                >
                  <label
                    htmlFor="reject-reason"
                    className={cm.cn(
                      'block text-[10px] font-black uppercase tracking-widest text-error font-label',
                    )}
                  >
                    {t('review.rejectReason', {}, { defaultValue: 'Rejection reason' })}
                  </label>
                  <select
                    id="reject-reason"
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    className={cm.cn(
                      'w-full bg-surface border border-red-200 rounded-md px-3 py-2 text-sm focus:border-red-500 focus:outline-none',
                    )}
                  >
                    <option value="">
                      {t('review.selectReason', {}, { defaultValue: '— Select a reason —' })}
                    </option>
                    {REJECT_REASONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {t(`review.reasons.${value}`, {}, { defaultValue: label })}
                      </option>
                    ))}
                  </select>
                  <div className={cm.cn('flex gap-2')}>
                    <button
                      type="button"
                      onClick={reject}
                      disabled={actionLoading || !rejectReason}
                      className={cm.cn(
                        'flex-1 bg-red-600 text-white font-bold text-xs uppercase tracking-wider px-3 py-2 rounded-md hover:bg-red-500 transition-colors disabled:opacity-50',
                      )}
                    >
                      {t('review.confirmReject', {}, { defaultValue: 'Confirm reject' })}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowRejectForm(false)
                        setRejectReason('')
                      }}
                      className={cm.cn(
                        'border border-red-200 text-error font-bold text-xs uppercase tracking-wider px-3 py-2 rounded-md hover:bg-error-light transition-colors',
                      )}
                    >
                      {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                    </button>
                  </div>
                </div>
              )}
            </article>
          )}

          {isResolved && (
            <article
              className={cm.cn(
                'rounded-xl bg-surface-container-lowest shadow-sm p-6 border-l-4',
                normalizedStatus === 'approved' ? 'border-emerald-500' : 'border-red-500',
              )}
            >
              <p
                className={cm.cn(
                  'text-xs uppercase tracking-widest font-black mb-2',
                  normalizedStatus === 'approved' ? 'text-success' : 'text-error',
                )}
              >
                {t(
                  `review.status.${normalizedStatus}`,
                  {},
                  { defaultValue: normalizedStatus.toUpperCase() },
                )}
              </p>
              {item.reviewed_by && (
                <p className={cm.cn('text-sm text-on-surface')}>
                  {t(
                    'review.resolvedBy',
                    { by: item.reviewed_by },
                    { defaultValue: `Resolved by ${item.reviewed_by}` },
                  )}
                </p>
              )}
              {item.reviewed_at && (
                <p className={cm.cn('text-xs text-on-surface-variant mt-1')}>
                  {new Date(item.reviewed_at).toLocaleString()}
                </p>
              )}
              {item.rejection_reason && (
                <p className={cm.cn('text-sm mt-3')}>
                  <strong className={cm.cn('text-on-surface')}>
                    {t('review.rejectedFor', {}, { defaultValue: 'Rejected for:' })}
                  </strong>{' '}
                  {item.rejection_reason}
                </p>
              )}
              {item.review_notes && (
                <p className={cm.cn('text-sm text-on-surface-variant mt-2')}>{item.review_notes}</p>
              )}
              {/* Appeal path: a decided item is not a dead end — a moderator
                  (or a senior reviewer acting on an appeal) can re-open it
                  back into the queue; the reversal lands in the audit log. */}
              <button
                type="button"
                onClick={reopen}
                disabled={actionLoading}
                data-mol-id="reopen-review"
                className={cm.cn(
                  'mt-4 w-full border border-outline-variant text-on-surface-variant font-bold text-xs uppercase tracking-wider px-3 py-2.5 rounded-lg hover:text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-50',
                )}
              >
                {actionLoading
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('review.reopen', {}, { defaultValue: 'Re-open review' })}
              </button>
            </article>
          )}
        </aside>
      </div>
    </SiftLayout>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <>
      <dt
        className={cm.cn(
          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label self-center',
        )}
      >
        {label}
      </dt>
      <dd className={cm.cn('text-on-surface')}>{children}</dd>
    </>
  )
}

function parseAiReview(review: AiReview): AiReview {
  return {
    ...review,
    categories: parseStringArray(review.categories),
    policy_violations: parseStringArray(review.policy_violations),
  }
}

function parseStringArrays(item: FlaggedItem): FlaggedItem {
  if (!item.ai_reviews) return item
  return {
    ...item,
    ai_reviews: item.ai_reviews.map(parseAiReview),
  }
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[]
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch (_error) {
      // value is not valid JSON — fall back to empty array
      return []
    }
  }
  return []
}

export default ReviewDetail
