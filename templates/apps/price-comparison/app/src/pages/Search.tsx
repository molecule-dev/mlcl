import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ErrorBanner } from '../components/ErrorBanner.js'
import { ProductPriceCard, type ProductPriceCardProduct } from '../components/ProductPriceCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface ApiProduct {
  id: string
  name: string
  brand?: string | null
  category?: string | null
  best_price?: number | null
  price?: number | null
  best_source?: string | null
  status?: string
  sku?: string | null
  image_url?: string | null
}

const CATEGORIES = [
  'All',
  'Headphones',
  'Laptops',
  'Home',
  'Gaming',
  'Fitness',
  'Phones',
  'Cameras',
  'Electronics',
]

const toCard = (p: ApiProduct): ProductPriceCardProduct => {
  const list = Number(p.price ?? 0)
  const best = Number(p.best_price ?? p.price ?? 0)
  const drop = list > best && list > 0 ? Math.round(((list - best) / list) * 100) : 0
  return {
    id: p.id,
    name: p.name,
    brand: p.brand ?? '—',
    category: p.category ?? '—',
    best_price_cents: best,
    list_price_cents: list,
    retailer_count: 5,
    drop_pct: drop,
    in_stock: true,
  }
}

export function Search() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>(searchParams.get('category') ?? 'All')
  const [maxPrice, setMaxPrice] = useState('')
  const [results, setResults] = useState<ProductPriceCardProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [seedAttempted, setSeedAttempted] = useState(false)
  const [bumpKey, setBumpKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setErrorMsg(null)
    http
      .get('/api/products?limit=200')
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<ApiProduct>(res).map(toCard)
        setResults(list)
        if (list.length === 0 && !seedAttempted) {
          setSeedAttempted(true)
          http
            .post('/api/products/seed', {})
            .then(() => {
              if (!cancelled) setBumpKey((k) => k + 1)
            })
            .catch(() => {})
        }
      })
      .catch(() => {
        if (!cancelled)
          setErrorMsg(t('search.loadFailed', {}, { defaultValue: 'Could not load the catalog.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, seedAttempted, bumpKey])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const max = maxPrice ? Number(maxPrice) * 100 : Infinity
    return results.filter((p) => {
      if (category !== 'All' && p.category !== category) return false
      if (max < Infinity && p.best_price_cents > max) return false
      if (!q) return true
      return [p.name, p.brand, p.category].some((s) => s.toLowerCase().includes(q))
    })
  }, [results, query, category, maxPrice])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')} data-test="search-page">
      <header>
        <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
          {t('search.eyebrow', {}, { defaultValue: 'Find the best price' })}
        </p>
        <h1
          className={cm.cn(
            'mt-1 text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
          )}
        >
          {t('search.heading', {}, { defaultValue: 'Search every retailer' })}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('base'),
            cm.sp('mt', 2),
            'text-on-surface-variant max-w-3xl',
          )}
        >
          {t(
            'search.subheading',
            { appName: APP_NAME },
            {
              defaultValue:
                'Type a product, brand, or category. {{appName}} fans out across 30+ retailers and ranks them by total delivered cost.',
            },
          )}
        </p>
      </header>

      <div
        className={cm.cn(
          cm.sp('p', 4),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm space-y-3',
        )}
      >
        <div className={cm.cn('relative')}>
          <span
            aria-hidden="true"
            className={cm.cn(
              'material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant',
            )}
          >
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-test="search-input"
            aria-label={t('search.queryLabel', {}, { defaultValue: 'Search query' })}
            placeholder={t(
              'search.queryHint',
              {},
              { defaultValue: 'Search products, brands, or categories…' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.sp('pl', 12),
              cm.sp('pr', 4),
              cm.sp('py', 4),
              cm.textSize('base'),
              'rounded-xl border-2 border-outline-variant/40 bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:bg-surface-container-lowest focus:outline-none transition-colors',
            )}
          />
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', wrap: 'wrap', gap: 'sm' }))}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              data-test={c === 'All' ? 'search-category-all' : `search-category-${c.toLowerCase()}`}
              data-search-category={c.toLowerCase()}
              aria-pressed={category === c}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'rounded-full uppercase tracking-wider transition-colors',
                category === c
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
              )}
            >
              {c}
            </button>
          ))}
          <label
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              'rounded-full bg-surface-container text-on-surface-variant text-xs font-bold uppercase tracking-wider',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
              attach_money
            </span>
            <span className={cm.cn('sr-only')}>
              {t('search.maxPriceLabel', {}, { defaultValue: 'Max price' })}
            </span>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              data-test="search-max-price"
              aria-label={t('search.maxPriceLabel', {}, { defaultValue: 'Max price' })}
              className={cm.cn('w-20 bg-transparent border-0 focus:outline-none tabular-nums')}
            />
          </label>
        </div>
      </div>

      <div
        className={cm.cn(
          cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'sm' }),
        )}
      >
        <p
          data-test="search-result-count"
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface-variant')}
        >
          {t(
            'search.resultCount',
            { count: filtered.length },
            { defaultValue: '{{count}} products found' },
          )}
        </p>
      </div>

      {errorMsg ? (
        <ErrorBanner message={errorMsg} onRetry={() => setBumpKey((k) => k + 1)} />
      ) : filtered.length === 0 ? (
        <div
          data-test="search-empty"
          className={cm.cn(
            cm.sp('p', 12),
            cm.textCenter,
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant',
          )}
        >
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined text-5xl text-on-surface-variant/40')}
          >
            search_off
          </span>
          <p className={cm.cn(cm.sp('mt', 4), cm.fontWeight('semibold'))}>
            {loading
              ? t('search.loading', {}, { defaultValue: 'Loading the catalog…' })
              : t('search.noResults', {}, { defaultValue: 'No products match your filters yet.' })}
          </p>
        </div>
      ) : (
        <div
          data-test="search-grid"
          className={cm.cn(
            cm.grid({ gap: 'md' }),
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
          )}
        >
          {filtered.map((p) => (
            <ProductPriceCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
