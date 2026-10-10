import { useCallback, useEffect, useRef, useState } from 'react'

import { FileDropzone } from '@molecule/app-file-dropzone-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

const MAX_BYTES = 25 * 1024 * 1024

interface Attachment {
  id: string
  filename: string
  mimetype: string
  size: number
  created_at: string
}

export interface AttachmentsPanelProps {
  /** The record these files hang off (an order, ticket, task, …). */
  parentId: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

export function AttachmentsPanel({ parentId }: AttachmentsPanelProps) {
  const { t } = useTranslation()
  const [items, setItems] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Every in-flight list request takes a ticket; only the newest may write
  // state. The panel outlives a `parentId` change (switch the selected order /
  // ticket while it stays mounted), so two loads overlap and the LATE response
  // would otherwise win — showing another record's attachments under this one.
  const loadSeq = useRef(0)

  const load = useCallback(async () => {
    const ticket = ++loadSeq.current
    // A failed load (offline, 500) keeps the current list for THIS record; the
    // rejection must not escape — the effect and the post-upload refresh both
    // fire-and-forget.
    try {
      const res = await fetch(`/api/attachments?parent_id=${encodeURIComponent(parentId)}`, {
        credentials: 'include',
      })
      if (!res.ok) return
      // Coerce the body to the list's shape: a non-array payload would reach the
      // render and crash `items.map`.
      const body = (await res.json()) as unknown
      if (ticket !== loadSeq.current) return // superseded by a newer request
      setItems(Array.isArray(body) ? (body as Attachment[]) : [])
    } catch (_error) {
      // Keep the last synced list.
    }
  }, [parentId])

  useEffect(() => {
    // A different record's attachments must never stand in for this one's while
    // its own load is in flight — clear them (the load below refills them).
    setItems([])
    void load()
    return () => {
      // Invalidate whatever this record still has in flight.
      loadSeq.current++
    }
  }, [load])

  async function upload(files: File[]): Promise<void> {
    setError(null)
    setUploading(true)
    try {
      // Upload sequentially so one bad file surfaces a clear error.
      for (const file of files) {
        const form = new FormData()
        form.append('file', file, file.name)
        const res = await fetch(`/api/attachments?parent_id=${encodeURIComponent(parentId)}`, {
          method: 'POST',
          body: form,
          credentials: 'include',
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(
            body.error ?? t('attachments.error.upload', {}, { defaultValue: 'Upload failed' }),
          )
        }
      }
      await load()
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : t('attachments.error.upload', {}, { defaultValue: 'Upload failed' }),
      )
    } finally {
      setUploading(false)
    }
  }

  function handleRejected(files: File[]): void {
    const name = files[0]?.name ?? ''
    setError(t('attachments.error.rejected', { name }, { defaultValue: `File rejected: ${name}` }))
  }

  async function remove(id: string): Promise<void> {
    if (!confirm(t('attachments.confirmDelete', {}, { defaultValue: 'Delete this attachment?' })))
      return
    // The row is dropped only after the server deleted it: a failed or !ok
    // DELETE keeps the attachment listed instead of silently pretending.
    try {
      const res = await fetch(`/api/attachments/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) setItems((prev) => prev.filter((a) => a.id !== id))
    } catch (_error) {
      // Network failure — the attachment stays; the user can retry the delete.
    }
  }

  return (
    <div className={cm.flex({ direction: 'col', gap: 'md' })} style={{ maxWidth: '36rem' }}>
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
        {t('attachments.title', {}, { defaultValue: 'Attachments' })}
      </h2>

      {/* Broad MIME support: no `accept` filter here — the server validates the type. */}
      <FileDropzone
        multiple
        maxSize={MAX_BYTES}
        onFiles={(files) => void upload(files)}
        onRejected={handleRejected}
        disabled={uploading}
      />

      {error ? (
        <p className={cm.textSize('sm')} role="alert" data-mol-id="attachments-error">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className={cm.textSize('sm')}>
          {t('attachments.empty', {}, { defaultValue: 'No files attached yet.' })}
        </p>
      ) : (
        <ul className={cm.flex({ direction: 'col', gap: 'sm' })}>
          {items.map((a) => (
            <li key={a.id} className={cm.flex({ align: 'center', gap: 'md' })}>
              <a
                href={`/api/attachments/${a.id}/download`}
                data-mol-id="attachment-download"
                className={cm.fontWeight('medium')}
              >
                {a.filename}
              </a>
              <span className={cm.textSize('sm')}>{formatBytes(a.size)}</span>
              <button
                type="button"
                onClick={() => void remove(a.id)}
                data-mol-id="attachment-delete"
                className={cm.button({ variant: 'ghost', size: 'sm' })}
              >
                {t('attachments.delete', {}, { defaultValue: 'Delete' })}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
