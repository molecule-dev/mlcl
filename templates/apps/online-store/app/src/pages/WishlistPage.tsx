import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import StoreFooter from '../components/StoreFooter.js'
import WishlistPageHeader from '../components/WishlistPageHeader.js'
import WishlistTopNavBar from '../components/WishlistTopNavBar.js'
import { unpackListPayload } from '../utils/httpUnpack.js'

interface WishlistItem {
  id: string
  product_id: string
  name: string
  /** Amount in USD cents when finite (same convention as cart lines). */
  price: number
  thumbnails: string[]
  category: string
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock'
  stockCount?: number
}

/** Minor units — integers are cents (see CartItem); decimals are dollar amounts. */
function extractPriceCents(row: Record<string, unknown>, product: Record<string, unknown>): number {
  const raw =
    row.price ??
    row.price_cents ??
    row.unit_price ??
    product.price ??
    product.sale_price ??
    product.price_cents
  if (raw === undefined || raw === null) return NaN
  const num = typeof raw === 'number' ? raw : Number(String(raw).replace(/[^0-9.-]/g, ''))
  if (!Number.isFinite(num)) return NaN
  if (!Number.isInteger(num)) return Math.round(num * 100)
  return Math.round(num)
}

function normalizeWishlistItem(raw: Record<string, unknown>, index: number): WishlistItem {
  const product =
    raw.product && typeof raw.product === 'object' && !Array.isArray(raw.product)
      ? (raw.product as Record<string, unknown>)
      : {}
  const id = String(raw.id ?? raw.uuid ?? `wishlist-${index}`)
  const product_id = String(raw.product_id ?? raw.productId ?? product.id ?? id)
  const nameCandidates = [
    raw.name,
    raw.product_name,
    raw.title,
    product.name,
    product.title,
  ].filter((v): v is string => typeof v === 'string')
  const name = nameCandidates.find((s) => s.trim())?.trim() ?? ''
  const stockRaw =
    raw.stockStatus ?? raw.stock_status ?? product.stock_status ?? product.stockStatus
  let stockStatus: WishlistItem['stockStatus']
  if (stockRaw === 'in_stock' || stockRaw === 'low_stock' || stockRaw === 'out_of_stock')
    stockStatus = stockRaw
  const stockCount =
    typeof raw.stockCount === 'number'
      ? raw.stockCount
      : typeof product.stockCount === 'number'
        ? product.stockCount
        : typeof product.stock_count === 'number'
          ? product.stock_count
          : undefined
  let thumbnails: string[] = []
  if (Array.isArray(raw.thumbnails)) thumbnails = raw.thumbnails as string[]
  else if (Array.isArray(product.thumbnails)) thumbnails = product.thumbnails as string[]
  else if (Array.isArray(product.images)) thumbnails = product.images as string[]
  const category =
    typeof raw.category === 'string'
      ? raw.category
      : typeof product.category === 'string'
        ? product.category
        : ''

  return {
    id,
    product_id,
    name,
    price: extractPriceCents(raw, product),
    thumbnails,
    category,
    stockStatus,
    stockCount,
  }
}

