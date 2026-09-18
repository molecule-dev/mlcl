import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { WhiteboardLayout } from '../components/WhiteboardLayout.js'

interface VersionRow {
  id: string
  board_id: string
  user_id?: string
  created_by?: string
  change_summary?: string
  snapshot?: unknown
  created_at?: string
}

interface BoardRow {
  id: string
  title?: string
}

const ACCENTS = ['#5b5bf7', '#00c4a8', '#a855f7', '#f97316', '#ec4899', '#84cc16', '#06b6d4']
function accentForId(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return ACCENTS[h % ACCENTS.length]!
}

function elementCount(snapshot: unknown): number {
  if (!snapshot) return 0
  const parsed =
    typeof snapshot === 'string' ? safeParse(snapshot) : (snapshot as { elements?: unknown[] })
  return Array.isArray(parsed?.elements) ? parsed.elements.length : 0
}

function safeParse(s: string): { elements?: unknown[] } | null {
  try {
    return JSON.parse(s) as { elements?: unknown[] }
  } catch (_error) {
    // invalid snapshot JSON; caller treats null as an empty element list
    return null
  }
}

function formatTime(value?: string): string {
  if (!value) return '—'
  const d = new Date(value)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function VersionHistory() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id = '' } = useParams<{ id: string }>()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [board, setBoard] = useState<BoardRow | null>(null)
  const [versions, setVersions] = useState<VersionRow[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [b, v] = await Promise.all([
        http.get<BoardRow>(`/api/boards/${id}`),
        http.get<VersionRow[]>(`/api/versions/${id}`),
      ])
      setBoard(b.data ?? null)
      const list = Array.isArray(v.data) ? v.data : []
      setVersions(list)
      setActiveId(list[0]?.id ?? '')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [http, id])

  useEffect(() => {
    refresh()
  }, [refresh])

  const active = useMemo(
    () => versions.find((v) => v.id === activeId) ?? versions[0] ?? null,
    [activeId, versions],
  )

  const handleRestore = useCallback(async () => {
    if (!active || !id) return
    setRestoring(true)
    setRestoreStatus(null)
    try {
      await http.post(`/api/versions/${id}/${active.id}/restore`, {})
      setRestoreStatus(t('versionHistory.restored', {}, { defaultValue: 'Snapshot restored.' })!)
      setTimeout(() => navigate(`/board/${id}`), 600)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setRestoring(false)
    }
  }, [active, http, id, navigate, t])

  return (
    <WhiteboardLayout
      eyebrow={
        board?.title
          ? t(
              'versionHistory.eyebrow',
              { title: board.title },
              { defaultValue: '{{title}} · history' },
            )
          : t('versionHistory.eyebrowFallback', {}, { defaultValue: 'Board history' })
      }
      title={t('versionHistory.title', {}, { defaultValue: 'Version history' })}
      actions={
        <>
          <Link
            to={`/board/${id}`}
            data-mol-id="version-back"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'bg-surface-container text-on-surface rounded-xl border border-outline-variant/40 hover:bg-surface-container-high transition-colors',
            )}
          >
            {t('versionHistory.backToBoard', {}, { defaultValue: 'Back to canvas' })}
          </Link>
          <button
            type="button"
            data-mol-id="version-restore"
            onClick={handleRestore}
            disabled={!active || restoring}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              cm.flex({ align: 'center', gap: 'xs' }),
              'bg-gradient-to-br from-primary to-primary-hover text-white rounded-xl shadow-md shadow-primary/30 disabled:opacity-50',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')}>restart_alt</span>
            {restoring
              ? t('versionHistory.restoring', {}, { defaultValue: 'Restoring…' })
              : t('versionHistory.restore', {}, { defaultValue: 'Restore this version' })}
          </button>
        </>
      }
    >
      <div className={cm.stack(4)}>
        {error && (
          <div
            role="alert"
            data-mol-id="version-error"
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
        {restoreStatus && (
          <div
            role="status"
            data-mol-id="version-status"
            className={cm.cn(
              cm.sp('p', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-xl bg-secondary-container/40 text-on-secondary-container',
            )}
          >
            {restoreStatus}
          </div>
        )}

        {!loading && versions.length === 0 ? (
          <div
            data-mol-id="version-empty"
            className={cm.cn(
              cm.sp('p', 12),
              cm.textCenter,
              cm.stack(3),
              'bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/40 text-on-surface-variant',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[40px] text-primary')}>
              history
            </span>
            <p className={cm.cn(cm.fontWeight('semibold'))}>
              {t('versionHistory.empty.title', {}, { defaultValue: 'No snapshots yet' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'))}>
              {t(
                'versionHistory.empty.body',
                {},
                {
                  defaultValue:
                    'Snapshots are created from the board canvas with "Save snapshot" — they appear here so you can restore any past state.',
                },
              )}
            </p>
            <Link
              to={`/board/${id}`}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                'self-center bg-primary text-white rounded-xl text-sm',
              )}
            >
              {t('versionHistory.empty.cta', {}, { defaultValue: 'Open canvas to take one' })}
            </Link>
          </div>
        ) : (
          <div className={cm.cn(cm.grid({ cols: 12, gap: 'lg' }))}>
            <aside
              data-mol-id="version-timeline"
              className={cm.cn(
                'col-span-4 self-start sticky top-24',
                cm.sp('p', 5),
                cm.stack(2),
                'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm',
              )}
            >
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('versionHistory.timelineEyebrow', {}, { defaultValue: 'Timeline' })}
              </span>
              <ul className={cm.cn(cm.stack(2), 'relative')}>
                {versions.map((snap, idx) => {
                  const accent = accentForId(snap.created_by ?? snap.user_id ?? snap.id)
                  return (
                    <li key={snap.id}>
                      <button
                        type="button"
                        data-mol-id={`version-item-${snap.id}`}
                        onClick={() => setActiveId(snap.id)}
                        className={cm.cn(
                          cm.flex({ gap: 'sm' }),
                          cm.sp('p', 3),
                          'w-full rounded-xl text-left transition-colors',
                          activeId === snap.id
                            ? 'bg-primary-fixed/40 border-l-4 border-primary'
                            : 'hover:bg-surface-container-low border-l-4 border-transparent',
                        )}
                      >
                        <span
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'center' }),
                            cm.w(8),
                            cm.h(8),
                            cm.roundedFull,
                            cm.fontWeight('bold'),
                            'shrink-0 text-white text-xs',
                          )}
                          style={{ backgroundColor: accent }}
                        >
                          {(snap.created_by ?? snap.user_id ?? '?').slice(0, 1).toUpperCase()}
                        </span>
                        <div className={cm.cn(cm.flex1, cm.stack(0), 'min-w-0')}>
                          <span
                            className={cm.cn(
                              cm.textSize('xs'),
                              cm.fontWeight('bold'),
                              'text-on-surface',
                            )}
                          >
                            {formatTime(snap.created_at)}
                          </span>
                          <span
                            className={cm.cn(
                              cm.textSize('xs'),
                              'text-on-surface-variant truncate block',
                            )}
                          >
                            {snap.change_summary || `Snapshot #${versions.length - idx}`}
                          </span>
                        </div>
                        {idx === 0 && (
                          <span
                            className={cm.cn(
                              cm.sp('px', 2),
                              cm.fontWeight('bold'),
                              'text-[10px] uppercase tracking-widest rounded-full bg-success-light text-success self-start',
                            )}
                          >
                            {t('versionHistory.latest', {}, { defaultValue: 'Latest' })}
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </aside>

            {active && (
              <section className={cm.cn('col-span-8', cm.stack(5))}>
                <div
                  data-mol-id="version-detail"
                  className={cm.cn(
                    cm.sp('p', 8),
                    'rounded-[2rem] bg-gradient-to-br from-primary to-primary-hover text-white relative overflow-hidden',
                  )}
                >
                  <div className={cm.stack(3)}>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest text-white/70',
                      )}
                    >
                      {formatTime(active.created_at)}
                    </span>
                    <h2 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight')}>
                      {active.change_summary ||
                        t(
                          'versionHistory.untitledSnapshot',
                          {},
                          { defaultValue: 'Untitled snapshot' },
                        )}
                    </h2>
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
                      <span
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'xs' }),
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.roundedFull,
                          cm.fontWeight('bold'),
                          'bg-surface/20 backdrop-blur-md text-xs',
                        )}
                      >
                        <span className={cm.cn('material-symbols-outlined text-[14px]')}>
                          dataset
                        </span>
                        {t(
                          'versionHistory.elementsTotal',
                          { count: elementCount(active.snapshot) },
                          { defaultValue: '{{count}} captured elements' },
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </WhiteboardLayout>
  )
}

export default VersionHistory
