import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import type { TranslateFunction } from '@molecule/app-i18n'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PromptDialog } from '../components/PromptDialog.js'

interface BoardRow {
  id: string
  name: string
  description: string | null
  background_color: string
  is_starred: boolean
  is_archived: boolean
  updated_at: string
}

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in (res as object)) {
    return (res as { data: T }).data
  }
  return res as T
}

function relative(date: string, t: TranslateFunction) {
  const parsed = Date.parse(date)
  if (Number.isNaN(parsed)) return ''
  const diff = Date.now() - parsed
  const m = Math.floor(diff / 60_000)
  if (m < 1) return t('time.justNow', {}, { defaultValue: 'just now' })
  if (m < 60) return t('time.minutesAgo', { minutes: m }, { defaultValue: '{{minutes}}m ago' })
  const h = Math.floor(m / 60)
  if (h < 24) return t('time.hoursAgo', { hours: h }, { defaultValue: '{{hours}}h ago' })
  return t('time.daysAgo', { days: Math.floor(h / 24) }, { defaultValue: '{{days}}d ago' })
}

export function Boards() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [boards, setBoards] = useState<BoardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)
    return http
      .get('/api/boards')
      .then((res) => {
        const list = unwrap<BoardRow[]>(res) ?? []
        setBoards(Array.isArray(list) ? list : [])
        setError(null)
      })
      .catch(() => {
        setError(t('boards.loadError', {}, { defaultValue: 'Failed to load boards.' }))
      })
      .finally(() => setLoading(false))
  }, [http, t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleCreate = async (name: string) => {
    setCreating(true)
    setCreateError(null)
    try {
      const res = await http.post('/api/boards', { name })
      const board = unwrap<BoardRow>(res)
      setCreateOpen(false)
      if (board?.id) {
        navigate(`/boards/${board.id}`)
        return
      }
      await refresh()
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 402) {
        setCreateError(
          t(
            'boards.upgradeRequired',
            {},
            {
              defaultValue:
                'You\u2019ve reached your plan\u2019s board limit. Upgrade to add more.',
            },
          ),
        )
      } else {
        setCreateError(
          t('boards.createError', {}, { defaultValue: 'Could not create the board. Try again.' }),
        )
      }
    } finally {
      setCreating(false)
    }
  }

  const starred = useMemo(() => boards.filter((b) => b.is_starred), [boards])
  const others = useMemo(() => boards.filter((b) => !b.is_starred), [boards])

  return (
    <div className={cm.cn(cm.sp('p', 8), cm.flex({ direction: 'col' }), cm.stack(8))}>
      <header className={cm.flex({ justify: 'between', align: 'start', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.32em] text-primary-dark">
            {t('nav.workspace', {}, { defaultValue: 'Workspace' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              'text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('boards.heading', {}, { defaultValue: 'All boards' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.textSize('base'), 'text-on-surface-variant')}>
            {t(
              'boards.subline',
              { count: boards.length },
              { defaultValue: '{{count}} boards in your workspace.' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            'px-5 py-2.5 rounded-xl font-bold text-white shadow-md',
            'bg-gradient-to-br from-primary to-primary-container hover:opacity-95 transition-opacity',
          )}
          data-testid="boards-new-board"
        >
          <span className="material-symbols-outlined">add</span>
          {t('boards.newCta', {}, { defaultValue: 'New board' })}
        </button>
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading && boards.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 8), cm.textCenter, cm.textMuted)}>
          {t('boards.loading', {}, { defaultValue: 'Loading boards\u2026' })}
        </p>
      ) : boards.length === 0 ? (
        <EmptyState onCreate={() => setCreateOpen(true)} />
      ) : (
        <>
          {starred.length > 0 ? (
            <section className={cm.flex({ direction: 'col', gap: 'md' })}>
              <h2
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('xs'),
                  'font-black uppercase tracking-[0.32em] text-warning',
                )}
              >
                <span className="material-symbols-outlined text-[18px]">star</span>
                {t('status.starred', {}, { defaultValue: 'Starred' })}
              </h2>
              <BoardGrid boards={starred} />
            </section>
          ) : null}
          <section className={cm.flex({ direction: 'col', gap: 'md' })}>
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-[0.32em] text-on-surface-variant',
              )}
            >
              {t('boards.allHeading', {}, { defaultValue: 'All boards' })}
            </h2>
            <BoardGrid boards={others} />
          </section>
        </>
      )}

      <PromptDialog
        open={createOpen}
        title={t('boards.create.title', {}, { defaultValue: 'Create a new board' })}
        label={t('boards.create.nameLabel', {}, { defaultValue: 'Board name' })}
        placeholder={t(
          'boards.create.namePlaceholder',
          {},
          { defaultValue: 'e.g. Q3 product launch' },
        )}
        submitLabel={t('boards.create.submit', {}, { defaultValue: 'Create board' })}
        busy={creating}
        error={createError}
        onCancel={() => {
          if (!creating) {
            setCreateOpen(false)
            setCreateError(null)
          }
        }}
        onSubmit={handleCreate}
      />
    </div>
  )

  function EmptyState({ onCreate }: { onCreate: () => void }) {
    return (
      <section
        className={cm.cn(
          cm.sp('p', 12),
          'text-center rounded-2xl border-2 border-dashed border-outline-variant/40 bg-surface-container-lowest/40',
        )}
      >
        <span className="material-symbols-outlined text-5xl text-primary/70">view_kanban</span>
        <h2
          className={cm.cn(
            cm.sp('mt', 4),
            'text-2xl font-extrabold tracking-tight text-on-surface',
          )}
        >
          {t('boards.empty.heading', {}, { defaultValue: 'No boards yet' })}
        </h2>
        <p className={cm.cn(cm.sp('mt', 2), 'text-on-surface-variant max-w-md mx-auto')}>
          {t(
            'boards.empty.subline',
            {},
            { defaultValue: 'Create your first board to start tracking work.' },
          )}
        </p>
        <button
          type="button"
          onClick={onCreate}
          className={cm.cn(
            cm.sp('mt', 6),
            'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white shadow-md',
            'bg-gradient-to-br from-primary to-primary-container hover:opacity-95 transition-opacity',
          )}
          data-testid="boards-empty-create"
        >
          <span className="material-symbols-outlined">add</span>
          {t('boards.empty.cta', {}, { defaultValue: 'Create your first board' })}
        </button>
      </section>
    )
  }

  function BoardGrid({ boards: list }: { boards: BoardRow[] }) {
    return (
      <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5')}>
        {list.map((board) => (
          <BoardTile key={board.id} board={board} />
        ))}
      </div>
    )
  }

  function BoardTile({ board }: { board: BoardRow }) {
    return (
      <Link
        to={`/boards/${board.id}`}
        data-testid={`board-tile-${board.id}`}
        className={cm.cn(
          'group block overflow-hidden rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
          'shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all',
        )}
      >
        <div
          className={cm.cn('relative h-28 overflow-hidden')}
          style={{ background: board.background_color || '#0079bf' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-black/30" />
          <div className={cm.cn('absolute inset-0 p-4 flex flex-col justify-end text-white')}>
            <p className={cm.cn('text-lg font-extrabold tracking-tight leading-tight')}>
              {board.name}
            </p>
            <p className="text-[11px] text-white/80 font-semibold">
              {t(
                'boards.tile.updated',
                { ago: relative(board.updated_at, t) },
                { defaultValue: 'Updated {{ago}}' },
              )}
            </p>
          </div>
          {board.is_starred ? (
            <span
              className="material-symbols-outlined absolute top-3 right-3 text-[18px] text-amber-300"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
          ) : null}
        </div>
        <div className={cm.cn(cm.sp('p', 5), cm.flex({ direction: 'col' }), cm.stack(2))}>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              'text-on-surface-variant line-clamp-2 min-h-[2.5em]',
            )}
          >
            {board.description ??
              t('boards.tile.noDescription', {}, { defaultValue: 'No description yet.' })}
          </p>
          <span
            className={cm.cn('inline-flex items-center gap-1 text-[11px] font-bold text-primary')}
          >
            {t('boards.tile.open', {}, { defaultValue: 'Open board' })}
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </span>
        </div>
      </Link>
    )
  }
}

export default Boards
