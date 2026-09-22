import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ConfidencePill } from '../components/ConfidencePill.js'
import { type DocumentType, DocumentTypeBadge } from '../components/DocumentTypeBadge.js'
import { unwrapSingle } from '../lib/unwrap.js'

type ProcessingStatus = 'pending' | 'processing' | 'extracted' | 'classified' | 'complete' | 'error'

interface ExtractedField {
  id: string
  field_name: string
  field_value: string
  confidence: number
  group?: string
}

interface DocumentEvent {
  id: string
  event_type: string
  actor: string
  details: string
  created_at: string
}

interface DocumentRecord {
  id: string
  original_name: string
  document_type: DocumentType | null
  processing_status: ProcessingStatus
  classification_confidence: number | null
  page_count: number | null
  file_size: number | null
  detected_language: string | null
  summary: string | null
  suggested_filing_path: string | null
  classification_reasoning: string | null
  download_url?: string | null
  preview_url?: string | null
  created_at: string
  extracted_fields: ExtractedField[]
  events: DocumentEvent[]
}

function fmtSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function groupFields(fields: ExtractedField[]): Record<string, ExtractedField[]> {
  const out: Record<string, ExtractedField[]> = {}
  for (const f of fields) {
    const key = f.group ?? 'Other'
    out[key] = out[key] ?? []
    out[key].push(f)
  }
  return out
}

