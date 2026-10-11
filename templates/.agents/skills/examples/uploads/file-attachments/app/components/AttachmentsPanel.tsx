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
  // The record the CURRENT render belongs to. An upload/delete that started on
  // record A must not refresh (nor report its error) into record B's state when
  // the user switches records while the request is in flight: the ticket only
  // serializes against EARLIER requests, so A's trailing refresh would take the
  // NEWEST ticket and overwrite B's list with A's.
  const mountedForRef = useRef(parentId)
  mountedForRef.current = parentId
  // The upload's write ticket. `uploading` is ONE flag for the dropzone, but the
  // panel outlives a `parentId` change: an upload parked on record A must not
  // hold B's dropzone disabled, and when it finally settles it must not release
  // an upload B started meanwhile. The reset below bumps the ticket and clears
  // the flag; an upload only clears the flag while its own ticket is still the
  // newest (the same monotonic release CommentThread's `postTicket` uses).
  const uploadTicket = useRef(0)

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
    // …and the dropzone's in-flight flag, which is the one piece of state an
    // upload left on the previous record still owns: left set, it kept the NEW
    // record's dropzone `disabled` for as long as A's upload ran, so files
    // dropped on B were silently refused. The ticket bump makes that upload's
    // `finally` a no-op, so it cannot release an upload started here.
    uploadTicket.current += 1
    setUploading(false)
    void load()
    return () => {
      // Invalidate whatever this record still has in flight.
      loadSeq.current++
    }
  }, [load])

  async function upload(files: File[]): Promise<void> {
    setError(null)
    setUploading(true)
    // This upload's ticket — the reset above invalidates it on a record change,
    // so its `finally` cannot clear a newer record's flag.
    const ticket = ++uploadTicket.current
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
    } catch (err: unknown) {
      // The failure belongs to the record it was uploaded to — a switch since
      // must not paste this error under the new record's panel.
      if (mountedForRef.current === parentId) {
        setError(
          err instanceof Error
            ? err.message
            : t('attachments.error.upload', {}, { defaultValue: 'Upload failed' }),
        )
      }
    } finally {
      // The refresh runs on EVERY outcome, not just the happy one. A multi-file
      // upload that fails on the third file has ALREADY stored the first two
      // server-side, and the old refresh-only-on-success left them off the list
      // until an unrelated reload — the panel reported the failure over a list
      // the server had grown. The user switched records while the upload ran?
      // Then the files landed on the record we LEFT, whose state this render no
      // longer owns: refreshing here would take the newest ticket and render
      // the old record's attachments under the new one (see mountedForRef).
      if (mountedForRef.current === parentId) await load()
      if (uploadTicket.current === ticket) setUploading(false)
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
      if (res.ok) {
        // A delete only speaks for the record THIS render was mounted for. The
        // panel outlives a `parentId` change, so the user can switch records
        // while the DELETE is in flight — and then this invalidation would take
        // the ticket the NEW record's own load is holding, discarding the rows
        // that were about to fill its list (the panel sits on "No files
        // attached yet" over a record that has files). The effect's cleanup
        // already invalidated everything this record had in flight, which is
        // the same ownership rule upload() applies through mountedForRef.
        if (mountedForRef.current !== parentId) return
        // The delete is the newest truth this panel holds. A list read issued
        // BEFORE it committed — an upload's trailing refresh is the reachable
        // one — carries the pre-delete snapshot, and landing after this line
        // it put the row the user just deleted back on screen until the next
        // load. Invalidate those reads (see loadSeq) and refetch: a read
        // started after the delete takes a newer ticket and is honored, and
        // the refetch refills the list whenever the invalidated read was the
        // only one in flight.
        loadSeq.current++
        setItems((prev) => prev.filter((a) => a.id !== id))
        void load()
      }
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
