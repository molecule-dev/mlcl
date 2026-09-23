import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { usePostComments, usePostDetail } from '../lib/api.js'
import { fmtCount, fmtRelativeShort, vividGradient } from '../lib/sample-feed.js'

export function PostDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const safeId = id || ''
  const {
    data: post,
    loading: postLoading,
    error: postError,
    refetch: refetchPost,
  } = usePostDetail(safeId)
  const {
    data: comments,
    loading: commentsLoading,
    refetch: refetchComments,
  } = usePostComments(safeId)

  const [likeOverride, setLikeOverride] = useState<{ liked: boolean; like_count: number } | null>(
    null,
  )
  const [followError, setFollowError] = useState<string | null>(null)
  const [following, setFollowing] = useState(false)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [composeError, setComposeError] = useState<string | null>(null)

  const liked = likeOverride?.liked ?? post?.liked ?? false
  const likeCount = likeOverride?.like_count ?? post?.like_count ?? 0

  const toggleLike = useCallback(async () => {
    if (!post) return
    const next = { liked: !liked, like_count: liked ? Math.max(0, likeCount - 1) : likeCount + 1 }
    setLikeOverride(next)
    try {
      const res = await http.post<{ liked: boolean; like_count: number }>(`/posts/${post.id}/like`)
      if (res.data) {
        setLikeOverride({ liked: res.data.liked, like_count: res.data.like_count })
        track({ name: 'post.liked', properties: { post_id: post.id, liked: res.data.liked } })
      }
    } catch (err) {
      logError('postDetail.toggleLike', err)
      setLikeOverride({ liked, like_count: likeCount })
    }
  }, [post, liked, likeCount, http])

  const submitComment = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!post || !draft.trim()) return
      setPosting(true)
      setComposeError(null)
      try {
        await http.post(`/posts/${post.id}/comments`, { body: draft.trim() })
        track({ name: 'comment.added', properties: { post_id: post.id } })
        setDraft('')
        await Promise.all([refetchComments(), refetchPost()])
      } catch (err) {
        setComposeError(err instanceof Error ? err.message : 'Could not post comment')
      } finally {
        setPosting(false)
      }
    },
    [draft, post, http, refetchComments, refetchPost],
  )

  const followAuthor = useCallback(async () => {
    if (!post || following) return
    setFollowing(true)
    setFollowError(null)
    try {
      await http.post(`/follows/users/${post.author.id}`)
      track({
        name: 'follow.toggled',
        properties: { target_id: post.author.id, following: true },
      })
    } catch (err) {
      setFollowError(err instanceof Error ? err.message : 'Could not follow user')
      setFollowing(false)
    }
  }, [post, following, http])

  if (postError) {
    return (
      <div
        className={cm.cn(
          cm.sp('p', 6),
          cm.sp('py', 8),
          'lg:px-10 mx-auto w-full max-w-3xl text-center',
        )}
      >
        <h1 className={cm.cn(cm.textSize('2xl'), 'font-extrabold')}>
          {t('postDetail.notFoundTitle', {}, { defaultValue: 'Post not found' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-2')}>
          {postError.message}
        </p>
        <Link to="/feed" className={cm.cn('inline-block mt-6 underline')}>
          {t('postDetail.backCta', {}, { defaultValue: 'Back to feed' })}
        </Link>
      </div>
    )
  }

  if (postLoading || !post) {
    return (
      <div className={cm.cn(cm.sp('p', 6), cm.sp('py', 8), 'lg:px-10 mx-auto w-full max-w-7xl')}>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('postDetail.loading', {}, { defaultValue: 'Loading post…' })}
        </p>
      </div>
    )
  }

  const cover = vividGradient(post.cover_index)

  return (
    <div className={cm.cn(cm.sp('p', 6), cm.sp('py', 8), 'lg:px-10 mx-auto w-full max-w-7xl')}>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('mb', 4),
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        <Link
          to="/feed"
          className={cm.cn('hover:text-primary transition-colors inline-flex items-center gap-1')}
        >
          <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
            arrow_back
          </span>
          {t('postDetail.backCta', {}, { defaultValue: 'Back to feed' })}
        </Link>
        <span aria-hidden="true">·</span>
        <span>{t('postDetail.eyebrow', {}, { defaultValue: 'Post' })}</span>
      </div>

      <div
        className={cm.cn(
          'grid grid-cols-1 lg:grid-cols-12 gap-8 bg-surface-container-lowest rounded-[2rem] overflow-hidden border border-outline-variant/40 shadow-sm',
        )}
      >
        <div className={cm.cn('lg:col-span-7')}>
          <div
            className={cm.cn('relative aspect-square lg:aspect-auto lg:h-full min-h-[480px]')}
            style={{ background: cover }}
          >
            <div
              className={cm.cn(
                'absolute inset-0 flex items-center justify-center pointer-events-none',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-white/30 text-[200px]')}>
                photo
              </span>
            </div>
            <div
              className={cm.cn(
                'absolute right-6 top-6 flex flex-wrap gap-1.5 max-w-[60%] justify-end',
              )}
            >
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className={cm.cn(
                    'px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-surface/20 backdrop-blur-md text-white',
                  )}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className={cm.cn('lg:col-span-5 flex flex-col')}>
          <header
            className={cm.cn(
              cm.sp('p', 5),
              cm.flex({ align: 'center', justify: 'between' }),
              'border-b border-outline-variant/40',
            )}
          >
            <Link
              to={`/profile/${post.author.handle}`}
              className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'group')}
            >
              <span
                className={cm.cn(
                  'inline-flex w-12 h-12 rounded-full items-center justify-center text-white font-extrabold shadow-sm',
                )}
                style={{ background: vividGradient(post.author.cover_index) }}
                aria-hidden="true"
              >
                {post.author.display_name.charAt(0)}
              </span>
              <span className={cm.cn(cm.flex({ direction: 'col' }))}>
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'group-hover:text-primary transition-colors',
                  )}
                >
                  {post.author.display_name}
                </span>
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  @{post.author.handle}
                  {post.location ? ` · ${post.location}` : ''}
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={followAuthor}
              disabled={following}
              data-testid="follow-author"
              className={cm.cn(
                cm.sp('px', 3),
                'h-8 rounded-full text-xs font-bold uppercase tracking-widest bg-primary text-on-primary hover:bg-primary/90 disabled:bg-surface-container-high disabled:text-on-surface-variant transition-colors',
              )}
            >
              {following
                ? t('common.following', {}, { defaultValue: 'Following' })
                : t('common.follow', {}, { defaultValue: 'Follow' })}
            </button>
          </header>
          {followError && (
            <p className={cm.cn(cm.textSize('xs'), cm.sp('px', 5), cm.sp('py', 2), 'text-error')}>
              {followError}
            </p>
          )}

          <div className={cm.cn(cm.sp('p', 5), 'border-b border-outline-variant/40')}>
            <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed')}>
              <span className={cm.cn(cm.fontWeight('semibold'), 'mr-1')}>
                @{post.author.handle}
              </span>
              {post.caption}
            </p>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'mt-3')}>
              <button
                type="button"
                onClick={toggleLike}
                data-testid="like-button"
                aria-pressed={liked}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  liked ? 'text-error' : 'text-on-surface',
                  'transition-colors hover:text-error',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-[24px]')}
                  style={liked ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  favorite
                </span>
                <span data-testid="like-count" className={cm.cn('tabular-nums')}>
                  {fmtCount(likeCount)}
                </span>
              </button>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant uppercase tracking-widest tabular-nums',
                )}
              >
                {fmtRelativeShort(post.posted_at)}
              </span>
            </div>
          </div>

          <ul
            id="comments"
            data-testid="comments-list"
            className={cm.cn(cm.flex1, 'overflow-y-auto divide-y divide-outline-variant/40')}
          >
            {commentsLoading && (comments ?? []).length === 0 && (
              <li className={cm.cn(cm.sp('p', 5), cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('postDetail.commentsLoading', {}, { defaultValue: 'Loading comments…' })}
              </li>
            )}
            {!commentsLoading && (comments ?? []).length === 0 && (
              <li className={cm.cn(cm.sp('p', 5), cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'postDetail.commentsEmpty',
                  {},
                  { defaultValue: 'No comments yet — be the first.' },
                )}
              </li>
            )}
            {(comments ?? []).map((c) => (
              <li
                key={c.id}
                className={cm.cn(cm.sp('p', 5), cm.flex({ align: 'start', gap: 'sm' }))}
              >
                <span
                  className={cm.cn(
                    'inline-flex shrink-0 w-9 h-9 rounded-full items-center justify-center text-white font-extrabold text-sm shadow-sm',
                  )}
                  style={{ background: vividGradient(c.author.cover_index) }}
                  aria-hidden="true"
                >
                  {c.author.display_name.charAt(0)}
                </span>
                <div className={cm.cn('flex-1 min-w-0')}>
                  <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed')}>
                    <Link
                      to={`/profile/${c.author.handle}`}
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        'mr-1 hover:text-primary transition-colors',
                      )}
                    >
                      @{c.author.handle}
                    </Link>
                    {c.body}
                  </p>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'md' }),
                      cm.textSize('xs'),
                      'text-on-surface-variant uppercase tracking-widest mt-1 tabular-nums',
                    )}
                  >
                    <span>{fmtRelativeShort(c.posted_at)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <form
            onSubmit={submitComment}
            className={cm.cn(
              cm.sp('p', 4),
              cm.flex({ align: 'center', gap: 'sm' }),
              'border-t border-outline-variant/40',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-on-surface-variant text-[24px]')}
            >
              mood
            </span>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              data-testid="comment-input"
              placeholder={t(
                'postDetail.commentPlaceholder',
                {},
                { defaultValue: 'Add a comment…' },
              )}
              className={cm.cn(
                cm.flex1,
                cm.sp('p', 0),
                cm.textSize('sm'),
                'bg-transparent border-none focus:ring-0 outline-none placeholder:text-on-surface-variant',
              )}
            />
            <button
              type="submit"
              data-testid="comment-submit"
              disabled={posting || !draft.trim()}
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-primary hover:text-primary/80 disabled:text-on-surface-variant transition-colors',
              )}
            >
              {posting
                ? t('common.postingEllipsis', {}, { defaultValue: 'Posting…' })
                : t('postDetail.post', {}, { defaultValue: 'Post' })}
            </button>
          </form>
          {composeError && (
            <p className={cm.cn(cm.textSize('xs'), cm.sp('px', 5), cm.sp('pb', 2), 'text-error')}>
              {composeError}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
