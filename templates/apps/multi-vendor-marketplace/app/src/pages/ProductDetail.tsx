import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { type VendryProduct, VendryProductCard } from '../components/VendryProductCard.js'
import {
  type ApiProduct,
  dollarsToCents,
  firstImageUrl,
  productFromApi,
} from '../utils/marketplaceApi.js'

interface ApiReview {
  id: string
  rating: number
  title?: string
  body?: string
  user_id?: string
  created_at?: string
}

interface VendorSummary {
  id?: string
  name?: string
  slug?: string
  featured?: boolean
}

const COLORS = [
  { name: 'Sienna', hex: '#d95030' },
  { name: 'Olive', hex: '#5d6843' },
  { name: 'Bone', hex: '#e8e2d6' },
  { name: 'Indigo', hex: '#33415c' },
] as const

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function ProductDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [product, setProduct] = useState<(ApiProduct & { vendor?: VendorSummary }) | null>(null)
  const [related, setRelated] = useState<VendryProduct[]>([])
  const [reviews, setReviews] = useState<ApiReview[]>([])
  const [activeImage, setActiveImage] = useState(0)
  const [activeColor, setActiveColor] = useState<string>(COLORS[0].name)
  const [quantity, setQuantity] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(
    null,
  )
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!id) return
    setLoadError(null)
    // Try uuid lookup first; fall back to slug lookup so URLs from the
    // landing page (which currently include slugs) keep working.
    const unwrap = (res: unknown): (ApiProduct & { vendor?: VendorSummary }) | null => {
      const raw = (res as { data?: unknown })?.data ?? res
      const body = (
        raw &&
        typeof raw === 'object' &&
        'data' in (raw as Record<string, unknown>) &&
        (raw as { id?: unknown }).id === undefined
          ? (raw as { data?: ApiProduct & { vendor?: VendorSummary } }).data
          : (raw as ApiProduct & { vendor?: VendorSummary })
      ) as (ApiProduct & { vendor?: VendorSummary }) | undefined
      return body && body.id ? body : null
    }
    const fetchProduct = async (): Promise<(ApiProduct & { vendor?: VendorSummary }) | null> => {
      try {
        const res = await http.get<ApiProduct | { data?: ApiProduct }>(
          `/api/products/${encodeURIComponent(id)}`,
        )
        const found = unwrap(res)
        if (found) return found
      } catch (_error) {
        // fall through to slug-based lookup on primary-endpoint failure
      }
      try {
        const res = await http.get<ApiProduct | { data?: ApiProduct }>(
          `/api/storefront/products/by-slug/${encodeURIComponent(id)}`,
        )
        const found = unwrap(res)
        if (found) return found
      } catch (_error) {
        // fall through — fetchProduct returns null, caller shows "not found"
      }
      return null
    }
    fetchProduct().then((p) => {
      if (cancelled) return
      if (!p) {
        setLoadError(t('productDetail.notFound', {}, { defaultValue: 'Product not found.' }))
        setProduct(null)
        return
      }
      setProduct(p)
      setActiveImage(0)
      // related: more products from the same vendor
      const vendorId = p.vendor_id ?? p.vendor?.id
      if (vendorId) {
        http
          .get<{ data?: ApiProduct[] }>(
            `/api/products?vendor=${encodeURIComponent(vendorId)}&limit=8`,
          )
          .then((res) => {
            const body = (res as { data?: { data?: ApiProduct[] } }).data
            const arr = Array.isArray(body) ? body : (body?.data ?? [])
            const filtered = arr.filter((r) => r.id !== p.id).slice(0, 4)
            setRelated(filtered.map(productFromApi))
          })
          .catch(() => setRelated([]))
      }
      http
        .get<{ data?: ApiReview[] }>(`/api/reviews/product/${encodeURIComponent(p.id)}`)
        .then((res) => {
          const body = (res as { data?: { data?: ApiReview[] } }).data
          const arr = Array.isArray(body) ? body : (body?.data ?? [])
          setReviews(arr)
        })
        .catch(() => setReviews([]))
    })
    return () => {
      cancelled = true
    }
  }, [id, http, t])

  const productName =
    product?.name ?? t('productDetail.loading', {}, { defaultValue: 'Loading product…' })
  const vendorName = product?.vendor?.name ?? product?.vendor_name ?? ''
  const vendorSlug = product?.vendor?.slug ?? product?.vendor_slug ?? ''
  const vendorVerified = !!(product?.vendor?.featured ?? product?.vendor_verified)
  const description = product?.description ?? ''
  const priceCents = dollarsToCents(product?.price)
  const ratingValue = product?.rating != null ? Number(product.rating) : null
  const reviewCount = product?.review_count ?? reviews.length

  const images = useMemo(() => {
    if (!product) return [] as string[]
    if (Array.isArray(product.images)) return product.images.map(String)
    if (typeof product.images === 'string') {
      try {
        const parsed = JSON.parse(product.images)
        if (Array.isArray(parsed)) return parsed.map(String)
      } catch (_error) {
        // not valid JSON — treat the raw string as a single image URL
        if (product.images) return [product.images]
      }
    }
    return [
      `https://picsum.photos/seed/vendry-product-${product.id}-0/800/1000`,
      `https://picsum.photos/seed/vendry-product-${product.id}-1/800/1000`,
    ]
  }, [product])

  const galleryFallbackImage = firstImageUrl(product?.images)
  const heroImage =
    images[activeImage] ??
    galleryFallbackImage ??
    `https://picsum.photos/seed/vendry-product-${id}/800/1000`

  async function handleAddToCart() {
    if (!product) return
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/products/${product.id}` } } })
      return
    }
    setSubmitting(true)
    setFeedback(null)
    try {
      await http.post('/api/cart', {
        product_id: product.id,
        quantity,
        variant_id: activeColor.toLowerCase(),
      })
      track({
        name: 'cart.item_added',
        properties: { product_id: product.id, quantity },
      })
      setFeedback({
        kind: 'success',
        message: t(
          'productDetail.addToCartSuccess',
          { name: product.name },
          { defaultValue: '“{{name}}” added to your cart.' },
        ),
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t('productDetail.addToCartError', {}, { defaultValue: 'Could not add to cart.' })
      setFeedback({ kind: 'error', message })
    } finally {
      setSubmitting(false)
    }
  }

  if (loadError) {
    return (
      <div className={cm.cn(cm.maxW('full'), cm.mxAuto, cm.sp('p', 8), 'max-w-[800px]')}>
        <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface text-xl')}>{loadError}</p>
        <Link
          to="/catalog"
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.sp('mt', 4),
            cm.roundedFull,
            'inline-block bg-primary text-on-primary hover:bg-primary-dark transition-colors',
          )}
        >
          {t('productDetail.backToCatalog', {}, { defaultValue: 'Back to catalog' })}
        </Link>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.maxW('full'), cm.mxAuto, cm.sp('p', 8), 'max-w-[1400px] space-y-12')}>
      {/* Breadcrumb */}
      <nav
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('sm'),
          'text-on-surface-variant',
        )}
      >
        <Link to="/catalog" className={'hover:text-primary'}>
          {t('productDetail.breadcrumbCatalog', {}, { defaultValue: 'Catalog' })}
        </Link>
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }} aria-hidden>
          chevron_right
        </span>
        {product?.category && (
          <>
            <Link to={`/catalog?category=${product.category}`} className={'hover:text-primary'}>
              {product.category}
            </Link>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }} aria-hidden>
              chevron_right
            </span>
          </>
        )}
        <span className="text-on-surface">{productName}</span>
      </nav>

      <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'lg:grid-cols-[1.1fr_1fr]')}>
        {/* Gallery */}
        <div className={cm.cn(cm.stack(4))}>
          <div
            className={'relative aspect-[4/5] overflow-hidden rounded-3xl bg-surface-container-low'}
          >
            <img
              src={heroImage}
              alt={productName}
              className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
            />
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.roundedFull,
                'absolute left-4 top-4 uppercase tracking-widest bg-primary text-on-primary',
              )}
            >
              {t('productDetail.featuredBadge', {}, { defaultValue: 'Featured maker' })}
            </span>
          </div>
          <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
            {images.map((src, idx) => (
              <button
                key={src + idx}
                type="button"
                onClick={() => setActiveImage(idx)}
                className={cm.cn(
                  'h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-colors',
                  idx === activeImage
                    ? 'border-primary'
                    : 'border-outline-variant hover:border-primary/40',
                )}
                aria-label={t(
                  'productDetail.galleryThumbAria',
                  { index: idx + 1 },
                  { defaultValue: 'Show image {{index}}' },
                )}
              >
                <img
                  src={src}
                  alt=""
                  className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Info column */}
        <div className={cm.cn(cm.stack(5))}>
          <div className={cm.cn(cm.stack(2))}>
            {vendorName && (
              <Link
                to={vendorSlug ? `/vendors/${vendorSlug}` : '/catalog'}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'text-sky-700 dark:text-info hover:underline',
                )}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}
                  aria-hidden
                >
                  storefront
                </span>
                {vendorName}
                {vendorVerified && (
                  <span
                    className="material-symbols-outlined text-secondary"
                    style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}
                    aria-label={t(
                      'productDetail.verifiedAria',
                      {},
                      { defaultValue: 'Verified vendor' },
                    )}
                  >
                    verified
                  </span>
                )}
              </Link>
            )}
            <h1
              data-testid="product-name"
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-4xl md:text-5xl tracking-tight font-extrabold text-on-surface leading-tight',
              )}
            >
              {productName}
            </h1>
            {ratingValue != null && (
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                <div className={cm.cn(cm.flex({ align: 'center' }))}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={cm.cn(
                        i < Math.round(ratingValue) ? 'text-warning' : 'text-on-surface-variant',
                        'material-symbols-outlined',
                      )}
                      style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
                      aria-hidden
                    >
                      star
                    </span>
                  ))}
                </div>
                <span
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}
                >
                  {ratingValue.toFixed(1)}
                </span>
                <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  (
                  {t(
                    'common.countReviews',
                    { count: reviewCount },
                    { defaultValue: '{{count}} reviews' },
                  )}
                  )
                </span>
              </div>
            )}
          </div>

          <p
            data-testid="product-price"
            className={cm.cn(cm.fontWeight('bold'), 'text-3xl text-on-surface tabular-nums')}
          >
            {formatCents(priceCents)}
          </p>

          <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant leading-relaxed')}>
            {description ||
              t(
                'productDetail.description',
                { appName: APP_NAME },
                {
                  defaultValue: 'Made by an independent maker on {{appName}}.',
                },
              )}
          </p>

          {/* Color picker */}
          <div className={cm.cn(cm.stack(2))}>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
              {t(
                'productDetail.colorLabel',
                { name: activeColor },
                { defaultValue: 'Color · {{name}}' },
              )}
            </p>
            <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
              {COLORS.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setActiveColor(color.name)}
                  aria-label={color.name}
                  aria-pressed={activeColor === color.name}
                  className={cm.cn(
                    'h-10 w-10 rounded-full transition-all border-2',
                    activeColor === color.name
                      ? 'border-primary scale-110'
                      : 'border-outline-variant',
                  )}
                  style={{ backgroundColor: color.hex }}
                />
              ))}
            </div>
          </div>

          {/* Qty + Add to cart */}
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                'rounded-full border border-outline-variant',
              )}
            >
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'text-on-surface-variant hover:text-primary',
                )}
                aria-label={t(
                  'productDetail.decreaseAria',
                  {},
                  { defaultValue: 'Decrease quantity' },
                )}
              >
                <span className="material-symbols-outlined" aria-hidden>
                  remove
                </span>
              </button>
              <span
                data-testid="quantity"
                className={cm.cn(cm.fontWeight('bold'), 'tabular-nums w-6 text-center')}
              >
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'text-on-surface-variant hover:text-primary',
                )}
                aria-label={t(
                  'productDetail.increaseAria',
                  {},
                  { defaultValue: 'Increase quantity' },
                )}
              >
                <span className="material-symbols-outlined" aria-hidden>
                  add
                </span>
              </button>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!product || submitting}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('bold'),
                cm.sp('px', 8),
                cm.sp('py', 4),
                cm.roundedFull,
                'flex-1 justify-center bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-md shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed',
              )}
            >
              <span className="material-symbols-outlined" aria-hidden>
                add_shopping_cart
              </span>
              {submitting
                ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
                : t('productDetail.addToCart', {}, { defaultValue: 'Add to cart' })}
            </button>
          </div>
          {feedback && (
            <p
              role="status"
              className={cm.cn(
                cm.textSize('sm'),
                'rounded-xl border px-4 py-2',
                feedback.kind === 'success'
                  ? 'border-success/30 bg-success/10 text-success'
                  : 'border-error/30 bg-error/10 text-error',
              )}
            >
              {feedback.message}
            </p>
          )}

          {/* Trust strip */}
          <div
            className={cm.cn(
              cm.grid({ cols: 3, gap: 'sm' }),
              cm.sp('pt', 4),
              'border-t border-outline-variant',
            )}
          >
            {[
              {
                icon: 'local_shipping',
                label: t('productDetail.trust.shipping', {}, { defaultValue: 'Ships in 2 days' }),
              },
              {
                icon: 'shield',
                label: t(
                  'productDetail.trust.protection',
                  { appName: APP_NAME },
                  { defaultValue: '{{appName}} protection' },
                ),
              },
              {
                icon: 'autorenew',
                label: t('productDetail.trust.returns', {}, { defaultValue: '30-day returns' }),
              },
            ].map((trust) => (
              <div
                key={trust.label}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                )}
              >
                <span
                  className="material-symbols-outlined text-secondary"
                  style={{ fontSize: '20px' }}
                  aria-hidden
                >
                  {trust.icon}
                </span>
                <span>{trust.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className={cm.cn(cm.stack(4))}>
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-2xl tracking-tight font-extrabold text-on-surface',
            )}
          >
            {t('productDetail.reviewsTitle', {}, { defaultValue: 'What shoppers said' })}
          </h2>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-3')}>
            {reviews.slice(0, 6).map((review) => (
              <article
                key={review.id}
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl border border-outline-variant bg-surface-container-low',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mb', 2))}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={cm.cn(
                        i < Number(review.rating) ? 'text-warning' : 'text-on-surface-variant',
                        'material-symbols-outlined',
                      )}
                      style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
                      aria-hidden
                    >
                      star
                    </span>
                  ))}
                </div>
                {review.title && (
                  <p className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 1), 'text-on-surface')}>
                    {review.title}
                  </p>
                )}
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {review.body}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Related products */}
      {related.length > 0 && (
        <section className={cm.cn(cm.stack(4))}>
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-2xl tracking-tight font-extrabold text-on-surface',
            )}
          >
            {t('productDetail.relatedTitle', {}, { defaultValue: 'More from this maker' })}
          </h2>
          <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }), 'md:grid-cols-4')}>
            {related.map((p) => (
              <VendryProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default ProductDetail
