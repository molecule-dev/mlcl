import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { NimbusFilesLayout } from '../components/NimbusFilesLayout.js'
import type { NimbusFileKind } from '../components/NimbusFileTypeIcon.js'
import { NimbusFileTypeIcon } from '../components/NimbusFileTypeIcon.js'

interface QueueEntry {
  id: string
  name: string
  size: number
  mime: string
  kind: NimbusFileKind
  blob?: File
  status: 'queued' | 'uploading' | 'done' | 'error'
  progress: number
  detail: string
  fileId?: string
}

function kindFromMime(mime: string): NimbusFileKind {
  if (!mime) return 'document'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (
    mime === 'application/zip' ||
    mime === 'application/x-tar' ||
    mime === 'application/gzip' ||
    mime === 'application/x-rar-compressed' ||
    mime === 'application/x-7z-compressed'
  ) {
    return 'archive'
  }
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime === 'text/csv')
    return 'spreadsheet'
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'presentation'
  if (
    mime === 'application/json' ||
    mime === 'application/xml' ||
    mime === 'application/javascript' ||
    mime.startsWith('text/markdown')
  ) {
    return 'code'
  }
  return 'document'
}

function formatSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let v = bytes / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i += 1
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`
}

const STATUS_BADGE: Record<QueueEntry['status'], string> = {
  uploading: 'bg-primary-container/15 text-primary',
  queued: 'bg-surface-container-high text-on-surface-variant',
  done: 'bg-success-light text-success',
  error: 'bg-error-container/30 text-error',
}

const STATUS_BAR: Record<QueueEntry['status'], string> = {
  uploading: 'bg-primary',
  queued: 'bg-surface-container-high',
  done: 'bg-success',
  error: 'bg-error',
}

export function Upload() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [queue, setQueue] = useState<QueueEntry[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const folderInputRef = useRef<HTMLInputElement | null>(null)

  const STATUS_COPY: Record<QueueEntry['status'], { key: string; defaultValue: string }> = {
    uploading: { key: 'upload.status.uploading', defaultValue: 'Uploading' },
    queued: { key: 'upload.status.queued', defaultValue: 'Queued' },
    done: { key: 'upload.status.done', defaultValue: 'Synced' },
    error: { key: 'upload.status.error', defaultValue: 'Failed' },
  }

  function setEntry(id: string, patch: Partial<QueueEntry>) {
    setQueue((q) => q.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  async function uploadOne(entry: QueueEntry) {
    setEntry(entry.id, {
      status: 'uploading',
      progress: 10,
      detail: t('upload.progress.uploading', {}, { defaultValue: 'Uploading bytes…' }),
    })
    try {
      let fileId: string | undefined

      if (entry.blob) {
        // Real byte upload to S3 via the backend uploads bond. The fetch
        // API is used directly so we get a multipart/form-data body that
        // bypasses the JSON body parser and reaches busboy intact.
        //
        // The upload endpoint creates the file metadata row itself, bound to
        // the server-minted storage key — the client never supplies a storage
        // key (doing so would be a cross-tenant IDOR). So a byte upload is a
        // single round-trip; we do NOT also POST to /api/files.
        const form = new FormData()
        form.append('file', entry.blob, entry.name)
        const upRes = await fetch('/api/uploads', {
          method: 'POST',
          body: form,
          credentials: 'include',
        })
        if (!upRes.ok) {
          const errBody = await upRes.json().catch(() => ({}))
          const msg =
            (errBody as { error?: string }).error ??
            t('upload.progress.uploadFailed', {}, { defaultValue: 'Upload failed.' })
          throw new Error(msg)
        }
        const upJson = (await upRes.json()) as { id: string }
        fileId = upJson.id
      } else {
        // Metadata-only entry (no bytes) — the storage key is minted
        // server-side; the client never sends one.
        const res = await http.post<{ id: string }>('/api/files', {
          name: entry.name,
          mime_type: entry.mime || '',
          size: entry.size,
        })
        fileId = res.data?.id
      }

      setEntry(entry.id, {
        status: 'done',
        progress: 100,
        detail: t('upload.progress.done', {}, { defaultValue: 'Synced just now' }),
        fileId,
      })
    } catch (e: unknown) {
      const message =
        e instanceof Error
          ? e.message
          : t('upload.progress.error', {}, { defaultValue: 'Upload failed.' })
      setEntry(entry.id, { status: 'error', progress: 0, detail: message })
    }
  }

  async function processFiles(files: FileList | File[]) {
    const arr = Array.from(files)
    if (arr.length === 0) return
    const newEntries: QueueEntry[] = arr.map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      mime: f.type || '',
      blob: f,
      kind: kindFromMime(f.type || ''),
      status: 'queued',
      progress: 0,
      detail: t('status.queued', {}, { defaultValue: 'Queued' }),
    }))
    setQueue((q) => [...newEntries, ...q])
    for (const entry of newEntries) {
      await uploadOne(entry)
    }
  }

  function clearDone() {
    setQueue((q) => q.filter((e) => e.status !== 'done'))
  }

  function retryEntry(id: string) {
    const entry = queue.find((e) => e.id === id)
    if (!entry) return
    void uploadOne({ ...entry, status: 'queued', progress: 0 })
  }

  const totalUploaded = queue.filter((q) => q.status === 'done').length

  return (
    <NimbusFilesLayout
      breadcrumbs={[
        {
          to: '/files',
          label: t('upload.crumbs.home', { appName: APP_NAME }, { defaultValue: '{{appName}}' }),
        },
        { label: t('common.upload', {}, { defaultValue: 'Upload' }) },
      ]}
    >
      <div
        className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}
        data-mol-id={`upload-queue-${queue.length}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void processFiles(e.target.files)
            e.target.value = ''
          }}
          data-mol-id="upload-file-input"
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-expect-error — webkitdirectory is non-standard but supported
          webkitdirectory="true"
          directory="true"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void processFiles(e.target.files)
            e.target.value = ''
          }}
          data-mol-id="upload-folder-input"
        />

        <section
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            if (e.dataTransfer.files.length > 0) void processFiles(e.dataTransfer.files)
          }}
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'md' }),
            cm.sp('p', 12),
            'rounded-2xl bg-gradient-to-br from-primary-container/15 to-tertiary-container/15 border-2 border-dashed text-center relative overflow-hidden transition-colors',
            isDragging ? 'border-primary bg-primary-container/30' : 'border-primary/40',
          )}
          data-mol-id="upload-dropzone"
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(20),
              cm.h(20),
              cm.roundedFull,
              'bg-gradient-to-br from-primary to-tertiary-container text-on-primary',
            )}
          >
            <span
              className="material-symbols-outlined text-4xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              cloud_upload
            </span>
          </span>
          <h1
            className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface')}
          >
            {t('upload.dropzone.title', {}, { defaultValue: 'Drop files anywhere on this page' })}
          </h1>
          <p className={cm.cn(cm.textSize('base'), cm.maxW('lg'), 'text-on-surface-variant')}>
            {t(
              'upload.dropzone.body',
              {},
              {
                defaultValue:
                  "Folders are welcome too. We'll keep their structure intact, deduplicate on the way in, and notify your team when each one finishes.",
              },
            )}
          </p>
          <div
            className={cm.cn(
              cm.flex({ wrap: 'wrap', gap: 'sm', justify: 'center' }),
              cm.sp('mt', 2),
            )}
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              type="button"
              data-mol-id="upload-choose-files"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-xl bg-gradient-to-br from-primary to-tertiary-container text-on-primary hover:opacity-90 transition-opacity',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-lg')}>upload_file</span>
              {t('upload.actions.chooseFiles', {}, { defaultValue: 'Choose files' })}
            </button>
            <button
              onClick={() => folderInputRef.current?.click()}
              type="button"
              data-mol-id="upload-choose-folder"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-lg')}>
                drive_folder_upload
              </span>
              {t('upload.actions.chooseFolder', {}, { defaultValue: 'Choose folder' })}
            </button>
            <button
              onClick={() => navigate('/files')}
              type="button"
              data-mol-id="upload-back"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-lg')}>arrow_back</span>
              {t('upload.actions.back', {}, { defaultValue: 'Back to files' })}
            </button>
          </div>
        </section>

        <section
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/15 overflow-hidden',
          )}
        >
          <header
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('px', 6),
              cm.sp('py', 4),
              'border-b border-outline-variant/15',
            )}
          >
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
                {t('upload.queue.title', {}, { defaultValue: 'Active uploads' })}
              </h2>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {queue.length === 0
                  ? t('upload.queue.idle', {}, { defaultValue: 'No active uploads.' })
                  : t(
                      'upload.queue.subtitle',
                      { done: totalUploaded, total: queue.length },
                      { defaultValue: '{{done}} of {{total}} synced' },
                    )}
              </span>
            </div>
            {totalUploaded > 0 && (
              <button
                onClick={clearDone}
                type="button"
                data-mol-id="upload-clear-done"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'text-primary hover:underline',
                )}
              >
                {t('upload.queue.clearDone', {}, { defaultValue: 'Clear synced' })}
              </button>
            )}
          </header>
          {queue.length === 0 ? (
            <p
              className={cm.cn(
                cm.sp('p', 8),
                cm.textSize('sm'),
                'text-on-surface-variant text-center',
              )}
            >
              {t(
                'upload.queue.emptyHint',
                {},
                {
                  defaultValue:
                    'Drop files into the area above or use the Choose buttons to start.',
                },
              )}
            </p>
          ) : (
            <ul
              className={cm.cn(cm.flex({ direction: 'col' }), 'divide-y divide-outline-variant/15')}
            >
              {queue.map((u) => {
                const statusCopy = STATUS_COPY[u.status]
                return (
                  <li
                    key={u.id}
                    data-mol-id={`upload-row-${u.id}`}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'md' }),
                      cm.sp('px', 6),
                      cm.sp('py', 4),
                    )}
                  >
                    <NimbusFileTypeIcon kind={u.kind} size="sm" />
                    <div
                      className={cm.cn(
                        cm.flex({ direction: 'col', gap: 'xs' }),
                        'flex-grow min-w-0',
                      )}
                    >
                      <div
                        className={cm.cn(
                          cm.flex({ align: 'baseline', justify: 'between', gap: 'sm' }),
                        )}
                      >
                        <span
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('semibold'),
                            'truncate text-on-surface',
                          )}
                        >
                          {u.name}
                        </span>
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            'text-on-surface-variant tabular-nums shrink-0',
                          )}
                        >
                          {formatSize(u.size)}
                        </span>
                      </div>
                      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                        <div
                          className={cm.cn(
                            'h-1.5 flex-grow rounded-full overflow-hidden bg-surface-container-high',
                          )}
                        >
                          <div
                            className={cm.cn(
                              'h-full rounded-full transition-all',
                              STATUS_BAR[u.status],
                            )}
                            style={{ width: `${u.progress}%` }}
                            aria-hidden="true"
                          />
                        </div>
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.sp('px', 2),
                            cm.sp('py', 1),
                            cm.roundedFull,
                            cm.fontWeight('semibold'),
                            'uppercase tracking-widest shrink-0',
                            STATUS_BADGE[u.status],
                          )}
                        >
                          {t(statusCopy.key, {}, { defaultValue: statusCopy.defaultValue })}
                        </span>
                      </div>
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {u.detail}
                      </span>
                    </div>
                    {u.status === 'error' && (
                      <button
                        type="button"
                        onClick={() => retryEntry(u.id)}
                        data-mol-id={`upload-retry-${u.id}`}
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 2),
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          'rounded-lg bg-primary-container/15 text-primary hover:bg-primary-container/25 transition-colors',
                        )}
                      >
                        {t('upload.actions.retry', {}, { defaultValue: 'Retry' })}
                      </button>
                    )}
                    {u.status === 'done' && u.fileId && (
                      <button
                        type="button"
                        onClick={() => navigate(`/files/${u.fileId}`)}
                        data-mol-id={`upload-view-${u.id}`}
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 2),
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          'rounded-lg bg-primary-container/15 text-primary hover:bg-primary-container/25 transition-colors',
                        )}
                      >
                        {t('upload.actions.view', {}, { defaultValue: 'View' })}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </NimbusFilesLayout>
  )
}

export default Upload
