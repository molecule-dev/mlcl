import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import type { RealtimeConnection } from '@molecule/app-realtime'
import { getClassMap } from '@molecule/app-ui'

import { PromptDialog } from '../components/PromptDialog.js'
import { getRealtimeConnection } from '../lib/realtime.js'

interface CardRow {
  id: string
  board_id: string
  list_id: string | null
  title: string
  description: unknown
  priority: 'low' | 'normal' | 'high' | 'urgent'
  position: number | string
  due_date: string | null
  is_archived: boolean
}

interface ListRow {
  id: string
  board_id: string
  name: string
  position: number | string
  is_archived: boolean
  cards?: CardRow[]
}

interface BoardRow {
  id: string
  name: string
  description: string | null
  background_color: string
  is_starred: boolean
  is_archived: boolean
  lists?: ListRow[]
}

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in (res as object)) {
    return (res as { data: T }).data
  }
  return res as T
}

const ACCENT_DOT = [
  'bg-sky-500',
  'bg-primary',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-purple-500',
] as const

const PRIORITY_STRIP: Record<CardRow['priority'], string> = {
  urgent: 'bg-rose-500',
  high: 'bg-amber-500',
  normal: 'bg-blue-500',
  low: 'bg-slate-400',
}

export function BoardDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const boardId = id ?? ''

  const [board, setBoard] = useState<BoardRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [createListOpen, setCreateListOpen] = useState(false)
  const [createListBusy, setCreateListBusy] = useState(false)
  const [createListError, setCreateListError] = useState<string | null>(null)

  const [createCardOpen, setCreateCardOpen] = useState<{ listId: string; listName: string } | null>(
    null,
  )
  const [createCardBusy, setCreateCardBusy] = useState(false)
  const [createCardError, setCreateCardError] = useState<string | null>(null)

  const [renameOpen, setRenameOpen] = useState(false)
  const [renameBusy, setRenameBusy] = useState(false)

  const refresh = useCallback(
    (opts?: { silent?: boolean }) => {
      if (!boardId) return Promise.resolve()
      // A live-event refresh is `silent` — don't flash the full-board spinner on
      // every card another collaborator adds/moves; only the first load shows it.
      if (!opts?.silent) setLoading(true)
      return http
        .get(`/api/boards/${boardId}`)
        .then((res) => {
          const b = unwrap<BoardRow>(res)
          if (b && b.id) {
            setBoard(b)
            setError(null)
          } else {
            setError(t('boardDetail.notFound', {}, { defaultValue: 'Board not found.' }))
          }
        })
        .catch(() => {
          setError(t('boardDetail.loadError', {}, { defaultValue: 'Failed to load board.' }))
        })
        .finally(() => setLoading(false))
    },
    [boardId, http, t],
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Live board — the API broadcasts card/list changes to the per-board room
  // `board:<boardId>` (api/src/handlers/{cards,lists}.ts). Join it and silently
  // re-fetch on each event so a collaborator's add/move/delete/reorder appears
  // without a reload. Room + event names MUST match the server exactly — a
  // mismatch is a silent no-op. The room is membership-guarded, so the socket
  // carries the auth token (see lib/realtime.ts). Realtime is an enhancement: if
  // the socket can't connect, the board still works from the initial fetch.
  useEffect(() => {
    if (!boardId) return
    const room = `board:${boardId}`
    const events = [
      'card:created',
      'card:updated',
      'card:moved',
      'card:deleted',
      'card:archived',
      'card:unarchived',
      'list:created',
      'list:updated',
      'list:deleted',
      'lists:reordered',
    ]
    let active = true
    let connection: RealtimeConnection | null = null
    const onBoardEvent = () => {
      void refresh({ silent: true })
    }
    getRealtimeConnection()
      .then((conn) => {
        if (!active) return
        connection = conn
        for (const e of events) conn.on(e, onBoardEvent)
        return conn.joinRoom(room)
      })
      .catch(() => {
        // Socket unavailable — the board still works from the initial fetch.
      })
    return () => {
      active = false
      if (connection) {
        for (const e of events) connection.off(e, onBoardEvent)
        connection.leaveRoom(room).catch(() => {})
      }
    }
  }, [boardId, refresh])

  const handleCreateList = async (name: string) => {
    if (!board) return
    setCreateListBusy(true)
    setCreateListError(null)
    try {
      await http.post('/api/lists', { board_id: board.id, name })
      setCreateListOpen(false)
      await refresh()
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      setCreateListError(
        status === 402
          ? t(
              'boardDetail.upgradeRequired',
              {},
              { defaultValue: 'You\u2019ve reached your plan\u2019s list limit.' },
            )
          : t('boardDetail.list.createError', {}, { defaultValue: 'Could not create the list.' }),
      )
    } finally {
      setCreateListBusy(false)
    }
  }

  const handleCreateCard = async (title: string) => {
    if (!board || !createCardOpen) return
    setCreateCardBusy(true)
    setCreateCardError(null)
    try {
      await http.post('/api/cards', {
        board_id: board.id,
        list_id: createCardOpen.listId,
        title,
      })
      setCreateCardOpen(null)
      await refresh()
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      setCreateCardError(
        status === 402
          ? t(
              'boardDetail.upgradeRequired',
              {},
              { defaultValue: 'You\u2019ve reached your plan\u2019s card limit.' },
            )
          : t('boardDetail.card.createError', {}, { defaultValue: 'Could not create the card.' }),
      )
    } finally {
      setCreateCardBusy(false)
    }
  }

  const handleRename = async (name: string) => {
    if (!board) return
    setRenameBusy(true)
    try {
      await http.patch(`/api/boards/${board.id}`, { name })
      setRenameOpen(false)
      await refresh()
    } finally {
      setRenameBusy(false)
    }
  }

  const handleStar = async () => {
    if (!board) return
    try {
      await http.patch(`/api/boards/${board.id}`, { is_starred: !board.is_starred })
      await refresh()
    } catch (_error) {
      // safe to ignore: star toggle is optimistic; board stays starred/unstarred on next load
    }
  }

  const handleMoveCard = async (cardId: string, targetListId: string) => {
    if (!board) return
    setBusy(true)
    try {
      const targetList = board.lists?.find((l) => l.id === targetListId)
      const nextPosition = targetList && targetList.cards ? targetList.cards.length : 0
      await http.post(`/api/cards/${cardId}/move`, {
        list_id: targetListId,
        position: nextPosition,
      })
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const handleArchiveCard = async (cardId: string) => {
    if (!board) return
    setBusy(true)
    try {
      await http.post(`/api/cards/${cardId}/archive`, {})
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteList = async (listId: string) => {
    if (!board) return
    if (
      !window.confirm(
        t(
          'boardDetail.list.confirmDelete',
          {},
          { defaultValue: 'Delete this list and all its cards?' },
        ),
      )
    ) {
      return
    }
    setBusy(true)
    try {
      await http.delete(`/api/lists/${listId}`)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const lists = useMemo(() => board?.lists ?? [], [board])
  const totalCards = useMemo(
    () => lists.reduce((sum, l) => sum + (l.cards?.length ?? 0), 0),
    [lists],
  )

  if (!boardId) {
    return (
      <div className={cm.cn(cm.sp('p', 8))}>
        <p className={cm.textMuted}>
          {t('boardDetail.notFound', {}, { defaultValue: 'Board not found.' })}
        </p>
        <Link to="/boards" className="text-primary font-bold mt-4 inline-block">
          {t('boardDetail.backToBoards', {}, { defaultValue: 'Back to boards' })}
        </Link>
      </div>
    )
  }

  if (loading && !board) {
    return (
      <div className={cm.cn(cm.sp('p', 8))}>
        <p className={cm.textMuted}>
          {t('boardDetail.loading', {}, { defaultValue: 'Loading board\u2026' })}
        </p>
      </div>
    )
  }

  if (error || !board) {
    return (
      <div className={cm.cn(cm.sp('p', 8))}>
        <p className="text-error font-semibold">
          {error ?? t('boardDetail.notFound', {}, { defaultValue: 'Board not found.' })}
        </p>
        <Link to="/boards" className="text-primary font-bold mt-4 inline-block">
          {t('boardDetail.backToBoards', {}, { defaultValue: 'Back to boards' })}
        </Link>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.minH('full'), 'flex flex-col bg-surface-container-low')}>
      <header
        className={cm.cn(
          cm.sp('px', 8),
          cm.sp('pt', 6),
          cm.sp('pb', 5),
          'border-b border-outline-variant/20 bg-surface-container-lowest',
        )}
      >
        <div className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}>
          <div className={cm.flex({ direction: 'col' })}>
            <Link
              to="/boards"
              className={cm.cn(
                'text-[11px] font-black uppercase tracking-[0.32em] text-primary-dark inline-flex items-center gap-1 hover:opacity-80 transition-opacity',
              )}
            >
              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
              {t('boardDetail.back', {}, { defaultValue: 'All boards' })}
            </Link>
            <div className={cm.cn('flex items-center gap-3 mt-2')}>
              <span
                className="w-3 h-8 rounded-md shrink-0"
                style={{ background: board.background_color || '#0079bf' }}
              />
              <h1
                className={cm.cn('text-3xl font-extrabold tracking-tight text-on-surface')}
                data-testid="board-name"
              >
                {board.name}
              </h1>
              <button
                type="button"
                onClick={() => setRenameOpen(true)}
                className="text-on-surface-variant hover:text-on-surface"
                aria-label={t('boardDetail.rename', {}, { defaultValue: 'Rename board' })}
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
              </button>
              <button
                type="button"
                onClick={() => void handleStar()}
                className={cm.cn(
                  'hover:opacity-80',
                  board.is_starred ? 'text-warning' : 'text-on-surface-variant',
                )}
                aria-label={
                  board.is_starred
                    ? t('boardDetail.unstar', {}, { defaultValue: 'Unstar board' })
                    : t('boardDetail.star', {}, { defaultValue: 'Star board' })
                }
                aria-pressed={board.is_starred}
                data-testid="board-star-toggle"
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={board.is_starred ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  star
                </span>
              </button>
            </div>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1')}>
              {board.description ??
                t('boardDetail.noDescription', {}, { defaultValue: 'No description' })}
            </p>
          </div>
          <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                'px-3 py-1.5 rounded-full bg-surface-container-high text-[11px] font-bold text-on-surface-variant',
              )}
            >
              <span className="material-symbols-outlined text-[14px]">view_kanban</span>
              {t(
                'boardDetail.totalCards',
                { count: totalCards },
                { defaultValue: '{{count}} cards' },
              )}
            </span>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                'px-3 py-1.5 rounded-full bg-surface-container-high text-[11px] font-bold text-on-surface-variant',
              )}
            >
              <span className="material-symbols-outlined text-[14px]">view_column</span>
              {t(
                'boardDetail.totalLists',
                { count: lists.length },
                { defaultValue: '{{count}} lists' },
              )}
            </span>
            <button
              type="button"
              onClick={() => setCreateListOpen(true)}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                'px-4 py-2 rounded-xl font-bold text-white text-sm shadow-md',
                'bg-gradient-to-br from-primary to-primary-container hover:opacity-95 transition-opacity',
              )}
              data-testid="board-add-list"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              {t('boardDetail.addListCta', {}, { defaultValue: 'Add list' })}
            </button>
          </div>
        </div>
      </header>

      <div className={cm.cn(cm.sp('p', 6), cm.flex1, 'overflow-x-auto')}>
        {lists.length === 0 ? (
          <div
            className={cm.cn(
              cm.sp('p', 12),
              'text-center rounded-2xl border-2 border-dashed border-outline-variant/40 bg-surface-container-lowest/40 max-w-2xl mx-auto',
            )}
          >
            <span className="material-symbols-outlined text-5xl text-primary/70">view_column</span>
            <h2
              className={cm.cn(
                cm.sp('mt', 4),
                'text-2xl font-extrabold tracking-tight text-on-surface',
              )}
            >
              {t('boardDetail.empty.heading', {}, { defaultValue: 'No lists yet' })}
            </h2>
            <p className={cm.cn(cm.sp('mt', 2), 'text-on-surface-variant')}>
              {t(
                'boardDetail.empty.subline',
                {},
                { defaultValue: 'Add a list (column) to start organizing cards.' },
              )}
            </p>
            <button
              type="button"
              onClick={() => setCreateListOpen(true)}
              className={cm.cn(
                cm.sp('mt', 6),
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white shadow-md',
                'bg-gradient-to-br from-primary to-primary-container hover:opacity-95 transition-opacity',
              )}
              data-testid="board-empty-add-list"
            >
              <span className="material-symbols-outlined">add</span>
              {t('boardDetail.empty.cta', {}, { defaultValue: 'Add your first list' })}
            </button>
          </div>
        ) : (
          <div className={cm.cn('flex gap-5 min-w-max')} data-testid="board-columns">
            {lists.map((list, idx) => (
              <ListColumn
                key={list.id}
                list={list}
                accentClass={ACCENT_DOT[idx % ACCENT_DOT.length]}
                otherLists={lists.filter((l) => l.id !== list.id)}
              />
            ))}
            <button
              type="button"
              onClick={() => setCreateListOpen(true)}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                'w-[280px] shrink-0 rounded-2xl border-2 border-dashed border-outline-variant/60 text-on-surface-variant font-semibold hover:bg-surface-container-low transition-colors py-8',
              )}
              data-testid="board-add-list-trailing"
            >
              <span className="material-symbols-outlined">add</span>
              {t('boardDetail.addListCta', {}, { defaultValue: 'Add list' })}
            </button>
          </div>
        )}
      </div>

      <PromptDialog
        open={createListOpen}
        title={t('boardDetail.createList.title', {}, { defaultValue: 'Add a list' })}
        label={t('boardDetail.createList.nameLabel', {}, { defaultValue: 'List name' })}
        placeholder={t('boardDetail.createList.placeholder', {}, { defaultValue: 'e.g. To Do' })}
        submitLabel={t('boardDetail.createList.submit', {}, { defaultValue: 'Add list' })}
        busy={createListBusy}
        error={createListError}
        onCancel={() => {
          if (!createListBusy) {
            setCreateListOpen(false)
            setCreateListError(null)
          }
        }}
        onSubmit={handleCreateList}
      />

      <PromptDialog
        open={createCardOpen !== null}
        title={
          createCardOpen
            ? t(
                'boardDetail.createCard.title',
                { listName: createCardOpen.listName },
                { defaultValue: 'Add card to {{listName}}' },
              )
            : ''
        }
        label={t('boardDetail.createCard.titleLabel', {}, { defaultValue: 'Card title' })}
        placeholder={t(
          'boardDetail.createCard.placeholder',
          {},
          { defaultValue: 'e.g. Investigate the bug report' },
        )}
        submitLabel={t('boardDetail.createCard.submit', {}, { defaultValue: 'Add card' })}
        multiline
        busy={createCardBusy}
        error={createCardError}
        onCancel={() => {
          if (!createCardBusy) {
            setCreateCardOpen(null)
            setCreateCardError(null)
          }
        }}
        onSubmit={handleCreateCard}
      />

      <PromptDialog
        open={renameOpen}
        title={t('boardDetail.renameDialog.title', {}, { defaultValue: 'Rename board' })}
        label={t('boardDetail.renameDialog.label', {}, { defaultValue: 'New name' })}
        initialValue={board.name}
        submitLabel={t('common.save', {}, { defaultValue: 'Save' })}
        busy={renameBusy}
        onCancel={() => {
          if (!renameBusy) setRenameOpen(false)
        }}
        onSubmit={handleRename}
      />
    </div>
  )

  function ListColumn({
    list,
    accentClass,
    otherLists,
  }: {
    list: ListRow
    accentClass: string
    otherLists: ListRow[]
  }) {
    const cards = (list.cards ?? [])
      .filter((c) => !c.is_archived)
      .slice()
      .sort((a, b) => Number(a.position) - Number(b.position))
    return (
      <section
        data-testid={`list-column-${list.id}`}
        className={cm.cn(
          'flex flex-col gap-3 w-[320px] shrink-0',
          cm.sp('p', 3),
          'rounded-2xl bg-surface-container-lowest/80 border border-outline-variant/30',
        )}
      >
        <header className={cm.flex({ align: 'center', justify: 'between' })}>
          <div className={cm.flex({ align: 'center', gap: 'xs' })}>
            <span className={cm.cn('w-2.5 h-2.5 rounded-full', accentClass)} />
            <h3 className="text-[11px] font-black uppercase tracking-[0.28em] text-on-surface-variant">
              {list.name}
            </h3>
            <span className="text-[11px] font-bold text-on-surface-variant">{cards.length}</span>
          </div>
          <button
            type="button"
            onClick={() => void handleDeleteList(list.id)}
            disabled={busy}
            className="text-on-surface-variant hover:text-error transition-colors"
            aria-label={t('boardDetail.list.delete', {}, { defaultValue: 'Delete list' })}
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
          </button>
        </header>
        <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
          {cards.length === 0 ? (
            <p className={cm.cn(cm.sp('py', 4), cm.textCenter, cm.textSize('xs'), cm.textMuted)}>
              {t('boardDetail.column.empty', {}, { defaultValue: 'No cards yet.' })}
            </p>
          ) : (
            cards.map((card) => <CardTile key={card.id} card={card} otherLists={otherLists} />)
          )}
        </div>
        <button
          type="button"
          onClick={() => setCreateCardOpen({ listId: list.id, listName: list.name })}
          className={cm.cn(
            cm.sp('py', 2),
            cm.sp('px', 3),
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            'w-full rounded-xl border border-dashed border-outline-variant text-[11px] font-bold uppercase tracking-widest text-on-surface-variant hover:bg-surface-container-low transition-colors',
          )}
          data-testid={`list-add-card-${list.id}`}
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
          {t('boardDetail.column.add', {}, { defaultValue: 'Add card' })}
        </button>
      </section>
    )
  }

  function CardTile({ card, otherLists }: { card: CardRow; otherLists: ListRow[] }) {
    const [menuOpen, setMenuOpen] = useState(false)
    return (
      <div
        data-testid={`card-tile-${card.id}`}
        className={cm.cn(
          'group relative bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-outline-variant/30 hover:border-outline-variant/60 transition-all',
        )}
      >
        <div
          className={cm.cn('h-1 w-full', PRIORITY_STRIP[card.priority] ?? 'bg-border-secondary')}
        />
        <div className={cm.cn(cm.sp('p', 3), cm.flex({ direction: 'col' }), cm.stack(2))}>
          <button
            type="button"
            onClick={() => navigate(`/cards/${card.id}`)}
            className="text-left w-full"
            data-testid={`card-tile-open-${card.id}`}
          >
            <h4 className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface leading-snug')}>
              {card.title}
            </h4>
          </button>
          <div className={cm.cn('flex items-center justify-between')}>
            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              {t(`priority.${card.priority}`, {}, { defaultValue: card.priority })}
            </span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="text-on-surface-variant hover:text-on-surface"
                aria-label={t('boardDetail.card.menu', {}, { defaultValue: 'Card actions' })}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                data-testid={`card-menu-${card.id}`}
              >
                <span className="material-symbols-outlined text-[18px]">more_horiz</span>
              </button>
              {menuOpen ? (
                <div
                  role="menu"
                  tabIndex={-1}
                  className={cm.cn(
                    cm.sp('p', 2),
                    'absolute right-0 top-full mt-1 z-10 w-52 rounded-xl bg-surface-container-lowest border border-outline-variant/40 shadow-lg',
                  )}
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  {otherLists.length === 0 ? null : (
                    <>
                      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-2 pt-1 pb-1">
                        {t('boardDetail.card.moveTo', {}, { defaultValue: 'Move to' })}
                      </p>
                      {otherLists.map((target) => (
                        <button
                          key={target.id}
                          type="button"
                          onClick={() => {
                            setMenuOpen(false)
                            void handleMoveCard(card.id, target.id)
                          }}
                          className="w-full text-left text-sm font-semibold px-2 py-1.5 rounded-lg hover:bg-surface-container-low text-on-surface"
                          data-testid={`card-move-${card.id}-${target.id}`}
                        >
                          {target.name}
                        </button>
                      ))}
                      <div className="my-1 border-t border-outline-variant/30" />
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      void handleArchiveCard(card.id)
                    }}
                    className="w-full text-left text-sm font-semibold px-2 py-1.5 rounded-lg hover:bg-surface-container-low text-on-surface"
                    data-testid={`card-archive-${card.id}`}
                  >
                    {t('boardDetail.card.archive', {}, { defaultValue: 'Archive card' })}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default BoardDetail
