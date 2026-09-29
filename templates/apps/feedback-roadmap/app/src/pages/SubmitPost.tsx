/**
 * SubmitPost — post a new feedback request (auth).
 *
 * Title → details textarea → board picker. Posts land in status 'open' on
 * the chosen board; the author's own vote is added automatically so a fresh
 * request starts with demand 1. Sidebar sections mirror the design:
 * submission quality guidelines, what happens after submit, and the
 * author's recent submissions.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { getClient as getHttpClient } from '@molecule/app-http'
import { error as logError } from '@molecule/app-logger'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type ApiBoardSummary, type ApiPost, timeAgo } from '../utils/posts.js'

const GUIDELINES = [
  {
    icon: 'center_focus_strong',
    bodyKey: 'submit.guide1',
    bodyDefault: 'One idea per post — specific, plain, and scoped to a single problem.',
  },
  {
    icon: 'bar_chart',
    bodyKey: 'submit.guide2',
    bodyDefault: 'Say what you need and why; business impact gets requests prioritized faster.',
  },
  {
    icon: 'search',
    bodyKey: 'submit.guide3',
    bodyDefault: 'Search before posting — a duplicate upvote pools votes behind one honest signal.',
  },
]

const NEXT_STEPS = [
  {
    icon: 'timeline',
    bodyKey: 'submit.next1',
    bodyDefault: 'Immediate duplicate analysis runs against every active roadmap node.',
  },
  {
    icon: 'fact_check',
    bodyKey: 'submit.next2',
    bodyDefault: 'The product team triages weekly; high-signal requests get an official response.',
  },
  {
    icon: 'flag',
    bodyKey: 'submit.next3',
    bodyDefault:
      'Accepted requests move onto the public roadmap and every voter is notified on ship.',
  },
]

export function SubmitPost() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth<{ id?: string }>()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [boards, setBoards] = useState<ApiBoardSummary[]>([])
  const [boardId, setBoardId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recent, setRecent] = useState<ApiPost[]>([])

  const userId = user?.id ?? ''

  useEffect(() => {
    let cancelled = false
    const http = getHttpClient()
    void http
      .get<ApiBoardSummary[]>('/api/boards')
      .then((res) => {
        if (cancelled) return
        const data = res?.data
        if (Array.isArray(data) && data.length > 0) {
          setBoards(data)
          setBoardId((prev) => prev || data[0].id)
        }
      })
      .catch((e) => {
        logError('submit.loadBoards', e)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    const http = getHttpClient()
    void http
      .get<{ data?: ApiPost[] }>(
        `/api/posts?author=${encodeURIComponent(userId)}&sort=latest&limit=3`,
      )
      .then((res) => {
        if (!cancelled && Array.isArray(res?.data?.data)) setRecent(res.data.data)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [userId])

  const isReady = useMemo(
    () => title.trim().length >= 3 && body.trim().length >= 1 && boardId.length > 0,
    [title, body, boardId],
  )

  const handleSubmit = async () => {
    if (!isReady || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const http = getHttpClient()
      const resp = await http.post<{ id?: string; error?: string }>('/api/posts', {
        title: title.trim(),
        body: body.trim(),
        board_id: boardId,
      })
      const created = resp?.data
      if (created?.id) {
        // The author's first vote makes the new request count itself.
        void http.post('/api/votes', { post_id: created.id }).catch(() => undefined)
        track({ name: 'post.submitted', properties: { post_id: created.id, board_id: boardId } })
        navigate(`/post/${created.id}`)
        return
      }
      setError(
        created?.error ||
          t('submit.failed', {}, { defaultValue: 'Failed to submit your request.' }),
      )
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t('submit.failed', {}, { defaultValue: 'Failed to submit your request.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), 'max-w-3xl')}>
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[11px] uppercase tracking-widest text-primary',
          )}
        >
          {t('submit.eyebrow', {}, { defaultValue: 'New feedback' })}
        </span>
        <h1 className={cm.cn(cm.fontWeight('bold'), 'text-3xl tracking-tight text-on-surface')}>
          {t('submit.title', {}, { defaultValue: 'What should we build next?' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'submit.subtitle',
            {},
            {
              defaultValue:
                'One idea per post. Say what you need and why — specific requests get shipped.',
            },
          )}
        </p>
      </header>

      <div
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'md' }),
          cm.sp('p', 5),
          'rounded-xl border border-outline-variant/40 bg-surface',
        )}
      >
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <label
            htmlFor="submit-title"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('submit.titleLabel', {}, { defaultValue: 'Title' })}
          </label>
          <input
            id="submit-title"
            data-mol-id="submit-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t(
              'submit.titlePlaceholder',
              {},
              { defaultValue: 'Short, plain, and specific — e.g. "Weekly digest email"' },
            )}
            maxLength={300}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              'w-full rounded-lg border border-outline-variant/50 bg-input-background text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary',
            )}
          />
        </div>

        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <label
            htmlFor="submit-body"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('submit.bodyLabel', {}, { defaultValue: 'Details' })}
          </label>
          <textarea
            id="submit-body"
            data-mol-id="submit-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t(
              'submit.bodyPlaceholder',
              {},
              {
                defaultValue:
                  'What problem does this solve? How do you work around it today? Who else needs it?',
              },
            )}
            maxLength={5000}
            className={cm.cn(
              cm.sp('p', 4),
              cm.textSize('base'),
              'w-full min-h-[160px] rounded-lg border border-outline-variant/50 bg-input-background text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary',
            )}
          />
        </div>

        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('submit.boardLabel', {}, { defaultValue: 'Board' })}
          </span>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
            {boards.map((board) => {
              const selected = board.id === boardId
              return (
                <button
                  key={board.id}
                  type="button"
                  data-mol-id={`submit-board-${board.slug}`}
                  aria-pressed={selected}
                  onClick={() => setBoardId(board.id)}
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.textSize('xs'),
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    'rounded-full border transition-colors',
                    !selected &&
                      'border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low/50',
                  )}
                  style={
                    selected && board.color
                      ? {
                          borderColor: board.color,
                          backgroundColor: `${board.color}1f`,
                          color: board.color,
                        }
                      : undefined
                  }
                >
                  {board.icon ? `${board.icon} ` : ''}
                  {board.name}
                </button>
              )
            })}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.sp('p', 3),
              'rounded-lg bg-error-container/40 text-on-error-container border border-error/40',
            )}
          >
            {error}
          </div>
        )}

        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}>
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t('submit.hint', {}, { defaultValue: 'Your first vote is added automatically.' })}
          </span>
          <button
            type="button"
            data-mol-id="submit-post"
            disabled={!isReady || submitting}
            onClick={() => {
              void handleSubmit()
            }}
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              cm.sp('px', 5),
              cm.sp('py', 2),
              'rounded-full bg-primary text-on-primary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-active transition-colors',
            )}
          >
            {submitting
              ? t('common.submittingEllipsis', {}, { defaultValue: 'Submitting…' })
              : t('submit.cta', {}, { defaultValue: 'Post request' })}
          </button>
        </div>
      </div>

      <div className={cm.cn('grid gap-4 grid-cols-1 md:grid-cols-3')}>
        <section
          aria-labelledby="submit-guidelines"
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'sm' }),
            cm.sp('p', 5),
            'rounded-xl border border-outline-variant/40 bg-surface',
          )}
        >
          <h3
            id="submit-guidelines"
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'), 'text-on-surface')}
          >
            {t('submit.guidelinesTitle', {}, { defaultValue: 'Submission Quality Guidelines' })}
          </h3>
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            {GUIDELINES.map((g) => (
              <li key={g.bodyKey} className={cm.cn(cm.flex({ align: 'start', gap: 'xs' }))}>
                <span
                  className={cm.cn('material-symbols-outlined text-base shrink-0')}
                  style={{ color: 'var(--color-primary)' }}
                  aria-hidden="true"
                >
                  {g.icon}
                </span>
                <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(g.bodyKey, {}, { defaultValue: g.bodyDefault })}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="submit-next"
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'sm' }),
            cm.sp('p', 5),
            'rounded-xl border border-outline-variant/40 bg-surface',
          )}
        >
          <h3
            id="submit-next"
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'), 'text-on-surface')}
          >
            {t('submit.nextTitle', {}, { defaultValue: 'What Happens Next?' })}
          </h3>
          <ol className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            {NEXT_STEPS.map((s) => (
              <li key={s.bodyKey} className={cm.cn(cm.flex({ align: 'start', gap: 'xs' }))}>
                <span
                  className={cm.cn('material-symbols-outlined text-base shrink-0')}
                  style={{ color: 'var(--color-primary)' }}
                  aria-hidden="true"
                >
                  {s.icon}
                </span>
                <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(s.bodyKey, {}, { defaultValue: s.bodyDefault })}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section
          aria-labelledby="submit-recent"
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'sm' }),
            cm.sp('p', 5),
            'rounded-xl border border-outline-variant/40 bg-surface',
          )}
        >
          <h3
            id="submit-recent"
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'), 'text-on-surface')}
          >
            {t('submit.recentTitle', {}, { defaultValue: 'Your Recent Submissions' })}
          </h3>
          {recent.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'submit.recentEmpty',
                {},
                { defaultValue: 'Nothing yet — your submitted requests will appear here.' },
              )}
            </p>
          ) : (
            <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              {recent.map((post) => (
                <li key={post.id}>
                  <Link
                    to={`/post/${post.id}`}
                    data-mol-id="submit-recent-link"
                    className={cm.cn(
                      cm.flex({ direction: 'col' }),
                      cm.sp('py', 1),
                      'text-on-surface hover:text-primary transition-colors',
                    )}
                  >
                    <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                      {post.title}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {timeAgo(post.created_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

export default SubmitPost
