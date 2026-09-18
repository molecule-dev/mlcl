import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { CourseTile } from '../components/CourseTile.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'
import { api } from '../lib/api.js'

interface ApiCourse {
  id: string
  slug: string | null
  title: string
  description: string | null
  category: string | null
  level: string
  thumbnail_url: string | null
  price_cents: number
  original_price_cents: number | null
  duration_min: number
  total_lessons: number
  total_enrollments: number
  rating_avg: number
  rating_count: number
  status: string
  featured: boolean
  instructor_id: string | null
  instructor_name: string | null
  instructor_avatar_url: string | null
}

interface Category {
  name: string
}

const SORT_OPTIONS = [
  { id: 'popular', labelKey: 'browse.sortOption.popular', labelDefault: 'Most popular' },
  { id: 'rating', labelKey: 'browse.sortOption.rating', labelDefault: 'Highest rated' },
  { id: 'recent', labelKey: 'browse.sortOption.recent', labelDefault: 'Newest' },
  { id: 'price-asc', labelKey: 'browse.sortOption.priceAsc', labelDefault: 'Price: low to high' },
] as const

const LEVELS: Array<{
  id: 'beginner' | 'intermediate' | 'advanced'
  labelKey: string
  labelDefault: string
}> = [
  { id: 'beginner', labelKey: 'browse.level.beginner', labelDefault: 'Beginner' },
  { id: 'intermediate', labelKey: 'browse.level.intermediate', labelDefault: 'Intermediate' },
  { id: 'advanced', labelKey: 'browse.level.advanced', labelDefault: 'Advanced' },
]

const PRICE_BUCKETS: Array<{
  id: string
  labelKey: string
  labelDefault: string
  min: number
  max?: number
}> = [
  { id: 'free', labelKey: 'browse.price.free', labelDefault: 'Free', min: 0, max: 0 },
  {
    id: 'under-50',
    labelKey: 'browse.price.under50',
    labelDefault: 'Under $50',
    min: 1,
    max: 4999,
  },
  {
    id: '50-100',
    labelKey: 'browse.price.50to100',
    labelDefault: '$50 – $100',
    min: 5000,
    max: 10000,
  },
  { id: 'over-100', labelKey: 'browse.price.over100', labelDefault: 'Over $100', min: 10001 },
]

function badgeFor(course: ApiCourse): 'bestseller' | 'new' | 'free' | undefined {
  if (course.price_cents === 0) return 'free'
  if (course.total_enrollments >= 50_000) return 'bestseller'
  if (course.rating_count < 100 && course.total_enrollments < 500) return 'new'
  return undefined
}

