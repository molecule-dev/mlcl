import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BoardCard } from '../components/BoardCard.js'
import { WhiteboardLayout } from '../components/WhiteboardLayout.js'

const CURSOR_PALETTE = ['#5b5bf7', '#00c4a8', '#a855f7', '#f97316', '#ec4899', '#84cc16', '#06b6d4']
const CURSOR_COLOR_KEY = 'whiteboard:cursorColor'

interface BoardSummary {
  id: string
  title: string
  background: string
  visibility: 'private' | 'shared' | 'public'
  updatedLabel: string
  collaborators: Array<{ id: string; name: string; avatarColor: string; online?: boolean }>
}

interface BoardRow {
  id: string
  title: string
  description?: string
  background?: string
  is_public?: boolean
  updated_at?: string | null
  created_at?: string | null
  trashed_at?: string | null
}

const PALETTE_FALLBACK = ['#eef2ff', '#ecfeff', '#fdf4ff', '#fef3c7', '#dcfce7', '#fee2e2']

function formatRelative(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diffMs = Date.now() - d.getTime()
  if (diffMs < 60_000) return 'just now'
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return d.toLocaleDateString()
}

function toSummary(board: BoardRow, idx: number): BoardSummary {
  return {
    id: board.id,
    title: board.title || 'Untitled board',
    background: board.background || PALETTE_FALLBACK[idx % PALETTE_FALLBACK.length],
    visibility: board.is_public ? 'public' : 'private',
    updatedLabel: formatRelative(board.updated_at ?? board.created_at) || 'just now',
    collaborators: [],
  }
}

