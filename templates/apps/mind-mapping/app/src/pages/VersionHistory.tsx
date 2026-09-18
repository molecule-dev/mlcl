import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface MapVersion {
  id: string
  map_id: string
  snapshot: { nodes?: unknown[]; connections?: unknown[] } | string
  created_by: string | null
  change_summary: string
  created_at: string
}

interface MapDetail {
  id: string
  title: string
}

const formatDate = (iso: string): string => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

const parseSnapshot = (
  snap: MapVersion['snapshot'],
): { nodes: unknown[]; connections: unknown[] } => {
  const obj = typeof snap === 'string' ? JSON.parse(snap) : snap
  return {
    nodes: Array.isArray(obj?.nodes) ? obj.nodes : [],
    connections: Array.isArray(obj?.connections) ? obj.connections : [],
  }
}

export function VersionHistory() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [map, setMap] = useState<MapDetail | null>(null)
  const [versions, setVersions] = useState<MapVersion[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [mapRes, versionsRes] = await Promise.all([
        http.get<MapDetail>(`/maps/${id}`),
        http.get<MapVersion[]>(`/versions?map_id=${id}`),
      ])
      setMap(mapRes?.data ?? null)
      const list = versionsRes?.data ?? []
      setVersions(list)
      setSelectedId(list[0]?.id ?? null)
      setError(null)
    } catch (error) {
      logError('versionHistory.load', error)
      setError(
        t('versionHistory.loadError', {}, { defaultValue: 'Could not load version history.' }),
      )
    } finally {
      setLoading(false)
    }
  }, [http, id, t])

  useEffect(() => {
    void load()
  }, [load])

  const handleSnapshot = async () => {
    if (!id) return
    setBusy(true)
    setInfo(null)
    try {
      await http.post('/versions', {
        map_id: id,
        change_summary: t(
          'versionHistory.snapshotDefault',
          {},
          { defaultValue: 'Manual snapshot' },
        ),
      })
      await load()
      setInfo(t('versionHistory.snapshotSuccess', {}, { defaultValue: 'Snapshot saved.' }))
    } catch (error) {
      logError('versionHistory.snapshot', error)
      setError(t('versionHistory.snapshotError', {}, { defaultValue: 'Could not save snapshot.' }))
    } finally {
      setBusy(false)
    }
  }

  const handleRestore = async (versionId: string) => {
    if (!id) return
    setBusy(true)
    setInfo(null)
    try {
      await http.post(`/versions/${versionId}/restore`, {})
      setInfo(t('versionHistory.restoreSuccess', {}, { defaultValue: 'Snapshot restored.' }))
      await load()
    } catch (error) {
      logError('versionHistory.restore', error)
      setError(
        t('versionHistory.restoreError', {}, { defaultValue: 'Could not restore snapshot.' }),
      )
    } finally {
      setBusy(false)
    }
  }

  const selected = versions.find((v) => v.id === selectedId) || null
  const selectedSummary = selected ? parseSnapshot(selected.snapshot) : null

  return (
    <div className={cm.stack(8)}>
      <header
        className={cm.cn(cm.flex({ justify: 'between', align: 'end', gap: 'md' }), 'flex-wrap')}
      >
        <div className={cm.stack(2)}>
          <Link
            to={id ? `/maps/${id}` : '/maps'}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'text-primary uppercase tracking-widest hover:underline',
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
              arrow_back
            </span>
            {t('versionHistory.backToMap', {}, { defaultValue: 'Back to map' })}
          </Link>
          <h1
            className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('versionHistory.title', {}, { defaultValue: 'Version history' })}
          </h1>
          {map?.title && (
            <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>{map.title}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleSnapshot}
          disabled={busy || !id}
          data-mol-id="version-history-snapshot"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 'xs' }),
            'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md disabled:opacity-60',
          )}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>save</span>
          {t('versionHistory.takeSnapshot', {}, { defaultValue: 'Save snapshot' })}
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            cm.textSize('sm'),
            'rounded-xl bg-error-container/30 text-on-error-container border border-error/30',
          )}
        >
          {error}
        </div>
      )}
      {info && (
        <div
          role="status"
          className={cm.cn(
            cm.sp('p', 4),
            cm.textSize('sm'),
            'rounded-xl bg-tertiary-container/30 text-on-tertiary-container border border-tertiary/30',
          )}
        >
          {info}
        </div>
      )}

      <div
        className={cm.cn(cm.grid({ cols: 1, gap: 'xl' }), 'lg:grid-cols-[320px_1fr] items-start')}
      >
        <ol
          className={cm.cn(
            cm.stack(2),
            cm.sp('p', 4),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm',
          )}
          data-mol-id="version-history-list"
        >
          {loading ? (
            <li className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('py', 4), cm.textCenter)}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </li>
          ) : versions.length === 0 ? (
            <li className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('py', 4), cm.textCenter)}>
              {t(
                'versionHistory.empty',
                {},
                { defaultValue: 'No snapshots yet. Save your first one to keep a checkpoint.' },
              )}
            </li>
          ) : (
            versions.map((snap) => {
              const isActive = snap.id === selectedId
              return (
                <li key={snap.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(snap.id)}
                    data-mol-id="version-history-item"
                    data-version-id={snap.id}
                    className={cm.cn(
                      cm.flex({ align: 'start', gap: 'sm' }),
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'w-full text-left rounded-xl transition-colors',
                      isActive
                        ? 'bg-primary-container/40 text-on-primary-container'
                        : 'hover:bg-surface-container-low text-on-surface',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.w(9),
                        cm.h(9),
                        'rounded-full bg-primary text-on-primary shrink-0',
                      )}
                    >
                      <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                        history
                      </span>
                    </span>
                    <div className={cm.cn('space-y-1 min-w-0')}>
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('bold'),
                          'truncate block',
                        )}
                      >
                        {snap.change_summary ||
                          t('versionHistory.unnamed', {}, { defaultValue: 'Snapshot' })}
                      </span>
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {formatDate(snap.created_at)}
                      </span>
                    </div>
                  </button>
                </li>
              )
            })
          )}
        </ol>

        <section
          className={cm.cn(
            cm.sp('p', 8),
            cm.stack(6),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm',
          )}
        >
          {selected && selectedSummary ? (
            <>
              <div
                className={cm.cn(
                  cm.flex({ justify: 'between', align: 'start', gap: 'md' }),
                  'flex-wrap',
                )}
              >
                <div className={cm.stack(1)}>
                  <span
                    className={cm.cn(
                      'text-[10px] uppercase tracking-widest font-bold text-primary',
                    )}
                  >
                    {t('versionHistory.snapshotEyebrow', {}, { defaultValue: 'Snapshot' })}
                  </span>
                  <h2
                    className={cm.cn(
                      cm.textSize('2xl'),
                      'font-extrabold tracking-tight text-on-surface',
                    )}
                  >
                    {selected.change_summary ||
                      t('versionHistory.unnamed', {}, { defaultValue: 'Snapshot' })}
                  </h2>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {formatDate(selected.created_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRestore(selected.id)}
                  disabled={busy}
                  data-mol-id="version-history-restore"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    cm.flex({ align: 'center', gap: 'xs' }),
                    'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md disabled:opacity-60',
                  )}
                >
                  <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                    restore
                  </span>
                  {t('versionHistory.restoreButton', {}, { defaultValue: 'Restore this version' })}
                </button>
              </div>

              <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'sm:grid-cols-2')}>
                <div
                  className={cm.cn(
                    cm.sp('p', 4),
                    'rounded-2xl bg-surface-container-low border border-outline-variant/30',
                  )}
                >
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      'uppercase tracking-widest font-bold text-on-surface-variant mb-2',
                    )}
                  >
                    {t('versionHistory.nodeCount', {}, { defaultValue: 'Nodes' })}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('3xl'),
                      cm.fontWeight('bold'),
                      'text-on-surface tabular-nums',
                    )}
                  >
                    {selectedSummary.nodes.length}
                  </p>
                </div>
                <div
                  className={cm.cn(
                    cm.sp('p', 4),
                    'rounded-2xl bg-surface-container-low border border-outline-variant/30',
                  )}
                >
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      'uppercase tracking-widest font-bold text-on-surface-variant mb-2',
                    )}
                  >
                    {t('nav.connections', {}, { defaultValue: 'Connections' })}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('3xl'),
                      cm.fontWeight('bold'),
                      'text-on-surface tabular-nums',
                    )}
                  >
                    {selectedSummary.connections.length}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {versions.length === 0
                ? t(
                    'versionHistory.emptyDetail',
                    {},
                    { defaultValue: 'Save a snapshot to start your timeline.' },
                  )
                : t(
                    'versionHistory.selectHint',
                    {},
                    { defaultValue: 'Select a snapshot to view it.' },
                  )}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

export default VersionHistory
