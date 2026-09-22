import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import type { TranslateFunction } from '@molecule/app-i18n'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import type { RealtimeConnection } from '@molecule/app-realtime'
import { getClassMap } from '@molecule/app-ui'

import { getRealtimeConnection } from '../lib/realtime.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface CommentRow {
  id: string
  document_id: string
  author_id: string | null
  parent_id: string | null
  body: string
  is_resolved: boolean
  created_at: string
}

interface DocumentRow {
  id: string
  title: string
}

const CURSOR_PALETTE = ['#4f46e5', '#e11d48', '#16a34a', '#d97706', '#7c3aed'] as const

function colorFor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return CURSOR_PALETTE[h % CURSOR_PALETTE.length]!
}

function initialsOf(id: string | null): string {
  if (!id) return '·'
  return id.slice(0, 2).toUpperCase()
}

/**
 * Append a comment only when its id is not already present. The realtime room
 * echoes `comment:created` for our OWN posts, and that echo can land before the
 * POST response resolves — appending both copies duplicated the list row (and
 * tripped React's duplicate-key warning). Both paths converge here so either
 * arrival order yields exactly one row.
 */
function appendUnique(list: CommentRow[], comment: CommentRow): CommentRow[] {
  return list.some((c) => c.id === comment.id) ? list : [...list, comment]
}

function fmtRelative(iso: string, t: TranslateFunction): string {
  const diffH = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60))
  if (diffH < 1) return t('time.justNow', {}, { defaultValue: 'just now' })
  if (diffH < 24) return t('time.hoursAgo', { hours: diffH }, { defaultValue: '{{hours}}h ago' })
  return t('time.daysAgo', { days: Math.floor(diffH / 24) }, { defaultValue: '{{days}}d ago' })
}

