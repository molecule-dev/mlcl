import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Product {
  id: string
  name: string
  brand: string
  category: string
  size: string
  price_cents: number
  thumbnail_url?: string | null
  badges?: string[]
}

const CATEGORIES = [
  'all',
  'produce',
  'dairy',
  'bakery',
  'meat',
  'pantry',
  'frozen',
  'beverages',
  'household',
] as const

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function Search() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('all')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/products')
      .then((res) => {
        if (!cancelled) setProducts(unwrapList<Product>(res))
      })
      .catch(() => {
        if (!cancelled) setError(t('search.loadError', {}, { defaultValue: 'Search unavailable.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      if (category !== 'all' && p.category !== category) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      )
    })
  }, [products, query, category])

  return (
    <div
      className={cm.cn(
        cm.maxW('7xl'),
        cm.sp('px', 6),
        cm.sp('py', 8),
        cm.mxAuto,
        cm.grid({ cols: 12, gap: 'lg' }),
      )}
    >
      <aside className={'col-span-12 md:col-span-3'}>
        <h2
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            cm.sp('mb', 3),
            'uppercase tracking-wide text-on-surface-variant',
          )}
        >
          {t('search.filterHeading', {}, { defaultValue: 'Filter by category' })}
        </h2>
        <ul className={'space-y-1'}>
          {CATEGORIES.map((cat) => {
            const isActive = category === cat
            return (
              <li key={cat}>
                <button
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'block w-full text-left rounded-md',
                    isActive
                      ? 'bg-primary-container text-primary'
                      : 'text-on-surface hover:bg-surface-container',
                  )}
                  aria-pressed={isActive}
                >
                  {t(
                    `search.category.${cat}`,
                    {},
                    {
                      defaultValue:
                        cat === 'all'
                          ? 'All categories'
                          : cat.charAt(0).toUpperCase() + cat.slice(1),
                    },
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </aside>

      <div className={'col-span-12 md:col-span-9'}>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
          {t('search.heading', {}, { defaultValue: 'Search products' })}
        </h1>

        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('mb', 4),
            'bg-surface rounded-full shadow-sm',
            cm.sp('px', 4),
            cm.sp('py', 3),
          )}
        >
          <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              'search.placeholder',
              {},
              { defaultValue: 'Bread, milk, organic apples…' },
            )}
            className={'flex-1 bg-transparent outline-none'}
            aria-label={t('common.search', {}, { defaultValue: 'Search' })}
          />
        </div>

        {error ? (
          <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
        ) : loading ? (
          <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : results.length === 0 ? (
          <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
            {t('search.empty', { query }, { defaultValue: 'No results for "{{query}}".' })}
          </p>
        ) : (
          <div className={cm.grid({ cols: 5, gap: 'md' })}>
            {results.map((p) => (
              <Link
                key={p.id}
                to={`/product/${p.id}`}
                className={cm.cn(
                  'block bg-surface rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden',
                )}
              >
                <div className={cm.cn('bg-surface-variant aspect-square')}>
                  {p.thumbnail_url ? (
                    <img
                      src={p.thumbnail_url}
                      alt={p.name}
                      className={'h-full w-full object-cover'}
                    />
                  ) : null}
                </div>
                <div className={cm.cn(cm.sp('p', 3))}>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-on-surface-variant uppercase tracking-wide',
                    )}
                  >
                    {p.brand}
                  </p>
                  <h3
                    className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'line-clamp-2')}
                  >
                    {p.name}
                  </h3>
                  <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), cm.textMuted)}>{p.size}</p>
                  <p className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), cm.sp('mt', 2))}>
                    {fmt(p.price_cents)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
