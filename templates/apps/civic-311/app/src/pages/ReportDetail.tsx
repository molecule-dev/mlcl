import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import MiniMap from '../components/MiniMap.js'
import SideNavBar from '../components/SideNavBar.js'
import { PageHeader, StatusBadge } from '../components/StatusBadge.js'
import {
  categoryIcon,
  formatDateTime,
  timeAgo,
  useCategoryLabel,
  useStatusLabel,
} from '../lib/issues.js'

interface TimelineEvent {
  id: string
  kind: 'status_change' | 'note' | 'comment'
  actor_id: string
  actor_name?: string
  text: string | null
  from_status: string | null
  to_status: string | null
  created_at: string
}

interface IssueDetail {
  id: string
  reporter_id: string
  reporter_name: string
  category: string
  description: string
  status: string
  photo_url: string | null
  x: number
  y: number
  derived_address: string
  official_note: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  confirmation_count: number
  confirmed_by_me: boolean
  is_mine: boolean
  is_staff?: boolean
  events: TimelineEvent[]
}

/** Client mirror of the API's one-way status ladder. */
const NEXT_STATUSES: Record<string, string[]> = {
  submitted: ['acknowledged', 'dismissed'],
  acknowledged: ['in_review', 'dismissed'],
  in_review: ['resolved', 'dismissed'],
  resolved: [],
  dismissed: [],
}

/**
 * ReportDetail — the status timeline (submitted → acknowledged → in_review
 * → resolved/dismissed), the official response note, citizen comments, and
 * the "me too" confirm button for other residents' reports.
 */
