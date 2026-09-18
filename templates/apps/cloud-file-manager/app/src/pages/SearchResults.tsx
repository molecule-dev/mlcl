import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { NimbusFileRow } from '../components/NimbusFileRow.js'
import { NimbusFilesLayout } from '../components/NimbusFilesLayout.js'
import type { NimbusFileKind } from '../components/NimbusFileTypeIcon.js'

interface FileRow {
  id: string
  name: string
  mime_type: string
  size: number
  is_starred: boolean
  is_trashed: boolean
  updated_at?: string
}

type FilterKind = 'all' | 'documents' | 'images' | 'media' | 'archives' | 'code'

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

function bucketFor(mime: string): FilterKind {
  if (mime.startsWith('image/')) return 'images'
  if (mime.startsWith('video/') || mime.startsWith('audio/')) return 'media'
  if (
    mime === 'application/zip' ||
    mime === 'application/x-tar' ||
    mime === 'application/gzip' ||
    mime === 'application/x-rar-compressed' ||
    mime === 'application/x-7z-compressed'
  ) {
    return 'archives'
  }
  if (
    mime === 'application/json' ||
    mime === 'application/xml' ||
    mime === 'application/javascript' ||
    mime.startsWith('text/markdown')
  ) {
    return 'code'
  }
  return 'documents'
}