export function Comments() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const params = useParams<{ id: string }>()
  const docId = params.id ?? ''
  const [doc, setDoc] = useState<DocumentRow | null>(null)
  const [comments, setComments] = useState<CommentRow[]>([])
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open')
  const [draftBody, setDraftBody] = useState('')
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!docId) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get(`/api/documents/${docId}`).catch(() => null),
      http.get(`/api/comments/${docId}`).catch(() => []),
    ])
      .then(([docRes, comRes]) => {
        if (cancelled) return
        setDoc(unwrapSingle<DocumentRow>(docRes))
        setComments(unwrapList<CommentRow>(comRes))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [docId, http])

  // Live collaboration: merge peer comment events from the `document:<id>` room
  // BY ID, mirroring this page's own optimistic setComments updates — so the
  // client's OWN echoed events are idempotent no-ops. Server:
  // api/src/handlers/comments.ts; room-auth contract: lib/realtime.ts.
  useEffect(() => {
    if (!docId) return
    const room = `document:${docId}`
    let active = true
    let connection: RealtimeConnection | null = null

    const toComment = (data: unknown): CommentRow | null =>
      typeof data === 'object' && data !== null && typeof (data as { id?: unknown }).id === 'string'
        ? (data as CommentRow)
        : null
    const idOf = (data: unknown): string | null =>
      typeof data === 'object' && data !== null && typeof (data as { id?: unknown }).id === 'string'
        ? (data as { id: string }).id
        : null

    const onCreated = (data: unknown) => {
      const comment = toComment(data)
      if (!comment) return
      setComments((prev) => appendUnique(prev, comment))
    }
    const onUpserted = (data: unknown) => {
      const comment = toComment(data)
      if (!comment) return
      setComments((prev) =>
        prev.some((c) => c.id === comment.id)
          ? prev.map((c) => (c.id === comment.id ? comment : c))
          : [...prev, comment],
      )
    }
    const onDeleted = (data: unknown) => {
      const commentId = idOf(data)
      if (!commentId) return
      // Mirror handleDelete: drop the comment AND its replies (parent_id === id).
      setComments((prev) => prev.filter((c) => c.id !== commentId && c.parent_id !== commentId))
    }

    getRealtimeConnection()
      .then((conn) => {
        if (!active) return
        connection = conn
        conn.on('comment:created', onCreated)
        conn.on('comment:resolved', onUpserted)
        conn.on('comment:reopened', onUpserted)
        conn.on('comment:deleted', onDeleted)
        return conn.joinRoom(room)
      })
      .catch(() => {
        // Realtime is best-effort; the initial fetch already populated the list.
      })

    return () => {
      active = false
      if (connection) {
        connection.off('comment:created', onCreated)
        connection.off('comment:resolved', onUpserted)
        connection.off('comment:reopened', onUpserted)
        connection.off('comment:deleted', onDeleted)
        connection.leaveRoom(room).catch(() => {})
      }
    }
  }, [docId])

  const grouped = useMemo(() => {
    const roots = comments.filter((c) => !c.parent_id)
    const repliesByParent = new Map<string, CommentRow[]>()
    for (const c of comments) {
      if (c.parent_id) {
        const arr = repliesByParent.get(c.parent_id) ?? []
        arr.push(c)
        repliesByParent.set(c.parent_id, arr)
      }
    }
    return roots.map((root) => ({ root, replies: repliesByParent.get(root.id) ?? [] }))
  }, [comments])

  const filtered = grouped.filter(({ root }) => {
    if (filter === 'open') return !root.is_resolved
    if (filter === 'resolved') return root.is_resolved
    return true
  })

  const openCount = grouped.filter((g) => !g.root.is_resolved).length
  const resolvedCount = grouped.length - openCount

  const onAddRoot = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    if (!docId || !draftBody.trim()) return
    try {
      const res = await http.post(`/api/comments/${docId}`, { body: draftBody })
      const created = unwrapSingle<CommentRow>(res)
      if (created) setComments((prev) => appendUnique(prev, created))
      void track({
        name: 'comment.added',
        properties: { document_id: docId, comment_id: created?.id ?? null, is_reply: false },
      })
      setDraftBody('')
    } catch (error) {
      logError('comments.addRoot', error)
      setError(t('comments.addFailed', {}, { defaultValue: 'Could not post comment.' }))
    }
  }

  const onReply = async (parentId: string): Promise<void> => {
    const text = replyDrafts[parentId]
    if (!docId || !text || !text.trim()) return
    try {
      const res = await http.post(`/api/comments/${docId}`, { body: text, parent_id: parentId })
      const created = unwrapSingle<CommentRow>(res)
      if (created) setComments((prev) => appendUnique(prev, created))
      void track({
        name: 'comment.added',
        properties: { document_id: docId, comment_id: created?.id ?? null, is_reply: true },
      })
      setReplyDrafts((prev) => ({ ...prev, [parentId]: '' }))
    } catch (error) {
      logError('comments.reply', error)
      setError(t('comments.replyFailed', {}, { defaultValue: 'Could not post reply.' }))
    }
  }

  const onResolve = async (commentId: string): Promise<void> => {
    if (!docId) return
    try {
      await http.put(`/api/comments/${docId}/${commentId}/resolve`, {})
      setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, is_resolved: true } : c)))
      void track({
        name: 'comment.resolved',
        properties: { document_id: docId, comment_id: commentId },
      })
    } catch (error) {
      logError('comments.resolve', error)
      setError(t('comments.resolveFailed', {}, { defaultValue: 'Could not resolve.' }))
    }
  }

  const onReopen = async (commentId: string): Promise<void> => {
    if (!docId) return
    try {
      await http.put(`/api/comments/${docId}/${commentId}/reopen`, {})
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, is_resolved: false } : c)),
      )
      void track({
        name: 'comment.reopened',
        properties: { document_id: docId, comment_id: commentId },
      })
    } catch (error) {
      logError('comments.reopen', error)
      setError(t('comments.reopenFailed', {}, { defaultValue: 'Could not reopen.' }))
    }
  }

  const onDelete = async (commentId: string): Promise<void> => {
    if (!docId) return
    try {
      await http.delete(`/api/comments/${docId}/${commentId}`)
      setComments((prev) => prev.filter((c) => c.id !== commentId && c.parent_id !== commentId))
      void track({
        name: 'comment.deleted',
        properties: { document_id: docId, comment_id: commentId },
      })
    } catch (error) {
      logError('comments.delete', error)
      setError(t('comments.deleteFailed', {}, { defaultValue: 'Could not delete.' }))
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')} data-testid="comments-root">
      <header className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <Link
            to={`/doc/${docId}`}
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'text-primary hover:underline',
            )}
          >
            ← {t('comments.backToDoc', {}, { defaultValue: 'Back to manuscript' })}
          </Link>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('3xl'),
              cm.fontWeight('extrabold'),
              'tracking-tight',
            )}
          >
            {doc?.title ?? t('comments.heading', {}, { defaultValue: 'Comment threads' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'comments.subtitle',
              { open: openCount, resolved: resolvedCount },
              { defaultValue: '{{open}} open · {{resolved}} resolved' },
            )}
          </p>
        </div>
      </header>

      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl border-l-4 border-l-error bg-error/5 text-sm text-error',
          )}
        >
          {error}
        </div>
      ) : null}

      <form
        onSubmit={onAddRoot}
        className={cm.cn(cm.flex({ gap: 'sm' }))}
        data-testid="comments-new-form"
      >
        <input
          type="text"
          value={draftBody}
          onChange={(e) => setDraftBody(e.target.value)}
          placeholder={t(
            'comments.newPlaceholder',
            {},
            { defaultValue: 'Add a comment to the manuscript…' },
          )}
          className={cm.cn(
            cm.w('full'),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'rounded-full border border-outline-variant bg-surface-container-lowest focus:border-primary focus:outline-none',
          )}
          data-testid="comments-new-body"
        />
        <button
          type="submit"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('extrabold'),
            cm.textSize('sm'),
            'rounded-full bg-primary text-white shadow-sm',
          )}
          data-testid="comments-new-submit"
        >
          {t('comments.newSubmit', {}, { defaultValue: 'Post' })}
        </button>
      </form>

      <nav
        className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
        aria-label={t('comments.filterLabel', {}, { defaultValue: 'Filter threads' })}
      >
        {(['open', 'resolved', 'all'] as const).map((opt) => {
          const isActive = filter === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setFilter(opt)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-full transition-colors',
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
              )}
              data-testid={`comments-filter-${opt}`}
            >
              {t(
                `comments.filter.${opt}`,
                {},
                { defaultValue: opt === 'all' ? 'All' : opt === 'open' ? 'Open' : 'Resolved' },
              )}
            </button>
          )
        })}
      </nav>

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-center text-sm text-on-surface-variant')}>
          {t('comments.loading', {}, { defaultValue: 'Loading threads…' })}
        </p>
      ) : (
        <ol className={cm.cn('space-y-4')} data-testid="comments-list">
          {filtered.map(({ root, replies }) => (
            <li
              key={root.id}
              className={cm.cn(
                cm.sp('p', 6),
                'rounded-2xl border-l-4 ring-1 ring-outline-variant',
                root.is_resolved
                  ? 'border-l-success bg-success/5'
                  : 'border-l-warning bg-warning/5',
              )}
              data-testid={`comments-thread-${root.id}`}
              data-resolved={root.is_resolved ? 'true' : 'false'}
            >
              <div className={cm.flex({ align: 'start', gap: 'md' })}>
                <span
                  className={cm.cn(
                    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold text-white',
                  )}
                  style={{ backgroundColor: colorFor(root.author_id ?? root.id) }}
                  aria-hidden="true"
                >
                  {initialsOf(root.author_id)}
                </span>
                <div className={cm.cn('min-w-0 flex-1')}>
                  <p className={cm.cn(cm.fontWeight('extrabold'), 'text-sm text-on-surface')}>
                    {root.author_id ?? t('settings.unknown', {}, { defaultValue: 'Unknown' })}
                  </p>
                  <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-on-surface')}>
                    {root.body}
                  </p>
                  <p
                    className={cm.cn(cm.sp('mt', 1), cm.textSize('xs'), 'text-on-surface-variant')}
                  >
                    {fmtRelative(root.created_at, t)}
                  </p>

                  {replies.length > 0 ? (
                    <ol
                      className={cm.cn(
                        cm.sp('mt', 4),
                        'space-y-3 border-l border-outline-variant pl-4',
                      )}
                    >
                      {replies.map((r) => (
                        <li key={r.id} className={cm.flex({ align: 'start', gap: 'sm' })}>
                          <span
                            className={cm.cn(
                              'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white',
                            )}
                            style={{ backgroundColor: colorFor(r.author_id ?? r.id) }}
                            aria-hidden="true"
                          >
                            {initialsOf(r.author_id)}
                          </span>
                          <div className={cm.cn('min-w-0 flex-1')}>
                            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>{r.body}</p>
                            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                              {fmtRelative(r.created_at, t)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : null}

                  <div className={cm.cn(cm.sp('mt', 4), cm.flex({ align: 'center', gap: 'sm' }))}>
                    <input
                      type="text"
                      value={replyDrafts[root.id] ?? ''}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({ ...prev, [root.id]: e.target.value }))
                      }
                      placeholder={t('comments.replyPlaceholder', {}, { defaultValue: 'Reply…' })}
                      className={cm.cn(
                        cm.w('full'),
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        'rounded-full border border-outline-variant bg-surface-container-lowest focus:border-primary focus:outline-none',
                      )}
                      data-testid={`comments-reply-input-${root.id}`}
                    />
                    <button
                      type="button"
                      onClick={() => onReply(root.id)}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.fontWeight('extrabold'),
                        cm.textSize('xs'),
                        'rounded-full bg-primary text-white',
                      )}
                      data-testid={`comments-reply-submit-${root.id}`}
                    >
                      {t('common.reply', {}, { defaultValue: 'Reply' })}
                    </button>
                    {root.is_resolved ? (
                      <button
                        type="button"
                        onClick={() => onReopen(root.id)}
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 2),
                          cm.fontWeight('extrabold'),
                          cm.textSize('xs'),
                          'rounded-full bg-warning/15 text-warning hover:bg-warning/25',
                        )}
                        data-testid={`comments-reopen-${root.id}`}
                      >
                        {t('comments.reopen', {}, { defaultValue: 'Reopen' })}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onResolve(root.id)}
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 2),
                          cm.fontWeight('extrabold'),
                          cm.textSize('xs'),
                          'rounded-full bg-success/15 text-success hover:bg-success/25',
                        )}
                        data-testid={`comments-resolve-${root.id}`}
                      >
                        {t('comments.resolve', {}, { defaultValue: 'Resolve' })}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDelete(root.id)}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.fontWeight('extrabold'),
                        cm.textSize('xs'),
                        'rounded-full text-error hover:bg-error/10',
                      )}
                      data-testid={`comments-delete-${root.id}`}
                    >
                      {t('common.delete', {}, { defaultValue: 'Delete' })}
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
          {filtered.length === 0 ? (
            <li
              className={cm.cn(cm.sp('py', 16), 'text-center text-sm text-on-surface-variant')}
              data-testid="comments-empty"
            >
              {t('comments.empty', {}, { defaultValue: 'No threads in this view.' })}
            </li>
          ) : null}
        </ol>
      )}
    </div>
  )
}

export default Comments
