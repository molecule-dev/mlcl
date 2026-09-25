import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import type { TranslateFunction } from '@molecule/app-i18n'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { KpiTile } from '../components/KpiTile.js'
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

interface CardRow {
  id: string
  board_id: string
  list_id: string | null
  title: string
  is_archived: boolean
  updated_at: string
  priority?: string
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

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [boards, setBoards] = useState<BoardRow[]>([])
  const [cards, setCards] = useState<CardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)

  const refresh = useCallback(() => {
    setLoading(true)
    return Promise.allSettled([http.get('/api/boards'), http.get('/api/cards?archived=all')])
      .then(([boardsRes, cardsRes]) => {
        if (boardsRes.status === 'fulfilled') {
          const list = unwrap<BoardRow[]>(boardsRes.value) ?? []
          setBoards(Array.isArray(list) ? list : [])
        }
        if (cardsRes.status === 'fulfilled') {
          const list = unwrap<CardRow[]>(cardsRes.value) ?? []
          setCards(Array.isArray(list) ? list : [])
        }
        // Both halves failing = nothing on this page is real — say so instead
        // of rendering an empty dashboard.
        setLoadError(boardsRes.status === 'rejected' && cardsRes.status === 'rejected')
      })
      .finally(() => setLoading(false))
  }, [http])

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
            'dashboard.upgradeRequired',
            {},
            {
              defaultValue:
                'You\u2019ve reached your plan\u2019s board limit. Upgrade to add more.',
            },
          ),
        )
      } else {
        setCreateError(
          t(
            'dashboard.createError',
            {},
            { defaultValue: 'Could not create the board. Try again.' },
          ),
        )
      }
    } finally {
      setCreating(false)
    }
  }

  const activeBoards = boards.filter((b) => !b.is_archived)
  const activeCards = cards.filter((c) => !c.is_archived)
  const archivedCards = cards.filter((c) => c.is_archived)
  const openCards = activeCards.length
  const shippedCards = archivedCards.length
  const highPriority = activeCards.filter(
    (c) => c.priority === 'high' || c.priority === 'urgent',
  ).length
  const recentCards = [...cards]
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    .slice(0, 6)

  return (
    <div className={cm.cn(cm.sp('p', 8), cm.flex({ direction: 'col' }), cm.stack(8))}>
      <header className={cm.flex({ justify: 'between', align: 'start', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.32em] text-primary-dark">
            {t(
              'dashboard.eyebrow',
              { appName: APP_NAME },
              { defaultValue: '{{appName}} \u00b7 Today' },
            )}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              'text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.textSize('base'), 'text-on-surface-variant')}>
            {boards.length === 0
              ? t(
                  'dashboard.subline.empty',
                  {},
                  { defaultValue: 'Create your first board to get started.' },
                )
              : t(
                  'dashboard.subline',
                  { open: openCards, boards: activeBoards.length },
                  { defaultValue: '{{open}} open cards across {{boards}} active boards.' },
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
          data-testid="dashboard-new-board"
        >
          <span className="material-symbols-outlined">add</span>
          {t('dashboard.newBoardCta', {}, { defaultValue: 'New board' })}
        </button>
      </header>

      {loadError ? (
        <LoadErrorBanner
          message={t('dashboard.loadError', {}, { defaultValue: 'Could not load your dashboard.' })}
          onRetry={refresh}
        />
      ) : null}

      {loading && boards.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 8), cm.textCenter, cm.textMuted)}>
          {t('dashboard.loading', {}, { defaultValue: 'Loading\u2026' })}
        </p>
      ) : boards.length === 0 ? (
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
            {t(
              'dashboard.empty.heading',
              { appName: APP_NAME },
              { defaultValue: 'Welcome to {{appName}}' },
            )}
          </h2>
          <p className={cm.cn(cm.sp('mt', 2), 'text-on-surface-variant max-w-md mx-auto')}>
            {t(
              'dashboard.empty.subline',
              {},
              { defaultValue: 'Create your first board to start tracking work.' },
            )}
          </p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className={cm.cn(
              cm.sp('mt', 6),
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white shadow-md',
              'bg-gradient-to-br from-primary to-primary-container hover:opacity-95 transition-opacity',
            )}
            data-testid="dashboard-empty-create"
          >
            <span className="material-symbols-outlined">add</span>
            {t('dashboard.empty.cta', {}, { defaultValue: 'Create your first board' })}
          </button>
        </section>
      ) : (
        <>
          <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5')}>
            <KpiTile
              icon="view_kanban"
              label={t('dashboard.kpis.activeBoards', {}, { defaultValue: 'Active boards' })}
              value={activeBoards.length}
              accent="primary"
            />
            <KpiTile
              icon="task_alt"
              label={t('dashboard.kpis.cardsShipped', {}, { defaultValue: 'Cards shipped' })}
              value={shippedCards}
              accent="success"
            />
            <KpiTile
              icon="pending_actions"
              label={t('dashboard.kpis.openCards', {}, { defaultValue: 'Open cards' })}
              value={openCards}
              accent="warning"
            />
            <KpiTile
              icon="priority_high"
              label={t('dashboard.kpis.highPriority', {}, { defaultValue: 'High priority' })}
              value={highPriority}
              accent={highPriority > 0 ? 'critical' : 'primary'}
            />
          </div>

          <div className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-6')}>
            <section
              className={cm.cn(
                cm.sp('p', 6),
                'lg:col-span-2 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
              )}
            >
              <header
                className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}
              >
                <div>
                  <h2
                    className={cm.cn(
                      cm.textSize('lg'),
                      'font-extrabold tracking-tight text-on-surface',
                    )}
                  >
                    {t('dashboard.recent.heading', {}, { defaultValue: 'Recent cards' })}
                  </h2>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      'dashboard.recent.sub',
                      {},
                      { defaultValue: 'Latest changes across your boards.' },
                    )}
                  </p>
                </div>
              </header>
              {recentCards.length === 0 ? (
                <p className={cm.cn(cm.sp('py', 8), cm.textCenter, cm.textMuted)}>
                  {t(
                    'dashboard.recent.empty',
                    {},
                    { defaultValue: 'No cards yet \u2014 add a card to a board to see activity.' },
                  )}
                </p>
              ) : (
                <ul className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(2))}>
                  {recentCards.map((card) => {
                    const board = boards.find((b) => b.id === card.board_id)
                    return (
                      <li key={card.id}>
                        <Link
                          to={`/cards/${card.id}`}
                          className={cm.cn(
                            cm.sp('px', 3),
                            cm.sp('py', 2),
                            'flex items-center gap-3 rounded-xl cursor-pointer hover:bg-surface-container-low transition-colors',
                          )}
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: board?.background_color ?? '#0079bf' }}
                          />
                          <div className="flex-1 min-w-0">
                            <p
                              className={cm.cn(
                                cm.textSize('sm'),
                                'font-bold text-on-surface truncate',
                              )}
                            >
                              {card.title}
                            </p>
                            <p className="text-[11px] text-on-surface-variant font-semibold truncate">
                              {board?.name ??
                                t(
                                  'dashboard.recent.unknownBoard',
                                  {},
                                  { defaultValue: 'Unknown board' },
                                )}
                              <span className="mx-1.5 text-outline-variant">{'\u00b7'}</span>
                              {relative(card.updated_at, t)}
                            </p>
                          </div>
                          {card.is_archived ? (
                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-success">
                              {t('dashboard.recent.shipped', {}, { defaultValue: 'Shipped' })}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section
              className={cm.cn(
                cm.sp('p', 6),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
              )}
            >
              <header
                className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}
              >
                <h2
                  className={cm.cn(
                    cm.textSize('lg'),
                    'font-extrabold tracking-tight text-on-surface',
                  )}
                >
                  {t('dashboard.boards.heading', {}, { defaultValue: 'Your boards' })}
                </h2>
              </header>
              <ul className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(2))}>
                {activeBoards.slice(0, 6).map((board) => (
                  <li key={board.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/boards/${board.id}`)}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        'w-full flex items-center gap-3 rounded-xl text-left hover:bg-surface-container-low transition-colors',
                      )}
                      data-testid={`dashboard-board-${board.id}`}
                    >
                      <span
                        className="w-9 h-9 rounded-lg shrink-0"
                        style={{ background: board.background_color ?? '#0079bf' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={cm.cn(cm.textSize('sm'), 'font-bold text-on-surface truncate')}
                        >
                          {board.name}
                        </p>
                        <p className="text-[11px] text-on-surface-variant font-semibold">
                          {t(
                            'dashboard.boards.updated',
                            { ago: relative(board.updated_at, t) },
                            { defaultValue: 'Updated {{ago}}' },
                          )}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}

      <PromptDialog
        open={createOpen}
        title={t('dashboard.create.title', {}, { defaultValue: 'Create a new board' })}
        label={t('dashboard.create.nameLabel', {}, { defaultValue: 'Board name' })}
        placeholder={t(
          'dashboard.create.namePlaceholder',
          {},
          { defaultValue: 'e.g. Q3 product launch' },
        )}
        submitLabel={t('dashboard.create.submit', {}, { defaultValue: 'Create board' })}
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
}

export default Dashboard
