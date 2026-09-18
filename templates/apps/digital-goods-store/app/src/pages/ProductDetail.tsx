import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'
import { addToCart } from '../lib/cart.js'

interface ApiProduct {
  id: string
  slug: string
  name: string
  description?: string
  price_cents: number
  original_price_cents?: number
  pricing_model?: 'free' | 'paid' | 'pwyw'
  file_type?: string
  cover_image?: string
  total_sales?: number
  category?: string
  rating?: number
  creator?: string
  updated_at?: string
}

function unwrapProduct(res: unknown): ApiProduct | null {
  if (!res || typeof res !== 'object') return null
  if ('data' in res) {
    const inner = (res as { data: unknown }).data
    if (inner && typeof inner === 'object') return inner as ApiProduct
  }
  return res as ApiProduct
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100)
}

export function ProductDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const [product, setProduct] = useState<ApiProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setErrorMsg(null)
    http
      .get(`/api/products/${encodeURIComponent(slug)}`)
      .then((res) => setProduct(unwrapProduct(res)))
      .catch(() => setProduct(null))
      .finally(() => setLoading(false))
  }, [http, slug])

  const handleAddToCart = (goToCheckout: boolean) => {
    if (!product || acting) return
    setActing(true)
    setErrorMsg(null)
    try {
      addToCart({
        productId: product.id,
        productSlug: product.slug,
        name: product.name,
        coverImage: product.cover_image ?? null,
        fileType: product.file_type ?? null,
        priceCents: product.price_cents,
        originalPriceCents: product.original_price_cents,
        quantity: 1,
      })
      navigate(goToCheckout ? '/checkout' : '/cart')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
    } finally {
      setActing(false)
    }
  }

  return (
    <div className={cm.cn(cm.page, cm.flex({ direction: 'col' }), 'min-h-screen')}>
      <Header />
      <main className={cm.cn(cm.mxAuto, cm.sp('px', 6), cm.sp('py', 10), 'w-full max-w-[1200px]')}>
        <nav
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('sm'),
            cm.sp('mb', 6),
            'text-on-surface-variant',
          )}
        >
          <Link to="/shop" className={cm.cn('hover:text-primary')}>
            {t('productDetail.crumb.shop', {}, { defaultValue: 'Storefront' })}
          </Link>
          <span>/</span>
          <span className={cm.cn('text-on-surface')}>{product?.name ?? '…'}</span>
        </nav>

        {loading ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : !product ? (
          <div className={cm.cn(cm.sp('py', 16), 'text-center')}>
            <span
              className="material-symbols-outlined text-on-surface-variant"
              style={{ fontSize: 56 }}
            >
              search_off
            </span>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('semibold'),
                cm.sp('mt', 4),
                'text-on-surface',
              )}
            >
              {t('product.notFound', {}, { defaultValue: 'Product not found' })}
            </p>
            <Link
              to="/shop"
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.sp('mt', 6),
                cm.fontWeight('bold'),
                'inline-flex items-center gap-2 bg-primary text-on-primary rounded-xl hover:bg-primary-hover transition-colors',
              )}
            >
              {t('cart.browse', {}, { defaultValue: 'Browse the storefront' })}
            </Link>
          </div>
        ) : (
          <div className={cm.cn(cm.grid({ gap: 'xl' }), 'grid-cols-1 lg:grid-cols-5')}>
            <div className={cm.cn('lg:col-span-3')}>
              <div
                className={cm.cn('rounded-3xl overflow-hidden bg-bg-secondary shadow-sm')}
                style={{ aspectRatio: '16 / 10' }}
              >
                {product.cover_image ? (
                  <img
                    src={product.cover_image}
                    alt={product.name}
                    className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
                  />
                ) : (
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w('full'),
                      cm.h('full'),
                      'bg-gradient-to-br from-primary-light to-accent-light',
                    )}
                  >
                    <span
                      className="material-symbols-outlined text-primary"
                      style={{ fontSize: 96 }}
                    >
                      inventory_2
                    </span>
                  </div>
                )}
              </div>

              <article className={cm.cn(cm.sp('mt', 8))}>
                <h2
                  className={cm.cn(
                    cm.textSize('xl'),
                    cm.fontWeight('bold'),
                    cm.sp('mb', 4),
                    'text-on-surface',
                  )}
                >
                  {t('productDetail.aboutTitle', {}, { defaultValue: 'About this product' })}
                </h2>
                <p
                  className={cm.cn(cm.textSize('base'), 'text-on-surface-variant leading-relaxed')}
                >
                  {product.description ??
                    t(
                      'productDetail.aboutFallback',
                      { appName: APP_NAME },
                      {
                        defaultValue:
                          'A digital product crafted by an indie creator on {{appName}}.',
                      },
                    )}
                </p>
                <div
                  className={cm.cn(
                    cm.grid({ gap: 'md' }),
                    cm.sp('mt', 6),
                    'grid-cols-1 sm:grid-cols-2',
                  )}
                >
                  {[
                    {
                      icon: 'description',
                      label: t('form.format', {}, { defaultValue: 'Format' }),
                      value: product.file_type ?? '—',
                    },
                    {
                      icon: 'category',
                      label: t('form.category', {}, { defaultValue: 'Category' }),
                      value: product.category ?? '—',
                    },
                    {
                      icon: 'star',
                      label: t('form.rating', {}, { defaultValue: 'Rating' }),
                      value: product.rating ? product.rating.toFixed(1) + ' / 5' : '—',
                    },
                    {
                      icon: 'shopping_cart',
                      label: t('productDetail.spec.sales', {}, { defaultValue: 'Total sales' }),
                      value: product.total_sales?.toLocaleString() ?? '0',
                    },
                  ].map((spec) => (
                    <div
                      key={spec.icon}
                      className={cm.cn(
                        cm.sp('p', 4),
                        cm.flex({ align: 'center', gap: 'sm' }),
                        'rounded-xl bg-surface-container-lowest border border-border',
                      )}
                    >
                      <span
                        className="material-symbols-outlined text-primary"
                        style={{ fontSize: 22 }}
                      >
                        {spec.icon}
                      </span>
                      <div>
                        <p
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            'uppercase tracking-widest text-on-surface-variant',
                          )}
                        >
                          {spec.label}
                        </p>
                        <p
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('semibold'),
                            'text-on-surface',
                          )}
                        >
                          {spec.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <aside className={cm.cn('lg:col-span-2 lg:sticky lg:top-6 self-start')}>
              <div
                className={cm.cn(
                  cm.sp('p', 8),
                  'rounded-3xl bg-surface border border-border shadow-sm',
                )}
              >
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-primary-dark',
                  )}
                >
                  {product.creator
                    ? t(
                        'productDetail.creator',
                        { name: product.creator },
                        { defaultValue: 'by {{name}}' },
                      )
                    : t('productDetail.creatorFallback', {}, { defaultValue: 'Indie creator' })}
                </p>
                <h1
                  className={cm.cn(
                    cm.textSize('3xl'),
                    cm.fontWeight('bold'),
                    cm.sp('mt', 2),
                    'text-on-surface',
                  )}
                >
                  {product.name}
                </h1>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'baseline', gap: 'sm' }),
                    cm.sp('mt', 6),
                    'flex-wrap',
                  )}
                >
                  <span
                    className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'text-on-surface')}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {product.price_cents === 0
                      ? t('nav.free', {}, { defaultValue: 'Free' })
                      : formatPrice(product.price_cents)}
                  </span>
                  {product.original_price_cents &&
                    product.original_price_cents > product.price_cents && (
                      <span
                        className={cm.cn(cm.textSize('lg'), 'line-through text-on-surface-variant')}
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {formatPrice(product.original_price_cents)}
                      </span>
                    )}
                </div>
                <button
                  type="button"
                  onClick={() => handleAddToCart(false)}
                  disabled={acting}
                  data-testid="product-add-to-cart"
                  aria-label={t('productDetail.cta.addToCart', {}, { defaultValue: 'Add to cart' })}
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 4),
                    cm.fontWeight('bold'),
                    cm.sp('mt', 6),
                    'flex items-center justify-center gap-2 w-full bg-primary text-on-primary rounded-xl shadow-md shadow-primary/20 hover:bg-primary-hover hover:-translate-y-0.5 transition-all disabled:opacity-60',
                  )}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    shopping_cart
                  </span>
                  {product.price_cents === 0
                    ? t('productDetail.cta.download', {}, { defaultValue: 'Get for free' })
                    : t('productDetail.cta.addToCart', {}, { defaultValue: 'Add to cart' })}
                </button>
                {product.price_cents > 0 && (
                  <button
                    type="button"
                    onClick={() => handleAddToCart(true)}
                    disabled={acting}
                    data-testid="product-buy-now"
                    aria-label={t('productDetail.cta.buyNow', {}, { defaultValue: 'Buy now' })}
                    className={cm.cn(
                      cm.sp('px', 6),
                      cm.sp('py', 3),
                      cm.fontWeight('bold'),
                      cm.sp('mt', 3),
                      'flex items-center justify-center gap-2 w-full bg-surface text-primary-dark border border-primary rounded-xl hover:bg-primary-light transition-colors disabled:opacity-60',
                    )}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      bolt
                    </span>
                    {t('productDetail.cta.buyNow', {}, { defaultValue: 'Buy now' })}
                  </button>
                )}
                {errorMsg && (
                  <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 3), 'text-error')}>
                    {errorMsg}
                  </p>
                )}
                <ul
                  className={cm.cn(
                    cm.sp('mt', 6),
                    cm.stack(3),
                    cm.textSize('sm'),
                    'text-on-surface-variant',
                  )}
                >
                  {[
                    {
                      icon: 'verified',
                      label: t(
                        'productDetail.guarantee.license',
                        {},
                        { defaultValue: 'Lifetime license key delivered instantly' },
                      ),
                    },
                    {
                      icon: 'cloud_download',
                      label: t(
                        'productDetail.guarantee.updates',
                        {},
                        { defaultValue: 'Free updates while the creator maintains the product' },
                      ),
                    },
                    {
                      icon: 'lock',
                      label: t(
                        'productDetail.guarantee.refund',
                        {},
                        { defaultValue: '14-day no-questions refund' },
                      ),
                    },
                  ].map((row) => (
                    <li key={row.icon} className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                      <span
                        className="material-symbols-outlined text-success"
                        style={{ fontSize: 18 }}
                      >
                        {row.icon}
                      </span>
                      {row.label}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

export default ProductDetail