export function Boards() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [boards, setBoards] = useState<BoardSummary[]>([])
  const [shared, setShared] = useState<BoardSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cursorColor, setCursorColor] = useState<string>(CURSOR_PALETTE[0])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(CURSOR_COLOR_KEY)
      if (stored && CURSOR_PALETTE.includes(stored)) setCursorColor(stored)
    }
  }, [])

  const persistCursorColor = useCallback((color: string) => {
    setCursorColor(color)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CURSOR_COLOR_KEY, color)
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [own, sharedRes] = await Promise.all([
        http.get<BoardRow[]>('/api/boards'),
        http.get<BoardRow[]>('/api/boards/shared'),
      ])
      const ownData = Array.isArray(own.data) ? own.data : []
      const sharedData = Array.isArray(sharedRes.data) ? sharedRes.data : []
      setBoards(ownData.filter((b) => !b.trashed_at).map(toSummary))
      setShared(sharedData.filter((b) => !b.trashed_at).map(toSummary))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBoards([])
      setShared([])
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleCreate = useCallback(async () => {
    if (creating) return
    setCreating(true)
    setError(null)
    try {
      const res = await http.post<BoardRow>('/api/boards', {
        title: t('boards.newDefaultTitle', {}, { defaultValue: 'Untitled board' }),
        background: PALETTE_FALLBACK[boards.length % PALETTE_FALLBACK.length],
      })
      const created = res.data
      if (created?.id) {
        navigate(`/board/${created.id}`)
      } else {
        await refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setCreating(false)
    }
  }, [boards.length, creating, http, navigate, refresh, t])

  // The sidebar "New board" button (in WhiteboardLayout) navigates here with
  // ?new=1 — honor it by kicking off board creation once, then strip the param
  // so a refresh or back-navigation doesn't create another board.
  const newParamHandled = useRef(false)
  useEffect(() => {
    if (newParamHandled.current || !searchParams.get('new')) return
    newParamHandled.current = true
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('new')
        return next
      },
      { replace: true },
    )
    void handleCreate()
  }, [searchParams, setSearchParams, handleCreate])

  const filtered = useMemo(
    () => boards.filter((b) => b.title.toLowerCase().includes(search.toLowerCase())),
    [boards, search],
  )

  const filteredShared = useMemo(
    () => shared.filter((b) => b.title.toLowerCase().includes(search.toLowerCase())),
    [shared, search],
  )

  return (
    <WhiteboardLayout
      eyebrow={t('boards.eyebrow', {}, { defaultValue: 'Workspace · Your boards' })}
      title={t('boards.title', {}, { defaultValue: 'Your boards' })}
      actions={
        <>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'relative')}>
            <span
              className={cm.cn(
                'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]',
              )}
            >
              search
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('boards.searchPlaceholder', {}, { defaultValue: 'Search boards' })!}
              aria-label={t('boards.searchAria', {}, { defaultValue: 'Search boards' })!}
              data-mol-id="boards-search"
              className={cm.cn(
                cm.sp('pl', 10),
                cm.sp('pr', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'w-72 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary/30 transition-all outline-none',
              )}
            />
          </div>
          <Link
            to="/templates"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'bg-surface-container text-on-surface rounded-xl border border-outline-variant/40 hover:bg-surface-container-high transition-colors',
            )}
          >
            {t('boards.startFromTemplate', {}, { defaultValue: 'Start from template' })}
          </Link>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            data-mol-id="boards-new-board"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              cm.flex({ align: 'center', gap: 'xs' }),
              'bg-gradient-to-br from-primary to-primary-hover text-white rounded-xl shadow-md shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-60',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')}>add</span>
            {creating
              ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
              : t('boards.newBoard', {}, { defaultValue: 'New board' })}
          </button>
        </>
      }
    >
      <div className={cm.cn(cm.grid({ cols: 12, gap: 'lg' }), 'items-start')}>
        <aside className={cm.cn('col-span-3 sticky top-24', cm.stack(2))}>
          <div
            className={cm.cn(
              cm.sp('p', 5),
              cm.stack(2),
              'bg-surface-container-lowest rounded-xl border border-outline-variant/30',
            )}
          >
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('nav.workspace', {}, { defaultValue: 'Workspace' })}
            </span>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'bg-primary-fixed/40 text-primary-dark rounded-lg',
              )}
            >
              <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                <span className={cm.cn('material-symbols-outlined text-[18px]')}>
                  space_dashboard
                </span>
                {t('boards.folders.allBoards', {}, { defaultValue: 'All boards' })}
              </span>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
                data-mol-id="boards-count"
              >
                {boards.length}
              </span>
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'text-on-surface-variant rounded-lg',
              )}
            >
              <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                <span className={cm.cn('material-symbols-outlined text-[18px]')}>group</span>
                {t('boards.folders.shared', {}, { defaultValue: 'Shared with me' })}
              </span>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
                data-mol-id="boards-shared-count"
              >
                {shared.length}
              </span>
            </div>
          </div>

          <div
            className={cm.cn(
              cm.sp('p', 5),
              cm.stack(3),
              'bg-surface-container-lowest rounded-xl border border-outline-variant/30',
            )}
          >
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('boards.cursorPaletteLabel', {}, { defaultValue: 'Your cursor color' })}
            </span>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
              {CURSOR_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => persistCursorColor(color)}
                  aria-label={t(
                    'boards.cursorColor',
                    { color },
                    { defaultValue: 'Pick cursor color {{color}}' },
                  )}
                  aria-pressed={cursorColor === color}
                  data-mol-id={`cursor-color-${color}`}
                  className={cm.cn(
                    cm.w(8),
                    cm.h(8),
                    cm.roundedFull,
                    'border-2 transition-transform hover:scale-110',
                  )}
                  style={{
                    backgroundColor: color,
                    borderColor: cursorColor === color ? 'var(--color-text)' : 'transparent',
                  }}
                />
              ))}
            </div>
          </div>
        </aside>

        <section className={cm.cn('col-span-9', cm.stack(8))}>
          {error && (
            <div
              role="alert"
              className={cm.cn(
                cm.sp('p', 3),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-xl bg-error-container/40 text-on-error-container',
              )}
            >
              {error}
            </div>
          )}

          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <h2
              className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {loading
                ? t('boards.loadingTitle', {}, { defaultValue: 'Loading boards…' })
                : t(
                    'boards.gridTitle',
                    { count: filtered.length },
                    { defaultValue: '{{count}} boards' },
                  )}
            </h2>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-on-surface-variant',
              )}
            >
              {t('boards.sortedBy', {}, { defaultValue: 'Sorted by recently updated' })}
            </span>
          </div>

          {!loading && filtered.length === 0 ? (
            <div
              data-mol-id="boards-empty"
              className={cm.cn(
                cm.sp('p', 12),
                cm.textCenter,
                cm.stack(3),
                'bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/40 text-on-surface-variant',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[40px] text-primary')}>
                draw
              </span>
              <p className={cm.cn(cm.fontWeight('semibold'))}>
                {t('boards.empty.title', {}, { defaultValue: 'No boards yet' })}
              </p>
              <p className={cm.cn(cm.textSize('sm'))}>
                {t(
                  'boards.empty.body',
                  {},
                  { defaultValue: 'Create your first board or pick a template to get started.' },
                )}
              </p>
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'sm' }))}>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating}
                  data-mol-id="boards-empty-create"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'bg-gradient-to-br from-primary to-primary-hover text-white rounded-xl shadow-md disabled:opacity-60',
                  )}
                >
                  {t('boards.empty.cta', {}, { defaultValue: 'Create your first board' })}
                </button>
                <Link
                  to="/templates"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'bg-surface-container text-on-surface rounded-xl border border-outline-variant/40 hover:bg-surface-container-high transition-colors',
                  )}
                >
                  {t('common.browseTemplates', {}, { defaultValue: 'Browse templates' })}
                </Link>
              </div>
            </div>
          ) : (
            <div className={cm.cn(cm.grid({ cols: 3, gap: 'lg' }))} data-mol-id="boards-grid">
              {filtered.map((b) => (
                <BoardCard key={b.id} board={b} />
              ))}
            </div>
          )}

          {!loading && filteredShared.length > 0 && (
            <div className={cm.stack(4)}>
              <h2
                className={cm.cn(
                  cm.textSize('xl'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {t('boards.sharedTitle', {}, { defaultValue: 'Shared with me' })}
              </h2>
              <div
                className={cm.cn(cm.grid({ cols: 3, gap: 'lg' }))}
                data-mol-id="boards-shared-grid"
              >
                {filteredShared.map((b) => (
                  <BoardCard key={b.id} board={b} />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </WhiteboardLayout>
  )
}

export default Boards