export function DocumentDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [record, setRecord] = useState<DocumentRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(100)
  const [page, setPage] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [reprocessing, setReprocessing] = useState(false)
  const [reprocessNote, setReprocessNote] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get(`/api/documents/${id}`)
      .then((res) => {
        if (cancelled) return
        const fetched = unwrapSingle<DocumentRecord>(res)
        setRecord(fetched ?? null)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : t('documentDetail.loadError', {}, { defaultValue: 'Failed to load document.' }),
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (loading && !record) {
    return (
      <p
        data-mol-id="document-detail-loading"
        className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}
      >
        {t('documentDetail.loading', {}, { defaultValue: 'Loading document…' })}
      </p>
    )
  }
  if (!record) {
    return (
      <div
        data-mol-id="document-detail-not-found"
        className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.stack(4))}
      >
        <p className={cm.cn('text-error')}>
          {error || t('documentDetail.notFound', {}, { defaultValue: 'Document not found.' })}
        </p>
        <Link to="/documents" className={cm.cn('underline text-primary')}>
          {t('documentDetail.back', {}, { defaultValue: 'All documents' })}
        </Link>
      </div>
    )
  }

  const totalPages = record.page_count ?? 1
  const grouped = groupFields(record.extracted_fields)

  const handlePrevPage = () => setPage((p) => Math.max(1, p - 1))
  const handleNextPage = () => setPage((p) => Math.min(totalPages, p + 1))
  const handleRotate = () => setRotation((r) => (r + 90) % 360)
  const handleDownload = () => {
    const url = record.download_url || `/api/documents/${record.id}/download`
    window.open(url, '_blank', 'noopener')
  }
  const handleReprocess = async () => {
    setReprocessing(true)
    setReprocessNote(null)
    try {
      await http.post(`/api/processing/documents/${record.id}/reprocess`, {
        steps: ['extract', 'classify', 'summarize'],
      })
      void track({
        name: 'document.reprocess_queued',
        properties: { document_id: record.id },
      })
      const refreshed = unwrapSingle<DocumentRecord>(await http.get(`/api/documents/${record.id}`))
      if (refreshed) setRecord(refreshed)
      setReprocessNote(
        t('documentDetail.reprocess.queued', {}, { defaultValue: 'Reprocess queued.' }),
      )
    } catch (err) {
      setReprocessNote(
        err instanceof Error
          ? err.message
          : t('documentDetail.reprocess.error', {}, { defaultValue: 'Failed to queue reprocess.' }),
      )
    } finally {
      setReprocessing(false)
    }
  }

  return (
    <div
      data-mol-id="document-detail-page"
      className={cm.cn('px-4 sm:px-8', cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(6))}
    >
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <Link
          to="/documents"
          data-mol-id="document-detail-back"
          className={cm.cn(
            cm.textSize('xs'),
            cm.flex({ align: 'center', gap: 'xs' }),
            'uppercase tracking-widest text-on-surface-variant font-bold hover:text-primary transition-colors',
          )}
          style={{ fontSize: 10 }}
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            style={{ fontSize: 14 }}
            aria-hidden="true"
          >
            arrow_back
          </span>
          {t('documentDetail.back', {}, { defaultValue: 'All documents' })}
        </Link>
        <div
          className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' })}
        >
          <h1
            data-mol-id="document-detail-title"
            className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}
          >
            {record.original_name}
          </h1>
          <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
            {record.document_type ? <DocumentTypeBadge type={record.document_type} /> : null}
            {typeof record.classification_confidence === 'number' ? (
              <ConfidencePill value={record.classification_confidence} variant="ring" />
            ) : null}
          </div>
        </div>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {[
            record.page_count
              ? t(
                  'documentDetail.pages',
                  { count: record.page_count },
                  { defaultValue: `${record.page_count} pages` },
                )
              : null,
            record.file_size ? fmtSize(record.file_size) : null,
            record.detected_language
              ? t(
                  'documentDetail.language',
                  { lang: record.detected_language.toUpperCase() },
                  { defaultValue: `Language: ${record.detected_language.toUpperCase()}` },
                )
              : null,
            t(
              'documentDetail.uploaded',
              { date: fmtDateTime(record.created_at) },
              { defaultValue: `Uploaded ${fmtDateTime(record.created_at)}` },
            ),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {error ? (
          <p
            data-mol-id="document-detail-error"
            className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant italic')}
          >
            {error}
          </p>
        ) : null}
        {reprocessNote ? (
          <p
            data-mol-id="document-reprocess-note"
            className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant italic')}
          >
            {reprocessNote}
          </p>
        ) : null}
      </header>

      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch')}>
        <section
          className={cm.cn(
            'lg:col-span-7 rounded-xl border border-outline-variant/40 overflow-hidden flex flex-col',
          )}
          style={{ background: 'var(--color-surface-container)' }}
        >
          <header
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
              'bg-surface border-b border-outline-variant/40',
            )}
          >
            <div className={cm.flex({ align: 'center', gap: 'xs' })}>
              <button
                type="button"
                data-mol-id="document-zoom-out"
                onClick={() => setZoom((z) => Math.max(50, z - 10))}
                className={cm.cn(
                  cm.sp('p', 2),
                  'rounded-md hover:bg-surface-container-high transition-colors',
                )}
                aria-label={t('documentDetail.zoomOut', {}, { defaultValue: 'Zoom out' })}
              >
                <span
                  className={cm.cn('material-symbols-outlined')}
                  style={{ fontSize: 18 }}
                  aria-hidden="true"
                >
                  remove
                </span>
              </button>
              <span
                data-mol-id="document-zoom-level"
                className={cm.cn('text-xs font-mono tabular-nums w-12 text-center')}
              >
                {zoom}%
              </span>
              <button
                type="button"
                data-mol-id="document-zoom-in"
                onClick={() => setZoom((z) => Math.min(200, z + 10))}
                className={cm.cn(
                  cm.sp('p', 2),
                  'rounded-md hover:bg-surface-container-high transition-colors',
                )}
                aria-label={t('documentDetail.zoomIn', {}, { defaultValue: 'Zoom in' })}
              >
                <span
                  className={cm.cn('material-symbols-outlined')}
                  style={{ fontSize: 18 }}
                  aria-hidden="true"
                >
                  add
                </span>
              </button>
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
                'text-xs font-mono tabular-nums',
              )}
            >
              <button
                type="button"
                data-mol-id="document-prev-page"
                onClick={handlePrevPage}
                disabled={page <= 1}
                className={cm.cn(
                  cm.sp('p', 2),
                  'rounded-md hover:bg-surface-container-high transition-colors disabled:opacity-40',
                )}
                aria-label={t('documentDetail.prevPage', {}, { defaultValue: 'Previous page' })}
              >
                <span
                  className={cm.cn('material-symbols-outlined')}
                  style={{ fontSize: 18 }}
                  aria-hidden="true"
                >
                  chevron_left
                </span>
              </button>
              <span data-mol-id="document-page-indicator">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                data-mol-id="document-next-page"
                onClick={handleNextPage}
                disabled={page >= totalPages}
                className={cm.cn(
                  cm.sp('p', 2),
                  'rounded-md hover:bg-surface-container-high transition-colors disabled:opacity-40',
                )}
                aria-label={t('documentDetail.nextPage', {}, { defaultValue: 'Next page' })}
              >
                <span
                  className={cm.cn('material-symbols-outlined')}
                  style={{ fontSize: 18 }}
                  aria-hidden="true"
                >
                  chevron_right
                </span>
              </button>
            </div>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }))}>
              <button
                type="button"
                data-mol-id="document-rotate"
                onClick={handleRotate}
                className={cm.cn(
                  cm.sp('p', 2),
                  'rounded-md hover:bg-surface-container-high transition-colors',
                )}
                aria-label={t('documentDetail.rotate', {}, { defaultValue: 'Rotate' })}
              >
                <span
                  className={cm.cn('material-symbols-outlined')}
                  style={{ fontSize: 18 }}
                  aria-hidden="true"
                >
                  rotate_right
                </span>
              </button>
              <button
                type="button"
                data-mol-id="document-reprocess"
                onClick={handleReprocess}
                disabled={reprocessing}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'rounded-md text-xs font-bold uppercase tracking-widest border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50',
                )}
                style={{ fontSize: 10 }}
                aria-label={t('documentDetail.reprocess', {}, { defaultValue: 'Reprocess' })}
              >
                {reprocessing
                  ? t('documentDetail.reprocess.processing', {}, { defaultValue: 'Reprocessing…' })
                  : t('documentDetail.reprocess', {}, { defaultValue: 'Reprocess' })}
              </button>
              <button
                type="button"
                data-mol-id="document-download"
                onClick={handleDownload}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'rounded-md text-xs font-bold uppercase tracking-widest bg-primary text-on-primary hover:opacity-90 transition-opacity',
                )}
                style={{ fontSize: 10 }}
              >
                {t('common.download', {}, { defaultValue: 'Download' })}
              </button>
            </div>
          </header>

          <div className={cm.cn('flex-1 overflow-auto p-6 flex justify-center')}>
            <div
              data-mol-id="document-preview-pane"
              className={cm.cn('bg-surface shadow-lg relative flex items-center justify-center')}
              style={{
                width: `${((8.5 * zoom) / 100) * 96}px`,
                minHeight: `${((11 * zoom) / 100) * 96}px`,
                transform: `rotate(${rotation}deg)`,
                transformOrigin: 'center center',
              }}
            >
              {record.preview_url ? (
                <img
                  src={record.preview_url}
                  alt={record.original_name}
                  className={cm.cn('max-w-full max-h-full object-contain')}
                />
              ) : (
                <div className={cm.cn('p-10 text-center text-on-surface-variant')}>
                  <span
                    className={cm.cn('material-symbols-outlined')}
                    style={{ fontSize: 64 }}
                    aria-hidden="true"
                  >
                    description
                  </span>
                  <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 4))}>
                    {t('documentDetail.noPreview', {}, { defaultValue: 'Preview unavailable' })}
                  </p>
                  <p
                    className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-on-surface-variant')}
                  >
                    {t(
                      'documentDetail.downloadHint',
                      {},
                      { defaultValue: 'Use Download to open the original file.' },
                    )}
                  </p>
                </div>
              )}

              {activeFieldId ? (
                <div
                  data-mol-id="document-field-highlight"
                  className={cm.cn('absolute pointer-events-none animate-pulse')}
                  style={{
                    inset: '40% 22% 33% 22%',
                    border: '2px solid var(--color-primary-container)',
                    background: 'color-mix(in srgb, var(--color-primary) 18%, transparent)',
                    borderRadius: 6,
                  }}
                  aria-hidden="true"
                />
              ) : null}
            </div>
          </div>
        </section>

        <aside
          data-mol-id="document-extracted-panel"
          className={cm.cn(
            'lg:col-span-5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm flex flex-col',
          )}
        >
          <header
            className={cm.cn(cm.sp('px', 5), cm.sp('py', 4), 'border-b border-outline-variant/40')}
          >
            <div className={cm.flex({ align: 'center', justify: 'between' })}>
              <h2 className={cm.cn(cm.textSize('lg'), 'font-bold')}>
                {t('documentDetail.extracted.heading', {}, { defaultValue: 'Extracted fields' })}
              </h2>
              {typeof record.classification_confidence === 'number' ? (
                <ConfidencePill value={record.classification_confidence} />
              ) : null}
            </div>
            <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
              {t(
                'documentDetail.extracted.subheading',
                { count: record.extracted_fields.length },
                { defaultValue: '{{count}} fields · click any field to highlight on page' },
              )}
            </p>
          </header>

          <div className={cm.cn('flex-1 overflow-auto')}>
            {record.extracted_fields.length === 0 ? (
              <p
                data-mol-id="document-extracted-empty"
                className={cm.cn(cm.sp('p', 6), cm.textCenter, 'text-on-surface-variant text-sm')}
              >
                {t(
                  'documentDetail.extracted.empty',
                  {},
                  { defaultValue: 'No fields extracted yet.' },
                )}
              </p>
            ) : (
              Object.entries(grouped).map(([groupName, fields]) => (
                <section
                  key={groupName}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 4),
                    'border-b border-outline-variant/30 last:border-b-0',
                  )}
                >
                  <h3
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.sp('mb', 2),
                      'uppercase tracking-widest text-on-surface-variant font-bold',
                    )}
                    style={{ fontSize: 10 }}
                  >
                    {t(
                      `documentDetail.fieldGroup.${groupName.toLowerCase()}`,
                      {},
                      { defaultValue: groupName },
                    )}
                  </h3>
                  <ul className={cm.cn('space-y-2')}>
                    {fields.map((f) => {
                      const active = activeFieldId === f.id
                      return (
                        <li key={f.id}>
                          <button
                            type="button"
                            data-mol-id={`document-field-${f.id}`}
                            onClick={() => setActiveFieldId(active ? null : f.id)}
                            className={cm.cn(
                              cm.sp('px', 3),
                              cm.sp('py', 2),
                              cm.w('full'),
                              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                              'rounded-lg transition-colors text-left',
                              active ? 'bg-primary/10' : 'hover:bg-surface-container-low',
                            )}
                            style={
                              active
                                ? { borderLeft: '3px solid var(--color-secondary)' }
                                : undefined
                            }
                          >
                            <span className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0')}>
                              <span
                                className={cm.cn(
                                  cm.textSize('xs'),
                                  'uppercase tracking-widest text-on-surface-variant font-bold',
                                )}
                                style={{ fontSize: 10 }}
                              >
                                {f.field_name}
                              </span>
                              <span
                                className={cm.cn(
                                  cm.textSize('sm'),
                                  'font-mono tabular-nums truncate',
                                )}
                              >
                                {f.field_value}
                              </span>
                            </span>
                            <ConfidencePill value={f.confidence} />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))
            )}
          </div>
        </aside>
      </div>

      {record.summary ? (
        <section
          data-mol-id="document-summary-card"
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm relative',
          )}
          style={{ borderLeft: '4px solid var(--color-type-form)' }}
        >
          <header className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 3))}>
            <span
              className={cm.cn('material-symbols-outlined text-tertiary')}
              style={{ fontSize: 20 }}
              aria-hidden="true"
            >
              auto_awesome
            </span>
            <h2 className={cm.cn(cm.textSize('lg'), 'font-bold')}>
              {t('documentDetail.summary.heading', {}, { defaultValue: 'AI summary' })}
            </h2>
          </header>
          <p
            className={cm.cn(cm.textSize('base'), 'leading-relaxed text-on-surface')}
            style={{ lineHeight: 1.75 }}
          >
            {record.summary}
          </p>
          {record.classification_reasoning ? (
            <details className={cm.cn('mt-4 text-sm text-on-surface-variant')}>
              <summary
                className={cm.cn(
                  'cursor-pointer font-bold text-on-surface hover:text-primary transition-colors',
                )}
              >
                {t(
                  'documentDetail.summary.reasoning',
                  { type: record.document_type ?? 'document' },
                  { defaultValue: 'Why this was classified as a {{type}}' },
                )}
              </summary>
              <p className={cm.cn(cm.sp('mt', 2), 'leading-relaxed')}>
                {record.classification_reasoning}
              </p>
            </details>
          ) : null}
          {record.suggested_filing_path ? (
            <div className={cm.cn(cm.sp('mt', 4), cm.flex({ align: 'center', gap: 'sm' }))}>
              <span
                className={cm.cn('material-symbols-outlined text-on-surface-variant')}
                style={{ fontSize: 16 }}
                aria-hidden="true"
              >
                folder_open
              </span>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t('documentDetail.summary.filing', {}, { defaultValue: 'Filed to' })}
              </span>
              <code
                className={cm.cn('text-xs font-mono px-2 py-1 rounded-md bg-surface-container')}
              >
                {record.suggested_filing_path}
              </code>
            </div>
          ) : null}
        </section>
      ) : null}

      {record.events.length > 0 ? (
        <section
          data-mol-id="document-audit-timeline"
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm',
          )}
        >
          <header className={cm.cn(cm.sp('mb', 4))}>
            <h2 className={cm.cn(cm.textSize('lg'), 'font-bold')}>
              {t('documentDetail.audit.heading', {}, { defaultValue: 'Audit timeline' })}
            </h2>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'documentDetail.audit.subheading',
                {},
                { defaultValue: 'Every step taken on this document, with the actor responsible.' },
              )}
            </p>
          </header>
          <ol className={cm.cn('border-l-2 border-outline-variant/40 pl-5 space-y-4')}>
            {record.events.map((ev) => (
              <li key={ev.id} className={cm.cn('relative')}>
                <span
                  className={cm.cn(
                    'absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-primary border-4 border-surface-container-lowest',
                  )}
                  aria-hidden="true"
                />
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    'uppercase tracking-widest text-on-surface-variant font-bold',
                  )}
                  style={{ fontSize: 10 }}
                >
                  {ev.event_type} · {fmtDateTime(ev.created_at)}
                </p>
                <p className={cm.cn(cm.textSize('sm'), 'mt-0.5')}>{ev.details}</p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant font-mono')}>
                  {ev.actor}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  )
}
