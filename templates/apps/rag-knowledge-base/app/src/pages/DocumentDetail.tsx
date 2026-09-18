import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { DocumentStatus, FileType } from '../components/DocumentCard.js'
import { EngramMetricTile } from '../components/EngramMetricTile.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface ChunkRecord {
  id: string
  chunk_index: number
  body_text: string
  heading?: string | null
  page_number?: number | null
  token_count?: number | null
}

interface DocumentRecord {
  id: string
  title: string
  body_md?: string | null
  source_url?: string | null
  mime?: string | null
  size_bytes?: number | null
  s3_key?: string | null
  page_count?: number | null
  chunk_count?: number | null
  ingest_status?: 'pending' | 'chunking' | 'embedding' | 'ready' | 'failed'
  status?: DocumentStatus | 'pending' | 'chunking' | 'embedding' | 'ready'
  file_type?: FileType
  created_at: string
  updated_at?: string
  chunks?: ChunkRecord[]
}

const STATUS_HEX: Record<DocumentStatus, string> = {
  indexed: 'var(--color-success)',
  indexing: 'var(--color-info)',
  failed: 'var(--color-error)',
  queued: 'var(--color-on-surface-variant)',
}

const STATUS_DEFAULT: Record<DocumentStatus, string> = {
  indexed: 'Indexed',
  indexing: 'Indexing',
  failed: 'Failed',
  queued: 'Queued',
}

const FILE_TYPE_HEX: Record<FileType, string> = {
  pdf: 'var(--color-error)',
  docx: 'var(--color-info)',
  txt: 'var(--color-on-surface-variant)',
  md: 'var(--color-on-surface)',
  csv: 'var(--color-success)',
  html: 'var(--color-accent)',
}

function uiStatus(
  raw?: DocumentRecord['status'] | DocumentRecord['ingest_status'],
): DocumentStatus {
  const v = raw ?? 'pending'
  if (v === 'ready' || v === 'indexed') return 'indexed'
  if (v === 'pending' || v === 'chunking' || v === 'embedding' || v === 'indexing')
    return 'indexing'
  if (v === 'failed') return 'failed'
  if (v === 'queued') return 'queued'
  return 'indexing'
}

function deriveType(rec: DocumentRecord): FileType {
  if (rec.file_type) return rec.file_type
  const mime = rec.mime ?? ''
  if (mime.includes('markdown')) return 'md'
  if (mime.includes('pdf')) return 'pdf'
  if (mime.includes('html')) return 'html'
  if (mime.includes('csv')) return 'csv'
  return 'txt'
}

