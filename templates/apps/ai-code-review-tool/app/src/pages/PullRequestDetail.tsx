import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ScoreCard } from '../components/ScoreCard.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface PullRequestRow {
  id: string
  title: string
  repository_id: string | null
  head_ref: string | null
  base_ref: string | null
  state: 'open' | 'merged' | 'closed' | 'draft'
  additions: number | null
  deletions: number | null
  opened_at: string | null
  author_login: string | null
}

interface ReviewRow {
  id: string
  pr_id: string
  status: string
  quality_score: number | null
  severity_summary_json: Record<string, number> | null
  completed_at: string | null
}

interface ReviewCommentRow {
  id: string
  review_id: string | null
  file_path: string | null
  line_start: number | null
  line_end: number | null
  body_md: string | null
  severity: string | null
  category: string | null
  suggested_patch: string | null
  createdAt: string | null
}

interface RepositoryRow {
  id: string
  full_name?: string
}

const STATUS_TINT: Record<string, { bg: string; text: string; label: string }> = {
  open: { bg: 'bg-emerald-500/15', text: 'text-success', label: 'Open' },
  merged: { bg: 'bg-violet-500/15', text: 'text-violet-600', label: 'Merged' },
  closed: { bg: 'bg-red-500/15', text: 'text-error', label: 'Closed' },
  draft: { bg: 'bg-slate-400/15', text: 'text-on-surface-variant', label: 'Draft' },
}

const SEVERITY_TINT: Record<string, { bg: string; label: string }> = {
  high: { bg: 'var(--color-severity-high)', label: 'High' },
  med: { bg: 'var(--color-severity-medium)', label: 'Medium' },
  low: { bg: 'var(--color-severity-low)', label: 'Low' },
  warning: { bg: 'var(--color-severity-warning)', label: 'Warning' },
  info: { bg: 'var(--color-severity-info)', label: 'Info' },
}

