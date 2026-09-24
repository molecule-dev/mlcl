import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import { type DocumentRow, type DocumentVersionRow, relativeLabel } from '../lib/types.js'

/**
 * Version history — show every snapshot for a document, allow restore.
 *
 * Each row in `document_versions` is rendered with its body excerpt; the
 * "Restore" button POSTs to /documents/:id/versions/:versionId/restore
 * which overwrites the current document body and returns the user to the
 * editor with that body in place.
 */
export function VersionHistory() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const docId = id ?? ''

  const [doc, setDoc] = useState<DocumentRow | null>(null)
  const [versions, setVersions] = useState<DocumentVersionRow[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!docId) return
    setLoading(true)
    setError(null)
    try {
      const [docRes, vRes] = await Promise.all([
        http.get<DocumentRow>(`/documents/${docId}`),
        http.get<DocumentVersionRow[]>(`/documents/${docId}/versions`),
      ])
      setDoc(docRes.data ?? null)
      const list = Array.isArray(vRes.data) ? vRes.data : []
      setVersions(list)
      setActiveId(list[0]?.id ?? null)
    } catch (error) {
      logError('versionHistory.reload', error)
      setError(
        t('versionHistory.loadFailed', {}, { defaultValue: 'Could not load version history.' }),
      )
    } finally {
      setLoading(false)
    }
  }, [docId, http, t])

  useEffect(() => {
    void reload()
  }, [reload])

  const active = useMemo(
    () => versions.find((v) => v.id === activeId) ?? versions[0] ?? null,
    [versions, activeId],
  )

  const wordsIn = useCallback((text: string) => text.trim().split(/\s+/).filter(Boolean).length, [])

  const previousVersion = useMemo(() => {
    if (!active) return null
    const idx = versions.findIndex((v) => v.id === active.id)
    return idx >= 0 && idx + 1 < versions.length ? (versions[idx + 1] ?? null) : null
  }, [versions, active])

  const handleSnapshot = useCallback(async () => {
    if (!doc) return
    try {
      await http.post(`/documents/${doc.id}/versions/snapshot`, {})
      void track({
        name: 'doc.snapshot_created',
        properties: { doc_id: doc.id, source: 'version-history' },
      })
      setActionMsg(t('versionHistory.snapshotSaved', {}, { defaultValue: 'Snapshot saved' }))
      await reload()
    } catch (error) {
      logError('versionHistory.handleSnapshot', error)
      setActionMsg(t('versionHistory.snapshotFailed', {}, { defaultValue: 'Snapshot failed' }))
    }
  }, [doc, http, reload, t])

  // ConfirmButton owns the arm/confirm step — this callback is only the
  // commit path. Errors are swallowed into actionMsg here because
  // ConfirmButton hands error reporting to the caller.
  const commitRestore = useCallback(async () => {
    if (!doc || !active) return
    try {
      await http.post(`/documents/${doc.id}/versions/${active.id}/restore`, {})
      void track({
        name: 'version.restored',
        properties: { doc_id: doc.id, version_id: active.id },
      })
      navigate(`/editor/${doc.id}`)
    } catch (error) {
      logError('versionHistory.handleRestore', error)
      setActionMsg(
        t('versionHistory.restoreFailed', {}, { defaultValue: 'Could not restore version.' }),
      )
    }
  }, [doc, active, http, navigate, t])

  if (loading) {
    return (
      <div className={cm.cn('p-12 text-center text-on-surface-variant')}>
        {t('versionHistory.loading', {}, { defaultValue: 'Loading versions…' })}
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div className={cm.cn('p-12 text-center')}>
        <p className={cm.cn('text-on-surface mb-4')}>{error}</p>
        <Link to="/library" className={cm.cn('text-primary font-bold')}>
          {t('versionHistory.backToLibrary', {}, { defaultValue: 'Back to library' })}
        </Link>
      </div>
    )
  }

  const sampleAdded = active?.body_md ? active.body_md.slice(0, 800) : ''
  const sampleRemoved = previousVersion?.body_md ? previousVersion.body_md.slice(0, 800) : null

  return (
    <div className={cm.cn(cm.flex({ direction: 'row' }), 'min-h-full')}>
      <aside
        className={cm.cn(
          'w-[320px] shrink-0 hidden lg:block border-r border-outline-variant/40 bg-surface-container-low/40',
        )}
      >
        <div className={cm.cn(cm.sp('p', 5))}>
          <Link
            to={`/editor/${doc.id}`}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              'text-[11px] font-black uppercase tracking-[0.32em] text-on-surface-variant hover:text-primary transition-colors mb-6',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
              arrow_back
            </span>
            {t('versionHistory.backToEditor', {}, { defaultValue: 'Back to editor' })}
          </Link>
          <p
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-[0.32em] text-on-surface-variant/70 mb-1',
            )}
          >
            {t('versionHistory.eyebrow', {}, { defaultValue: 'Manuscript timeline' })}
          </p>
          <h2
            className={cm.cn(
              'text-xl font-extrabold tracking-tight text-on-surface mb-2 leading-snug',
            )}
            style={{
              fontFamily:
                'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
            }}
          >
            {doc.title || t('status.untitled', {}, { defaultValue: 'Untitled' })}
          </h2>
          <button
            type="button"
            onClick={handleSnapshot}
            data-testid="versions-snapshot"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              'mb-4 inline-flex items-center gap-2 rounded-lg border border-outline-variant text-[12px] font-bold text-on-surface-variant hover:bg-surface-container-low',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
              save
            </span>
            {t('versionHistory.snapshotCta', {}, { defaultValue: 'Save snapshot now' })}
          </button>
          {versions.length === 0 ? (
            <p className={cm.cn('text-sm text-on-surface-variant')}>
              {t(
                'versionHistory.empty',
                {},
                { defaultValue: 'No snapshots yet. Save one to start the timeline.' },
              )}
            </p>
          ) : (
            <ol
              className={cm.cn('relative space-y-1 ml-2 border-l border-outline-variant/40 pl-5')}
            >
              {versions.map((rev, idx) => {
                const prev = versions[idx + 1]
                const wc = wordsIn(rev.body_md)
                const delta = prev ? wc - wordsIn(prev.body_md) : wc
                const isActive = rev.id === activeId
                return (
                  <li key={rev.id} className={cm.cn('relative pb-3')}>
                    <span
                      className={cm.cn(
                        'absolute -left-[26px] top-2 w-3 h-3 rounded-full border-2 border-background',
                        isActive ? 'bg-primary ring-2 ring-primary/30' : 'bg-on-surface-variant/50',
                      )}
                      aria-hidden="true"
                    />
                    <button
                      type="button"
                      onClick={() => setActiveId(rev.id)}
                      data-testid={`version-row-${rev.version_number}`}
                      className={cm.cn(
                        cm.sp('p', 3),
                        'w-full text-left rounded-xl transition-colors',
                        isActive
                          ? 'bg-primary/10 text-on-surface'
                          : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                      )}
                    >
                      <div
                        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'mb-1')}
                      >
                        <span className={cm.cn('text-[11px] font-black uppercase tracking-widest')}>
                          v{rev.version_number}
                        </span>
                        {idx === 0 ? (
                          <span
                            className={cm.cn(
                              'text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary text-on-primary',
                            )}
                          >
                            {t('versionHistory.latestTag', {}, { defaultValue: 'Latest' })}
                          </span>
                        ) : null}
                      </div>
                      <p className={cm.cn('text-[13px] font-medium leading-snug')}>
                        {relativeLabel(rev.created_at)}
                      </p>
                      <div
                        className={cm.cn(
                          'mt-2 flex items-center gap-2 text-[10px] font-bold tabular-nums',
                        )}
                      >
                        <span>{wc.toLocaleString()} words</span>
                        <span aria-hidden="true">·</span>
                        <span className={cm.cn(delta >= 0 ? 'text-success' : 'text-error')}>
                          {delta > 0 ? '+' : ''}
                          {delta}
                        </span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </aside>

      <div className={cm.cn(cm.flex1, 'min-w-0 px-6 py-10 lg:px-12 lg:py-14')}>
        <div className={cm.cn('mx-auto w-full max-w-[820px]')}>
          {actionMsg ? (
            <div
              role="status"
              className={cm.cn(
                'mb-6 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-[12px] font-semibold text-primary',
              )}
            >
              {actionMsg}
            </div>
          ) : null}
          {!active ? (
            <div className={cm.cn('text-center text-on-surface-variant py-12')}>
              {t(
                'versionHistory.selectPrompt',
                {},
                { defaultValue: 'Take a snapshot to start the version timeline.' },
              )}
            </div>
          ) : (
            <>
              <header className={cm.cn('mb-8')}>
                <p
                  className={cm.cn(
                    'text-[11px] font-black uppercase tracking-[0.32em] text-on-surface-variant mb-2',
                  )}
                >
                  {t(
                    'versionHistory.diffEyebrow',
                    { label: relativeLabel(active.created_at) },
                    { defaultValue: 'Snapshot · {{label}}' },
                  )}
                </p>
                <h1
                  className={cm.cn(
                    'text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
                  )}
                  style={{
                    fontFamily:
                      'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
                  }}
                >
                  v{active.version_number}
                </h1>
                <div
                  className={cm.cn(
                    cm.sp('mt', 4),
                    'flex flex-wrap items-center gap-3 text-[12px] font-bold tabular-nums text-on-surface-variant',
                  )}
                >
                  <span className={cm.cn('inline-flex items-center gap-1')}>
                    <span
                      className={cm.cn('material-symbols-outlined text-[14px]')}
                      aria-hidden="true"
                    >
                      edit_note
                    </span>
                    {wordsIn(active.body_md).toLocaleString()} words
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{active.snapshot_size} chars</span>
                </div>
              </header>

              <div className={cm.cn('space-y-4')}>
                {sampleRemoved ? (
                  <div
                    className={cm.cn(
                      cm.sp('p', 5),
                      'rounded-2xl border border-error/30 bg-error-light/60',
                    )}
                  >
                    <div
                      className={cm.cn(
                        'flex items-center gap-2 mb-2 text-[11px] font-black uppercase tracking-widest text-error',
                      )}
                    >
                      <span aria-hidden="true">−</span>
                      {t('versionHistory.previous', {}, { defaultValue: 'Previous version' })}
                    </div>
                    <pre
                      className={cm.cn(
                        'text-[15px] leading-[1.7] text-error whitespace-pre-wrap font-sans',
                      )}
                      style={{
                        fontFamily:
                          'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
                      }}
                    >
                      {sampleRemoved}
                    </pre>
                  </div>
                ) : null}

                <div
                  className={cm.cn(
                    cm.sp('p', 5),
                    'rounded-2xl border border-success/30 bg-success-light/60',
                  )}
                >
                  <div
                    className={cm.cn(
                      'flex items-center gap-2 mb-2 text-[11px] font-black uppercase tracking-widest text-success',
                    )}
                  >
                    <span aria-hidden="true">+</span>
                    {t('versionHistory.thisSnapshot', {}, { defaultValue: 'This snapshot' })}
                  </div>
                  <pre
                    className={cm.cn(
                      'text-[15px] leading-[1.7] text-success whitespace-pre-wrap font-sans',
                    )}
                    style={{
                      fontFamily:
                        'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
                    }}
                  >
                    {sampleAdded || t('versionHistory.empty', {}, { defaultValue: '(empty)' })}
                  </pre>
                </div>
              </div>

              <div className={cm.cn(cm.sp('mt', 8), 'flex flex-wrap items-center gap-3')}>
                <ConfirmButton
                  label={t(
                    'versionHistory.restoreCta',
                    {},
                    { defaultValue: 'Restore this snapshot' },
                  )}
                  confirmLabel={t(
                    'versionHistory.confirmRestore',
                    {},
                    { defaultValue: 'Replace the current document body with this version?' },
                  )}
                  onConfirm={commitRestore}
                  disarmSeconds={6}
                  data-testid="versions-restore"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default VersionHistory
