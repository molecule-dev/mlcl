/**
 * VersionHistoryPage — a document's revision history with view + restore.
 *
 * Lists every snapshot for a document (newest first), previews a past version
 * side-by-side with the current text (a minimal diff affordance), and restores
 * one. Restoring creates a NEW revision on the server, so the history is never
 * rewritten. Fetches via raw fetch('/api/...') and styles through
 * getClassMap() — swap the field names to match your own document resource.
 */
import { useEffect, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

type Version = {
  id: string
  revision_number: number
  actor_user_id: string
  state: { title?: string; body?: string }
  created_at: string
}

type Document = {
  id: string
  title: string
  body: string
  updated_at: string
}

export function VersionHistoryPage({ documentId }: { documentId: string }) {
  const { t } = useTranslation()
  const [doc, setDoc] = useState<Document | null>(null)
  const [versions, setVersions] = useState<Version[]>([])
  const [selected, setSelected] = useState<Version | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  // Re-runs on documentId change and after a restore (reloadKey bump).
  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([
      fetch(`/api/documents/${documentId}`).then((r) => (r.ok ? r.json() : Promise.reject(r))),
      fetch(`/api/documents/${documentId}/versions`).then((r) =>
        r.ok ? r.json() : Promise.reject(r),
      ),
    ])
      .then(([d, v]) => {
        if (!active) return
        setDoc(d as Document)
        setVersions(v as Version[])
      })
      .catch(() => {
        if (active)
          setError(
            t('versions.loadError', undefined, { defaultValue: 'Could not load version history.' }),
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [documentId, reloadKey, t])

  async function restore(version: Version): Promise<void> {
    if (
      !confirm(
        t('versions.confirmRestore', undefined, {
          defaultValue: 'Restore this version? A new revision is created — nothing is lost.',
        }),
      )
    ) {
      return
    }
    const res = await fetch(`/api/documents/${documentId}/versions/${version.id}/restore`, {
      method: 'POST',
    })
    if (!res.ok) {
      setError(t('versions.restoreError', undefined, { defaultValue: 'Restore failed.' }))
      return
    }
    setSelected(null)
    setReloadKey((k) => k + 1)
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), cm.sp('p', 6))}>
      <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
        {t('versions.title', undefined, { defaultValue: 'Version history' })}
      </h1>

      {loading ? <p>{t('common.loading', undefined, { defaultValue: 'Loading…' })}</p> : null}

      {error ? (
        <p className={cm.textError} role="alert">
          {error}
        </p>
      ) : null}

      {!loading && versions.length === 0 ? (
        <p className={cm.textMuted}>
          {t('versions.empty', undefined, {
            defaultValue: 'No previous versions yet. Edits will appear here.',
          })}
        </p>
      ) : null}

      <ul className={cm.flex({ direction: 'col', gap: 'sm' })}>
        {versions.map((version) => (
          <li
            key={version.id}
            className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('py', 2))}
          >
            <span className={cm.fontWeight('medium')}>
              {t(
                'versions.number',
                { number: version.revision_number },
                { defaultValue: 'v{{number}}' },
              )}
            </span>
            <span className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {new Date(version.created_at).toLocaleString()}
            </span>
            <button
              type="button"
              data-mol-id={`version-view-${version.revision_number}`}
              onClick={() => setSelected(version)}
              className={cm.button({ variant: 'ghost', size: 'sm' })}
            >
              {t('versions.view', undefined, { defaultValue: 'View diff' })}
            </button>
            <button
              type="button"
              data-mol-id={`version-restore-${version.revision_number}`}
              onClick={() => void restore(version)}
              className={cm.button({ variant: 'outline', size: 'sm' })}
            >
              {t('versions.restore', undefined, { defaultValue: 'Restore' })}
            </button>
          </li>
        ))}
      </ul>

      {selected && doc ? (
        <div className={cm.flex({ direction: 'row', gap: 'lg' })} data-mol-id="version-diff">
          <section className={cm.flex({ direction: 'col', gap: 'sm' })} style={{ flex: 1 }}>
            <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), cm.textMuted)}>
              {t(
                'versions.thisVersion',
                { number: selected.revision_number },
                { defaultValue: 'Version {{number}}' },
              )}
            </h2>
            <p className={cm.fontWeight('medium')}>{selected.state.title}</p>
            <pre className={cm.textSize('sm')} style={{ whiteSpace: 'pre-wrap' }}>
              {selected.state.body}
            </pre>
          </section>
          <section className={cm.flex({ direction: 'col', gap: 'sm' })} style={{ flex: 1 }}>
            <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), cm.textMuted)}>
              {t('versions.current', undefined, { defaultValue: 'Current' })}
            </h2>
            <p className={cm.fontWeight('medium')}>{doc.title}</p>
            <pre className={cm.textSize('sm')} style={{ whiteSpace: 'pre-wrap' }}>
              {doc.body}
            </pre>
          </section>
        </div>
      ) : null}
    </div>
  )
}
