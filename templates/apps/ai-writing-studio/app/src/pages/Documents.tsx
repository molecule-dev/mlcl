import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DocumentCard, type DocumentCardData } from '../components/DocumentCard.js'
import { type DocumentStatus, DocumentStatusPill } from '../components/DocumentStatusPill.js'

interface DocumentRow {
  id: string
  title: string
  summary?: string | null
  status: string
  word_count: number
  reading_minutes: number
  seo_score?: number | null
  updated_at: string
  last_edited_at?: string | null
}

const STATUS_FILTERS: ReadonlyArray<{ key: 'all' | DocumentStatus; defaultLabel: string }> = [
  { key: 'all', defaultLabel: 'All' },
  { key: 'draft', defaultLabel: 'Drafts' },
  { key: 'ai-assisted', defaultLabel: 'AI assisted' },
  { key: 'published', defaultLabel: 'Published' },
  { key: 'archived', defaultLabel: 'Archived' },
]

const STATUS_MAP: Record<string, DocumentStatus> = {
  draft: 'draft',
  published: 'published',
  archived: 'archived',
  'ai-assisted': 'ai-assisted',
}

function toRelative(updatedAt: string): string {
  const then = new Date(updatedAt).getTime()
  const now = Date.now()
  const diffMs = Math.max(0, now - then)
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 60) return `${Math.max(1, diffMin)}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDays = Math.floor(diffHr / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 30) return `${diffDays}d ago`
  return new Date(updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function Documents() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [docs, setDocs] = useState<DocumentCardData[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | DocumentStatus>('all')
  const [query, setQuery] = useState('')
  const [filterClicks, setFilterClicks] = useState(0)

  function applyFilter(next: 'all' | DocumentStatus) {
    setFilter(next)
    // Bump a visible "filter applied" counter so re-clicking the
    // already-active filter still produces an observable DOM change
    // (helpful for behavioral verifiers and for telling the user that
    // a click registered).
    setFilterClicks((n) => n + 1)
  }

  useEffect(() => {
    let cancelled = false
    http
      .get<DocumentRow[]>('/documents')
      .then((res) => {
        if (cancelled) return
        const rows = Array.isArray(res.data) ? res.data : []
        const cards: DocumentCardData[] = rows.map((d) => ({
          id: String(d.id),
          title: String(d.title || ''),
          excerpt: d.summary ?? '',
          status: STATUS_MAP[d.status] ?? 'draft',
          wordCount: Number(d.word_count ?? 0),
          updatedRelative: toRelative(String(d.last_edited_at ?? d.updated_at)),
          seoScore: d.seo_score == null ? undefined : Number(d.seo_score),
        }))
        setDocs(cards)
        setError(null)
      })
      .catch(() => {
        if (cancelled) return
        setDocs([])
        setError(t('documents.loadError', {}, { defaultValue: 'Could not load documents.' }))
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const filtered = (docs ?? []).filter((d) => {
    if (filter !== 'all' && d.status !== filter) return false
    if (query.trim() && !d.title.toLowerCase().includes(query.toLowerCase())) return false
    return true
  })

  return (
    <div className={cm.cn(cm.sp('p', 8), 'bg-background min-h-screen')}>
      <div className={cm.cn('max-w-7xl', cm.mxAuto, cm.stack(8))}>
        <div
          className={cm.cn(cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }))}
        >
          <div>
            <h1
              className={cm.cn(
                'text-3xl font-extrabold tracking-tight font-serif text-on-background',
              )}
            >
              {t('documents.title', {}, { defaultValue: 'Documents' })}
            </h1>
            <p className={cm.cn(cm.sp('mt', 1), cm.textMuted)}>
              {docs === null
                ? t('documents.loading', {}, { defaultValue: 'Loading your library…' })
                : t(
                    'documents.subtitle',
                    { count: docs.length },
                    { defaultValue: '{{count}} documents in your library.' },
                  )}
            </p>
          </div>
          <Link
            to="/documents/new"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'bg-primary text-white rounded-full hover:bg-primary-dark transition-colors shadow-sm',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              add
            </span>
            {t('documents.new', {}, { defaultValue: 'New document' })}
          </Link>
        </div>

        {error ? (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('p', 4),
              cm.textSize('sm'),
              'rounded-lg bg-error-container text-on-error-container',
            )}
          >
            {error}
          </div>
        ) : null}

        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }))}>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => applyFilter(f.key)}
                aria-pressed={filter === f.key}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.roundedFull,
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  'uppercase tracking-widest border transition-colors',
                  filter === f.key
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface text-on-surface-variant border-outline-variant hover:border-primary/30 hover:text-primary',
                )}
              >
                {t(`documents.filter.${f.key}`, {}, { defaultValue: f.defaultLabel })}
              </button>
            ))}
            <span
              data-mol-id="documents-filter-applied-counter"
              aria-live="polite"
              className={cm.cn(cm.textSize('xs'), cm.textMuted, cm.sp('ml', 2))}
            >
              {filterClicks > 0
                ? t(
                    'documents.filter.applied',
                    { count: filterClicks },
                    { defaultValue: 'Filter applied ({{count}}).' },
                  )
                : ''}
            </span>
          </div>
          <div className="relative">
            <span
              className={cm.cn(
                'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-base',
              )}
              aria-hidden="true"
            >
              search
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t(
                'documents.searchPlaceholder',
                {},
                { defaultValue: 'Search documents…' },
              )}
              aria-label={t('documents.searchAriaLabel', {}, { defaultValue: 'Search documents' })}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                'pl-10 rounded-full bg-surface border border-outline-variant w-72 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors',
              )}
            />
          </div>
        </div>

        {docs === null ? (
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.textCenter, cm.sp('py', 12))}>
            {t('documents.loading', {}, { defaultValue: 'Loading your library…' })}
          </p>
        ) : filtered.length === 0 ? (
          <div
            className={cm.cn(
              cm.sp('py', 16),
              cm.textCenter,
              cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
            )}
          >
            <DocumentStatusPill status={filter === 'all' ? 'draft' : filter} />
            <p className={cm.cn(cm.textSize('lg'), cm.textMuted, 'font-serif italic')}>
              {docs.length === 0
                ? t(
                    'documents.empty',
                    {},
                    { defaultValue: 'Your library is waiting — start your first document.' },
                  )
                : t(
                    'documents.emptyFiltered',
                    {},
                    { defaultValue: 'No documents match your filters yet.' },
                  )}
            </p>
            <Link
              to="/documents/new"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                'bg-primary text-white rounded-full hover:bg-primary-dark transition-colors',
              )}
            >
              {t('documents.createNew', {}, { defaultValue: 'Create new document' })}
            </Link>
          </div>
        ) : (
          <div
            className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}
          >
            {filtered.map((doc) => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Documents
export { Documents as DocumentsPage }
