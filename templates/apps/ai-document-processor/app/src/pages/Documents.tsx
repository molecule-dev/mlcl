import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DocumentCard, type ProcessingStatus } from '../components/DocumentCard.js'
import type { DocumentType } from '../components/DocumentTypeBadge.js'
import { unwrapList } from '../lib/unwrap.js'

interface DocumentSummary {
  id: string
  original_name: string
  document_type: DocumentType | null
  processing_status: ProcessingStatus
  classification_confidence: number | null
  page_count: number | null
  file_size: number | null
  created_at: string
}

const FILTERS: Array<{ key: 'all' | DocumentType; defaultLabel: string; icon?: string }> = [
  { key: 'all', defaultLabel: 'All', icon: 'all_inbox' },
  { key: 'invoice', defaultLabel: 'Invoices', icon: 'receipt_long' },
  { key: 'receipt', defaultLabel: 'Receipts', icon: 'receipt' },
  { key: 'contract', defaultLabel: 'Contracts', icon: 'gavel' },
  { key: 'form', defaultLabel: 'Forms', icon: 'assignment' },
  { key: 'report', defaultLabel: 'Reports', icon: 'analytics' },
  { key: 'identification', defaultLabel: 'IDs', icon: 'badge' },
  { key: 'other', defaultLabel: 'Other', icon: 'description' },
]

export function Documents() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<DocumentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | DocumentType>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/documents')
      .then((res) => {
        if (cancelled) return
        setItems(unwrapList<DocumentSummary>(res))
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : t('documents.loadError', {}, { defaultValue: 'Failed to load documents.' }),
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((d) => {
      if (activeFilter !== 'all' && d.document_type !== activeFilter) return false
      if (q && !d.original_name.toLowerCase().includes(q)) return false
      return true
    })
  }, [items, activeFilter, search])

  return (
    <div
      data-mol-id="documents-page"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}
    >
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
        <p
          className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest text-primary font-bold')}
          style={{ fontSize: 10 }}
        >
          {t('nav.library', {}, { defaultValue: 'Library' })}
        </p>
        <div
          className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' })}
        >
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
            {t('documents.heading', {}, { defaultValue: 'All documents' })}
          </h1>
          <Link
            data-mol-id="documents-upload-cta"
            to="/upload"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity inline-flex items-center gap-2',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined')}
              style={{ fontSize: 18 }}
              aria-hidden="true"
            >
              add
            </span>
            {t('documents.uploadCta', {}, { defaultValue: 'Upload documents' })}
          </Link>
        </div>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'documents.subheading',
            { count: items.length },
            { defaultValue: '{{count}} documents in your library, sorted newest first.' },
          )}
        </p>
      </header>

      <section
        className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm', align: 'center', justify: 'between' }))}
      >
        <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }))}>
          {FILTERS.map((f) => {
            const active = activeFilter === f.key
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setActiveFilter(f.key)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'rounded-full transition-colors uppercase tracking-widest inline-flex items-center gap-1',
                  active
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                )}
                style={{ fontSize: 10 }}
              >
                {f.icon ? (
                  <span
                    className={cm.cn('material-symbols-outlined')}
                    style={{ fontSize: 14 }}
                    aria-hidden="true"
                  >
                    {f.icon}
                  </span>
                ) : null}
                {t(`documents.filter.${f.key}`, {}, { defaultValue: f.defaultLabel })}
              </button>
            )
          })}
        </div>
        <label className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'relative')}>
          <span className={cm.cn('sr-only')}>
            {t('documents.searchLabel', {}, { defaultValue: 'Search documents' })}
          </span>
          <span
            className={cm.cn('material-symbols-outlined absolute left-3 text-on-surface-variant')}
            style={{ fontSize: 18 }}
            aria-hidden="true"
          >
            search
          </span>
          <input
            data-mol-id="documents-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              'documents.searchPlaceholder',
              {},
              { defaultValue: 'Search documents…' },
            )}
            className={cm.cn(
              cm.sp('pl', 10),
              cm.sp('pr', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'rounded-full border border-outline-variant bg-surface-container-low w-64 focus:outline-none focus:border-primary',
            )}
          />
        </label>
      </section>

      {error ? (
        <p className={cm.cn(cm.textSize('xs'), cm.sp('py', 2), 'text-on-surface-variant italic')}>
          {error}
        </p>
      ) : null}

      {loading && items.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('documents.loading', {}, { defaultValue: 'Loading library…' })}
        </p>
      ) : filtered.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('documents.empty', {}, { defaultValue: 'No documents match the current filters.' })}
        </p>
      ) : (
        <section
          className={cm.cn(
            cm.grid({ gap: 'lg' }),
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
          )}
        >
          {filtered.map((d) => (
            <DocumentCard
              key={d.id}
              id={d.id}
              filename={d.original_name}
              type={d.document_type}
              status={d.processing_status}
              confidence={d.classification_confidence}
              pageCount={d.page_count}
              fileSize={d.file_size}
              uploadedAt={d.created_at}
            />
          ))}
        </section>
      )}
    </div>
  )
}
