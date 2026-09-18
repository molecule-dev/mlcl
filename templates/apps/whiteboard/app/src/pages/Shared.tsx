import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { WhiteboardLayout } from '../components/WhiteboardLayout.js'

interface BoardRow {
  id: string
  title?: string
  description?: string
  background?: string | null
  owner_id?: string
  is_public?: boolean
  updated_at?: string
}

interface CollabRow {
  id: string
  board_id: string
  user_id?: string | null
  email?: string | null
  role?: string
  status?: string
}

const PERMISSION_FILTERS: Array<'all' | 'editor' | 'commenter' | 'viewer'> = [
  'all',
  'editor',
  'commenter',
  'viewer',
]

const ACCENTS = ['#5b5bf7', '#00c4a8', '#a855f7', '#f97316', '#ec4899', '#84cc16', '#06b6d4']
function accentForId(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return ACCENTS[h % ACCENTS.length]!
}

function relativeTime(value?: string): string {
  if (!value) return ''
  const ts = new Date(value).getTime()
  const diffMs = Date.now() - ts
  if (diffMs < 60_000) return 'just now'
  if (diffMs < 3_600_000) return `${Math.round(diffMs / 60_000)}m ago`
  if (diffMs < 86_400_000) return `${Math.round(diffMs / 3_600_000)}h ago`
  return `${Math.round(diffMs / 86_400_000)}d ago`
}

export function Shared() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [boards, setBoards] = useState<BoardRow[]>([])
  const [collabsByBoard, setCollabsByBoard] = useState<Record<string, CollabRow[]>>({})
  const [filter, setFilter] = useState<(typeof PERMISSION_FILTERS)[number]>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await http.get<BoardRow[]>('/api/boards/shared')
      const list = Array.isArray(res.data) ? res.data : []
      setBoards(list)
      const collabMap: Record<string, CollabRow[]> = {}
      await Promise.all(
        list.map(async (b) => {
          try {
            const cr = await http.get<CollabRow[]>(`/api/collaborators/${b.id}`)
            collabMap[b.id] = Array.isArray(cr.data) ? cr.data : []
          } catch (_error) {
            // best-effort: a failed collab fetch defaults to an empty list for this board
            collabMap[b.id] = []
          }
        }),
      )
      setCollabsByBoard(collabMap)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBoards([])
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    refresh()
  }, [refresh])

  const myRoleByBoard = useMemo(() => {
    const map: Record<string, string> = {}
    for (const [boardId, list] of Object.entries(collabsByBoard)) {
      const accepted = list.find((c) => c.status === 'accepted' || c.status === 'active') ?? list[0]
      if (accepted?.role) map[boardId] = accepted.role
    }
    return map
  }, [collabsByBoard])

  const filtered = useMemo(() => {
    if (filter === 'all') return boards
    return boards.filter((b) => myRoleByBoard[b.id] === filter)
  }, [boards, filter, myRoleByBoard])

  return (
    <WhiteboardLayout
      eyebrow={t('shared.eyebrow', {}, { defaultValue: 'Shared with you' })}
      title={t('shared.title', {}, { defaultValue: 'Boards from your team' })}
    >
      <div className={cm.stack(8)}>
        {error && (
          <div
            role="alert"
            data-mol-id="shared-error"
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

        <div
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm flex-wrap',
          )}
        >
          <div className={cm.stack(2)}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('shared.filterEyebrow', {}, { defaultValue: 'Filter by permission' })}
            </span>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
              {PERMISSION_FILTERS.map((p) => (
                <button
                  key={p}
                  type="button"
                  data-mol-id={`shared-filter-${p}`}
                  onClick={() => setFilter(p)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 1),
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    'uppercase tracking-widest rounded-full transition-colors',
                    filter === p
                      ? 'bg-on-surface text-surface'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                  )}
                >
                  {t(
                    `shared.permission.${p}`,
                    {},
                    {
                      defaultValue:
                        p === 'all'
                          ? 'All'
                          : p === 'editor'
                            ? 'Can edit'
                            : p === 'commenter'
                              ? 'Can comment'
                              : 'Can view',
                    },
                  )}
                </button>
              ))}
            </div>
          </div>
          <div
            data-mol-id="shared-count"
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'text-on-surface-variant')}
          >
            {t('shared.count', { count: filtered.length }, { defaultValue: '{{count}} board(s)' })}
          </div>
        </div>

        {!loading && filtered.length === 0 ? (
          <div
            data-mol-id="shared-empty"
            className={cm.cn(
              cm.sp('p', 12),
              cm.textCenter,
              cm.stack(3),
              'bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/40 text-on-surface-variant',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[40px] text-primary')}>
              lock_open
            </span>
            <p className={cm.cn(cm.fontWeight('semibold'))}>
              {t('shared.empty.title', {}, { defaultValue: 'Nothing shared with you yet' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'))}>
              {t(
                'shared.empty.body',
                {},
                {
                  defaultValue:
                    'When a teammate invites you to a board, it will show up here automatically.',
                },
              )}
            </p>
          </div>
        ) : (
          <div data-mol-id="shared-grid" className={cm.cn(cm.grid({ cols: 3, gap: 'lg' }))}>
            {filtered.map((b) => {
              const accent = accentForId(b.id)
              const myRole = myRoleByBoard[b.id] ?? 'viewer'
              const collabCount = collabsByBoard[b.id]?.length ?? 0
              return (
                <Link
                  key={b.id}
                  to={`/board/${b.id}`}
                  data-mol-id={`shared-board-${b.id}`}
                  className={cm.cn(
                    cm.stack(0),
                    'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:-translate-y-1 transition-transform overflow-hidden',
                  )}
                >
                  <div
                    className={cm.cn(cm.h(28), 'relative')}
                    style={{
                      background:
                        b.background ?? `linear-gradient(135deg, ${accent}33 0%, ${accent}11 100%)`,
                    }}
                  >
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.fontWeight('bold'),
                        'absolute top-2 right-2 text-[10px] uppercase tracking-widest rounded-full text-white',
                      )}
                      style={{ backgroundColor: accent }}
                    >
                      {myRole}
                    </span>
                  </div>
                  <div className={cm.cn(cm.sp('p', 4), cm.stack(1))}>
                    <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'truncate')}>
                      {b.title || 'Untitled Board'}
                    </span>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'sm' }),
                        cm.textSize('xs'),
                        'text-on-surface-variant',
                      )}
                    >
                      <span>{relativeTime(b.updated_at)}</span>
                      <span>·</span>
                      <span>
                        {t(
                          'shared.collaboratorCount',
                          { count: collabCount },
                          { defaultValue: '{{count}} collaborator(s)' },
                        )}
                      </span>
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </WhiteboardLayout>
  )
}

export default Shared
