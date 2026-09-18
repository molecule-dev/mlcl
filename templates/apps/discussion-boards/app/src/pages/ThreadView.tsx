import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PostCard } from '../components/PostCard.js'
import { ReputationBadge } from '../components/ReputationBadge.js'

interface ThreadDetail {
  id: string
  slug?: string
  title: string
  category: { name: string; slug: string; color?: string }
  status: { pinned?: boolean; locked?: boolean; resolved?: boolean; hot?: boolean }
  posts: Array<{
    id: string
    body: string
    created_at: string
    edited_at?: string
    upvotes: number
    is_solution?: boolean
    has_upvoted?: boolean
    bookmarked?: boolean
    author: {
      username: string
      display_name?: string
      avatar_url?: string
      reputation: number
      role?: 'member' | 'moderator' | 'admin'
      joined_at?: string
      post_count?: number
    }
  }>
  reply_count: number
  view_count: number
  participant_count: number
  last_activity_at: string
}

const formatNumber = (n: number) => n.toLocaleString()

export function ThreadView() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const params = useParams<{ id: string }>()
  const [thread, setThread] = useState<ThreadDetail | null>(null)
  const [reply, setReply] = useState('')
  const [posting, setPosting] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [flagged, setFlagged] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [postError, setPostError] = useState<string | null>(null)
  const replyRef = useRef<HTMLTextAreaElement>(null)

  const loadThread = useCallback(async () => {
    if (!params.id) return
    setError(null)
    try {
      const res = await http.get<{ data: ThreadDetail }>(`/api/threads/${params.id}`)
      setThread(res?.data?.data ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load thread')
      setThread(null)
    }
  }, [http, params.id])

  useEffect(() => {
    loadThread()
  }, [loadThread])

  useEffect(() => {
    if (!params.id) return
    let cancelled = false
    http
      .get<{ bookmarked: boolean }>(`/api/threads/${params.id}/bookmark`)
      .then((res) => !cancelled && setBookmarked(!!res?.data?.bookmarked))
      .catch(() => {
        /* ignore */
      })
    return () => {
      cancelled = true
    }
  }, [http, params.id])

  const detail = thread
  const opAuthor = detail?.posts[0]?.author

  const statuses = useMemo(() => {
    if (!detail) return []
    const list: Array<{ key: string; icon: string; defaultLabel: string; tone: string }> = []
    if (detail.status.pinned)
      list.push({
        key: 'pinned',
        icon: 'push_pin',
        defaultLabel: 'Pinned',
        tone: 'bg-warning-light text-warning',
      })
    if (detail.status.locked)
      list.push({
        key: 'locked',
        icon: 'lock',
        defaultLabel: 'Locked',
        tone: 'bg-border text-foreground-secondary',
      })
    if (detail.status.resolved)
      list.push({
        key: 'resolved',
        icon: 'check_circle',
        defaultLabel: 'Resolved',
        tone: 'bg-success-light text-success',
      })
    if (detail.status.hot)
      list.push({
        key: 'hot',
        icon: 'local_fire_department',
        defaultLabel: 'Hot',
        tone: 'bg-error-light text-error',
      })
    return list
  }, [detail])

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reply.trim() || posting || !detail) return
    setPosting(true)
    setPostError(null)
    try {
      await http.post(`/api/threads/${detail.id}/posts`, { body: reply })
      setReply('')
      await loadThread()
    } catch (err) {
      setPostError(
        err instanceof Error
          ? err.message
          : t('threadView.replyFailed', {}, { defaultValue: 'Could not post reply. Try again.' }),
      )
    } finally {
      setPosting(false)
    }
  }

  const handleToggleBookmark = async () => {
    if (!detail) return
    try {
      if (bookmarked) {
        await http.delete(`/api/threads/${detail.id}/bookmark`)
        setBookmarked(false)
      } else {
        await http.post(`/api/threads/${detail.id}/bookmark`)
        setBookmarked(true)
      }
    } catch (_error) {
      /* surfaced via reload on next mount */
    }
  }

  const focusReply = () => {
    const el = replyRef.current
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.focus({ preventScroll: true })
  }

  const handleQuote = (postBody: string) => {
    const quoted = postBody
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n')
    setReply((current) => (current.trim() ? `${current}\n\n${quoted}\n\n` : `${quoted}\n\n`))
    focusReply()
  }

  // Flag a post for the moderation queue. The OP is a synthetic `op-<topicId>`
  // post built from the topic itself, so it reports as the topic.
  const handleFlag = async (postId: string) => {
    if (!detail || flagged[postId]) return
    const isOp = postId.startsWith('op-')
    try {
      await http.post('/api/moderation-reports', {
        target_type: isOp ? 'topic' : 'post',
        target_id: isOp ? detail.id : postId,
        reason: 'flagged-from-thread',
      })
      setFlagged((prev) => ({ ...prev, [postId]: true }))
    } catch (_error) {
      // Flagging is best-effort — the button stays enabled so the user can retry.
    }
  }

  if (!detail) {
    return (
      <div className={cm.cn(cm.stack(4), 'mx-auto w-full max-w-[760px]')}>
        {error ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-error')} role="alert">
            {error}
          </p>
        ) : (
          <p className={cm.textMuted}>
            {t('threadView.loading', {}, { defaultValue: 'Loading thread…' })}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.stack(8), 'mx-auto w-full max-w-[760px]')}>
      <header className={cm.cn(cm.stack(4))}>
        <nav
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          <Link to="/c" className={cm.cn('hover:text-primary')}>
            {t('threadView.breadcrumb.categories', {}, { defaultValue: 'Categories' })}
          </Link>
          <span className={cm.cn('mx-2 text-on-surface-variant/40')}>/</span>
          {detail.category.slug && (
            <Link to={`/c/${detail.category.slug}`} className={cm.cn('hover:text-primary')}>
              {detail.category.name}
            </Link>
          )}
        </nav>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
          {statuses.map((s) => (
            <span
              key={s.key}
              className={cm.cn(
                cm.sp('px', 2),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'inline-flex items-center gap-1 py-0.5 text-[10px] uppercase tracking-widest',
                s.tone,
              )}
            >
              <span className="material-symbols-outlined text-[12px]" aria-hidden>
                {s.icon}
              </span>
              {t(`threadView.status.${s.key}`, {}, { defaultValue: s.defaultLabel })}
            </span>
          ))}
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }))}>
          <h1
            className={cm.cn(
              'text-3xl md:text-4xl font-extrabold tracking-tight leading-tight text-on-surface',
            )}
          >
            {detail.title}
          </h1>
          <button
            type="button"
            onClick={handleToggleBookmark}
            aria-pressed={bookmarked}
            aria-label={
              bookmarked
                ? t('threadView.unbookmark', {}, { defaultValue: 'Remove bookmark' })
                : t('threadView.bookmark', {}, { defaultValue: 'Bookmark thread' })
            }
            className={cm.cn(
              cm.sp('p', 2),
              cm.roundedFull,
              'shrink-0 transition-colors',
              bookmarked
                ? 'bg-primary/10 text-primary'
                : 'bg-surface-container text-on-surface-variant hover:text-primary',
            )}
          >
            <span className="material-symbols-outlined" aria-hidden>
              {bookmarked ? 'bookmark' : 'bookmark_border'}
            </span>
          </button>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'md' }),
            cm.textSize('xs'),
            'flex-wrap text-on-surface-variant',
          )}
        >
          {opAuthor && (
            <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
              <Link
                to={`/u/${opAuthor.username}`}
                className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
              >
                @{opAuthor.username}
              </Link>
              <ReputationBadge score={opAuthor.reputation} />
            </span>
          )}
          <span className="text-on-surface-variant">·</span>
          <span>
            {t(
              'threadView.replies',
              { count: formatNumber(detail.reply_count) },
              { defaultValue: '{{count}} replies' },
            )}
          </span>
          <span className="text-on-surface-variant">·</span>
          <span>
            {t(
              'common.countViews',
              { count: formatNumber(detail.view_count) },
              { defaultValue: '{{count}} views' },
            )}
          </span>
          <span className="text-on-surface-variant">·</span>
          <span>
            {t(
              'threadView.participants',
              { count: detail.participant_count.toLocaleString() },
              { defaultValue: '{{count}} voices' },
            )}
          </span>
        </div>
      </header>

      <div className={cm.cn(cm.stack(4))}>
        {detail.posts.map((post, idx) => (
          <PostCard
            key={post.id}
            id={post.id}
            isOriginalPost={idx === 0}
            body={post.body}
            createdAt={post.created_at}
            editedAt={post.edited_at}
            upvotes={post.upvotes}
            hasUpvoted={post.has_upvoted}
            bookmarked={post.bookmarked}
            flagged={!!flagged[post.id]}
            isSolution={post.is_solution}
            onReply={detail.status.locked ? undefined : focusReply}
            onQuote={detail.status.locked ? undefined : () => handleQuote(post.body)}
            onFlag={() => handleFlag(post.id)}
            author={{
              username: post.author.username,
              displayName: post.author.display_name,
              avatarUrl: post.author.avatar_url,
              reputation: post.author.reputation,
              role: post.author.role,
              joinedAt: post.author.joined_at,
              postCount: post.author.post_count,
            }}
          />
        ))}
      </div>

      {detail.status.locked ? (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            cm.flex({ align: 'center', gap: 'sm' }),
            'rounded-2xl bg-surface-secondary text-foreground-secondary border border-border',
          )}
        >
          <span className="material-symbols-outlined" aria-hidden>
            lock
          </span>
          <p className={cm.textSize('sm')}>
            {t(
              'threadView.locked',
              {},
              { defaultValue: 'This thread is locked. New replies are disabled.' },
            )}
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleReplySubmit}
          className={cm.cn(
            cm.sp('p', 4),
            cm.stack(3),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
          )}
        >
          <label
            htmlFor="thread-reply"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('threadView.reply.label', {}, { defaultValue: 'Add to the conversation' })}
          </label>
          <textarea
            id="thread-reply"
            ref={replyRef}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={5}
            placeholder={t(
              'threadView.reply.placeholder',
              {},
              { defaultValue: 'Markdown supported. Quote with > and link with [text](url).' },
            )}
            className={cm.cn(
              cm.sp('p', 3),
              'w-full rounded-xl bg-surface-container border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm leading-relaxed',
            )}
          />
          {postError && (
            <p className={cm.cn(cm.textSize('sm'), 'text-error')} role="alert">
              {postError}
            </p>
          )}
          <div
            className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-2')}
          >
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'threadView.reply.hint',
                {},
                { defaultValue: 'Be considered. Quote sources. Lift the conversation.' },
              )}
            </p>
            <button
              type="submit"
              disabled={posting || !reply.trim()}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.roundedFull,
                cm.textSize('sm'),
                'inline-flex items-center gap-2 bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-sm shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden>
                send
              </span>
              {posting
                ? t('common.postingEllipsis', {}, { defaultValue: 'Posting…' })
                : t('threadView.reply.submit', {}, { defaultValue: 'Post reply' })}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default ThreadView
