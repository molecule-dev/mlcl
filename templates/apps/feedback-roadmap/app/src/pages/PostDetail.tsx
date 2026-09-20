/**
 * PostDetail — one feedback request, publicly readable.
 *
 * Layout: vote rail + title + status badge → body → official admin
 * response card (accent-bordered, only when present) → merged-into banner
 * on duplicates → comment thread with a signed-in composer.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { error as logError } from '@molecule/app-logger'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StatusBadge } from '../components/StatusBadge.js'
import { VoteButton } from '../components/VoteButton.js'
import { type ApiPost, authorName, displayStatus, formatDate, timeAgo } from '../utils/posts.js'

export function PostDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const { isAuthenticated } = useAuth()
  const [post, setPost] = useState<ApiPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [voting, setVoting] = useState(false)
  const [commentBody, setCommentBody] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const http = getHttpClient()
    void http
      .get<ApiPost>(`/api/posts/${id}`)
      .then((res) => {
        if (cancelled) return
        if (res?.data?.id) setPost(res.data)
        else setError(t('posts.notFound', {}, { defaultValue: 'Post not found' }))
      })
      .catch((e) => {
        logError('postDetail.load', e)
        if (!cancelled) setError(t('posts.notFound', {}, { defaultValue: 'Post not found' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, t])

  const toggleVote = useCallback(async () => {
    if (!post || voting) return
    setVoting(true)
    try {
      const http = getHttpClient()
      const res = await http.post<{ voted?: boolean; vote_count?: number }>('/api/votes', {
        post_id: post.id,
      })
      setPost((prev) =>
        prev
          ? {
              ...prev,
              viewer_voted: res?.data?.voted ?? !prev.viewer_voted,
              vote_count: res?.data?.vote_count ?? prev.vote_count ?? 0,
            }
          : prev,
      )
    } catch (e) {
      logError('postDetail.vote', e)
    } finally {
      setVoting(false)
    }
  }, [post, voting])

  const submitComment = useCallback(async () => {
    if (!post || !commentBody.trim() || posting) return
    setPosting(true)
    try {
      const http = getHttpClient()
      const res = await http.post<{ id?: string }>(`/api/posts/${post.id}/comments`, {
        body: commentBody.trim(),
      })
      if (res?.data?.id) {
        setCommentBody('')
        const refreshed = await http.get<ApiPost>(`/api/posts/${post.id}`)
        if (refreshed?.data?.id) setPost(refreshed.data)
      }
    } catch (e) {
      logError('postDetail.comment', e)
    } finally {
      setPosting(false)
    }
  }, [post, commentBody, posting])

  if (loading) {
    return (
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  }

  if (error || !post) {
    return (
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), 'items-start')}>
        <p
          className={cm.cn(cm.textSize('base'), cm.fontWeight('medium'), 'text-on-surface-variant')}
        >
          {error}
        </p>
        <Link
          to="/boards"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-primary hover:underline',
          )}
        >
          {t('postDetail.backToBoards', {}, { defaultValue: 'Back to boards' })}
        </Link>
      </div>
    )
  }

  const status = displayStatus(post)

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), 'max-w-3xl')}>
      <Link
        to={post.board ? `/b/${post.board.slug}` : '/boards'}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'text-on-surface-variant hover:text-primary transition-colors self-start',
        )}
      >
        <span className="material-symbols-outlined text-sm" aria-hidden="true">
          arrow_back
        </span>
        {post.board?.name ?? t('postDetail.backToBoards', {}, { defaultValue: 'Back to boards' })}
      </Link>

      <article className={cm.cn(cm.flex({ align: 'start', gap: 'md' }))}>
        <VoteButton
          size="lg"
          count={post.vote_count ?? 0}
          voted={post.viewer_voted ?? false}
          onVote={isAuthenticated ? toggleVote : undefined}
          disabled={voting}
        />
        <div className={cm.cn(cm.flex1, cm.flex({ direction: 'col', gap: 'sm' }), 'min-w-0')}>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
            <StatusBadge status={status} label={post.roadmap_label} size="md" />
          </div>
          <h1
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('2xl'),
              'leading-snug tracking-tight text-on-surface',
            )}
          >
            {post.title}
          </h1>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'flex-wrap text-on-surface-variant',
            )}
          >
            <span className={cm.cn(cm.fontWeight('semibold'))}>{authorName(post.author)}</span>
            <span aria-hidden="true">·</span>
            <span>
              {t(
                'postDetail.submitted',
                { date: formatDate(post.created_at) },
                { defaultValue: 'Submitted {{date}}' },
              )}
            </span>
            <span aria-hidden="true">·</span>
            <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
              <span className="material-symbols-outlined" aria-hidden="true">
                chat_bubble
              </span>
              {t(
                'postDetail.commentCount',
                { count: post.comment_count ?? 0 },
                { defaultValue: '{{count}} comments' },
              )}
            </span>
          </div>
        </div>
      </article>

      {post.merged_into_id && (
        <div
          role="status"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('p', 4),
            'rounded-xl border',
          )}
          style={{
            borderColor: 'var(--color-status-merged)',
            backgroundColor: 'var(--color-status-merged-light)',
          }}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            merge
          </span>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
            {t('postDetail.mergedInto', {}, { defaultValue: 'This request was merged into' })}{' '}
            {post.merged_into ? (
              <Link
                to={`/post/${post.merged_into.id}`}
                className={cm.cn(cm.fontWeight('bold'), 'underline')}
              >
                {post.merged_into.title}
              </Link>
            ) : (
              t('postDetail.mergedUnknown', {}, { defaultValue: 'another request' })
            )}
            {t('postDetail.mergedVotesNote', {}, { defaultValue: ' — its votes now count there.' })}
          </p>
        </div>
      )}

      <div
        className={cm.cn(cm.sp('p', 5), 'rounded-xl border border-outline-variant/40 bg-surface')}
      >
        <p
          className={cm.cn(
            cm.textSize('base'),
            'text-on-surface leading-relaxed whitespace-pre-wrap',
          )}
        >
          {post.body}
        </p>
      </div>

      {post.admin_response && (
        <section
          data-mol-id="official-response"
          className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('p', 5))}
          style={{
            borderLeft: '4px solid var(--color-official-border)',
            backgroundColor: 'var(--color-official-bg)',
          }}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-widest',
            )}
            style={{ color: 'var(--color-primary)' }}
          >
            <span className="material-symbols-outlined text-sm" aria-hidden="true">
              verified
            </span>
            {t('postDetail.officialResponse', {}, { defaultValue: 'Official response' })}
          </span>
          <p
            className={cm.cn(
              cm.textSize('base'),
              'text-on-surface leading-relaxed whitespace-pre-wrap',
            )}
          >
            {post.admin_response}
          </p>
          {post.admin_responded_at && (
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'postDetail.respondedAt',
                { date: formatDate(post.admin_responded_at) },
                { defaultValue: 'Responded {{date}}' },
              )}
            </span>
          )}
        </section>
      )}

      {post.shipped_at && (
        <section
          role="status"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('p', 4),
            'rounded-xl border',
          )}
          style={{
            borderColor: 'var(--color-status-shipped)',
            backgroundColor: 'var(--color-status-shipped-light)',
          }}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            local_shipping
          </span>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
            {t(
              'postDetail.shippedOn',
              { date: formatDate(post.shipped_at) },
              { defaultValue: 'Shipped on {{date}} — see the changelog entry.' },
            )}
          </p>
        </section>
      )}

      <section className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <h2 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
          {t('postDetail.commentsTitle', {}, { defaultValue: 'Comments' })}
        </h2>

        {isAuthenticated ? (
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <textarea
              data-mol-id="comment-input"
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder={t(
                'postDetail.commentPlaceholder',
                {},
                { defaultValue: 'Add context, a use case, or a +1 with details…' },
              )}
              maxLength={5000}
              className={cm.cn(
                cm.sp('p', 3),
                cm.textSize('sm'),
                'w-full min-h-[80px] rounded-lg border border-outline-variant/50 bg-input-background text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary',
              )}
            />
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {commentBody.length}/5000
              </span>
              <button
                type="button"
                data-mol-id="comment-submit"
                disabled={!commentBody.trim() || posting}
                onClick={() => {
                  void submitComment()
                }}
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-full bg-primary text-on-primary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-active transition-colors self-end',
                )}
              >
                {posting
                  ? t('common.submittingEllipsis', {}, { defaultValue: 'Submitting…' })
                  : t('postDetail.commentSubmit', {}, { defaultValue: 'Comment' })}
              </button>
            </div>
          </div>
        ) : (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            <Link
              to="/login"
              className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>{' '}
            {t('postDetail.signInToComment', {}, { defaultValue: 'to join the discussion.' })}
          </p>
        )}

        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          {(post.comments ?? []).map((comment) => (
            <div
              key={comment.id}
              data-mol-id="comment"
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'xs' }),
                cm.sp('p', 4),
                'rounded-xl border border-outline-variant/40 bg-surface',
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.textSize('xs'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(6),
                    cm.h(6),
                    cm.roundedFull,
                    cm.fontWeight('bold'),
                  )}
                  style={{
                    backgroundColor: 'var(--color-primary-container)',
                    color: 'var(--color-primary)',
                  }}
                  aria-hidden="true"
                >
                  {authorName(comment.author, '?').slice(0, 1).toUpperCase()}
                </span>
                <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                  {authorName(comment.author)}
                </span>
                {comment.author?.role === 'admin' && (
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'rounded-full px-1.5 py-0 text-[9px] uppercase tracking-widest',
                    )}
                    style={{
                      backgroundColor: 'var(--color-secondary-container)',
                      color: 'var(--color-secondary)',
                    }}
                  >
                    {t('postDetail.team', {}, { defaultValue: 'Team' })}
                  </span>
                )}
                <span aria-hidden="true">·</span>
                <span>{timeAgo(comment.created_at)}</span>
              </div>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  'text-on-surface leading-relaxed whitespace-pre-wrap',
                )}
              >
                {comment.body}
              </p>
            </div>
          ))}
          {(post.comments ?? []).length === 0 && (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('postDetail.noComments', {}, { defaultValue: 'No comments yet.' })}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

export default PostDetail
