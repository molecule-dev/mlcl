import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PromptDialog } from '../components/PromptDialog.js'

interface CardRow {
  id: string
  board_id: string
  list_id: string | null
  title: string
  description: unknown
  priority: 'low' | 'normal' | 'high' | 'urgent'
  due_date: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

interface BoardRow {
  id: string
  name: string
  background_color: string
  lists?: { id: string; name: string }[]
}

interface CommentRow {
  id: string
  card_id: string
  author_id: string
  body: string
  created_at: string
}

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in (res as object)) {
    return (res as { data: T }).data
  }
  return res as T
}

function descriptionString(desc: unknown): string {
  if (typeof desc === 'string') return desc
  if (desc && typeof desc === 'object' && 'text' in (desc as object)) {
    return String((desc as { text: unknown }).text ?? '')
  }
  return ''
}

const PRIORITY_TONE: Record<CardRow['priority'], string> = {
  urgent: 'bg-rose-500/15 text-error',
  high: 'bg-amber-500/15 text-warning',
  normal: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  low: 'bg-slate-500/15 text-foreground',
}

const PRIORITY_OPTIONS: CardRow['priority'][] = ['low', 'normal', 'high', 'urgent']

export function CardDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [card, setCard] = useState<CardRow | null>(null)
  const [board, setBoard] = useState<BoardRow | null>(null)
  const [comments, setComments] = useState<CommentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [commentBody, setCommentBody] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)

  const [editTitleOpen, setEditTitleOpen] = useState(false)
  const [editDescOpen, setEditDescOpen] = useState(false)
  const [editBusy, setEditBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const cardRes = await http.get<unknown>(`/api/cards/${id}`)
      const c = unwrap<CardRow>(cardRes)
      if (!c?.id) {
        setError(t('cardDetail.notFound', {}, { defaultValue: 'Card not found.' }))
        setCard(null)
        return
      }
      setCard(c)
      setError(null)
      const [boardRes, commentsRes] = await Promise.allSettled([
        http.get(`/api/boards/${c.board_id}`),
        http.get(`/api/comments?card_id=${c.id}`),
      ])
      if (boardRes.status === 'fulfilled') {
        setBoard(unwrap<BoardRow>(boardRes.value))
      }
      if (commentsRes.status === 'fulfilled') {
        const list = unwrap<CommentRow[]>(commentsRes.value) ?? []
        setComments(Array.isArray(list) ? list : [])
      }
    } catch (_error) {
      // error displayed to user via setError below
      setError(t('cardDetail.loadError', {}, { defaultValue: 'Failed to load card.' }))
    } finally {
      setLoading(false)
    }
  }, [http, id, t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!card) return
    const trimmed = commentBody.trim()
    if (!trimmed || postingComment) return
    setPostingComment(true)
    setCommentError(null)
    try {
      const postRes = await http.post('/api/comments', { card_id: card.id, body: trimmed })
      const comment = unwrap<CommentRow>(postRes)
      if (comment?.id) {
        track({ name: 'card.commented', properties: { card_id: card.id, comment_id: comment.id } })
      }
      setCommentBody('')
      const res = await http.get(`/api/comments?card_id=${card.id}`)
      const list = unwrap<CommentRow[]>(res) ?? []
      setComments(Array.isArray(list) ? list : [])
    } catch (_error) {
      // error displayed to user via setCommentError below
      setCommentError(
        t('cardDetail.comment.error', {}, { defaultValue: 'Could not post comment.' }),
      )
    } finally {
      setPostingComment(false)
    }
  }

  const handleArchive = async () => {
    if (!card) return
    setBusy(true)
    try {
      await http.post(`/api/cards/${card.id}/archive`, {})
      track({ name: 'card.archived', properties: { board_id: card.board_id, card_id: card.id } })
      navigate(`/boards/${card.board_id}`)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!card) return
    if (
      !window.confirm(
        t('cardDetail.deleteConfirm', {}, { defaultValue: 'Delete this card permanently?' }),
      )
    ) {
      return
    }
    setBusy(true)
    try {
      await http.delete(`/api/cards/${card.id}`)
      track({ name: 'card.deleted', properties: { board_id: card.board_id, card_id: card.id } })
      navigate(`/boards/${card.board_id}`)
    } finally {
      setBusy(false)
    }
  }

  const handlePriority = async (priority: CardRow['priority']) => {
    if (!card) return
    setBusy(true)
    try {
      await http.patch(`/api/cards/${card.id}`, { priority })
      track({
        name: 'card.updated',
        properties: { card_id: card.id, field: 'priority', value: priority },
      })
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const handleMove = async (listId: string) => {
    if (!card) return
    setBusy(true)
    try {
      await http.post(`/api/cards/${card.id}/move`, { list_id: listId, position: 0 })
      track({
        name: 'card.moved',
        properties: { board_id: card.board_id, card_id: card.id, to_list_id: listId },
      })
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const handleEditTitle = async (title: string) => {
    if (!card) return
    setEditBusy(true)
    try {
      await http.patch(`/api/cards/${card.id}`, { title })
      track({ name: 'card.updated', properties: { card_id: card.id, field: 'title' } })
      setEditTitleOpen(false)
      await refresh()
    } finally {
      setEditBusy(false)
    }
  }

  const handleEditDesc = async (text: string) => {
    if (!card) return
    setEditBusy(true)
    try {
      await http.patch(`/api/cards/${card.id}`, { description: { text } })
      track({ name: 'card.updated', properties: { card_id: card.id, field: 'description' } })
      setEditDescOpen(false)
      await refresh()
    } finally {
      setEditBusy(false)
    }
  }

  if (loading && !card) {
    return (
      <div className={cm.cn(cm.sp('p', 8))}>
        <p className={cm.textMuted}>
          {t('cardDetail.loading', {}, { defaultValue: 'Loading\u2026' })}
        </p>
      </div>
    )
  }

  if (error || !card) {
    return (
      <div className={cm.cn(cm.sp('p', 8))}>
        <p className="text-error font-semibold">
          {error ?? t('cardDetail.notFound', {}, { defaultValue: 'Card not found.' })}
        </p>
        <Link to="/boards" className="text-primary font-bold mt-4 inline-block">
          {t('cardDetail.backToBoards', {}, { defaultValue: 'Back to boards' })}
        </Link>
      </div>
    )
  }

  const desc = descriptionString(card.description)
  const dueLabel = card.due_date
    ? new Date(card.due_date).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : null
  const currentList = board?.lists?.find((l) => l.id === card.list_id)
  const otherLists = (board?.lists ?? []).filter((l) => l.id !== card.list_id)

  return (
    <div className={cm.cn(cm.sp('p', 8), cm.flex({ direction: 'col' }), cm.stack(6))}>
      <Link
        to={`/boards/${card.board_id}`}
        className={cm.cn(
          'text-[11px] font-black uppercase tracking-[0.32em] text-primary-dark inline-flex items-center gap-1 hover:opacity-80 transition-opacity',
        )}
      >
        <span className="material-symbols-outlined text-[14px]">arrow_back</span>
        {t(
          'cardDetail.back',
          { boardName: board?.name ?? '' },
          { defaultValue: 'Back to {{boardName}}' },
        )}
      </Link>

      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-6')}>
        <main className={cm.cn('lg:col-span-2 flex flex-col gap-6')}>
          <section
            className={cm.cn(
              cm.sp('p', 8),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
            )}
          >
            <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
              {currentList ? (
                <span
                  className={cm.cn(
                    'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary',
                  )}
                >
                  {currentList.name}
                </span>
              ) : null}
              <span
                className={cm.cn(
                  'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
                  PRIORITY_TONE[card.priority],
                )}
              >
                {t(`priority.${card.priority}`, {}, { defaultValue: card.priority })}
              </span>
              {card.is_archived ? (
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/15 text-success">
                  {t('cardDetail.archived', {}, { defaultValue: 'Archived' })}
                </span>
              ) : null}
            </div>
            <div className={cm.cn(cm.sp('mt', 5), 'flex items-start justify-between gap-3')}>
              <h1
                className={cm.cn('text-3xl font-extrabold tracking-tight text-on-surface flex-1')}
                data-testid="card-title"
              >
                {card.title}
              </h1>
              <button
                type="button"
                onClick={() => setEditTitleOpen(true)}
                className="text-on-surface-variant hover:text-on-surface"
                aria-label={t('cardDetail.editTitle', {}, { defaultValue: 'Edit title' })}
                data-testid="card-edit-title"
              >
                <span className="material-symbols-outlined">edit</span>
              </button>
            </div>
            <div className={cm.cn(cm.sp('mt', 4), 'flex items-start justify-between gap-3')}>
              <p
                className={cm.cn(
                  cm.textSize('base'),
                  'text-on-surface-variant leading-relaxed flex-1 whitespace-pre-wrap',
                )}
              >
                {desc || t('cardDetail.noDescription', {}, { defaultValue: 'No description yet.' })}
              </p>
              <button
                type="button"
                onClick={() => setEditDescOpen(true)}
                className="text-on-surface-variant hover:text-on-surface"
                aria-label={t(
                  'cardDetail.editDescription',
                  {},
                  { defaultValue: 'Edit description' },
                )}
                data-testid="card-edit-description"
              >
                <span className="material-symbols-outlined">edit_note</span>
              </button>
            </div>
          </section>

          <section
            className={cm.cn(
              cm.sp('p', 8),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
            )}
          >
            <h2 className={cm.cn('text-lg font-extrabold tracking-tight text-on-surface mb-4')}>
              {t('cardDetail.comments.heading', {}, { defaultValue: 'Comments' })}
            </h2>
            {comments.length === 0 ? (
              <p className={cm.cn(cm.sp('py', 4), cm.textCenter, cm.textSize('sm'), cm.textMuted)}>
                {t(
                  'cardDetail.comments.empty',
                  {},
                  { defaultValue: 'No comments yet \u2014 be the first.' },
                )}
              </p>
            ) : (
              <ul className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(5))}>
                {comments.map((comment) => (
                  <li
                    key={comment.id}
                    className={cm.cn('flex gap-3')}
                    data-testid={`card-comment-${comment.id}`}
                  >
                    <span className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-primary to-primary-container text-white font-bold text-sm flex items-center justify-center">
                      {comment.author_id.slice(0, 1).toUpperCase()}
                    </span>
                    <div className={cm.cn('flex-1 min-w-0')}>
                      <span className="text-[11px] text-on-surface-variant font-semibold">
                        {new Date(comment.created_at).toLocaleString(undefined, {
                          hour: 'numeric',
                          minute: '2-digit',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <p
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.sp('mt', 1),
                          'text-on-surface leading-relaxed whitespace-pre-wrap',
                        )}
                      >
                        {comment.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <form
              className={cm.cn(cm.sp('mt', 5), 'flex items-start gap-2')}
              onSubmit={handleAddComment}
              data-testid="card-comment-form"
            >
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder={t(
                  'cardDetail.comments.placeholder',
                  {},
                  { defaultValue: 'Write a comment\u2026' },
                )}
                rows={2}
                className={cm.cn(
                  'flex-1 px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-sm focus:outline-none focus:border-primary',
                )}
                data-testid="card-comment-input"
              />
              <button
                type="submit"
                disabled={postingComment || commentBody.trim().length === 0}
                className={cm.cn(
                  'px-4 py-2 rounded-xl font-bold text-white text-sm shadow-md',
                  'bg-gradient-to-br from-primary to-primary-container hover:opacity-95 transition-opacity disabled:opacity-50',
                )}
                data-testid="card-comment-submit"
              >
                {postingComment
                  ? t('cardDetail.comments.posting', {}, { defaultValue: 'Posting\u2026' })
                  : t('common.send', {}, { defaultValue: 'Send' })}
              </button>
            </form>
            {commentError ? (
              <p className="text-sm font-semibold text-error mt-2">{commentError}</p>
            ) : null}
          </section>
        </main>

        <aside className={cm.cn('flex flex-col gap-5')}>
          <section
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
            )}
          >
            <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
              {t('form.priority', {}, { defaultValue: 'Priority' })}
            </p>
            <div className={cm.cn(cm.sp('mt', 3), 'flex flex-wrap gap-2')}>
              {PRIORITY_OPTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => void handlePriority(p)}
                  disabled={busy}
                  data-testid={`card-priority-${p}`}
                  className={cm.cn(
                    'px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest transition-colors',
                    card.priority === p
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest',
                  )}
                >
                  {t(`priority.${p}`, {}, { defaultValue: p })}
                </button>
              ))}
            </div>
          </section>

          {otherLists.length > 0 ? (
            <section
              className={cm.cn(
                cm.sp('p', 6),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
              )}
            >
              <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
                {t('cardDetail.move.heading', {}, { defaultValue: 'Move to' })}
              </p>
              <div className={cm.cn(cm.sp('mt', 3), cm.flex({ direction: 'col' }), cm.stack(2))}>
                {otherLists.map((list) => (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => void handleMove(list.id)}
                    disabled={busy}
                    data-testid={`card-move-${list.id}`}
                    className={cm.cn(
                      'w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors',
                    )}
                  >
                    {list.name}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {dueLabel ? (
            <section
              className={cm.cn(
                cm.sp('p', 6),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
              )}
            >
              <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
                {t('form.due', {}, { defaultValue: 'Due' })}
              </p>
              <p
                className={cm.cn(
                  cm.sp('mt', 2),
                  'text-2xl font-extrabold tracking-tight text-on-surface',
                )}
              >
                {dueLabel}
              </p>
            </section>
          ) : null}

          <section
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
            )}
          >
            <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
              {t('nav.actions', {}, { defaultValue: 'Actions' })}
            </p>
            <div className={cm.cn(cm.sp('mt', 3), cm.flex({ direction: 'col' }), cm.stack(2))}>
              {!card.is_archived ? (
                <button
                  type="button"
                  onClick={() => void handleArchive()}
                  disabled={busy}
                  data-testid="card-archive"
                  className={cm.cn(
                    'px-3 py-2 rounded-xl text-left text-sm font-semibold text-on-surface hover:bg-surface-container-low flex items-center gap-2',
                  )}
                >
                  <span className="material-symbols-outlined text-[18px]">archive</span>
                  {t('cardDetail.actions.archive', {}, { defaultValue: 'Archive card' })}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={busy}
                data-testid="card-delete"
                className={cm.cn(
                  'px-3 py-2 rounded-xl text-left text-sm font-semibold text-error hover:bg-error/5 flex items-center gap-2',
                )}
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                {t('cardDetail.actions.delete', {}, { defaultValue: 'Delete card' })}
              </button>
            </div>
          </section>
        </aside>
      </div>

      <PromptDialog
        open={editTitleOpen}
        title={t('cardDetail.editTitleDialog.title', {}, { defaultValue: 'Edit card title' })}
        label={t('form.title', {}, { defaultValue: 'Title' })}
        initialValue={card.title}
        submitLabel={t('common.save', {}, { defaultValue: 'Save' })}
        busy={editBusy}
        onCancel={() => {
          if (!editBusy) setEditTitleOpen(false)
        }}
        onSubmit={handleEditTitle}
      />

      <PromptDialog
        open={editDescOpen}
        title={t(
          'cardDetail.editDescriptionDialog.title',
          {},
          { defaultValue: 'Edit description' },
        )}
        label={t('form.description', {}, { defaultValue: 'Description' })}
        initialValue={desc}
        submitLabel={t('common.save', {}, { defaultValue: 'Save' })}
        multiline
        busy={editBusy}
        onCancel={() => {
          if (!editBusy) setEditDescOpen(false)
        }}
        onSubmit={handleEditDesc}
      />
    </div>
  )
}

export default CardDetail
