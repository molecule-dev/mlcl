import { useEffect, useMemo, useRef, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { DocumentCard, type DocumentStatus, type FileType } from '../components/DocumentCard.js'
import { EngramMetricTile } from '../components/EngramMetricTile.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

/**
 * Backend status enum (`api/migrations/0010_*`):
 *   pending | chunking | embedding | ready | failed
 *
 * UI status enum:
 *   indexed | indexing | queued | failed
 *
 * We carry the raw backend value through `RawDocumentStatus` so the
 * mapping in the render layer doesn't trip TypeScript.
 */
type RawDocumentStatus = DocumentStatus | 'pending' | 'chunking' | 'embedding' | 'ready'

interface DocumentRecord {
  id: string
  title: string
  file_type: FileType
  status: RawDocumentStatus
  page_count?: number | null
  chunk_count?: number | null
  created_at: string
  indexing_progress?: number | null
}

interface CreateDocumentResponse extends DocumentRecord {
  body_md?: string | null
  ingest_status?: RawDocumentStatus
}

function uiStatus(status: RawDocumentStatus): DocumentStatus {
  if (status === 'ready') return 'indexed'
  if (status === 'pending' || status === 'chunking' || status === 'embedding') return 'indexing'
  return status
}

type Filter = 'all' | DocumentStatus

const ACCEPT_TYPES = '.txt,.md,.markdown,.csv,.json,text/plain,text/markdown'

function deriveFileType(name: string): FileType {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'md' || ext === 'markdown') return 'md'
  if (ext === 'csv') return 'csv'
  if (ext === 'json') return 'json' as FileType
  if (ext === 'pdf') return 'pdf'
  if (ext === 'docx') return 'docx'
  if (ext === 'html' || ext === 'htm') return 'html'
  return 'txt'
}