export function Browse() {
  const cm = getClassMap()
  const { t } = useTranslation()
  // Deep-link support: the Landing hero search navigates to /browse?q=…
  // and category bubbles navigate to /browse?category=… — honor both.
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q')?.trim() ?? ''
  const [courses, setCourses] = useState<ApiCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<string[]>(['All'])
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') ?? 'All')
  const [activeLevel, setActiveLevel] = useState<string | null>(null)
  const [activePrice, setActivePrice] = useState<string | null>(null)
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]['id']>('popular')
  const [page, setPage] = useState(1)
  const pageSize = 9

  const clearSearch = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('q')
    setSearchParams(next, { replace: true })
  }

  useEffect(() => {
    let cancelled = false
    api<Category[]>('/courses/categories')
      .then((rows) => {
        if (cancelled) return
        const names = (rows ?? []).map((c) => c.name).filter(Boolean)
        setCategories(['All', ...names])
      })
      .catch(() => {
        // fall back to fetched-from-courses extraction
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const params: Record<string, string | number> = { sort, limit: 100 }
    // The API's text search takes precedence over the other filters.
    if (query) params.search = query
    if (activeCategory && activeCategory !== 'All') params.category = activeCategory
    if (activeLevel) params.level = activeLevel
    const bucket = PRICE_BUCKETS.find((b) => b.id === activePrice)
    if (bucket) {
      params.price_min = bucket.min
      if (bucket.max !== undefined) params.price_max = bucket.max
    }
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      search.set(key, String(value))
    }
    api<ApiCourse[]>(`/courses?${search.toString()}`)
      .then((rows) => {
        if (cancelled) return
        setCourses(rows ?? [])
        setPage(1)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
        setCourses([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeCategory, activeLevel, activePrice, sort, query])

  const totalPages = Math.max(1, Math.ceil(courses.length / pageSize))
  const visible = courses.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className={cm.cn('min-h-screen flex flex-col bg-background')}>
      <Header />
      <main className={cm.cn(cm.sp('px', 6), cm.sp('py', 12), 'max-w-7xl mx-auto w-full flex-1')}>
        <header className={cm.cn('mb-10')}>
          <p
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2',
            )}
          >
            {t('browse.eyebrow', { appName: APP_NAME }, { defaultValue: '{{appName}} archive' })}
          </p>
          <h1
            className={cm.cn(
              'text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface mb-4',
            )}
          >
            {t('browse.title', {}, { defaultValue: 'Browse every course' })}
          </h1>
          <p className={cm.cn('text-on-surface-variant max-w-xl leading-relaxed')}>
            {t(
              'browse.subtitle',
              {},
              {
                defaultValue:
                  'Filter the editorial archive by topic, level, and price. Every course is hand-curated by our editors.',
              },
            )}
          </p>
        </header>

        <div className={cm.cn('grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10 items-start')}>
          <aside
            className={cm.cn(
              'bg-surface-container-lowest rounded-2xl shadow-sm p-6 space-y-6 lg:sticky lg:top-8',
            )}
          >
            <div>
              <h3
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3',
                )}
              >
                {t('form.category', {}, { defaultValue: 'Category' })}
              </h3>
              <div className={cm.cn('flex flex-wrap gap-2')}>
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    data-mol-id={`filter-${c}`}
                    onClick={() => {
                      setActiveCategory(c)
                      // Text search overrides the other filters server-side, so
                      // picking a category drops the active search term.
                      if (query) clearSearch()
                    }}
                    className={cm.cn(
                      'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                      activeCategory === c
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high',
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3',
                )}
              >
                {t('browse.filter.level', {}, { defaultValue: 'Level' })}
              </h3>
              <ul className={cm.cn('space-y-2 text-sm')}>
                {LEVELS.map((l) => (
                  <li key={l.id}>
                    <label
                      className={cm.cn(
                        'flex items-center gap-3 cursor-pointer hover:text-primary transition-colors',
                      )}
                    >
                      <input
                        type="radio"
                        name="filter-level"
                        data-mol-id={`level-${l.id}`}
                        checked={activeLevel === l.id}
                        onChange={() => setActiveLevel((v) => (v === l.id ? null : l.id))}
                        onClick={() => activeLevel === l.id && setActiveLevel(null)}
                        className={cm.cn(
                          'w-4 h-4 rounded-full border-outline-variant/30 text-primary',
                        )}
                      />
                      <span>{t(l.labelKey, {}, { defaultValue: l.labelDefault })}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3',
                )}
              >
                {t('form.price', {}, { defaultValue: 'Price' })}
              </h3>
              <ul className={cm.cn('space-y-2 text-sm')}>
                {PRICE_BUCKETS.map((b) => (
                  <li key={b.id}>
                    <label
                      className={cm.cn(
                        'flex items-center gap-3 cursor-pointer hover:text-primary transition-colors',
                      )}
                    >
                      <input
                        type="radio"
                        name="filter-price"
                        data-mol-id={`price-${b.id}`}
                        checked={activePrice === b.id}
                        onChange={() => setActivePrice((v) => (v === b.id ? null : b.id))}
                        onClick={() => activePrice === b.id && setActivePrice(null)}
                        className={cm.cn('w-4 h-4 rounded border-outline-variant/30 text-primary')}
                      />
                      <span>{t(b.labelKey, {}, { defaultValue: b.labelDefault })}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <section>
            <header className={cm.cn('flex items-center justify-between gap-4 mb-6 flex-wrap')}>
              <div className={cm.cn('flex items-center gap-3 flex-wrap')}>
                <p className={cm.cn('text-sm text-on-surface-variant')} data-mol-id="results-count">
                  {loading
                    ? t('browse.loading', {}, { defaultValue: 'Loading courses…' })
                    : t(
                        'browse.results',
                        { count: courses.length },
                        { defaultValue: 'Showing {{count}} courses' },
                      )}
                </p>
                {query && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    data-mol-id="clear-search"
                    aria-label={t('browse.clearSearch', {}, { defaultValue: 'Clear search' })}
                    className={cm.cn(
                      'inline-flex items-center gap-1.5 bg-primary-fixed text-on-primary-fixed px-3 py-1 rounded-full text-sm font-medium hover:bg-primary-fixed-dim transition-colors',
                    )}
                  >
                    {t('browse.searchChip', { query }, { defaultValue: '“{{query}}”' })}
                    <span
                      className={cm.cn('material-symbols-outlined text-[16px]')}
                      aria-hidden="true"
                    >
                      close
                    </span>
                  </button>
                )}
              </div>
              <div className={cm.cn('flex items-center gap-3')}>
                <label
                  htmlFor="sort"
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('browse.sort', {}, { defaultValue: 'Sort by' })}
                </label>
                <select
                  id="sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as (typeof SORT_OPTIONS)[number]['id'])}
                  data-mol-id="sort-select"
                  className={
                    'bg-surface-container-lowest rounded-full px-4 py-2 text-sm font-medium text-on-surface shadow-sm border border-outline-variant/20 focus:outline-none focus:border-primary'
                  }
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {t(o.labelKey, {}, { defaultValue: o.labelDefault })}
                    </option>
                  ))}
                </select>
              </div>
            </header>
            {error && (
              <div
                role="alert"
                data-mol-id="browse-error"
                className={cm.cn(
                  'px-4 py-3 rounded-xl bg-error-container text-on-error-container text-sm mb-6',
                )}
              >
                {error}
              </div>
            )}
            {!loading && courses.length === 0 && !error && (
              <div
                data-mol-id="browse-empty"
                className={cm.cn(
                  'bg-surface-container-lowest rounded-2xl shadow-sm p-12 text-center',
                )}
              >
                <p className={cm.cn('text-lg font-bold text-on-surface mb-2')}>
                  {t('browse.empty.title', {}, { defaultValue: 'No courses match your filters' })}
                </p>
                <p className={cm.cn('text-on-surface-variant text-sm')}>
                  {t(
                    'browse.empty.body',
                    {},
                    { defaultValue: 'Try clearing a filter or switching category.' },
                  )}
                </p>
              </div>
            )}
            <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6')}>
              {visible.map((c) => (
                <CourseTile
                  key={c.id}
                  id={c.id}
                  title={c.title}
                  instructor={c.instructor_name ?? `${APP_NAME} instructor`}
                  rating={c.rating_avg}
                  reviewCount={c.rating_count}
                  priceCents={c.price_cents > 0 ? c.price_cents : undefined}
                  originalPriceCents={c.original_price_cents ?? undefined}
                  imageSeed={c.slug ?? c.id}
                  badge={badgeFor(c)}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <nav
                className={cm.cn('mt-12 flex items-center justify-center gap-2')}
                aria-label="Pagination"
              >
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label={t('browse.prev', {}, { defaultValue: 'Previous page' })}
                  className={
                    'w-10 h-10 rounded-full bg-surface-container-lowest text-on-surface flex items-center justify-center shadow-sm disabled:opacity-50 hover:bg-surface-container-low transition-colors'
                  }
                >
                  <span className={cm.cn('material-symbols-outlined text-[20px]')}>
                    chevron_left
                  </span>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    data-mol-id={`page-${n}`}
                    className={cm.cn(
                      'w-10 h-10 rounded-full text-sm font-bold transition-colors',
                      page === n
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-low',
                    )}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  aria-label={t('browse.next', {}, { defaultValue: 'Next page' })}
                  className={
                    'w-10 h-10 rounded-full bg-surface-container-lowest text-on-surface flex items-center justify-center shadow-sm disabled:opacity-50 hover:bg-surface-container-low transition-colors'
                  }
                >
                  <span className={cm.cn('material-symbols-outlined text-[20px]')}>
                    chevron_right
                  </span>
                </button>
              </nav>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default Browse
