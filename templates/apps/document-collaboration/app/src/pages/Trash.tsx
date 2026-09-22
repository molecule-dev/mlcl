import { useEffect, useRef, useState } from 'react'

import { track } from '@molecule/app-analytics'
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
  // Destructive actions arm on the first click and commit on the second —
  // the armed state auto-resets after 4s so a stray click can't linger.
  const [armedDeleteId, setArmedDeleteId] = useState<string | null>(null)
  const [armedEmpty, setArmedEmpty] = useState(false)
  const disarmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleDisarm = (disarm: () => void): void => {
    if (disarmTimerRef.current) clearTimeout(disarmTimerRef.current)
    disarmTimerRef.current = setTimeout(disarm, 4000)
  }

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
      void track({ name: 'doc.restored', properties: { document_id: id } })
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
      void track({ name: 'doc.deleted', properties: { document_id: id } })
    } catch (error) {
      logError('trash.deleteForever', error)
      setError(t('trash.deleteFailed', {}, { defaultValue: 'Could not delete.' }))
    } finally {
      setBusyId(null)
    }
  }

  const emptyTrash = async (): Promise<void> => {
    const count = docs.length
    for (const doc of docs) {
      try {
        await http.delete(`/api/documents/${doc.id}`)
      } catch (_error) {
        // best-effort — continue deleting remaining docs even if one fails
      }
    }
    setDocs([])
    void track({ name: 'trash.emptied', properties: { count } })
  }

  const onDeleteForeverClick = (id: string): void => {
    if (armedDeleteId !== id) {
      setArmedDeleteId(id)
      setArmedEmpty(false)
      scheduleDisarm(() => setArmedDeleteId(null))
      return
    }
    setArmedDeleteId(null)
    void deleteForever(id)
  }

  const onEmptyTrashClick = (): void => {
    if (!armedEmpty) {
      setArmedEmpty(true)
      setArmedDeleteId(null)
      scheduleDisarm(() => setArmedEmpty(false))
      return
    }
    setArmedEmpty(false)
    void emptyTrash()
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
          onClick={onEmptyTrashClick}
          disabled={docs.length === 0}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('extrabold'),
            cm.textSize('sm'),
            'rounded-full shadow-sm transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0',
            armedEmpty ? 'bg-error text-white ring-2 ring-error/40' : 'bg-error text-white',
          )}
          data-testid="trash-empty-all"
        >
          {armedEmpty
            ? t('trash.confirmEmpty', {}, { defaultValue: 'Confirm — delete everything' })
            : t('trash.emptyAll', {}, { defaultValue: 'Empty trash' })}
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
                    onClick={() => onDeleteForeverClick(d.id)}
                    disabled={busyId === d.id}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.fontWeight('extrabold'),
                      'rounded-full text-[10px] uppercase tracking-widest hover:bg-error/10 disabled:opacity-50',
                      armedDeleteId === d.id
                        ? 'bg-error/10 text-error ring-1 ring-error'
                        : 'text-error',
                    )}
                    data-testid={`trash-delete-${d.id}`}
                  >
                    {armedDeleteId === d.id
                      ? t('trash.confirmDelete', {}, { defaultValue: 'Confirm delete' })
                      : t('trash.deleteForever', {}, { defaultValue: 'Delete forever' })}
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