export function ReportDetailPage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const categoryLabel = useCategoryLabel()
  const statusLabel = useStatusLabel()

  const [issue, setIssue] = useState<IssueDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [commenting, setCommenting] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [staffStatus, setStaffStatus] = useState('')
  const [staffNote, setStaffNote] = useState('')
  const [staffBusy, setStaffBusy] = useState(false)

  const fetchIssue = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      setLoadError(null)
      const res = await http.get<IssueDetail>(`/api/issues/${id}`)
      const o = res as { data?: IssueDetail }
      const row = (o?.data ?? res) as IssueDetail
      if (!row || typeof row.id !== 'string') {
        setIssue(null)
        setLoadError(t('reportDetail.notFound', {}, { defaultValue: 'Report not found' }))
        return
      }
      setIssue(row)
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
      setIssue(null)
      setLoadError(
        err instanceof Error && err.message
          ? err.message
          : t('reportDetail.loadError', {}, { defaultValue: 'Failed to load report.' }),
      )
    } finally {
      setLoading(false)
    }
  }, [http, id, t])

  useEffect(() => {
    void fetchIssue()
  }, [fetchIssue])

  async function handleConfirm() {
    if (!id || confirming) return
    setConfirming(true)
    setCommentError(null)
    try {
      await http.post(`/api/issues/${id}/confirmations`, {})
      // Domain event: a resident corroborated a neighbor's report.
      void track({ name: 'issue.confirmed', properties: { issue_id: id } })
      await fetchIssue()
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
      setCommentError(
        err instanceof Error && err.message
          ? err.message
          : t('reportDetail.confirmError', {}, { defaultValue: 'Could not confirm this report.' }),
      )
    } finally {
      setConfirming(false)
    }
  }

  async function handleStaffApply() {
    if (!id || staffBusy) return
    setStaffBusy(true)
    setCommentError(null)
    try {
      const patch: Record<string, unknown> = {}
      if (staffStatus) patch.status = staffStatus
      if (staffNote.trim()) patch.official_note = staffNote.trim()
      await http.patch(`/api/issues/${id}`, patch)
      setStaffStatus('')
      setStaffNote('')
      // Domain event: city staff moved the workflow forward.
      if (patch.status) {
        void track({
          name: 'issue.status_changed',
          properties: { issue_id: id, status: patch.status },
        })
      }
      await fetchIssue()
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
      setCommentError(
        err instanceof Error && err.message
          ? err.message
          : t('reportDetail.staffError', {}, { defaultValue: 'Could not update the report.' }),
      )
    } finally {
      setStaffBusy(false)
    }
  }

  async function handleComment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!comment.trim() || !id || commenting) return
    setCommenting(true)
    setCommentError(null)
    try {
      await http.post(`/api/issues/${id}/comments`, { body: comment.trim() })
      setComment('')
      // Domain event: a neighbor joined the conversation.
      void track({ name: 'issue.commented', properties: { issue_id: id } })
      await fetchIssue()
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
      setCommentError(
        err instanceof Error && err.message
          ? err.message
          : t('reportDetail.commentError', {}, { defaultValue: 'Failed to post comment.' }),
      )
    } finally {
      setCommenting(false)
    }
  }

  if (loading) {
    return (
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.minH('screen'),
          'bg-surface text-on-surface',
        )}
      >
        <div
          className={cm.cn(
            cm.w(8),
            cm.h(8),
            cm.roundedFull,
            'animate-spin border-4 border-primary border-t-transparent',
          )}
        />
      </div>
    )
  }

  if (loadError || !issue) {
    return (
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.minH('screen'),
          'bg-surface text-on-surface',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 4 }),
            cm.sp('p', 8),
            cm.maxW('md'),
            cm.textCenter,
          )}
          role="alert"
        >
          <h1 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
            {t('reportDetail.errorTitle', {}, { defaultValue: 'Something went wrong' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {loadError ?? t('reportDetail.notFound', {}, { defaultValue: 'Report not found' })}
          </p>
          <Link
            to="/explore"
            className={cm.cn(
              cm.sp('px', 4),
              'rounded-lg py-2 text-sm font-medium',
              'bg-primary text-on-primary hover:opacity-90',
            )}
          >
            {t('reportDetail.backToExplore', {}, { defaultValue: 'Back to Explore' })}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.surface, 'text-on-surface')}>
      <SideNavBar />
      <main className={cm.cn(cm.minH('screen'), 'md:ml-[240px]')}>
        <div className={cm.cn(cm.mxAuto, 'max-w-5xl', cm.sp('px', 6), cm.sp('py', 8), cm.stack(8))}>
          <PageHeader
            molId="report-detail-title"
            title={`${categoryLabel(issue.category)} · ${issue.derived_address}`}
            subtitle={t(
              'reportDetail.subtitle',
              { reporter: issue.reporter_name || 'A resident', when: timeAgo(issue.created_at, t) },
              { defaultValue: 'Reported by {{reporter}} {{when}}' },
            )}
            action={
              issue.is_mine ? null : issue.confirmed_by_me ? (
                <span
                  data-mol-id="report-confirmed"
                  className={cm.cn(
                    cm.sp('px', 4),
                    'rounded-lg py-2 text-sm font-semibold shrink-0',
                    'bg-primary-container/40 text-primary',
                  )}
                >
                  {t('reportDetail.confirmed', {}, { defaultValue: 'You confirmed this' })}
                </span>
              ) : (
                <button
                  type="button"
                  data-mol-id="report-confirm"
                  onClick={handleConfirm}
                  disabled={confirming}
                  className={cm.cn(
                    cm.sp('px', 4),
                    'rounded-lg py-2 text-sm font-semibold shrink-0',
                    'bg-primary text-on-primary hover:opacity-90 disabled:opacity-50',
                  )}
                >
                  {confirming
                    ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
                    : t('reportDetail.confirm', {}, { defaultValue: 'Me too — confirm' })}
                </button>
              )
            }
          />

          {commentError && (
            <div
              role="status"
              data-mol-id="report-detail-action-error"
              className={cm.cn(
                cm.sp('p', 4),
                'rounded-lg bg-error-container text-on-error-container',
              )}
            >
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{commentError}</p>
            </div>
          )}

          <div className={cm.flex({ align: 'start', gap: 8 })}>
            {/* Left column: summary + timeline + comments */}
            <div className={cm.cn(cm.flex1, 'min-w-0', cm.stack(6))}>
              <section
                data-mol-id="report-detail-summary"
                className={cm.cn(
                  cm.stack(3),
                  cm.sp('p', 5),
                  'rounded-xl bg-surface-container-lowest border border-outline-variant/40',
                )}
              >
                <div className={cm.flex({ align: 'center', gap: 3 })}>
                  <span
                    className="material-symbols-outlined"
                    style={{ color: `var(--color-cat-${issue.category})` }}
                    aria-hidden
                  >
                    {categoryIcon(issue.category)}
                  </span>
                  <StatusBadge status={issue.status} />
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      'reportDetail.confirmations',
                      { count: issue.confirmation_count },
                      { defaultValue: '{{count}} neighbors confirmed this' },
                    )}
                  </span>
                </div>
                <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed')}>{issue.description}</p>
                {issue.photo_url && (
                  <img
                    src={issue.photo_url}
                    alt={t(
                      'reportDetail.photoAlt',
                      { category: categoryLabel(issue.category) },
                      { defaultValue: 'Photo of the reported {{category}}' },
                    )}
                    data-mol-id="report-detail-photo"
                    className={cm.cn(cm.maxW('sm'), 'rounded-lg border border-outline-variant/50')}
                  />
                )}
              </section>

              {/* Official response note — rendered above the timeline so the
                  city's answer is the first thing the reporter reads. */}
              {issue.official_note && (
                <section
                  data-mol-id="report-official-note"
                  className={cm.cn(
                    cm.stack(2),
                    cm.sp('p', 5),
                    cm.accentCard({ tone: 'primary' }),
                    'rounded-xl bg-[var(--color-internal-note)]',
                  )}
                >
                  <h2 className={cm.accentCardLabel({ tone: 'primary' })}>
                    {t('reportDetail.officialNote', {}, { defaultValue: 'Official response' })}
                  </h2>
                  <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed')}>
                    {issue.official_note}
                  </p>
                </section>
              )}

              {/* City-staff workflow panel — only rendered when the API says
                  the caller is staff (role/env allow-list). */}
              {issue.is_staff && (
                <section
                  data-mol-id="report-staff-panel"
                  className={cm.cn(
                    cm.stack(3),
                    cm.sp('p', 5),
                    'rounded-xl border border-primary/40 bg-surface-container-lowest',
                  )}
                >
                  <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-primary')}>
                    {t('reportDetail.staffPanel', {}, { defaultValue: 'City staff actions' })}
                  </h2>
                  <div className={cm.flex({ align: 'center', gap: 3 })}>
                    <label
                      htmlFor="report-staff-status"
                      className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
                    >
                      {t('reportDetail.moveStatus', {}, { defaultValue: 'Move status to' })}
                    </label>
                    <select
                      id="report-staff-status"
                      data-mol-id="report-staff-status"
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        'rounded-lg border border-outline-variant bg-surface-container-lowest',
                      )}
                      value={staffStatus}
                      onChange={(e) => setStaffStatus(e.target.value)}
                    >
                      <option value="">
                        {t('reportDetail.noChange', {}, { defaultValue: '(no change)' })}
                      </option>
                      {(NEXT_STATUSES[issue.status] ?? []).map((st) => (
                        <option key={st} value={st}>
                          {st.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    data-mol-id="report-staff-note"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      'w-full min-h-[64px] rounded-lg border border-outline-variant bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary',
                    )}
                    maxLength={2000}
                    value={staffNote}
                    onChange={(e) => setStaffNote(e.target.value)}
                    placeholder={t(
                      'reportDetail.staffNotePlaceholder',
                      {},
                      { defaultValue: 'Official response note (shown to the reporter)…' },
                    )}
                  />
                  <button
                    type="button"
                    data-mol-id="report-staff-apply"
                    onClick={() => void handleStaffApply()}
                    disabled={staffBusy || (!staffStatus && !staffNote.trim())}
                    className={cm.cn(
                      cm.sp('px', 4),
                      'self-start rounded-lg py-2 text-sm font-semibold',
                      'bg-primary text-on-primary hover:opacity-90 disabled:opacity-50',
                    )}
                  >
                    {staffBusy
                      ? t('common.submittingEllipsis', {}, { defaultValue: 'Submitting…' })
                      : t('reportDetail.applyUpdate', {}, { defaultValue: 'Apply update' })}
                  </button>
                </section>
              )}

              <section data-mol-id="report-timeline" className={cm.stack(3)}>
                <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                  {t('reportDetail.timeline', {}, { defaultValue: 'Timeline' })}
                </h2>
                <ol className={cm.stack(0)}>
                  {(issue.events ?? []).map((e) => (
                    <li
                      key={e.id}
                      data-mol-id="report-timeline-item"
                      data-kind={e.kind}
                      className={cm.cn(
                        cm.flex({ align: 'start', gap: 3 }),
                        'relative border-l-2 border-outline-variant pl-4 pb-4 last:pb-0',
                      )}
                    >
                      <span
                        className={cm.cn(
                          'absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-surface',
                          e.kind === 'status_change'
                            ? 'bg-[var(--mol-color-primary)]'
                            : e.kind === 'note'
                              ? 'bg-[var(--color-status-in-review)]'
                              : 'bg-surface-variant',
                        )}
                        aria-hidden
                      />
                      <div className={cm.stack(1)}>
                        {e.kind === 'status_change' ? (
                          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                            {e.from_status
                              ? t(
                                  'reportDetail.movedFrom',
                                  {
                                    from: statusLabel(e.from_status),
                                    to: statusLabel(e.to_status ?? ''),
                                  },
                                  { defaultValue: 'Status: {{from}} → {{to}}' },
                                )
                              : t(
                                  'reportDetail.submitted',
                                  {},
                                  { defaultValue: 'Report submitted' },
                                )}
                          </span>
                        ) : e.kind === 'note' ? (
                          <span
                            className={cm.cn(
                              cm.textSize('sm'),
                              cm.fontWeight('medium'),
                              'text-primary',
                            )}
                          >
                            {t(
                              'reportDetail.noteByCity',
                              {},
                              { defaultValue: 'City response note' },
                            )}
                          </span>
                        ) : (
                          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                            {t(
                              'reportDetail.commentBy',
                              { actor: e.actor_name || 'A neighbor' },
                              { defaultValue: 'Comment from {{actor}}' },
                            )}
                          </span>
                        )}
                        {e.text && (
                          <p
                            className={cm.cn(
                              cm.textSize('sm'),
                              'text-on-surface-variant leading-relaxed',
                            )}
                          >
                            {e.text}
                          </p>
                        )}
                        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {formatDateTime(e.created_at)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              {/* Comment composer */}
              <form
                data-mol-id="report-comment-form"
                className={cm.stack(2)}
                onSubmit={handleComment}
              >
                <label
                  htmlFor="report-comment"
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
                >
                  {t('reportDetail.addComment', {}, { defaultValue: 'Add a comment' })}
                </label>
                <textarea
                  id="report-comment"
                  data-mol-id="report-comment"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'w-full min-h-[80px] rounded-lg border border-outline-variant bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary',
                  )}
                  maxLength={2000}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t(
                    'reportDetail.commentPlaceholder',
                    {},
                    { defaultValue: 'Anything neighbors or the crew should know…' },
                  )}
                />
                <button
                  type="submit"
                  data-mol-id="report-comment-submit"
                  className={cm.cn(
                    cm.sp('px', 4),
                    'self-start rounded-lg py-2 text-sm font-semibold',
                    'bg-primary text-on-primary hover:opacity-90 disabled:opacity-50',
                  )}
                  disabled={commenting || !comment.trim()}
                >
                  {commenting
                    ? t('common.submittingEllipsis', {}, { defaultValue: 'Submitting…' })
                    : t('reportDetail.postComment', {}, { defaultValue: 'Post comment' })}
                </button>
              </form>
            </div>

            {/* Right column: map + facts */}
            <aside className={cm.cn(cm.w('[260px]'), 'hidden lg:block shrink-0', cm.stack(5))}>
              <div data-mol-id="report-detail-map" className={cm.stack(2)}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-semibold uppercase tracking-wide text-on-surface-variant',
                  )}
                >
                  {t('reportDetail.location', {}, { defaultValue: 'Location' })}
                </span>
                <MiniMap
                  data-mol-id="report-map"
                  pins={[
                    {
                      id: issue.id,
                      x: issue.x,
                      y: issue.y,
                      color: `var(--color-cat-${issue.category})`,
                    },
                  ]}
                  activePin={{ x: issue.x, y: issue.y }}
                />
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                  {issue.derived_address}
                </span>
              </div>
              <dl
                data-mol-id="report-detail-facts"
                className={cm.cn(
                  cm.stack(2),
                  cm.sp('p', 4),
                  'rounded-lg bg-surface-container-low text-sm',
                )}
              >
                <div className={cm.flex({ justify: 'between' })}>
                  <dt className="text-on-surface-variant">
                    {t('reportDetail.reported', {}, { defaultValue: 'Reported' })}
                  </dt>
                  <dd>{formatDateTime(issue.created_at)}</dd>
                </div>
                {issue.resolved_at && (
                  <div className={cm.flex({ justify: 'between' })}>
                    <dt className="text-on-surface-variant">
                      {t('reportDetail.closed', {}, { defaultValue: 'Closed' })}
                    </dt>
                    <dd>{formatDateTime(issue.resolved_at)}</dd>
                  </div>
                )}
                <div className={cm.flex({ justify: 'between' })}>
                  <dt className="text-on-surface-variant">
                    {t('reportDetail.updated', {}, { defaultValue: 'Last activity' })}
                  </dt>
                  <dd>{timeAgo(issue.updated_at, t)}</dd>
                </div>
              </dl>
            </aside>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ReportDetailPage
