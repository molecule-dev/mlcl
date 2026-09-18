import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import CategoryAnnouncementBar from '../components/CategoryAnnouncementBar.js'
import CategoryPageHeader from '../components/CategoryPageHeader.js'
import CategoryTopNavBar from '../components/CategoryTopNavBar.js'

interface Product {
  id: string
  name: string
  description?: string
  price: number
  category: string
  thumbnails?: string[]
  images?: string[]
}

const CATEGORY_NORMALISATION: Record<string, string> = {
  electronics: 'Electronics',
  fashion: 'Fashion',
  'home-living': 'Home & Living',
  'home-and-living': 'Home & Living',
  sports: 'Sports',
  accessories: 'Accessories',
  sale: '',
  all: '',
  new: '',
}

function denormaliseSlug(slug: string | undefined): string {
  if (!slug) return ''
  const lower = decodeURIComponent(slug).toLowerCase()
  if (CATEGORY_NORMALISATION[lower] !== undefined) return CATEGORY_NORMALISATION[lower]
  return decodeURIComponent(slug)
    .replace(/-/g, ' & ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function CategoryPage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { slug } = useParams<{ slug: string }>()
  const http = useHttpClient()
  const navigate = useNavigate()

  const categoryName = useMemo(() => denormaliseSlug(slug), [slug])
  const isSale = (slug || '').toLowerCase() === 'sale'

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addedId, setAddedId] = useState<string | null>(null)
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false)
  const [newsletterSuccess, setNewsletterSuccess] = useState(false)
  const [sort, setSort] = useState<'created_at' | '-created_at' | 'price' | '-price'>('-created_at')

  useEffect(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    params.set('limit', '24')
    if (categoryName && !isSale) params.set('category', categoryName)
    params.set('sort', sort)
    http
      .get<{ data?: Product[] } | Product[]>(`/api/products?${params.toString()}`)
      .then((res) => {
        const body = (res as { data?: unknown })?.data ?? res
        const list = Array.isArray(body)
          ? (body as Product[])
          : ((body as { data?: Product[] })?.data ?? [])
        setProducts(Array.isArray(list) ? list : [])
      })
      .catch(() =>
        setError(t('categoryPage.loadError', {}, { defaultValue: 'Failed to load products' })),
      )
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, categoryName, isSale, sort]) // t is stable and intentionally omitted to avoid re-fetching on locale change

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100)

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
      if (status === 401) {
        navigate('/login')
      } else {
        setError(t('categoryPage.addToCartError', {}, { defaultValue: 'Failed to add to cart.' }))
      }
    } finally {
      setAddingId(null)
    }
  }

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newsletterEmail || newsletterSubmitting || newsletterSuccess) return
    setNewsletterSubmitting(true)
    try {
      await http.post('/api/newsletter', { email: newsletterEmail })
      setNewsletterSuccess(true)
      setNewsletterEmail('')
    } catch (_error) {
      // Newsletter subscription failure is silently ignored — form resets and user can retry
    } finally {
      setNewsletterSubmitting(false)
    }
  }

  const headingLabel =
    categoryName ||
    (isSale
      ? t('categoryPage.saleHeading', {}, { defaultValue: 'On Sale' })
      : t('categoryPage.allHeading', {}, { defaultValue: 'All Products' }))

  return (
    <div className={cm.cn(cm.surface, cm.textPrimary, 'font-body antialiased')}>
      <CategoryAnnouncementBar />
      <CategoryTopNavBar />
      <main className={cm.cn(cm.mxAuto, cm.sp('px', 6), 'pt-24 pb-20 max-w-[1280px]')}>
        {loading && (
          <p className={cm.cn('sr-only')} data-mol-id="category-loading">
            {t('categoryPage.loading', {}, { defaultValue: 'Loading products' })}
          </p>
        )}
        {error && (
          <p
            className={cm.cn(cm.sp('mb', 4), cm.textSize('sm'), 'text-error')}
            role="alert"
            data-mol-id="category-error"
          >
            {error}
          </p>
        )}
        <CategoryPageHeader name={headingLabel} count={products.length} />
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 4, align: 'center' }),
            cm.sp('mb', 4),
            'md:flex-row md:justify-end',
          )}
        >
          <label className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.textSize('sm'))}>
            {t('categoryPage.sortLabel', {}, { defaultValue: 'Sort by' })}
            <select
              data-mol-id="category-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className={cm.cn(
                cm.input(),
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-md border-border-secondary text-sm',
              )}
              aria-label={t('categoryPage.sortAria', {}, { defaultValue: 'Sort products' })}
            >
              <option value="-created_at">
                {t('categoryPage.sortNewest', {}, { defaultValue: 'Newest' })}
              </option>
              <option value="created_at">
                {t('categoryPage.sortOldest', {}, { defaultValue: 'Oldest' })}
              </option>
              <option value="price">
                {t('categoryPage.sortPriceAsc', {}, { defaultValue: 'Price: Low to High' })}
              </option>
              <option value="-price">
                {t('categoryPage.sortPriceDesc', {}, { defaultValue: 'Price: High to Low' })}
              </option>
            </select>
          </label>
        </div>
        {!loading && products.length === 0 && (
          <p
            data-mol-id="category-empty"
            className={cm.cn(cm.textCenter, cm.sp('py', 16), 'text-foreground-secondary')}
          >
            {t(
              'categoryPage.noProducts',
              {},
              { defaultValue: 'No products in this category yet.' },
            )}
          </p>
        )}
        <section className={cm.flex1}>
          <div
            className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2 lg:grid-cols-3')}
            data-mol-id="category-grid"
          >
            {products.map((product) => (
              <article
                key={product.id}
                data-mol-id={`category-card-${product.id}`}
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
                    <h3
                      className={cm.cn(cm.fontWeight('semibold'), cm.textSize('base'), 'truncate')}
                    >
                      {product.name}
                    </h3>
                    <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'))}>
                      {formatPrice(product.price)}
                    </p>
                  </div>
                </Link>
                <div className={cm.cn(cm.sp('p', 4), 'pt-0')}>
                  <button
                    type="button"
                    data-mol-id={`category-add-${product.id}`}
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
                      ? t('categoryPage.added', {}, { defaultValue: 'Added!' })
                      : addingId === product.id
                        ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
                        : t('categoryPage.addToCart', {}, { defaultValue: 'Add to Cart' })}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer
        className={cm.cn(
          cm.w('full'),
          cm.textPrimary,
          'bg-foreground mt-auto border-t border-slate-800',
        )}
      >
        <form
          onSubmit={handleNewsletterSubmit}
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 3 }),
            cm.sp('py', 8),
            cm.sp('px', 6),
            'max-w-[1280px] mx-auto md:flex-row md:justify-between',
          )}
          data-mol-id="newsletter-form"
        >
          <p className={cm.cn(cm.textSize('sm'), 'text-foreground-tertiary')}>
            {t('footer.newsletterCta', {}, { defaultValue: 'Get sale alerts in your inbox.' })}
          </p>
          <div className={cm.cn(cm.flex({ gap: 2 }))}>
            <input
              type="email"
              required
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder={t('footer.emailPlaceholder', {}, { defaultValue: 'Your email' })}
              className={cm.cn(
                cm.input(),
                cm.sp('px', 4),
                cm.sp('py', 2),
                'bg-foreground border-none rounded-lg text-white text-sm',
              )}
              data-mol-id="newsletter-email"
            />
            <button
              type="submit"
              data-mol-id="newsletter-submit"
              disabled={newsletterSubmitting || newsletterSuccess}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                'bg-primary hover:bg-primary-hover rounded-lg text-white text-sm disabled:opacity-60',
              )}
            >
              {newsletterSuccess
                ? t('footer.newsletterJoined', {}, { defaultValue: 'Joined!' })
                : t('footer.newsletterJoin', {}, { defaultValue: 'Join' })}
            </button>
          </div>
        </form>
        <div
          className={cm.cn(
            cm.sp('py', 6),
            cm.textCenter,
            cm.textSize('xs'),
            cm.textSubtle,
            'border-t border-slate-800',
          )}
        >
          {t(
            'footer.copyright',
            { year: new Date().getFullYear(), appName: APP_NAME },
            { defaultValue: '© {{year}} {{appName}}. All rights reserved.' },
          )}
        </div>
      </footer>
    </div>
  )
}

export default CategoryPage
export { CategoryPage, CategoryPage as CategoryPagePage }
