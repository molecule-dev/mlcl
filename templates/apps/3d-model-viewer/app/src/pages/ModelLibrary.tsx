import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import ModelFilterBar from '../components/ModelFilterBar.js'
import ModelLibraryGrid from '../components/ModelLibraryGrid.js'
import ModelLibraryHeader from '../components/ModelLibraryHeader.js'
import ModelPagination from '../components/ModelPagination.js'

const PAGE_SIZE = 12

/** Sidebar categories, moved into the page with the side nav's retirement —
 * the shared shell's nav carries app navigation; category filtering is
 * library content. Same slugs/icons the former rail linked to. */
const CATEGORIES: ReadonlyArray<{
  slug: string
  icon: string
  labelKey: string
  fallback: string
}> = [
  {
    slug: 'architecture',
    icon: 'domain',
    labelKey: 'nav.architecture',
    fallback: 'Architecture',
  },
  { slug: 'characters', icon: 'person_4', labelKey: 'nav.characters', fallback: 'Characters' },
  { slug: 'vehicles', icon: 'directions_car', labelKey: 'nav.vehicles', fallback: 'Vehicles' },
  { slug: 'props', icon: 'category', labelKey: 'nav.props', fallback: 'Props' },
]

/** Raw model row as returned by GET /api/models (snake_case DB fields). */
interface ApiModel {
  id: string | number
  name?: string
  format?: string
  file_size?: number | string
  polygon_count?: number | string
  thumbnail_url?: string | null
  category?: string | null
  created_at?: string
  updated_at?: string | null
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function ModelLibrary() {
  const cm = getClassMap()
  const http = useHttpClient()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  // Category comes from the sidebar links (?category=…); q lets the dashboard
  // search bar hand off a query.
  const category = searchParams.get('category') ?? ''
  const [allModels, setAllModels] = useState<ApiModel[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '')
  const [format, setFormat] = useState('All Formats')
  // 100 = no polycount limit; lower values keep only lighter models.
  const [polycount, setPolycount] = useState(100)
  const [sort, setSort] = useState('Recent')
  const [page, setPage] = useState(1)

  useEffect(() => {
    http
      .get('/api/models')
      .then((res: unknown) =>
        setAllModels(
          Array.isArray(res)
            ? (res as ApiModel[])
            : Array.isArray((res as { data?: unknown[] })?.data)
              ? (res as { data: ApiModel[] }).data
              : [],
        ),
      )
      .catch((err) =>
        setFetchError(
          err instanceof Error
            ? err.message
            : t('modelLibrary.loadError', {}, { defaultValue: 'Failed to load models' }),
        ),
      )
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reset to page 1 whenever the sidebar category changes.
  useEffect(() => {
    setPage(1)
  }, [category])

  const maxPoly = allModels.reduce((max, m) => Math.max(max, Number(m.polygon_count) || 0), 0)
  const polyLimit = polycount >= 100 ? Infinity : (polycount / 100) * maxPoly

  const filtered = allModels.filter((m) => {
    const matchFormat =
      format === 'All Formats' || (m.format || '').toUpperCase() === format.toUpperCase()
    const matchSearch = !search || (m.name || '').toLowerCase().includes(search.toLowerCase())
    const matchCategory = !category || (m.category || '') === category
    const matchPoly = (Number(m.polygon_count) || 0) <= polyLimit
    return matchFormat && matchSearch && matchCategory && matchPoly
  })

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case 'Name':
        return (a.name || '').localeCompare(b.name || '')
      case 'Size':
        return (Number(b.file_size) || 0) - (Number(a.file_size) || 0)
      case 'Polycount':
        return (Number(b.polygon_count) || 0) - (Number(a.polygon_count) || 0)
      case 'Recent':
      default:
        return (
          new Date(b.updated_at ?? b.created_at ?? 0).getTime() -
          new Date(a.updated_at ?? a.created_at ?? 0).getTime()
        )
    }
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((m) => ({
    id: m.id,
    name: m.name ?? '',
    format: (m.format || 'glb').toUpperCase(),
    fileSize: formatBytes(Number(m.file_size) || 0),
    triCount: (Number(m.polygon_count) || 0).toLocaleString(),
    updatedAt: m.updated_at ? new Date(m.updated_at).toLocaleDateString() : undefined,
    thumbnailUrl: m.thumbnail_url ?? undefined,
  }))

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.h('screen'),
        'text-on-surface overflow-hidden bg-background',
      )}
    >
      {/* Page top bar — md+ chrome riding inside the shell's Content (the
          shell's mobile TopBar replaces it below the breakpoint). */}
      <ModelLibraryHeader
        search={search}
        onSearch={(q) => {
          setSearch(q)
          setPage(1)
        }}
      />
      {/* Content Area */}
      <div className={cm.cn(cm.flex1, cm.sp('px', 8), 'pb-28 md:pb-12 overflow-y-auto')}>
        {/* Category chips — the former side nav's filter, now page content */}
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 2 }),
            cm.sp('pb', 4),
            'overflow-x-auto hide-scrollbar',
          )}
        >
          <Link
            to="/models"
            className={
              category === ''
                ? cm.cn(
                    cm.sp('px', 4),
                    cm.roundedFull,
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'py-1.5 bg-primary text-on-primary whitespace-nowrap',
                  )
                : cm.cn(
                    cm.sp('px', 4),
                    cm.roundedFull,
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'py-1.5 bg-surface-container hover:bg-surface-container-highest text-on-surface-variant transition-colors whitespace-nowrap',
                  )
            }
          >
            {t('nav.allModels', {}, { defaultValue: 'All Models' })}
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              to={`/models?category=${c.slug}`}
              className={
                category === c.slug
                  ? cm.cn(
                      cm.sp('px', 4),
                      cm.roundedFull,
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      cm.flex({ align: 'center', gap: 1 }),
                      'py-1.5 bg-primary text-on-primary whitespace-nowrap',
                    )
                  : cm.cn(
                      cm.sp('px', 4),
                      cm.roundedFull,
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      cm.flex({ align: 'center', gap: 1 }),
                      'py-1.5 bg-surface-container hover:bg-surface-container-highest text-on-surface-variant transition-colors whitespace-nowrap',
                    )
              }
            >
              <span className="material-symbols-outlined text-[18px]">{c.icon}</span>
              {t(c.labelKey, {}, { defaultValue: c.fallback })}
            </Link>
          ))}
        </div>
        {/* Filter Row */}
        <ModelFilterBar
          format={format}
          onFormat={(f) => {
            setFormat(f)
            setPage(1)
          }}
          polycount={polycount}
          onPolycount={(v) => {
            setPolycount(v)
            setPage(1)
          }}
          sort={sort}
          onSort={setSort}
        />
        {/* Model Grid */}
        <ModelLibraryGrid
          models={paged}
          loading={loading}
          error={fetchError}
          onDeleted={(id) =>
            setAllModels((prev) => prev.filter((m) => String(m.id) !== String(id)))
          }
        />
        {/* Pagination */}
        <ModelPagination page={page} totalPages={totalPages} onPage={setPage} />
      </div>
    </div>
  )
}

export default ModelLibrary
export { ModelLibrary, ModelLibrary as ModelLibraryPage }
