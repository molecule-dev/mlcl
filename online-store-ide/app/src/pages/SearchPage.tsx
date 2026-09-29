import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import SearchAnnouncementBar from '../components/SearchAnnouncementBar.js'
import SearchTopNavBar from '../components/SearchTopNavBar.js'
import StoreFooter from '../components/StoreFooter.js'

interface Product {
  id: string
  name: string
  description?: string
  price: number
  category: string
  thumbnails?: string[]
  images?: string[]
}

function SearchPage() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const initialQuery = params.get('q') ?? ''
  const [query, setQuery] = useState(initialQuery)
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addedId, setAddedId] = useState<string | null>(null)

  // Re-sync if URL ?q= changes externally (header search bar)
  useEffect(() => {
    const q = params.get('q') ?? ''
    if (q !== submittedQuery) {
      setSubmittedQuery(q)
      setQuery(q)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]) // submittedQuery intentionally omitted — comparing against it to detect URL changes only

  useEffect(() => {
    const q = submittedQuery.trim().toLowerCase()
    const browseAll = !q || q === 'all'
    const browseNew = q === 'new'
    if (browseAll) {
      setLoading(true)
      setError(null)
      http
        .get<{ data?: Product[] }>('/api/products?limit=24')
        .then((res) => {
          const body = (res as { data?: unknown })?.data ?? res
          const list = Array.isArray(body)
            ? (body as Product[])
            : ((body as { data?: Product[] })?.data ?? [])
          setProducts(Array.isArray(list) ? list : [])
        })
        .catch(() =>
          setError(t('search.loadError', {}, { defaultValue: 'Failed to load products' })),
        )
        .finally(() => setLoading(false))
      return
    }
    if (browseNew) {
      setLoading(true)
      setError(null)
      http
        .get<{ data?: Product[] }>('/api/storefront/new-arrivals?limit=24')
        .then((res) => {
          const body = (res as { data?: unknown })?.data ?? res
          const list = Array.isArray(body)
            ? (body as Product[])
            : ((body as { data?: Product[] })?.data ?? [])
          setProducts(Array.isArray(list) ? list : [])
        })
        .catch(() =>
          setError(t('search.loadError', {}, { defaultValue: 'Failed to load products' })),
        )
        .finally(() => setLoading(false))
      return
    }
    setLoading(true)
    setError(null)
    http
      .get<{ data?: Product[] } | Product[]>(
        `/api/storefront/search?q=${encodeURIComponent(submittedQuery)}&limit=24`,
      )
      .then((res) => {
        const body = (res as { data?: unknown })?.data ?? res
        // Search providers return `{ hits: [{ id, score, document: {...} }], ...}`.
        // Each hit's `document` is the actual product shape — flatten so the
        // page sees a `Product[]` (with name/price/category) rather than
        // raw hit envelopes.
        const rawHits = (body as { hits?: Array<Record<string, unknown>> })?.hits
        const data = (body as { data?: Product[] })?.data
        let list: Product[]
        if (Array.isArray(rawHits)) {
          list = rawHits.map((h) => {
            const doc = (h as { document?: Product })?.document
            return doc ?? (h as unknown as Product)
          })
        } else if (Array.isArray(data)) {
          list = data
        } else if (Array.isArray(body)) {
          list = body as Product[]
        } else {
          list = []
        }
        setProducts(list)
      })
      .catch(() => setError(t('search.error', {}, { defaultValue: 'Search failed' })))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submittedQuery, http]) // t is stable and intentionally omitted to avoid re-fetching on locale change

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmittedQuery(query)
    const next = new URLSearchParams(params)
    if (query) next.set('q', query)
    else next.delete('q')
    setParams(next, { replace: true })
  }

  async function handleAdd(product: Product) {
    setAddingId(product.id)
    setAddedId(null)
    try {
      await http.post('/api/cart/items', { productId: product.id, quantity: 1 })
      setAddedId(product.id)
      setTimeout(() => setAddedId(null), 2500)
    } catch (err) {
      const status =
        (err as { status?: number; response?: { status?: number } })?.status ??
        (err as { response?: { status?: number } })?.response?.status
      if (status === 401) navigate('/login')
      else setError(t('search.addToCartError', {}, { defaultValue: 'Failed to add to cart.' }))
    } finally {
      setAddingId(null)
    }
  }

  const headingText = useMemo(() => {
    const q = submittedQuery.trim().toLowerCase()
    if (!q || q === 'all') return t('search.allHeading', {}, { defaultValue: 'Browse Products' })
    if (q === 'new')
      return t(
        'search.newArrivalsHeading',
        { count: products.length },
        { defaultValue: 'New Arrivals ({{count}})' },
      )
    return t(
      'search.resultsForHeading',
      { query: submittedQuery, count: products.length },
      { defaultValue: 'Results for "{{query}}" ({{count}})' },
    )
  }, [submittedQuery, products.length, t])

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-surface-secondary text-foreground antialiased',
      )}
    >
      <SearchAnnouncementBar />
      <SearchTopNavBar />
      <main
        className={cm.cn(
          cm.flex1,
          cm.mxAuto,
          cm.sp('px', 6),
          cm.sp('py', 12),
          'pt-24 max-w-[1280px] w-full',
        )}
      >
        <form
          data-mol-id="search-form"
          onSubmit={handleSubmit}
          className={cm.cn(cm.flex({ gap: 2 }), cm.sp('mb', 6))}
        >
          <input
            type="search"
            data-mol-id="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.placeholder', {}, { defaultValue: 'Search products' })}
            className={cm.cn(
              cm.input(),
              cm.flex1,
              cm.sp('px', 4),
              cm.h(12),
              'rounded-md bg-surface border-border',
            )}
            aria-label={t('search.inputAria', {}, { defaultValue: 'Search products' })}
          />
          <button
            type="submit"
            data-mol-id="search-submit"
            className={cm.cn(
              cm.sp('px', 6),
              cm.h(12),
              cm.fontWeight('semibold'),
              'bg-primary text-white rounded-md hover:bg-primary-hover',
            )}
          >
            {t('common.search', {}, { defaultValue: 'Search' })}
          </button>
        </form>
        <h1
          data-mol-id="search-heading"
          className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}
        >
          {headingText}
        </h1>
        {loading && (
          <p data-mol-id="search-loading" className={cm.cn('sr-only')}>
            {t('search.loading', {}, { defaultValue: 'Searching' })}
          </p>
        )}
        {error && (
          <p
            data-mol-id="search-error"
            role="alert"
            className={cm.cn(cm.textSize('sm'), 'text-error')}
          >
            {error}
          </p>
        )}
        {!loading && products.length === 0 && (
          <p
            data-mol-id="search-empty"
            className={cm.cn(cm.textCenter, cm.sp('py', 12), 'text-foreground-secondary')}
          >
            {t('search.noResults', {}, { defaultValue: 'No products match your search.' })}
          </p>
        )}
        <div
          data-mol-id="search-grid"
          className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'sm:grid-cols-2 lg:grid-cols-3')}
        >
          {products.map((product) => (
            <article
              key={product.id}
              data-mol-id={`search-card-${product.id}`}
              className={cm.cn('bg-surface rounded-xl shadow-sm overflow-hidden flex flex-col')}
            >
              <Link to={`/product/${product.id}`} className={cm.cn('block')}>
                <div className={cm.cn('aspect-square bg-surface-secondary overflow-hidden')}>
                  <img
                    alt={product.name}
                    src={
                      product.thumbnails?.[0] ||
                      product.images?.[0] ||
                      `https://picsum.photos/seed/${product.id}/400/400`
                    }
                    className={cm.cn('w-full h-full object-cover')}
                  />
                </div>
                <div className={cm.cn(cm.sp('p', 4), cm.stack(2))}>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      'uppercase tracking-wide text-foreground-secondary',
                    )}
                  >
                    {product.category}
                  </p>
                  <h3 className={cm.cn(cm.fontWeight('semibold'), 'truncate')}>{product.name}</h3>
                  <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'))}>
                    {formatPrice(product.price)}
                  </p>
                </div>
              </Link>
              <div className={cm.cn(cm.sp('p', 4), 'pt-0')}>
                <button
                  type="button"
                  data-mol-id={`search-add-${product.id}`}
                  onClick={() => handleAdd(product)}
                  disabled={addingId === product.id}
                  className={cm.cn(
                    cm.w('full'),
                    cm.fontWeight('semibold'),
                    cm.sp('py', 2),
                    'bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-60',
                  )}
                >
                  {addedId === product.id
                    ? t('search.added', {}, { defaultValue: 'Added!' })
                    : addingId === product.id
                      ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
                      : t('search.addToCart', {}, { defaultValue: 'Add to Cart' })}
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>
      <StoreFooter />
    </div>
  )
}

export default SearchPage
export { SearchPage, SearchPage as SearchPagePage }
