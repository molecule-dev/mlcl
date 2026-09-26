import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type CommentNode, CommentThreadItem } from '../components/CommentThreadItem.js'
import { type LinkPost, timeAgo } from '../components/LinkPostCard.js'
import { VoteCluster, type VoteDirection } from '../components/VoteCluster.js'

export function LinkDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id = '' } = useParams<{ id: string }>()
  const http = useHttpClient()

  const [post, setPost] = useState<LinkPost | null>(null)
  const [comments, setComments] = useState<CommentNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    Promise.all([http.get(`/api/links/${id}`), http.get(`/api/comments/by-link/${id}`)])
      .then(([linkRes, commentRes]) => {
        if (!active) return
        const linkData = (linkRes as { data?: unknown }).data ?? linkRes
        const commentData = (commentRes as { data?: unknown }).data ?? commentRes
        setPost(toPost(linkData))
        setComments(buildTree(commentData))
      })
      .catch((err) => {
        if (!active) return
        setError(
          err instanceof Error
            ? err.message
            : t('linkDetail.loadError', {}, { defaultValue: 'Failed to load this link.' }),
        )
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [http, id, t])

  const handlePostVote = async (next: VoteDirection) => {
    if (!post) return
    setPost((p) =>
      p
        ? {
            ...p,
            user_vote: next,
            points: p.points + voteDelta(p.user_vote ?? null, next),
          }
        : p,
    )
    if (next) {
      track({ name: 'link.voted', properties: { link_id: post.id, direction: next } })
      try {
        await http.post(`/api/votes/link/${post.id}/${next}`)
      } catch (_error) {
        // Optimistic; next data load will reconcile.
      }
    } else {
      try {
        await http.delete(`/api/votes/link/${post.id}`)
      } catch (_error) {
        // Optimistic; next data load will reconcile.
      }
    }
  }

  const handleCommentVote = async (commentId: string, next: VoteDirection) => {
    setComments((prev) => updateCommentVote(prev, commentId, next))
    try {
      if (next) {
        await http.post(`/api/votes/comment/${commentId}/${next}`)
      } else {
        await http.delete(`/api/votes/comment/${commentId}`)
      }
    } catch (_error) {
      // Optimistic; next data load will reconcile.
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return
    setSubmitting(true)
    setCommentError(null)
    try {
      const res = await http.post('/api/comments', {
        resourceType: 'link',
        resourceId: id,
        body: body.trim(),
      })
      const created = toComment((res as { data?: unknown }).data ?? res)
      setComments((prev) => [...prev, created])
      setBody('')
      track({
        name: 'comment.created',
        properties: { comment_id: created.id, link_id: id },
      })
    } catch (_error) {
      setCommentError(
        t('linkDetail.commentError', {}, { defaultValue: 'Comment failed to post — try again.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <p className={cm.cn(cm.textCenter, cm.sp('py', 12), 'text-on-surface-variant')}>
        {t('linkDetail.loading', {}, { defaultValue: 'Reading the link\u2026' })}
      </p>
    )
  }
  if (error || !post) {
    return (
      <p className={cm.cn(cm.textCenter, cm.sp('py', 12), 'text-error')} role="alert">
        {error ?? t('linkDetail.notFound', {}, { defaultValue: 'This link wandered off.' })}
      </p>
    )
  }

  return (
    <article className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <Link
        to="/feed"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          'text-on-surface-variant hover:text-primary transition-colors w-fit',
        )}
      >
        <span className={'material-symbols-outlined text-base'}>arrow_back</span>
        {t('linkDetail.backToFeed', {}, { defaultValue: 'Back to the feed' })}
      </Link>

      <section
        className={cm.cn(
          cm.flex({ gap: 'md' }),
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
        )}
      >
        <VoteCluster
          score={post.points}
          direction={post.user_vote ?? null}
          onVote={handlePostVote}
        />
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'flex-1 min-w-0')}>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface leading-tight',
            )}
          >
            {post.url ? (
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className={'hover:text-primary transition-colors'}
              >
                {post.title}
              </a>
            ) : (
              post.title
            )}
          </h1>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.textSize('sm'),
              'text-on-surface-variant flex-wrap',
            )}
          >
            {post.sub_slug && (
              <Link
                to={`/subs/${post.sub_slug}`}
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-primary hover:underline decoration-2 underline-offset-2',
                )}
              >
                c/{post.sub_name || post.sub_slug}
              </Link>
            )}
            <span className="text-outline">·</span>
            <span>
              {t(
                'linkDetail.byUser',
                { user: post.submitter_name || post.submitter_id },
                { defaultValue: 'submitted by {{user}}' },
              )}
            </span>
            <span className="text-outline">·</span>
            <time dateTime={post.created_at}>{timeAgo(post.created_at)}</time>
            {post.domain && (
              <>
                <span className="text-outline">·</span>
                <span className={'font-mono text-xs'}>({post.domain})</span>
              </>
            )}
          </div>
          {post.text && (
            <p
              className={cm.cn(
                cm.sp('p', 4),
                cm.textSize('base'),
                'rounded-xl bg-surface-container-low text-on-surface leading-relaxed whitespace-pre-wrap',
              )}
            >
              {post.text}
            </p>
          )}
          {post.tags.length > 0 && (
            <div className={cm.cn(cm.flex({ gap: 'xs' }), 'flex-wrap')}>
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  to={`/feed?tag=${encodeURIComponent(tag)}`}
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.roundedFull,
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'py-0.5 bg-primary/10 text-primary hover:bg-primary hover:text-on-primary transition-colors',
                  )}
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <div className={cm.cn(cm.flex({ align: 'baseline', justify: 'between' }), 'flex-wrap')}>
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t(
              'linkDetail.commentsHeading',
              { count: post.comment_count },
              { defaultValue: '{{count}} comments' },
            )}
          </h2>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('linkDetail.commentSort', {}, { defaultValue: 'Best first' })}
          </span>
        </div>

        <form
          onSubmit={handleSubmit}
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'sm' }),
            cm.sp('p', 4),
            'rounded-xl bg-surface-container-low',
          )}
        >
          <textarea
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            aria-label={t('linkDetail.commentAria', {}, { defaultValue: 'Write a comment' })}
            placeholder={t(
              'linkDetail.commentPlaceholder',
              {},
              { defaultValue: 'Add a thoughtful reply…' },
            )}
            className={cm.cn(
              cm.sp('p', 3),
              cm.textSize('base'),
              'w-full rounded-lg border border-outline-variant/40 bg-surface focus:border-primary focus:outline-none resize-y text-on-surface',
            )}
          />
          {commentError && (
            <p
              role="alert"
              className={cm.cn(
                cm.sp('p', 3),
                cm.textSize('sm'),
                'rounded-lg bg-error/10 text-error',
              )}
            >
              {commentError}
            </p>
          )}
          <div className={cm.cn(cm.flex({ justify: 'end', align: 'center', gap: 'sm' }))}>
            <button
              type="submit"
              disabled={submitting || !body.trim()}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.roundedFull,
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'bg-primary text-on-primary hover:bg-primary-hover disabled:opacity-60 transition-colors',
              )}
            >
              {submitting
                ? t('linkDetail.commentSubmitting', {}, { defaultValue: 'Posting\u2026' })
                : t('linkDetail.commentSubmit', {}, { defaultValue: 'Post comment' })}
            </button>
          </div>
        </form>

        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          {comments.length === 0 ? (
            <p className={cm.cn(cm.textCenter, cm.sp('py', 8), 'text-on-surface-variant')}>
              {t(
                'linkDetail.noComments',
                {},
                { defaultValue: 'No comments yet \u2014 stack the first stone.' },
              )}
            </p>
          ) : (
            comments.map((c) => (
              <CommentThreadItem key={c.id} comment={c} onVote={handleCommentVote} />
            ))
          )}
        </div>
      </section>
    </article>
  )
}

