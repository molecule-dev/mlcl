import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { PromptDialog } from '../components/PromptDialog.js'

interface CardRow {
  id: string
  board_id: string
  list_id: string | null
  title: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  is_archived: boolean
  created_at: string
  updated_at: string
}

interface BoardRow {
  id: string
  name: string
  background_color: string
}

const PRIORITY_TONE: Record<CardRow['priority'], string> = {
  urgent: 'bg-rose-500/15 text-error',
  high: 'bg-amber-500/15 text-warning',
  normal: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  low: 'bg-slate-500/15 text-foreground',
}

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in (res as object)) {
    return (res as { data: T }).data
  }
  return res as T
}

export function Backlog() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [items, setItems] = useState<CardRow[]>([])
  const [boards, setBoards] = useState<BoardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [createBusy, setCreateBusy] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [boardChoice, setBoardChoice] = useState<string>('')
  const [loadError, setLoadError] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [backlogRes, boardsRes] = await Promise.allSettled([
        http.get('/api/cards/backlog'),
        http.get('/api/boards'),
      ])
      if (backlogRes.status === 'fulfilled') {
        const list = unwrap<CardRow[]>(backlogRes.value) ?? []
        setItems(Array.isArray(list) ? list : [])
      }
      if (boardsRes.status === 'fulfilled') {
        const list = unwrap<BoardRow[]>(boardsRes.value) ?? []
        setBoards(Array.isArray(list) ? list : [])
        if (!boardChoice && list.length > 0) {
          setBoardChoice(list[0].id)
        }
      }
      // Both halves failing = the page cannot do its job — say so instead of
      // rendering an empty backlog.
      setLoadError(backlogRes.status === 'rejected' && boardsRes.status === 'rejected')
    } finally {
      setLoading(false)
    }
  }, [http, boardChoice])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleCreate = async (title: string) => {
    if (!boardChoice) {
      setCreateError(
        t(
          'backlog.create.needBoard',
          {},
          { defaultValue: 'Create a board first to add backlog items.' },
        ),
      )
      return
    }
    setCreateBusy(true)
    setCreateError(null)
    try {
      await http.post('/api/cards', {
        board_id: boardChoice,
        list_id: null,
        title,
      })
      setCreateOpen(false)
      await refresh()
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      setCreateError(
        status === 402
          ? t(
              'backlog.upgradeRequired',
              {},
              { defaultValue: 'You\u2019ve reached your plan\u2019s card limit.' },
            )
          : t('backlog.create.error', {}, { defaultValue: 'Could not add the item.' }),
      )
    } finally {
      setCreateBusy(false)
    }
  }

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)),
    [items],
  )

  return (
    <div className={cm.cn(cm.sp('p', 8), cm.flex({ direction: 'col' }), cm.stack(8))}>
      <header className={cm.flex({ justify: 'between', align: 'start', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.32em] text-primary-dark">
            {t(
              'backlog.eyebrow',
              { appName: APP_NAME },
              { defaultValue: '{{appName}} \u00b7 Backlog' },
            )}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              'text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('backlog.heading', {}, { defaultValue: 'Backlog' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.textSize('base'), 'text-on-surface-variant')}>
            {boards.length === 0
              ? t(
                  'backlog.noBoards',
                  {},
                  { defaultValue: 'Create a board first to use the backlog.' },
                )
              : t(
                  'backlog.subline',
                  { count: items.length },
                  { defaultValue: '{{count}} cards waiting to be picked up.' },
                )}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          {boards.length > 0 ? (
            <select
              value={boardChoice}
              onChange={(e) => setBoardChoice(e.target.value)}
              className={cm.cn(
                'h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-semibold text-on-surface',
              )}
              data-testid="backlog-board-select"
            >
              {boards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
            </select>
          ) : null}
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            disabled={boards.length === 0}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              'px-5 py-2.5 rounded-xl font-bold text-white shadow-md',
              'bg-gradient-to-br from-primary to-primary-container hover:opacity-95 transition-opacity disabled:opacity-50',
            )}
            data-testid="backlog-new-item"
          >
            <span className="material-symbols-outlined">add</span>
            {t('backlog.newItem', {}, { defaultValue: 'New item' })}
          </button>
        </div>
      </header>

      {loadError ? (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'flex flex-wrap items-center gap-3 rounded-xl border border-error/40 bg-error/5',
          )}
        >
          <p className="text-error font-semibold flex-1">
            {t('backlog.loadError', {}, { defaultValue: 'Could not load the backlog.' })}
          </p>
          <button
            type="button"
            onClick={() => void refresh()}
            className={cm.cn(
              'px-4 py-2 rounded-xl text-sm font-bold text-white',
              'bg-gradient-to-br from-primary to-primary-container hover:opacity-95 transition-opacity',
            )}
          >
            {t('common.retry', {}, { defaultValue: 'Retry' })}
          </button>
        </div>
      ) : null}

      {loading && items.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 8), cm.textCenter, cm.textMuted)}>
          {t('backlog.loading', {}, { defaultValue: 'Loading backlog\u2026' })}
        </p>
      ) : sortedItems.length === 0 ? (
        <section
          className={cm.cn(
            cm.sp('p', 12),
            'text-center rounded-2xl border-2 border-dashed border-outline-variant/40 bg-surface-container-lowest/40',
          )}
        >
          <span className="material-symbols-outlined text-5xl text-primary/70">inventory</span>
          <h2
            className={cm.cn(
              cm.sp('mt', 4),
              'text-2xl font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('backlog.empty.heading', {}, { defaultValue: 'Backlog is empty' })}
          </h2>
          <p className={cm.cn(cm.sp('mt', 2), 'text-on-surface-variant max-w-md mx-auto')}>
            {boards.length === 0
              ? t('backlog.empty.noBoards', {}, { defaultValue: 'Create a board first.' })
              : t(
                  'backlog.empty.subline',
                  {},
                  { defaultValue: 'Capture an idea here, then drag it onto a list when ready.' },
                )}
          </p>
          {boards.length > 0 ? (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className={cm.cn(
                cm.sp('mt', 6),
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white shadow-md',
                'bg-gradient-to-br from-primary to-primary-container hover:opacity-95 transition-opacity',
              )}
              data-testid="backlog-empty-create"
            >
              <span className="material-symbols-outlined">add</span>
              {t('backlog.empty.cta', {}, { defaultValue: 'Add a backlog item' })}
            </button>
          ) : (
            <Link
              to="/boards"
              className={cm.cn(
                cm.sp('mt', 6),
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white shadow-md',
                'bg-gradient-to-br from-primary to-primary-container hover:opacity-95 transition-opacity',
              )}
            >
              <span className="material-symbols-outlined">view_kanban</span>
              {t('backlog.goToBoards', {}, { defaultValue: 'Go to boards' })}
            </Link>
          )}
        </section>
      ) : (
        <section
          className={cm.cn(
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm overflow-hidden',
          )}
        >
          <ul className="divide-y divide-outline-variant/20">
            {sortedItems.map((item, idx) => {
              const board = boards.find((b) => b.id === item.board_id)
              return (
                <li key={item.id} data-testid={`backlog-item-${item.id}`}>
                  <Link
                    to={`/cards/${item.id}`}
                    className={cm.cn(
                      cm.sp('px', 6),
                      cm.sp('py', 4),
                      'flex items-center gap-4 hover:bg-surface-container-low transition-colors cursor-pointer',
                    )}
                  >
                    <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant w-6 text-right">
                      #{idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-on-surface leading-tight">{item.title}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-on-surface-variant font-semibold">
                        <span
                          className={cm.cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest',
                            PRIORITY_TONE[item.priority],
                          )}
                        >
                          {t(`priority.${item.priority}`, {}, { defaultValue: item.priority })}
                        </span>
                        {board ? (
                          <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-[10px] font-bold tracking-widest uppercase">
                            {board.name}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <PromptDialog
        open={createOpen}
        title={t('backlog.create.title', {}, { defaultValue: 'New backlog item' })}
        label={t('form.title', {}, { defaultValue: 'Title' })}
        placeholder={t(
          'backlog.create.placeholder',
          {},
          { defaultValue: 'e.g. Investigate the slow query on the dashboard' },
        )}
        submitLabel={t('backlog.create.submit', {}, { defaultValue: 'Add to backlog' })}
        multiline
        busy={createBusy}
        error={createError}
        onCancel={() => {
          if (!createBusy) {
            setCreateOpen(false)
            setCreateError(null)
          }
        }}
        onSubmit={handleCreate}
      />
    </div>
  )
}

export default Backlog
