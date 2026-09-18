import { useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ConfidencePill } from '../components/ConfidencePill.js'
import { type DocumentType, DocumentTypeBadge } from '../components/DocumentTypeBadge.js'
import { UploadDropZone } from '../components/UploadDropZone.js'

interface QueueItem {
  id: string
  name: string
  size: number
  type: DocumentType | null
  status: 'queued' | 'processing' | 'extracted' | 'complete' | 'error'
  progress: number
  confidence: number | null
}

const STATUS_HEX: Record<QueueItem['status'], string> = {
  queued: 'var(--color-on-surface-variant)',
  processing: 'var(--color-primary)',
  extracted: 'var(--color-secondary)',
  complete: 'var(--color-success)',
  error: 'var(--color-error)',
}

const STATUS_DEFAULT: Record<QueueItem['status'], string> = {
  queued: 'Queued',
  processing: 'Processing',
  extracted: 'Extracted',
  complete: 'Filed',
  error: 'Error',
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function Upload() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [error, setError] = useState<string | null>(null)

  const updateItem = (id: string, patch: Partial<QueueItem>) => {
    setQueue((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }

  const handleFiles = async (files: File[]) => {
    setError(null)
    const additions: QueueItem[] = files.map((f, i) => ({
      id: `local-${Date.now()}-${i}`,
      name: f.name,
      size: f.size,
      type: null,
      status: 'queued',
      progress: 0,
      confidence: null,
    }))
    setQueue((prev) => [...additions, ...prev])

    for (const item of additions) {
      const file = files[additions.indexOf(item)]
      if (!file) continue
      try {
        updateItem(item.id, { status: 'processing', progress: 25 })
        const form = new FormData()
        form.append('file', file)
        const res = await http.post('/api/documents/upload', form)
        const data = (res?.data ?? {}) as {
          document_type?: DocumentType | null
          classification_confidence?: number | null
        }
        updateItem(item.id, {
          status: 'complete',
          progress: 100,
          type: data.document_type ?? null,
          confidence: data.classification_confidence ?? null,
        })
      } catch (err) {
        updateItem(item.id, { status: 'error', progress: 100 })
        setError(
          err instanceof Error
            ? err.message
            : t('upload.error', {}, { defaultValue: 'Upload failed.' }),
        )
      }
    }
  }

  return (
    <div
      data-mol-id="upload-page"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}
    >
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest text-primary font-bold')}
          style={{ fontSize: 10 }}
        >
          {t('upload.eyebrow', {}, { defaultValue: 'Ingestion' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('upload.heading', {}, { defaultValue: 'Upload documents' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'upload.subheading',
            {},
            {
              defaultValue:
                'Drop a single file or a batch — we classify, extract, and file each one automatically.',
            },
          )}
        </p>
        {error ? (
          <p
            data-mol-id="upload-error"
            role="alert"
            className={cm.cn(cm.textSize('sm'), 'text-error')}
          >
            {error}
          </p>
        ) : null}
      </header>

      <UploadDropZone onFiles={handleFiles} />

      <section
        className={cm.cn(
          'rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm overflow-hidden',
        )}
      >
        <header
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            'border-b border-outline-variant/30',
          )}
        >
          <div>
            <h2 className={cm.cn(cm.textSize('lg'), 'font-bold')}>
              {t('upload.queue.heading', {}, { defaultValue: 'Batch queue' })}
            </h2>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'upload.queue.subheading',
                { count: queue.length },
                { defaultValue: '{{count}} files in this batch' },
              )}
            </p>
          </div>
          <button
            type="button"
            data-mol-id="upload-clear-queue"
            onClick={() =>
              setQueue((prev) =>
                prev.filter((it) => it.status !== 'complete' && it.status !== 'error'),
              )
            }
            className={cm.cn(
              cm.textSize('xs'),
              'font-bold uppercase tracking-widest text-on-surface-variant hover:text-error transition-colors',
            )}
            style={{ fontSize: 10 }}
          >
            {t('upload.queue.clear', {}, { defaultValue: 'Clear completed' })}
          </button>
        </header>

        <table className={cm.cn('w-full text-left')}>
          <thead className={cm.cn('bg-surface-container')}>
            <tr>
              <th
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('upload.queue.col.file', {}, { defaultValue: 'File' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('form.type', {}, { defaultValue: 'Type' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('nav.progress', {}, { defaultValue: 'Progress' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-center',
                )}
              >
                {t('nav.status', {}, { defaultValue: 'Status' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right',
                )}
              >
                {t('upload.queue.col.confidence', {}, { defaultValue: 'Confidence' })}
              </th>
            </tr>
          </thead>
          <tbody className={cm.cn('divide-y divide-surface-container')}>
            {queue.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 8),
                    'text-center text-on-surface-variant text-sm',
                  )}
                >
                  {t(
                    'upload.queue.empty',
                    {},
                    { defaultValue: 'Nothing in the queue. Drop files above to get started.' },
                  )}
                </td>
              </tr>
            ) : (
              queue.map((item) => (
                <tr
                  key={item.id}
                  className={cm.cn('hover:bg-surface-container-low transition-colors')}
                >
                  <td className={cm.cn(cm.sp('px', 6), cm.sp('py', 3))}>
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                      <span
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'center' }),
                          'w-9 h-9 rounded-lg bg-surface-container text-on-surface-variant',
                        )}
                        aria-hidden="true"
                      >
                        <span
                          className={cm.cn('material-symbols-outlined')}
                          style={{ fontSize: 18 }}
                        >
                          insert_drive_file
                        </span>
                      </span>
                      <div>
                        <p className={cm.cn(cm.textSize('sm'), 'font-semibold line-clamp-1')}>
                          {item.name}
                        </p>
                        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {fmtSize(item.size)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    {item.type ? (
                      <DocumentTypeBadge type={item.type} />
                    ) : (
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant italic')}>
                        {t('upload.queue.detecting', {}, { defaultValue: 'Detecting…' })}
                      </span>
                    )}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))} style={{ minWidth: 140 }}>
                    <div
                      className={cm.cn('h-1.5 rounded-full bg-surface-container overflow-hidden')}
                    >
                      <div
                        className={cm.cn('h-full rounded-full transition-all')}
                        style={{
                          width: `${item.progress}%`,
                          background: STATUS_HEX[item.status],
                          backgroundImage:
                            item.status === 'processing'
                              ? 'repeating-linear-gradient(45deg, rgba(255,255,255,0.2) 0 6px, transparent 6px 12px)'
                              : undefined,
                        }}
                      />
                    </div>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.sp('mt', 1),
                        'text-on-surface-variant tabular-nums',
                      )}
                    >
                      {item.progress}%
                    </p>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-center')}>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                        cm.textSize('xs'),
                        'font-semibold',
                      )}
                    >
                      <span
                        className={cm.cn('w-2 h-2 rounded-full')}
                        style={{ background: STATUS_HEX[item.status] }}
                        aria-hidden="true"
                      />
                      <span style={{ color: STATUS_HEX[item.status] }}>
                        {t(
                          `upload.queue.status.${item.status}`,
                          {},
                          { defaultValue: STATUS_DEFAULT[item.status] },
                        )}
                      </span>
                    </span>
                  </td>
                  <td className={cm.cn(cm.sp('px', 6), cm.sp('py', 3), 'text-right')}>
                    {typeof item.confidence === 'number' ? (
                      <ConfidencePill value={item.confidence} />
                    ) : (
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