export function Documents() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [docs, setDocs] = useState<DocumentRecord[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Inline "paste content" composer: a more reliable upload path than file
  // pickers in headless browsers, which lets E2E tests exercise the same
  // POST /api/documents endpoint without uploading binary fixtures.
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerTitle, setComposerTitle] = useState('')
  const [composerBody, setComposerBody] = useState('')

  const refresh = () => {
    setLoading(true)
    return http
      .get('/api/documents')
      .then((res) => {
        const data = unwrapList<DocumentRecord>(res)
        setDocs(data)
      })
      .catch(() => setDocs([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/documents')
      .then((res) => {
        if (cancelled) return
        const data = unwrapList<DocumentRecord>(res)
        setDocs(data)
      })
      .catch(() => {
        if (!cancelled) setDocs([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const counts = useMemo(() => {
    const indexed = docs.filter((d) => uiStatus(d.status) === 'indexed').length
    const indexing = docs.filter((d) => uiStatus(d.status) === 'indexing').length
    const failed = docs.filter((d) => uiStatus(d.status) === 'failed').length
    const totalChunks = docs.reduce((acc, d) => acc + (d.chunk_count || 0), 0)
    return { total: docs.length, indexed, indexing, failed, totalChunks }
  }, [docs])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return docs.filter((d) => {
      if (filter !== 'all') {
        if (uiStatus(d.status) !== filter) return false
      }
      if (q && !d.title.toLowerCase().includes(q)) return false
      return true
    })
  }, [docs, filter, search])

  const FILTER_TABS: ReadonlyArray<{ key: Filter; defaultLabel: string }> = [
    { key: 'all', defaultLabel: 'All' },
    { key: 'indexed', defaultLabel: 'Indexed' },
    { key: 'indexing', defaultLabel: 'Indexing' },
    { key: 'queued', defaultLabel: 'Queued' },
    { key: 'failed', defaultLabel: 'Failed' },
  ]

  async function uploadDocument(title: string, mime: string, sizeBytes: number, bodyText: string) {
    setUploadError(null)
    setUploading(true)
    try {
      const res = await http.post('/api/documents', {
        title,
        body_md: bodyText,
        mime,
        size_bytes: sizeBytes,
      })
      const created = unwrapSingle<CreateDocumentResponse>(res)
      if (created) {
        setDocs((prev) => [
          {
            id: created.id,
            title: created.title,
            file_type: created.file_type ?? deriveFileType(created.title),
            status: (created.status ?? created.ingest_status ?? 'ready') as DocumentStatus,
            page_count: created.page_count ?? null,
            chunk_count: created.chunk_count ?? 0,
            created_at: created.created_at,
          },
          ...prev,
        ])
      } else {
        await refresh()
      }
      return true
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : t('documents.uploadFailed', {}, { defaultValue: 'Upload failed.' }),
      )
      return false
    } finally {
      setUploading(false)
    }
  }

  async function onFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const ok = await uploadDocument(
      file.name,
      file.type || (deriveFileType(file.name) === 'md' ? 'text/markdown' : 'text/plain'),
      file.size,
      text,
    )
    if (event.target) event.target.value = ''
    if (ok) await refresh()
  }

  async function onComposerSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!composerTitle.trim() || !composerBody.trim()) return
    const ok = await uploadDocument(
      composerTitle.trim(),
      'text/markdown',
      composerBody.length,
      composerBody,
    )
    if (ok) {
      setComposerTitle('')
      setComposerBody('')
      setComposerOpen(false)
      await refresh()
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest text-primary font-bold')}
          style={{ fontSize: 10 }}
        >
          {t('nav.library', {}, { defaultValue: 'Library' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('documents.heading', {}, { defaultValue: 'Indexed documents' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'documents.subheading',
            { appName: APP_NAME },
            { defaultValue: 'Every doc {{appName}} has chunked, embedded, and made retrievable.' },
          )}
        </p>
      </header>

      <section className={cm.cn(cm.flex({ align: 'center', wrap: 'wrap', gap: 'md' }))}>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_TYPES}
          onChange={onFileChosen}
          className="hidden"
          data-testid="documents-file-input"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          data-testid="documents-upload-button"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-full text-white bg-primary hover:opacity-90 disabled:opacity-50 transition-opacity',
          )}
        >
          {uploading
            ? t('documents.uploading', {}, { defaultValue: 'Uploading…' })
            : t('documents.uploadButton', {}, { defaultValue: 'Upload document' })}
        </button>
        <button
          type="button"
          onClick={() => setComposerOpen((v) => !v)}
          data-testid="documents-paste-toggle"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'rounded-full border border-outline-variant text-on-surface hover:border-primary hover:text-primary transition-colors',
          )}
        >
          {composerOpen
            ? t('documents.closePaste', {}, { defaultValue: 'Close composer' })
            : t('documents.openPaste', {}, { defaultValue: 'Paste text' })}
        </button>
        {uploadError ? (
          <span
            data-testid="documents-upload-error"
            className={cm.cn(cm.textSize('xs'), 'text-error')}
          >
            {uploadError}
          </span>
        ) : null}
      </section>

      {composerOpen ? (
        <form
          onSubmit={onComposerSubmit}
          data-testid="documents-paste-form"
          className={cm.cn(
            cm.stack(3),
            cm.sp('p', 4),
            'rounded-2xl border border-outline-variant/40 bg-surface-container-lowest',
          )}
        >
          <input
            type="text"
            value={composerTitle}
            onChange={(e) => setComposerTitle(e.target.value)}
            placeholder={t(
              'documents.composer.titlePlaceholder',
              {},
              { defaultValue: 'Document title' },
            )}
            data-testid="documents-paste-title"
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-md border border-outline-variant bg-transparent text-on-surface focus:border-primary focus:outline-none',
            )}
          />
          <textarea
            value={composerBody}
            onChange={(e) => setComposerBody(e.target.value)}
            placeholder={t(
              'documents.composer.bodyPlaceholder',
              {},
              { defaultValue: 'Paste markdown or plain text…' },
            )}
            rows={8}
            data-testid="documents-paste-body"
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-md border border-outline-variant bg-transparent text-on-surface focus:border-primary focus:outline-none font-mono text-sm',
            )}
          />
          <button
            type="submit"
            disabled={uploading || !composerTitle.trim() || !composerBody.trim()}
            data-testid="documents-paste-submit"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-full text-white bg-primary disabled:opacity-50 hover:opacity-90 transition-opacity self-start',
            )}
          >
            {uploading
              ? t('documents.composer.saving', {}, { defaultValue: 'Indexing…' })
              : t('documents.composer.save', {}, { defaultValue: 'Index document' })}
          </button>
        </form>
      ) : null}

      <section className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 sm:grid-cols-4')}>
        <EngramMetricTile
          label={t('documents.metric.total', {}, { defaultValue: 'Total docs' })}
          value={counts.total.toLocaleString()}
          icon="folder"
          tone="primary"
        />
        <EngramMetricTile
          label={t('documents.metric.indexed', {}, { defaultValue: 'Indexed' })}
          value={counts.indexed.toLocaleString()}
          icon="verified"
          tone="success"
        />
        <EngramMetricTile
          label={t('documents.metric.indexing', {}, { defaultValue: 'Indexing' })}
          value={counts.indexing.toLocaleString()}
          icon="autorenew"
          tone="info"
        />
        <EngramMetricTile
          label={t('documents.metric.chunks', {}, { defaultValue: 'Total chunks' })}
          value={counts.totalChunks.toLocaleString()}
          icon="dataset"
          tone="cited"
        />
      </section>

      <section
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }))}
      >
        <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }))}>
          {FILTER_TABS.map((tab) => {
            const active = filter === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  'rounded-full font-bold uppercase tracking-widest transition-all',
                  active
                    ? 'bg-primary text-on-primary shadow-md shadow-primary/20'
                    : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface',
                )}
                style={{ fontSize: 11 }}
              >
                {t(`documents.filter.${tab.key}`, {}, { defaultValue: tab.defaultLabel })}
              </button>
            )
          })}
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 4),
            'rounded-full bg-surface-container-low border border-outline-variant focus-within:border-primary transition-colors w-full sm:w-80',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-on-surface-variant mr-2')}
            style={{ fontSize: 18 }}
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('documents.searchPlaceholder', {}, { defaultValue: 'Filter by title…' })}
            className={cm.cn(
              cm.w('full'),
              cm.sp('py', 2),
              cm.fontWeight('medium'),
              cm.textSize('sm'),
              'bg-transparent border-none focus:ring-0 outline-none',
            )}
          />
        </div>
      </section>

      {loading ? (
        <p
          data-testid="documents-loading"
          className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}
        >
          {t('documents.loading', {}, { defaultValue: 'Loading documents…' })}
        </p>
      ) : filtered.length === 0 ? (
        <div
          data-testid="documents-empty"
          className={cm.cn(
            cm.sp('py', 16),
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            cm.textCenter,
          )}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(16),
              cm.h(16),
              cm.roundedFull,
              'bg-surface-container-low',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-on-surface-variant')}
              style={{ fontSize: 36 }}
              aria-hidden="true"
            >
              inbox
            </span>
          </span>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {docs.length === 0
              ? t(
                  'documents.emptyAll',
                  {},
                  {
                    defaultValue: 'No documents yet. Upload one to start asking questions.',
                  },
                )
              : t('documents.empty', {}, { defaultValue: 'No documents match those filters.' })}
          </p>
        </div>
      ) : (
        <section
          data-testid="documents-grid"
          className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}
        >
          {filtered.map((d) => (
            <DocumentCard
              key={d.id}
              id={d.id}
              title={d.title}
              fileType={d.file_type}
              status={uiStatus(d.status)}
              pageCount={d.page_count ?? null}
              chunkCount={d.chunk_count ?? null}
              uploadedAt={d.created_at}
              indexingProgress={d.indexing_progress ?? null}
            />
          ))}
        </section>
      )}
    </div>
  )
}