function formatSize(bytes: number): string {
  if (!bytes || bytes === 0) return '—'
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

function relativeLabel(iso: string | undefined, t: ReturnType<typeof useTranslation>['t']): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.round(diffMs / 60_000)
  if (diffMin < 1) return t('common.justNow', {}, { defaultValue: 'just now' })
  if (diffMin < 60)
    return t('search.time.minutesAgo', { count: diffMin }, { defaultValue: '{{count}} min ago' })
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24)
    return t('search.time.hoursAgo', { count: diffHr }, { defaultValue: '{{count}}h ago' })
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 7)
    return t('search.time.daysAgo', { count: diffDay }, { defaultValue: '{{count}}d ago' })
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function SearchResults() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const queryParam = params.get('q') ?? ''
  const [draftQuery, setDraftQuery] = useState(queryParam)
  const [files, setFiles] = useState<FileRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterKind>('all')

  useEffect(() => {
    setDraftQuery(queryParam)
  }, [queryParam])

  // Refetch on every queryParam change so each Enter on the search form
  // fires a real GET /api/files?q=<term> the user can verify in the
  // network panel (and so server-side filters can take over later
  // without changing the wiring).
  useEffect(() => {
    let cancelled = false
    const url = queryParam ? `/api/files?q=${encodeURIComponent(queryParam)}` : '/api/files'
    http
      .get<FileRow[]>(url)
      .then((res) => {
        if (cancelled) return
        const data = Array.isArray(res.data) ? res.data : []
        setFiles(data.filter((f) => !f.is_trashed))
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('search.fetchError', {}, { defaultValue: 'Could not load files.' }),
        )
        setFiles([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t, queryParam])

  const matched = useMemo(() => {
    if (!files) return null
    const q = queryParam.trim().toLowerCase()
    return q.length === 0 ? files : files.filter((f) => f.name.toLowerCase().includes(q))
  }, [files, queryParam])

  const filtered = useMemo(() => {
    if (!matched) return null
    if (activeFilter === 'all') return matched
    return matched.filter((f) => bucketFor(f.mime_type) === activeFilter)
  }, [matched, activeFilter])

  const counts = useMemo(() => {
    const c: Record<FilterKind, number> = {
      all: 0,
      documents: 0,
      images: 0,
      media: 0,
      archives: 0,
      code: 0,
    }
    if (!matched) return c
    c.all = matched.length
    for (const f of matched) {
      c[bucketFor(f.mime_type)]++
    }
    return c
  }, [matched])

  const filterChips: Array<{ id: FilterKind; key: string; defaultLabel: string; glyph: string }> = [
    { id: 'all', key: 'search.filter.all', defaultLabel: 'All', glyph: 'apps' },
    { id: 'documents', key: 'search.filter.documents', defaultLabel: 'Docs', glyph: 'description' },
    { id: 'images', key: 'search.filter.images', defaultLabel: 'Images', glyph: 'image' },
    { id: 'media', key: 'search.filter.media', defaultLabel: 'Media', glyph: 'movie' },
    {
      id: 'archives',
      key: 'search.filter.archives',
      defaultLabel: 'Archives',
      glyph: 'folder_zip',
    },
    { id: 'code', key: 'search.filter.code', defaultLabel: 'Code', glyph: 'code' },
  ]

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next = new URLSearchParams(params)
    if (draftQuery.trim()) {
      next.set('q', draftQuery.trim())
    } else {
      next.delete('q')
    }
    setParams(next)
  }

  function clearQuery() {
    setDraftQuery('')
    const next = new URLSearchParams(params)
    next.delete('q')
    setParams(next)
  }

  return (
    <NimbusFilesLayout
      breadcrumbs={[
        {
          to: '/files',
          label: t('search.crumbs.home', { appName: APP_NAME }, { defaultValue: '{{appName}}' }),
        },
        { label: t('common.search', {}, { defaultValue: 'Search' }) },
      ]}
      showSearch={false}
      topbarRight={
        <form
          onSubmit={handleSubmit}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'rounded-xl bg-surface-container-low text-on-surface w-80',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-lg text-on-surface-variant')}>
            search
          </span>
          <input
            type="search"
            value={draftQuery}
            onChange={(e) => setDraftQuery(e.target.value)}
            placeholder={t(
              'search.input.placeholder',
              { appName: APP_NAME },
              { defaultValue: 'Search {{appName}}…' },
            )}
            data-mol-id="search-input"
            className={cm.cn(
              cm.w('full'),
              cm.fontWeight('semibold'),
              'bg-transparent border-0 focus:ring-0 focus:outline-none text-on-surface placeholder:text-outline',
            )}
          />
          {queryParam && (
            <button
              onClick={clearQuery}
              type="button"
              data-mol-id="search-clear"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(6),
                cm.h(6),
                cm.roundedFull,
                'ml-auto text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors shrink-0',
              )}
              aria-label={t('search.clearLabel', {}, { defaultValue: 'Clear search' })}
            >
              <span className={cm.cn('material-symbols-outlined text-base')}>close</span>
            </button>
          )}
        </form>
      }
    >
      <div
        className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}
        data-mol-id={`search-results-${queryParam}`}
      >
        <section
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'md' }),
            cm.sp('p', 8),
            'rounded-2xl bg-gradient-to-br from-primary-container/15 to-tertiary-container/15 border border-outline-variant/15 relative overflow-hidden',
          )}
        >
          <p
            className={cm.cn(
              cm.textSize('xs'),
              'font-black uppercase tracking-widest text-primary',
            )}
          >
            {t('common.search', {}, { defaultValue: 'Search' })}
          </p>
          <h1
            className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface')}
          >
            {queryParam
              ? t(
                  'search.hero.titleWithQuery',
                  { count: filtered?.length ?? 0, query: queryParam },
                  { defaultValue: '{{count}} results for “{{query}}”' },
                )
              : t('search.hero.titleEmpty', {}, { defaultValue: 'Search your archive' })}
          </h1>
          <p className={cm.cn(cm.textSize('base'), cm.maxW('lg'), 'text-on-surface-variant')}>
            {t(
              'search.hero.body',
              {},
              { defaultValue: 'Filter by type to focus. Tap any result to open it.' },
            )}
          </p>
          <div
            className={cm.cn(
              'absolute -right-12 -top-12 w-48 h-48 rounded-full bg-primary/10 blur-3xl',
            )}
            aria-hidden="true"
          />
        </section>

        {error && (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('p', 4),
              cm.textSize('sm'),
              'rounded-xl bg-error-container text-on-error-container',
            )}
          >
            {error}
          </div>
        )}

        <section className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }))}>
          {filterChips.map((c) => {
            const active = activeFilter === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveFilter(c.id)}
                data-mol-id={`search-filter-${c.id}`}
                aria-pressed={active}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-full transition-all',
                  active
                    ? 'bg-gradient-to-br from-primary to-tertiary-container text-on-primary shadow-md shadow-primary/20'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-base')}>{c.glyph}</span>
                {t(c.key, {}, { defaultValue: c.defaultLabel })}
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('px', 2),
                    cm.roundedFull,
                    cm.fontWeight('bold'),
                    'tabular-nums',
                    active
                      ? 'bg-surface/25 text-on-primary'
                      : 'bg-surface-container-high text-on-surface-variant',
                  )}
                >
                  {counts[c.id]}
                </span>
              </button>
            )
          })}
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
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('search.section.allFiles', {}, { defaultValue: 'Matching files' })}
            </h2>
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'search.section.count',
                { count: filtered?.length ?? 0 },
                { defaultValue: '{{count}} results' },
              )}
            </span>
          </header>
          {filtered === null ? (
            <p className={cm.cn(cm.sp('p', 6), cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : filtered.length === 0 ? (
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'sm' }),
                cm.sp('p', 12),
                'text-center',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-4xl text-outline')}>
                search_off
              </span>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {queryParam
                  ? t(
                      'search.emptyWithQuery',
                      { query: queryParam },
                      { defaultValue: 'No files match “{{query}}”.' },
                    )
                  : t(
                      'search.emptyNoQuery',
                      {},
                      { defaultValue: 'Type a query above to search your archive.' },
                    )}
              </p>
              <button
                type="button"
                onClick={() => navigate('/files')}
                data-mol-id="search-back-to-files"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-xl bg-primary-container/15 text-primary hover:bg-primary-container/25 transition-colors',
                )}
              >
                <span className="material-symbols-outlined text-base">folder_open</span>
                {t('search.backToFiles', {}, { defaultValue: 'Back to all files' })}
              </button>
            </div>
          ) : (
            <ul
              className={cm.cn(cm.flex({ direction: 'col' }), 'divide-y divide-outline-variant/15')}
            >
              {filtered.map((h) => (
                <NimbusFileRow
                  key={h.id}
                  id={h.id}
                  kind={kindFromMime(h.mime_type)}
                  name={h.name}
                  modifiedLabel={relativeLabel(h.updated_at, t)}
                  sizeLabel={formatSize(h.size)}
                  starred={h.is_starred}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </NimbusFilesLayout>
  )
}

export default SearchResults