function WishlistPage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addedId, setAddedId] = useState<string | null>(null)

  const fetchWishlist = useCallback(() => {
    setLoading(true)
    setError(null)
    http
      .get<{ data: WishlistItem[] } | WishlistItem[]>('/api/wishlist')
      .then((res) => {
        const list = unpackListPayload(res).map((row, i) =>
          normalizeWishlistItem(row as Record<string, unknown>, i),
        )
        setItems(list)
      })
      .catch(() =>
        setError(t('wishlistPage.loadError', {}, { defaultValue: 'Failed to load wishlist' })),
      )
      .finally(() => setLoading(false))
  }, [http, t])

  useEffect(() => {
    fetchWishlist()
  }, [fetchWishlist])

  const removeItem = async (id: string) => {
    setActionError(null)
    try {
      await http.delete(`/api/wishlist/${id}`)
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch (_error) {
      // Removal failed — the item stays visible; surface a retryable message
      setActionError(
        t('wishlistPage.removeError', {}, { defaultValue: 'Could not remove item. Try again.' }),
      )
    }
  }

  const addToCart = async (productId: string) => {
    setActionError(null)
    setAddingId(productId)
    setAddedId(null)
    try {
      await http.post('/api/cart/items', { productId, quantity: 1 })
      setAddedId(productId)
      setTimeout(() => setAddedId(null), 2500)
    } catch (_error) {
      // Add-to-cart failed — surface a retryable message instead of failing silently
      setActionError(
        t('wishlistPage.addToCartError', {}, { defaultValue: 'Failed to add to cart.' }),
      )
    } finally {
      setAddingId(null)
    }
  }

  const formatPrice = (cents: number) => {
    if (!Number.isFinite(cents)) return '—'
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(
      cents / 100,
    )
  }

  return (
    <div className={cm.cn('bg-surface-secondary text-text-primary antialiased')}>
      <WishlistTopNavBar />
      <main className={cm.cn(cm.sp('px', 8), cm.mxAuto, 'pt-28 pb-20 max-w-[1280px] min-h-screen')}>
        <WishlistPageHeader itemCount={items.length} loading={loading} error={error} />
        {actionError && (
          <p
            className={cm.cn(cm.sp('mb', 4), cm.textSize('sm'), 'text-error')}
            role="alert"
            data-mol-id="wishlist-action-error"
          >
            {actionError}
          </p>
        )}
        {loading ? (
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 4 }),
              cm.sp('py', 16),
              'min-h-[40vh]',
            )}
          >
            <div
              className={cm.cn(
                cm.w(10),
                cm.h(10),
                cm.roundedFull,
                'border-4 border-primary border-t-transparent animate-spin',
              )}
            />
            <p className={cm.cn('text-foreground-secondary')}>
              {t('wishlistPage.loading', {}, { defaultValue: 'Loading your wishlist...' })}
            </p>
          </div>
        ) : error || items.length === 0 ? (
          <div className={cm.cn(cm.textCenter, cm.sp('py', 16), cm.sp('px', 8))}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(16),
                cm.h(16),
                cm.mxAuto,
                cm.sp('mb', 6),
                cm.roundedFull,
                'bg-surface-secondary text-foreground-tertiary',
              )}
            >
              <svg
                width={32}
                height={32}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
                />
              </svg>
            </div>
            <h3
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('semibold'),
                cm.sp('mb', 3),
                'text-[var(--mol-color-secondary)]',
              )}
            >
              {error
                ? t('wishlistPage.errorHeading', {}, { defaultValue: 'Could not load wishlist' })
                : t('wishlistPage.emptyHeading', {}, { defaultValue: 'Your wishlist is empty' })}
            </h3>
            <p
              className={cm.cn(
                cm.maxW('sm'),
                cm.mxAuto,
                cm.sp('mb', 6),
                'text-foreground-secondary',
              )}
            >
              {error ||
                t(
                  'wishlistPage.emptyDescription',
                  {},
                  {
                    defaultValue:
                      'Browse our products and save your favorites here for easy access later.',
                  },
                )}
            </p>
            {error ? (
              <button
                onClick={fetchWishlist}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.fontWeight('semibold'),
                  'py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors',
                )}
              >
                {t('common.tryAgain', {}, { defaultValue: 'Try Again' })}
              </button>
            ) : (
              <Link
                to="/"
                className={cm.cn(
                  'inline-flex items-center justify-center px-5 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary-hover transition-colors',
                )}
              >
                {t('wishlistPage.browseProducts', {}, { defaultValue: 'Browse Products' })}
              </Link>
            )}
          </div>
        ) : (
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}
          >
            {items.map((item) => {
              const isOutOfStock = item.stockStatus === 'out_of_stock'
              const isLowStock = item.stockStatus === 'low_stock'
              const thumbnail =
                item.thumbnails?.[0] ?? `https://picsum.photos/seed/${item.id}/400/400`
              return (
                <article
                  key={item.id}
                  className={cm.cn(
                    cm.flex({ direction: 'col' }),
                    'bg-surface rounded-xl shadow-sm group',
                    isOutOfStock ? 'opacity-80' : 'hover:shadow-md transition-shadow',
                  )}
                  data-mol-id={`wishlist-card-${item.id}`}
                >
                  <div
                    className={cm.cn(
                      'relative aspect-square overflow-hidden rounded-t-xl',
                      isOutOfStock && 'grayscale-[0.3]',
                    )}
                  >
                    <img
                      alt={item.name}
                      className={cm.cn(
                        cm.w('full'),
                        cm.h('full'),
                        'object-cover',
                        !isOutOfStock && 'group-hover:scale-105 transition-transform duration-500',
                      )}
                      src={thumbnail}
                    />
                    <button
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.w(10),
                        cm.h(10),
                        cm.roundedFull,
                        'absolute top-4 right-4 bg-surface/90 backdrop-blur-sm text-[var(--color-wishlist-heart)] shadow-sm',
                      )}
                      onClick={(e) => {
                        e.preventDefault()
                        removeItem(item.id)
                      }}
                      aria-label={t(
                        'wishlistPage.removeAriaLabel',
                        {},
                        { defaultValue: 'Remove from wishlist' },
                      )}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined')}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        favorite
                      </span>
                    </button>
                    {isOutOfStock && (
                      <div
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'center' }),
                          'absolute inset-0 bg-surface/20 pointer-events-none',
                        )}
                      >
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            cm.sp('px', 3),
                            cm.roundedFull,
                            'bg-foreground/80 text-white py-1.5',
                          )}
                        >
                          {t(
                            'wishlistPage.temporarilyUnavailable',
                            {},
                            { defaultValue: 'Temporarily Unavailable' },
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={cm.cn(cm.sp('p', 6), cm.flex({ direction: 'col' }), 'flex-grow')}>
                    <div
                      className={cm.cn(
                        cm.flex({ justify: 'between', align: 'start' }),
                        cm.sp('mb', 2),
                      )}
                    >
                      <h3
                        className={cm.cn(
                          cm.fontWeight('bold'),
                          cm.textSize('lg'),
                          isOutOfStock
                            ? 'text-foreground-tertiary'
                            : 'text-[var(--mol-color-secondary)]',
                        )}
                      >
                        {item.name ||
                          t('wishlistPage.fallbackProductName', {}, { defaultValue: 'Saved item' })}
                      </h3>
                      {isOutOfStock ? (
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            cm.sp('px', 2),
                            cm.sp('py', 1),
                            cm.roundedFull,
                            'bg-surface-secondary text-foreground-secondary',
                          )}
                        >
                          {t('wishlistPage.outOfStock', {}, { defaultValue: 'Out of Stock' })}
                        </span>
                      ) : isLowStock ? (
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            cm.sp('px', 2),
                            cm.sp('py', 1),
                            cm.roundedFull,
                            'bg-warning-light text-warning',
                          )}
                        >
                          {t(
                            'wishlistPage.lowStock',
                            { count: item.stockCount ?? 3 },
                            { defaultValue: 'Low Stock - {{count}} left' },
                          )}
                        </span>
                      ) : (
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            cm.sp('px', 2),
                            cm.sp('py', 1),
                            cm.roundedFull,
                            'bg-success-light text-success',
                          )}
                        >
                          {t('wishlistPage.inStock', {}, { defaultValue: 'In Stock' })}
                        </span>
                      )}
                    </div>
                    <p
                      className={cm.cn(
                        cm.textSize('xl'),
                        cm.fontWeight('bold'),
                        cm.sp('mb', 6),
                        `tabular-nums ${isOutOfStock ? 'text-gray-400' : 'text-foreground'}`,
                      )}
                    >
                      {formatPrice(item.price)}
                    </p>
                    <div className={cm.cn(cm.stack(4), 'mt-auto')}>
                      {isOutOfStock ? (
                        <button
                          className={cm.cn(
                            cm.sp('py', 3),
                            cm.fontWeight('semibold'),
                            cm.w('full'),
                            'bg-border-secondary text-foreground-secondary rounded-lg cursor-not-allowed',
                          )}
                          disabled
                        >
                          {t('wishlistPage.outOfStock', {}, { defaultValue: 'Out of Stock' })}
                        </button>
                      ) : (
                        <button
                          className={cm.cn(
                            cm.sp('py', 3),
                            cm.fontWeight('semibold'),
                            cm.w('full'),
                            'bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors active:scale-[0.98] disabled:opacity-60',
                          )}
                          onClick={() => addToCart(item.product_id)}
                          disabled={addingId === item.product_id}
                        >
                          {addedId === item.product_id
                            ? t('wishlistPage.addedToCart', {}, { defaultValue: 'Added!' })
                            : addingId === item.product_id
                              ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
                              : t('wishlistPage.addToCart', {}, { defaultValue: 'Add to Cart' })}
                        </button>
                      )}
                      <button
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('medium'),
                          cm.w('full'),
                          'text-foreground-tertiary hover:text-error underline transition-colors',
                        )}
                        onClick={() => removeItem(item.id)}
                      >
                        {t(
                          'wishlistPage.removeFromWishlist',
                          {},
                          { defaultValue: 'Remove from Wishlist' },
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>
      <StoreFooter />
    </div>
  )
}

export default WishlistPage
export { WishlistPage, WishlistPage as WishlistPagePage }