export function PullRequestDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [pr, setPr] = useState<PullRequestRow | null>(null)
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [comments, setComments] = useState<ReviewCommentRow[]>([])
  const [repo, setRepo] = useState<RepositoryRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get(`/api/pull-requests/${id}`)
      .catch(() => null)
      .then(async (prRes) => {
        if (cancelled) return
        const prData = unwrapSingle<PullRequestRow>(prRes)
        setPr(prData)
        if (prData?.repository_id) {
          const repoRes = await http
            .get(`/api/repositories/${prData.repository_id}`)
            .catch(() => null)
          if (!cancelled) setRepo(unwrapSingle<RepositoryRow>(repoRes))
        }
        const reviewsRes = await http.get(`/api/reviews?pr_id=${id}`).catch(() => null)
        if (!cancelled) {
          const reviewsList = unwrapList<ReviewRow>(reviewsRes)
          setReviews(reviewsList)
          if (reviewsList.length > 0) {
            const allComments: ReviewCommentRow[] = []
            for (const r of reviewsList) {
              const commentsRes = await http.get(`/api/reviews/${r.id}/comments`).catch(() => null)
              if (cancelled) return
              const list = unwrapList<ReviewCommentRow>(commentsRes)
              allComments.push(...list)
            }
            if (!cancelled) setComments(allComments)
          }
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t(
              'pullRequestDetail.loadError',
              {},
              { defaultValue: 'Failed to load this pull request.' },
            ),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const tint = pr ? (STATUS_TINT[pr.state] ?? STATUS_TINT.open!) : STATUS_TINT.open!
  const repoLabel = repo?.full_name || pr?.repository_id || ''

  const latestReview = useMemo(() => {
    if (reviews.length === 0) return null
    return [...reviews].sort((a, b) => {
      const aT = a.completed_at ? new Date(a.completed_at).getTime() : 0
      const bT = b.completed_at ? new Date(b.completed_at).getTime() : 0
      return bT - aT
    })[0]
  }, [reviews])

  const score = useMemo(() => {
    if (
      !latestReview ||
      latestReview.quality_score === null ||
      latestReview.quality_score === undefined
    )
      return 0
    return Number((latestReview.quality_score / 10).toFixed(1))
  }, [latestReview])

  return (
    <div className={cm.cn(cm.flex1, cm.sp('px', 8), cm.sp('py', 8), cm.stack(6))}>
      <div className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}>
        <Link to="/dashboard" className={cm.cn('hover:text-primary transition-colors')}>
          {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
        </Link>
        <span className={cm.cn('mx-2 opacity-60')}>/</span>
        <Link to="/history" className={cm.cn('hover:text-primary transition-colors')}>
          {t('pullRequestDetail.crumbHistory', {}, { defaultValue: 'Review history' })}
        </Link>
        {pr ? (
          <>
            <span className={cm.cn('mx-2 opacity-60')}>/</span>
            <span>
              {repoLabel}#{pr.id}
            </span>
          </>
        ) : null}
      </div>

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : !pr ? (
        <div className={cm.cn(cm.sp('py', 16), cm.textCenter)}>
          <p className={cm.textMuted}>
            {t(
              'pullRequestDetail.unavailable',
              {},
              { defaultValue: 'This pull request is unavailable.' },
            )}
          </p>
          <Link
            to="/dashboard"
            className={cm.cn(
              cm.sp('mt', 4),
              'inline-block text-primary text-sm font-bold hover:underline',
            )}
          >
            {t('pullRequestDetail.backToDashboard', {}, { defaultValue: '← Back to dashboard' })}
          </Link>
        </div>
      ) : (
        <>
          <header className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
            <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
              <span
                className={cm.cn(
                  'px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest font-mono',
                  tint.bg,
                  tint.text,
                )}
              >
                {t(`pullRequestDetail.status.${pr.state}`, {}, { defaultValue: tint.label })}
              </span>
              <span className={cm.cn('text-[11px] font-mono text-on-surface-variant')}>
                {repoLabel}
                {pr.head_ref ? ` · ${pr.head_ref}` : ''}
                {pr.base_ref ? ` → ${pr.base_ref}` : ''}
                {pr.author_login ? ` · ${pr.author_login}` : ''}
              </span>
            </div>
            <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
              {pr.title}
            </h1>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
                'font-mono tabular-nums text-sm',
              )}
            >
              <span className={cm.cn('text-success font-bold')}>+{pr.additions ?? 0}</span>
              <span className={cm.cn('text-error font-bold')}>-{pr.deletions ?? 0}</span>
              {pr.opened_at ? (
                <>
                  <span className={cm.cn('text-on-surface-variant')}>·</span>
                  <span className={cm.cn('text-on-surface-variant')}>
                    {new Date(pr.opened_at).toLocaleString()}
                  </span>
                </>
              ) : null}
            </div>
          </header>

          <section className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-6')}>
            <div className={cm.cn('lg:col-span-8')}>
              <article
                className={cm.cn(
                  cm.sp('p', 5),
                  'rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm',
                  cm.stack(4),
                )}
              >
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'tracking-tight')}>
                  {t('pullRequestDetail.reviewsHeading', {}, { defaultValue: 'Reviews' })}
                </h2>
                {reviews.length === 0 ? (
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(
                      'pullRequestDetail.reviewsEmpty',
                      {},
                      { defaultValue: 'No reviews yet for this pull request.' },
                    )}
                  </p>
                ) : (
                  <ul className={cm.stack(3)}>
                    {reviews.map((r) => (
                      <li
                        key={r.id}
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'md' }),
                          cm.sp('p', 3),
                          'rounded-lg border border-outline-variant/40 bg-surface',
                        )}
                      >
                        <span
                          className="material-symbols-outlined text-[20px] text-primary"
                          aria-hidden="true"
                        >
                          rate_review
                        </span>
                        <div className={cm.cn('flex-1 min-w-0')}>
                          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                            {r.status}
                          </p>
                          {r.completed_at ? (
                            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                              {new Date(r.completed_at).toLocaleString()}
                            </p>
                          ) : null}
                        </div>
                        {r.quality_score !== null && r.quality_score !== undefined ? (
                          <span
                            className={cm.cn(
                              'text-sm font-mono tabular-nums font-bold text-success',
                            )}
                          >
                            {(r.quality_score / 10).toFixed(1)}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </div>

            <aside className={cm.cn('lg:col-span-4', cm.stack(6))}>
              <ScoreCard
                score={score}
                label={t('pullRequestDetail.scoreLabel', {}, { defaultValue: 'AI quality score' })}
                subtitle={t(
                  'pullRequestDetail.scoreSubtitle',
                  { appName: APP_NAME },
                  { defaultValue: '{{appName}} AI · most recent review' },
                )}
                breakdown={[
                  {
                    label: t('nav.reviews', {}, { defaultValue: 'Reviews' }),
                    value: reviews.length,
                  },
                  {
                    label: t(
                      'pullRequestDetail.scoreBreakdown.comments',
                      {},
                      { defaultValue: 'Comments' },
                    ),
                    value: comments.length,
                  },
                ]}
              />

              <article
                className={cm.cn(
                  cm.sp('p', 5),
                  'rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm',
                )}
              >
                <h3
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.sp('mb', 4),
                    'uppercase tracking-widest text-on-surface-variant font-mono',
                  )}
                >
                  {t('pullRequestDetail.commentsHeading', {}, { defaultValue: 'Review thread' })}
                </h3>
                {comments.length === 0 ? (
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      'pullRequestDetail.commentsEmpty',
                      {},
                      { defaultValue: 'No review comments recorded.' },
                    )}
                  </p>
                ) : (
                  <ul className={cm.stack(4)}>
                    {comments.map((c) => {
                      const sevKey = (c.severity ?? 'info').toLowerCase()
                      const sev = SEVERITY_TINT[sevKey] ?? SEVERITY_TINT.info!
                      const author = `${APP_NAME} AI`
                      return (
                        <li
                          key={c.id}
                          className={cm.cn(
                            cm.flex({ direction: 'col', gap: 'sm' }),
                            cm.sp('p', 3),
                            'rounded-lg border border-outline-variant/40 bg-surface',
                          )}
                          data-mol-id="review-comment"
                        >
                          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                            <span
                              className="material-symbols-outlined text-[16px] text-primary"
                              aria-hidden="true"
                            >
                              auto_awesome
                            </span>
                            <span
                              className={cm.cn(
                                cm.textSize('xs'),
                                cm.fontWeight('bold'),
                                'text-on-surface',
                              )}
                            >
                              {author}
                            </span>
                            {c.category ? (
                              <span
                                className={cm.cn('text-[10px] font-mono text-on-surface-variant')}
                              >
                                {c.category}
                              </span>
                            ) : null}
                            <span
                              className={cm.cn(
                                'ml-auto inline-flex items-center px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-widest text-white',
                              )}
                              style={{ backgroundColor: sev.bg }}
                            >
                              {t(
                                `pullRequestDetail.severity.${sevKey}`,
                                {},
                                { defaultValue: sev.label },
                              )}
                            </span>
                          </div>
                          {c.body_md ? (
                            <p
                              className={cm.cn(
                                cm.textSize('xs'),
                                'leading-relaxed text-on-surface-variant whitespace-pre-wrap',
                              )}
                              data-mol-id="review-comment-body"
                            >
                              {c.body_md}
                            </p>
                          ) : null}
                          {c.suggested_patch ? (
                            <pre
                              className={cm.cn(
                                cm.sp('p', 2),
                                // Wrap long patch lines on phones (overflow-x-auto
                                // alone left the tail of a diff unreachable when the
                                // pre sat inside a padding-constrained column).
                                'bg-surface-container-low rounded text-[10px] font-mono whitespace-pre-wrap break-words',
                              )}
                              data-mol-id="review-comment-patch"
                            >
                              {c.suggested_patch}
                            </pre>
                          ) : null}
                          {c.file_path ? (
                            <p
                              className={cm.cn(
                                'text-[10px] font-mono text-on-surface-variant truncate',
                              )}
                            >
                              {c.file_path}
                              {c.line_start ? `:${c.line_start}` : ''}
                            </p>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </article>
            </aside>
          </section>
        </>
      )}
    </div>
  )
}
