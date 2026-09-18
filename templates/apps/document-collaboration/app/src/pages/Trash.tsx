import { useEffect, useState } from 'react'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { DocumentVisibility } from '../components/DocumentVisibilityPill.js'
import { QuillonDocumentCard } from '../components/QuillonDocumentCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface TrashedDoc {
  id: string
  owner_id: string
  title: string
  status: string
  content: { blocks?: Array<{ type: string; text?: string }> } | null
  trashed_at: string | null
  updated_at: string
}

function previewOf(doc: TrashedDoc): string {
  const blocks = doc.content?.blocks ?? []
  const para = blocks.find((b) => b.type === 'paragraph' && b.text)
  return para?.text ?? ''
}

export function Trash() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [docs, setDocs] = useState<TrashedDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/documents/trash')
      .then((res) => {
        if (cancelled) return
        setDocs(unwrapList<TrashedDoc>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('trash.loadFailed', {}, { defaultValue: 'Could not load trash.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const restore = async (id: string): Promise<void> => {
    setBusyId(id)
    try {
      await http.post(`/api/documents/${id}/restore`, {})
      setDocs((prev) => prev.filter((d) => d.id !== id))
    } catch (error) {
      logError('trash.restore', error)
      setError(t('trash.restoreFailed', {}, { defaultValue: 'Could not restore.' }))
    } finally {
      setBusyId(null)
    }
  }

  const deleteForever = async (id: string): Promise<void> => {
    setBusyId(id)
    try {
      await http.delete(`/api/documents/${id}`)
      setDocs((prev) => prev.filter((d) => d.id !== id))
    } catch (error) {
      logError('trash.deleteForever', error)
      setError(t('trash.deleteFailed', {}, { defaultValue: 'Could not delete.' }))
    } finally {
      setBusyId(null)
    }
  }

  const emptyTrash = async (): Promise<void> => {
    for (const doc of docs) {
      try {
        await http.delete(`/api/documents/${doc.id}`)
      } catch (_error) {
        // best-effort — continue deleting remaining docs even if one fails
      }
    }
    setDocs([])
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')} data-testid="trash-root">
      <header className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('extrabold'),
              'uppercase tracking-widest text-secondary',
            )}
          >
            {t('trash.eyebrow', {}, { defaultValue: 'Studio' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 1),
              cm.textSize('3xl'),
              cm.fontWeight('extrabold'),
              'tracking-tight',
            )}
          >
            {t('trash.heading', {}, { defaultValue: 'Trash' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'trash.subtitle',
              {},
              { defaultValue: 'Restore manuscripts you sent to trash, or remove them for good.' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={emptyTrash}
          disabled={docs.length === 0}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('extrabold'),
            cm.textSize('sm'),
            'rounded-full bg-error text-white shadow-sm transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0',
          )}
          data-testid="trash-empty-all"
        >
          {t('trash.emptyAll', {}, { defaultValue: 'Empty trash' })}
        </button>
      </header>

      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl border-l-4 border-l-error bg-error/5 text-sm text-error',
          )}
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-center text-sm text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : docs.length === 0 ? (
        <p
          className={cm.cn(cm.sp('py', 16), 'text-center text-sm text-on-surface-variant')}
          data-testid="trash-empty"
        >
          {t('trash.empty', {}, { defaultValue: 'Nothing to recover.' })}
        </p>
      ) : (
        <div
          className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'sm:grid-cols-2 xl:grid-cols-3')}
          data-testid="trash-grid"
        >
          {docs.map((d) => (
            <QuillonDocumentCard
              key={d.id}
              id={d.id}
              title={d.title || t('status.untitled', {}, { defaultValue: 'Untitled' })}
              preview={previewOf(d)}
              visibility={'private' as DocumentVisibility}
              collaborators={[{ id: d.owner_id, initials: 'YOU' }]}
              updatedAt={d.trashed_at ?? d.updated_at}
              dimmed
              footerSlot={
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <button
                    type="button"
                    onClick={() => restore(d.id)}
                    disabled={busyId === d.id}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.fontWeight('extrabold'),
                      'rounded-full border border-primary text-[10px] uppercase tracking-widest text-primary hover:bg-primary/10 disabled:opacity-50',
                    )}
                    data-testid={`trash-restore-${d.id}`}
                  >
                    {t('trash.restore', {}, { defaultValue: 'Restore' })}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteForever(d.id)}
                    disabled={busyId === d.id}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.fontWeight('extrabold'),
                      'rounded-full text-[10px] uppercase tracking-widest text-error hover:bg-error/10 disabled:opacity-50',
                    )}
                    data-testid={`trash-delete-${d.id}`}
                  >
                    {t('trash.deleteForever', {}, { defaultValue: 'Delete forever' })}
                  </button>
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default Trash