function wordCount(text?: string | null): number {
  if (!text) return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function DocumentDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [doc, setDoc] = useState<DocumentRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get(`/api/documents/${id}`)
      .then((res) => {
        if (cancelled) return
        const fetched = unwrapSingle<DocumentRecord>(res)
        setDoc(fetched)
      })
      .catch(() => {
        if (cancelled) return
        setDoc(null)
        setError(t('documentDetail.notFound', {}, { defaultValue: 'Document not found.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (loading) {
    return (
      <p
        data-testid="documentDetail-loading"
        className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}
      >
        {t('documentDetail.loading', {}, { defaultValue: 'Loading document\u2026' })}
      </p>
    )
  }

  if (error || !doc) {
    return (
      <div
        data-testid="documentDetail-error"
        className={cm.cn(
          cm.sp('px', 8),
          cm.sp('py', 16),
          cm.maxW('5xl'),
          cm.mxAuto,
          cm.stack(4),
          cm.textCenter,
        )}
      >
        <p className={cm.cn(cm.textSize('lg'), 'font-bold text-error')}>
          {error || t('documentDetail.notFound', {}, { defaultValue: 'Document not found.' })}
        </p>
        <Link
          to="/documents"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            cm.textSize('sm'),
            'font-semibold text-primary hover:underline',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            style={{ fontSize: 16 }}
            aria-hidden="true"
          >
            arrow_back
          </span>
          {t('documentDetail.back', {}, { defaultValue: 'Back to documents' })}
        </Link>
      </div>
    )
  }

  const type = deriveType(doc)
  const status = uiStatus(doc.status ?? doc.ingest_status)
  const fileColor = FILE_TYPE_HEX[type]
  const statusColor = STATUS_HEX[status]
  const chunks = (doc.chunks ?? []).slice().sort((a, b) => a.chunk_index - b.chunk_index)
  const totalChunks = doc.chunk_count ?? chunks.length
  const totalWords = wordCount(doc.body_md)
  const sourceLabel =
    doc.source_url ??
    doc.s3_key ??
    doc.mime ??
    t('documentDetail.uploadedSource', {}, { defaultValue: 'manual upload' })

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <Link
        to="/documents"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('sm'),
          'font-semibold text-on-surface-variant hover:text-primary transition-colors',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined')}
          style={{ fontSize: 16 }}
          aria-hidden="true"
        >
          arrow_back
        </span>
        {t('documentDetail.back', {}, { defaultValue: 'Back to documents' })}
      </Link>

      <header
        data-testid="documentDetail-header"
        className={cm.cn(
          cm.sp('p', 8),
          'rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm relative overflow-hidden',
        )}
        style={{ borderLeft: `4px solid ${fileColor}` }}
      >
        <div className={cm.flex({ align: 'start', justify: 'between', gap: 'lg', wrap: 'wrap' })}>
          <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.textSize('xs'),
                'uppercase tracking-widest font-bold',
              )}
              style={{ color: fileColor, fontSize: 10 }}
            >
              <span
                className={cm.cn('material-symbols-outlined')}
                style={{ fontSize: 14 }}
                aria-hidden="true"
              >
                description
              </span>
              {type.toUpperCase()}
              {doc.page_count
                ? ' \u00b7 ' +
                  t(
                    'documentDetail.pages',
                    { count: doc.page_count },
                    {
                      defaultValue: `${doc.page_count} pages`,
                    },
                  )
                : ''}
            </span>
            <h1
              data-testid="documentDetail-title"
              className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {doc.title}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant font-mono')}>
              {sourceLabel}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'documentDetail.uploaded',
                { when: new Date(doc.created_at).toLocaleString() },
                {
                  defaultValue: `Uploaded {{when}}`,
                },
              )}
            </p>
          </div>
          <span
            data-testid="documentDetail-status"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              'rounded-full font-bold uppercase tracking-widest shrink-0',
            )}
            style={{
              background: `color-mix(in srgb, ${statusColor} 15%, transparent)`,
              color: statusColor,
              fontSize: 11,
            }}
          >
            <span
              className={cm.cn('w-2 h-2 rounded-full')}
              style={{ background: statusColor }}
              aria-hidden="true"
            />
            {t(`documentDetail.status.${status}`, {}, { defaultValue: STATUS_DEFAULT[status] })}
          </span>
        </div>
      </header>

      <section className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 sm:grid-cols-4')}>
        <EngramMetricTile
          label={t('documentDetail.metric.chunks', {}, { defaultValue: 'Chunks' })}
          value={totalChunks.toLocaleString()}
          icon="dataset"
          tone="cited"
        />
        <EngramMetricTile
          label={t('documentDetail.metric.words', {}, { defaultValue: 'Words' })}
          value={totalWords.toLocaleString()}
          icon="text_fields"
          tone="primary"
        />
        <EngramMetricTile
          label={t('form.size', {}, { defaultValue: 'Size' })}
          value={doc.size_bytes != null ? `${(doc.size_bytes / 1024).toFixed(1)} KB` : '\u2014'}
          icon="hard_drive"
          tone="info"
        />
        <EngramMetricTile
          label={t('documentDetail.metric.pages', {}, { defaultValue: 'Pages' })}
          value={(doc.page_count ?? 0).toLocaleString()}
          icon="article"
          tone="accent"
        />
      </section>

      <section className={cm.stack(4)}>
        <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('xl'), 'font-bold')}>
            {t('documentDetail.chunks.heading', {}, { defaultValue: 'Indexed chunks' })}
          </h2>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'uppercase tracking-widest font-bold text-on-surface-variant font-mono',
            )}
          >
            {t('documentDetail.fts', {}, { defaultValue: 'PostgreSQL FTS retriever' })}
          </span>
        </div>
        {chunks.length === 0 ? (
          <p
            data-testid="documentDetail-chunks-empty"
            className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}
          >
            {t(
              'documentDetail.chunks.empty',
              {},
              {
                defaultValue:
                  'No chunks indexed for this document yet — paste some content to start ingesting.',
              },
            )}
          </p>
        ) : (
          <div
            className={cm.cn(
              'rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm overflow-hidden',
            )}
          >
            <table className={cm.cn('w-full text-left')}>
              <thead className={cm.cn('bg-surface-container')}>
                <tr>
                  <th
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('documentDetail.col.index', {}, { defaultValue: '#' })}
                  </th>
                  <th
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('documentDetail.col.heading', {}, { defaultValue: 'Heading' })}
                  </th>
                  <th
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('documentDetail.col.content', {}, { defaultValue: 'Content preview' })}
                  </th>
                  <th
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-center',
                    )}
                  >
                    {t('documentDetail.col.tokens', {}, { defaultValue: 'Tokens' })}
                  </th>
                </tr>
              </thead>
              <tbody
                data-testid="documentDetail-chunks"
                className={cm.cn('divide-y divide-surface-container')}
              >
                {chunks.map((c) => (
                  <tr
                    key={c.id}
                    data-testid={`documentDetail-chunk-${c.chunk_index}`}
                    className={cm.cn('hover:bg-surface-container-low transition-colors')}
                  >
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        'tabular-nums font-bold text-on-surface-variant',
                      )}
                    >
                      {c.chunk_index + 1}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('xs'),
                        'font-mono text-on-surface-variant',
                      )}
                    >
                      {c.heading ?? '\u2014'}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        'font-mono text-on-surface line-clamp-3 leading-relaxed whitespace-pre-line',
                      )}
                      style={{
                        background: 'color-mix(in srgb, var(--color-primary) 4%, transparent)',
                      }}
                    >
                      {c.body_text}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        'tabular-nums text-center font-semibold',
                      )}
                    >
                      {c.token_count ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
