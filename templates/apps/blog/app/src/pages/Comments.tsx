import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import CommentsEmptyState from '../components/CommentsEmptyState.js'
import CommentsTopNavBar from '../components/CommentsTopNavBar.js'
import MobileTopBar from '../components/MobileTopBar.js'
import SideNavBar from '../components/SideNavBar.js'

interface Comment {
  id: string
  body: string
  status?: 'pending' | 'approved' | 'spam'
  resourceType?: string
  resourceId?: string
  userId?: string
  createdAt?: string
  author_name?: string
  created_at?: string
  post_title?: string
}

type Filter = 'all' | 'pending' | 'approved' | 'spam'

interface CommentsListResponse {
  data?: Comment[]
  total?: number
}

function Comments() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [searchParams] = useSearchParams()
  const postIdFromUrl = searchParams.get('postId') ?? ''
  const pageTitle = t('comments.pageTitle', {}, { defaultValue: 'Comments' })

  const [comments, setComments] = useState<Comment[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [postFilter, setPostFilter] = useState(postIdFromUrl)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actioning, setActioning] = useState<string | null>(null)
  const [newCommentBody, setNewCommentBody] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])

  useEffect(() => {
    setPostFilter(postIdFromUrl)
  }, [postIdFromUrl])

  const reload = async (currentFilter: Filter = filter, currentPost: string = postFilter) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (currentFilter !== 'all') params.set('status', currentFilter)
      else params.set('status', 'all')
      if (currentPost) {
        params.set('resourceType', 'post')
        params.set('resourceId', currentPost)
      }
      const res = await http.get<CommentsListResponse>(`/api/comments?${params.toString()}`)
      const payload = res.data
      const data = Array.isArray((payload as CommentsListResponse).data)
        ? ((payload as CommentsListResponse).data as Comment[])
        : []
      setComments(data)
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t('comments.loadError', {}, { defaultValue: 'Could not load comments.' }),
      )
      setComments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload(filter, postFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, postFilter])

  const counts = useMemo(() => {
    return {
      all: comments.length,
      pending: comments.filter((c) => c.status === 'pending').length,
      approved: comments.filter((c) => c.status === 'approved').length,
      spam: comments.filter((c) => c.status === 'spam').length,
    }
  }, [comments])

  const moderate = async (id: string, status: 'approved' | 'spam') => {
    setActioning(id)
    try {
      await http.patch(`/api/comments/${id}`, { status })
      void track({
        name: status === 'approved' ? 'comment.approved' : 'comment.marked_spam',
        properties: { commentId: id },
      })
      await reload(filter, postFilter)
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t('comments.moderateError', {}, { defaultValue: 'Could not update comment.' }),
      )
    } finally {
      setActioning(null)
    }
  }

  const remove = async (id: string) => {
    setActioning(id)
    try {
      await http.delete(`/api/comments/${id}`)
      void track({ name: 'comment.deleted', properties: { commentId: id } })
      setComments((prev) => prev.filter((c) => c.id !== id))
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t('comments.deleteError', {}, { defaultValue: 'Could not delete comment.' }),
      )
    } finally {
      setActioning(null)
    }
  }

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!postFilter) {
      setCreateError(
        t(
          'comments.requirePost',
          {},
          { defaultValue: 'Choose a post to comment on by visiting it first.' },
        ),
      )
      return
    }
    if (!newCommentBody.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      const res = await http.post('/api/comments', {
        body: newCommentBody.trim(),
        resourceType: 'post',
        resourceId: postFilter,
      })
      const created =
        res && typeof res === 'object'
          ? ((res as { data?: { id?: string }; id?: string }).data?.id ??
            (res as { id?: string }).id)
          : undefined
      void track({
        name: 'comment.created',
        properties: { ...(created ? { commentId: created } : {}), postId: postFilter },
      })
      setNewCommentBody('')
      await reload(filter, postFilter)
    } catch (err) {
      setCreateError(
        err instanceof Error
          ? err.message
          : t('comments.createError', {}, { defaultValue: 'Could not create comment.' }),
      )
    } finally {
      setCreating(false)
    }
  }

  const filterButtonClass = (active: boolean) =>
    cm.cn(
      cm.sp('px', 6),
      cm.sp('py', 2),
      cm.roundedFull,
      cm.textSize('sm'),
      'transition-all',
      active
        ? cm.cn(
            'bg-surface-container-lowest',
            cm.textPrimary,
            cm.fontWeight('semibold'),
            'shadow-sm',
          )
        : cm.cn('text-on-surface-variant hover:text-on-surface', cm.fontWeight('medium')),
    )

  return (
    <>
      <SideNavBar />
      <CommentsTopNavBar />
      {/* Mobile chrome (renders nothing on desktop) */}
      <MobileTopBar />
      <main
        aria-label={pageTitle}
        className={cm.cn(cm.sp('px', 4), 'md:px-8 md:ml-[240px] pt-24 pb-16')}
      >
        {postFilter ? (
          <div
            data-mol-id="comments-post-filter-banner"
            className={cm.cn(
              cm.sp('p', 4),
              cm.sp('mb', 6),
              'rounded-lg bg-surface-container-low text-on-surface',
            )}
          >
            {t(
              'comments.filteredByPost',
              { id: postFilter },
              { defaultValue: 'Showing comments for post {{id}}.' },
            )}
          </div>
        ) : null}
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', justify: 'between', gap: 'lg' }),
            cm.sp('mb', 10),
            'md:flex-row md:items-center',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', wrap: 'wrap', gap: 'xs' }),
              cm.sp('p', 1),
              cm.roundedFull,
              'bg-surface-container-low w-fit max-w-full',
            )}
          >
            {(['all', 'pending', 'approved', 'spam'] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                data-mol-id={`comments-filter-${f}`}
                onClick={() => setFilter(f)}
                className={filterButtonClass(filter === f)}
                aria-pressed={filter === f}
              >
                {t(
                  `commentsFilterBar.${f}`,
                  {},
                  { defaultValue: f.charAt(0).toUpperCase() + f.slice(1) },
                )}
                <span className={cm.cn(cm.sp('ml', 1), 'opacity-60')}>{counts[f]}</span>
              </button>
            ))}
          </div>
        </div>

        {postFilter ? (
          <form
            onSubmit={(e) => void submitComment(e)}
            data-mol-id="comments-create-form"
            className={cm.cn(
              cm.sp('p', 6),
              cm.sp('mb', 8),
              cm.stack(4),
              'rounded-xl bg-surface-container-lowest',
            )}
          >
            <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
              {t('comments.createTitle', {}, { defaultValue: 'Add a comment' })}
            </h3>
            <textarea
              data-mol-id="comments-create-body"
              value={newCommentBody}
              onChange={(e) => setNewCommentBody(e.target.value)}
              required
              minLength={1}
              maxLength={10000}
              rows={3}
              className={cm.cn(
                cm.sp('p', 3),
                cm.w('full'),
                cm.textSize('sm'),
                'rounded border border-outline-variant bg-surface-container-low',
              )}
              placeholder={t(
                'comments.createPlaceholder',
                {},
                { defaultValue: 'Write your reply…' },
              )}
            />
            {createError ? (
              <p
                role="alert"
                data-mol-id="comments-create-error"
                className={cm.cn(cm.textSize('xs'), 'text-error')}
              >
                {createError}
              </p>
            ) : null}
            <button
              type="submit"
              data-mol-id="comments-create-submit"
              disabled={creating || !newCommentBody.trim()}
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 2),
                cm.roundedFull,
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary disabled:opacity-50 w-fit',
              )}
            >
              {creating
                ? t('common.postingEllipsis', {}, { defaultValue: 'Posting…' })
                : t('comments.post', {}, { defaultValue: 'Post comment' })}
            </button>
          </form>
        ) : null}

        {error ? (
          <div
            role="alert"
            data-mol-id="comments-error"
            className={cm.cn(
              cm.sp('p', 4),
              cm.sp('mb', 6),
              'rounded-lg bg-error-container text-on-error-container',
            )}
          >
            {error}
          </div>
        ) : null}
        {loading ? (
          <p
            data-mol-id="comments-loading"
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          >
            {t('comments.loading', {}, { defaultValue: 'Loading comments…' })}
          </p>
        ) : comments.length === 0 ? (
          <CommentsEmptyState />
        ) : (
          <ul className={cm.stack(4)} data-mol-id="comments-list">
            {comments.map((c) => (
              <li
                key={c.id}
                data-mol-id={`comment-${c.id}`}
                className={cm.cn(cm.sp('p', 6), 'rounded-xl bg-surface-container-lowest')}
              >
                {c.author_name ? (
                  <div
                    className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 3))}
                    data-mol-id={`comment-${c.id}-author`}
                  >
                    <span
                      aria-hidden="true"
                      className={cm.cn(
                        cm.w(8),
                        cm.h(8),
                        cm.roundedFull,
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'bg-primary-container text-on-primary',
                      )}
                    >
                      {c.author_name.slice(0, 1).toUpperCase()}
                    </span>
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'font-headline',
                      )}
                    >
                      {c.author_name}
                    </span>
                    {(c.created_at ?? c.createdAt) ? (
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {new Date(c.created_at ?? c.createdAt ?? '').toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <p className={cm.cn(cm.textSize('sm'), 'font-body text-on-surface')}>{c.body}</p>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('mt', 2),
                    'text-on-surface-variant uppercase tracking-wide',
                  )}
                >
                  {c.post_title
                    ? `${c.post_title} · `
                    : c.resourceType
                      ? `${c.resourceType} · `
                      : ''}
                  {c.status ?? 'pending'}
                </p>
                <div className={cm.cn(cm.flex({ gap: 'sm' }), cm.sp('mt', 4))}>
                  <button
                    type="button"
                    data-mol-id={`comment-${c.id}-approve`}
                    onClick={() => void moderate(c.id, 'approved')}
                    disabled={actioning === c.id || c.status === 'approved'}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      cm.roundedFull,
                      'bg-primary text-on-primary hover:opacity-90 disabled:opacity-50',
                    )}
                  >
                    {t('comments.approve', {}, { defaultValue: 'Approve' })}
                  </button>
                  <button
                    type="button"
                    data-mol-id={`comment-${c.id}-spam`}
                    onClick={() => void moderate(c.id, 'spam')}
                    disabled={actioning === c.id || c.status === 'spam'}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      cm.roundedFull,
                      'bg-surface-container text-on-surface hover:opacity-90 disabled:opacity-50',
                    )}
                  >
                    {t('comments.markSpam', {}, { defaultValue: 'Mark spam' })}
                  </button>
                  <button
                    type="button"
                    data-mol-id={`comment-${c.id}-delete`}
                    onClick={() => void remove(c.id)}
                    disabled={actioning === c.id}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      cm.roundedFull,
                      'bg-error-container text-on-error-container hover:opacity-90 disabled:opacity-50',
                    )}
                  >
                    {t('common.delete', {}, { defaultValue: 'Delete' })}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}

export default Comments
export { Comments, Comments as CommentsPage }
