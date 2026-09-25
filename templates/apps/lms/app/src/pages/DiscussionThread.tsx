import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DiscussionsAppShell } from '../components/AppShell.js'

interface ThreadRow {
  id: string
  course_id: string
  title: string
  content: string
  author_id?: string | null
  author_name?: string | null
  created_at?: string | null
}

interface ReplyRow {
  id: string
  discussion_id: string
  author_id?: string | null
  author_name?: string | null
  content: string
  created_at?: string | null
}

const unwrap = <T,>(res: unknown): T | null => {
  if (res && typeof res === 'object' && 'data' in res) return (res as { data: T }).data ?? null
  return (res as T) ?? null
}

const unwrapList = <T,>(res: unknown): T[] => {
  if (Array.isArray(res)) return res as T[]
  if (
    res &&
    typeof res === 'object' &&
    'data' in res &&
    Array.isArray((res as { data: unknown }).data)
  )
    return (res as { data: T[] }).data
  return []
}

/**
 * Single discussion thread: the opening post, its replies, and a reply
 * composer. Reached from the thread cards on `/discussions` — previously
 * those cards linked to a route that did not exist.
 */
function DiscussionThread() {
  const cm = getClassMap()
  const http = useHttpClient()
  const { t } = useTranslation()
  const { discussionId } = useParams<{ discussionId: string }>()
  const [thread, setThread] = useState<ThreadRow | null>(null)
  const [replies, setReplies] = useState<ReplyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [posting, setPosting] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)

  useEffect(() => {
    if (!discussionId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get(`/api/discussions/${discussionId}`).catch(() => null),
      http.get(`/api/discussions/${discussionId}/replies`).catch(() => null),
    ])
      .then(([threadRes, repliesRes]) => {
        if (cancelled) return
        const row = unwrap<ThreadRow>(threadRes)
        if (row?.id) {
          setThread(row)
          setReplies(unwrapList<ReplyRow>(repliesRes))
        } else {
          setError(t('discussions.notFound', {}, { defaultValue: 'Discussion not found' }))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [discussionId, http, t])

  const submitReply = async (): Promise<void> => {
    if (!discussionId || !reply.trim() || posting) return
    setPosting(true)
    setReplyError(null)
    try {
      const res: unknown = await http.post(`/api/discussions/${discussionId}/replies`, {
        content: reply.trim(),
      })
      const created = unwrap<ReplyRow>(res)
      if (created?.id) setReplies((prev) => [...prev, created])
      setReply('')
      track({ name: 'discussion.replied', properties: { discussionId } })
    } catch (err) {
      setReplyError(
        (err as Error)?.message ||
          t('discussions.createReplyError', {}, { defaultValue: 'Failed to create reply' }),
      )
    } finally {
      setPosting(false)
    }
  }

  const formatDate = (raw?: string | null): string => {
    if (!raw) return ''
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const authorLabel = (name?: string | null): string =>
    (name ?? '').trim() || t('discussions.classmate', {}, { defaultValue: 'Classmate' })

  return (
    <DiscussionsAppShell
      className={'bg-background text-on-surface'}
      contentClassName={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'))}
    >
      <div
        className={cm.cn(cm.sp('p', 8), cm.maxW('4xl'), cm.mxAuto, cm.w('full'), cm.stack(8))}
        data-mol-id="discussion-thread"
      >
        <Link
          to="/discussions"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 2 }),
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'text-foreground-secondary hover:text-primary transition-colors self-start',
          )}
          data-mol-id="thread-back"
        >
          <span className={cm.cn('material-symbols-outlined', cm.textSize('lg'))}>arrow_back</span>
          {t('discussions.backToDiscussions', {}, { defaultValue: 'Back to discussions' })}
        </Link>

        {loading ? (
          <div className={cm.cn(cm.flex({ justify: 'center' }), cm.sp('py', 12))}>
            <div
              className={cm.cn(
                cm.w(10),
                cm.h(10),
                cm.roundedFull,
                'border-4 border-primary border-t-transparent animate-spin',
              )}
              role="status"
              aria-label={t('common.loading', {}, { defaultValue: 'Loading' })}
            />
          </div>
        ) : error || !thread ? (
          <div
            className={cm.cn(
              cm.sp('p', 6),
              'bg-error-container/30 text-on-error-container rounded-2xl',
            )}
            role="alert"
            data-mol-id="thread-error"
          >
            {error ?? t('discussions.notFound', {}, { defaultValue: 'Discussion not found' })}
          </div>
        ) : (
          <>
            <article
              className={cm.cn(
                cm.sp('p', 8),
                cm.stack(4),
                'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10',
              )}
              data-mol-id="thread-post"
            >
              <h1
                className={cm.cn(cm.textSize('3xl'), cm.fontWeight('extrabold'), 'tracking-tight')}
              >
                {thread.title}
              </h1>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'discussions.postedBy',
                  { name: authorLabel(thread.author_name), date: formatDate(thread.created_at) },
                  { defaultValue: 'Posted by {{name}} · {{date}}' },
                )}
              </p>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  'text-on-surface leading-relaxed whitespace-pre-wrap',
                )}
              >
                {thread.content}
              </p>
            </article>

            <section className={cm.stack(4)} data-mol-id="thread-replies">
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
                {t(
                  'discussions.repliesHeading',
                  { count: replies.length },
                  { defaultValue: 'Replies ({{count}})' },
                )}
              </h2>
              {replies.length === 0 ? (
                <p
                  className={cm.cn(
                    cm.sp('p', 6),
                    cm.textSize('sm'),
                    'text-on-surface-variant rounded-2xl border border-outline-variant/20 bg-surface-container-lowest',
                  )}
                  data-mol-id="thread-replies-empty"
                >
                  {t(
                    'discussions.noRepliesYet',
                    {},
                    { defaultValue: 'No replies yet — be the first to answer.' },
                  )}
                </p>
              ) : (
                <ul className={cm.stack(3)}>
                  {replies.map((r) => (
                    <li
                      key={r.id}
                      className={cm.cn(
                        cm.sp('p', 5),
                        cm.stack(2),
                        'bg-surface-container-lowest rounded-2xl border border-outline-variant/10',
                      )}
                      data-mol-id="thread-reply"
                    >
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          'text-on-surface-variant',
                        )}
                      >
                        {t(
                          'discussions.replyBy',
                          { name: authorLabel(r.author_name), date: formatDate(r.created_at) },
                          { defaultValue: '{{name}} · {{date}}' },
                        )}
                      </p>
                      <p
                        className={cm.cn(
                          cm.textSize('sm'),
                          'text-on-surface leading-relaxed whitespace-pre-wrap',
                        )}
                      >
                        {r.content}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(3),
                'bg-surface-container-lowest rounded-2xl border border-outline-variant/10',
              )}
              data-mol-id="thread-reply-composer"
            >
              <label
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'uppercase tracking-wider text-foreground-secondary',
                )}
                htmlFor="thread-reply-input"
              >
                {t('discussions.yourReply', {}, { defaultValue: 'Your reply' })}
              </label>
              <textarea
                id="thread-reply-input"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('p', 3),
                  cm.textSize('sm'),
                  'rounded-xl bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 outline-none text-on-surface min-h-24 resize-y',
                )}
                maxLength={5000}
                placeholder={t(
                  'discussions.replyPlaceholder',
                  {},
                  { defaultValue: 'Share an answer or add to the conversation…' },
                )}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
              {replyError ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-error')} role="alert">
                  {replyError}
                </p>
              ) : null}
              <div className={cm.flex({ justify: 'end' })}>
                <button
                  type="button"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'rounded-xl bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50',
                  )}
                  data-mol-id="thread-reply-submit"
                  disabled={posting || !reply.trim()}
                  onClick={() => void submitReply()}
                >
                  {posting
                    ? t('discussions.composerPosting', {}, { defaultValue: 'Posting…' })
                    : t('discussions.postReply', {}, { defaultValue: 'Post reply' })}
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </DiscussionsAppShell>
  )
}

export default DiscussionThread
export { DiscussionThread, DiscussionThread as DiscussionThreadPage }