function voteDelta(prev: 'up' | 'down' | null, next: 'up' | 'down' | null): number {
  const v = (d: 'up' | 'down' | null) => (d === 'up' ? 1 : d === 'down' ? -1 : 0)
  return v(next) - v(prev)
}

function toPost(raw: unknown): LinkPost {
  const r = (raw as Record<string, unknown>) ?? {}
  return {
    id: String(r.id ?? ''),
    title: String(r.title ?? ''),
    url: typeof r.url === 'string' ? r.url : null,
    domain: typeof r.domain === 'string' ? r.domain : null,
    text: typeof r.text === 'string' ? r.text : null,
    submitter_id: String(r.submitter_id ?? r.submitterId ?? ''),
    submitter_name: typeof r.submitter_name === 'string' ? r.submitter_name : undefined,
    sub_slug: typeof r.sub_slug === 'string' ? r.sub_slug : undefined,
    sub_name: typeof r.sub_name === 'string' ? r.sub_name : undefined,
    points: Number(r.points ?? 0),
    comment_count: Number(r.comment_count ?? r.commentCount ?? 0),
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    user_vote: r.user_vote === 'up' || r.user_vote === 'down' ? r.user_vote : null,
    created_at: String(r.created_at ?? r.createdAt ?? new Date().toISOString()),
  }
}

function toComment(raw: unknown): CommentNode {
  const r = (raw as Record<string, unknown>) ?? {}
  return {
    id: String(r.id ?? ''),
    body: String(r.body ?? ''),
    author_id: String(r.userId ?? r.author_id ?? ''),
    author_name: typeof r.author_name === 'string' ? r.author_name : undefined,
    author_karma: typeof r.author_karma === 'number' ? r.author_karma : undefined,
    parent_id: typeof r.parentId === 'string' ? r.parentId : null,
    points: Number(r.points ?? 0),
    user_vote: r.user_vote === 'up' || r.user_vote === 'down' ? r.user_vote : null,
    created_at: String(r.createdAt ?? r.created_at ?? new Date().toISOString()),
    children: [],
  }
}

function buildTree(payload: unknown): CommentNode[] {
  const list = Array.isArray(payload) ? payload.map(toComment) : []
  const byId = new Map<string, CommentNode>()
  list.forEach((c) => byId.set(c.id, { ...c, children: [] }))
  const roots: CommentNode[] = []
  byId.forEach((c) => {
    if (c.parent_id && byId.has(c.parent_id)) {
      byId.get(c.parent_id)!.children!.push(c)
    } else {
      roots.push(c)
    }
  })
  return roots
}

function updateCommentVote(list: CommentNode[], id: string, next: VoteDirection): CommentNode[] {
  return list.map((c) => {
    if (c.id === id) {
      const delta =
        (next === 'up' ? 1 : next === 'down' ? -1 : 0) -
        (c.user_vote === 'up' ? 1 : c.user_vote === 'down' ? -1 : 0)
      return { ...c, user_vote: next, points: c.points + delta }
    }
    return c.children ? { ...c, children: updateCommentVote(c.children, id, next) } : c
  })
}

export default LinkDetail
