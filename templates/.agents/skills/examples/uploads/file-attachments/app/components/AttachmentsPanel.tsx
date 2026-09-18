import { useCallback, useEffect, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { FileDropzone } from '@molecule/app-file-dropzone-react'

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

  const load = useCallback(async () => {
    const res = await fetch(`/api/attachments?parent_id=${encodeURIComponent(parentId)}`, {
      credentials: 'include',
    })
    if (res.ok) setItems((await res.json()) as Attachment[])
  }, [parentId])

  useEffect(() => {
    void load()
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
    const res = await fetch(`/api/attachments/${id}`, { method: 'DELETE', credentials: 'include' })
    if (res.ok) setItems((prev) => prev.filter((a) => a.id !== id))
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
