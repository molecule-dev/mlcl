import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface Product {
  id: string
  name: string
  brand: string
  category: string
  size: string
  price_cents: number
  unit_price_cents?: number
  unit_label?: string
  description?: string
  nutrition?: {
    calories?: number
    protein_g?: number
    fat_g?: number
    carbs_g?: number
    sugar_g?: number
    sodium_mg?: number
  }
  rating?: number
  review_count?: number
  thumbnail_url?: string | null
  in_stock?: boolean
  badges?: Array<'organic' | 'sale' | 'new' | 'local'>
}

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function ProductDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get(`/api/products/${id}`)
      .then((res) => {
        if (!cancelled) setProduct(unwrapSingle<Product>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('productDetail.loadError', {}, { defaultValue: 'Failed to load product.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, http, t])

  const [submitting, setSubmitting] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  async function addToCart(): Promise<void> {
    if (!id || submitting) return
    if (!user) {
      navigate('/login', { state: { from: location } })
      return
    }
    setSubmitting(true)
    setAddError(null)
    try {
      await http.post('/api/cart/items', { productId: id, quantity: qty })
      void track({
        name: 'item.added',
        properties: { product_id: id, quantity: qty, source: 'product_detail' },
      })
      setAdded(true)
      setTimeout(() => setAdded(false), 1500)
    } catch (err) {
      const status =
        (err as { status?: number; response?: { status?: number } } | null)?.status ??
        (err as { response?: { status?: number } } | null)?.response?.status
      if (status === 401) {
        navigate('/login', { state: { from: location } })
        return
      }
      setAddError(t('productDetail.addError', {}, { defaultValue: 'Could not add to cart.' }))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <Link
        to="/shop"
        className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant hover:underline')}
      >
        ← {t('productDetail.backLink', {}, { defaultValue: 'Back to shop' })}
      </Link>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : !product ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textMuted)}>
          {t('productDetail.notFound', {}, { defaultValue: 'Product not found.' })}
        </p>
      ) : (
        <div className={cm.cn(cm.sp('mt', 4), cm.grid({ cols: 12, gap: 'lg' }))}>
          <div className={'col-span-12 md:col-span-6'}>
            <div className={cm.cn('bg-surface-variant rounded-xl aspect-square')}>
              {product.thumbnail_url ? (
                <img
                  src={product.thumbnail_url}
                  alt={product.name}
                  className={'h-full w-full object-cover rounded-xl'}
                />
              ) : null}
            </div>
          </div>
          <div className={'col-span-12 md:col-span-6'}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'text-on-surface-variant uppercase tracking-wide',
              )}
            >
              {product.brand}
            </p>
            <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mt', 1))}>
              {product.name}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), cm.textMuted)}>{product.size}</p>
            {product.rating != null ? (
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('mt', 2),
                  cm.textSize('sm'),
                )}
              >
                <span aria-hidden="true">★</span>
                <span>{product.rating.toFixed(1)}</span>
                {product.review_count != null ? (
                  <span className="text-on-surface-variant">
                    {t(
                      'productDetail.reviewCount',
                      { count: product.review_count },
                      { defaultValue: '({{count}} reviews)' },
                    )}
                  </span>
                ) : null}
              </div>
            ) : null}
            <p className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mt', 4))}>
              {fmt(product.price_cents)}
            </p>
            {product.unit_price_cents && product.unit_label ? (
              <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                {fmt(product.unit_price_cents)}/{product.unit_label}
              </p>
            ) : null}

            {product.description ? (
              <p className={cm.cn(cm.textSize('base'), cm.sp('mt', 4))}>{product.description}</p>
            ) : null}

            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mt', 6))}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  'border border-outline-variant rounded-full',
                  cm.sp('px', 2),
                )}
              >
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className={cm.cn(cm.sp('px', 2), cm.fontWeight('bold'))}
                  aria-label={t('productDetail.decrement', {}, { defaultValue: 'Decrement' })}
                >
                  −
                </button>
                <span aria-live="polite" className={cm.cn(cm.fontWeight('semibold'))}>
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  className={cm.cn(cm.sp('px', 2), cm.fontWeight('bold'))}
                  aria-label={t('productDetail.increment', {}, { defaultValue: 'Increment' })}
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={addToCart}
                disabled={product.in_stock === false || submitting}
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  'flex-1 bg-primary text-on-primary rounded-full hover:bg-primary-hover disabled:opacity-50',
                )}
              >
                {product.in_stock === false
                  ? t('productDetail.outOfStock', {}, { defaultValue: 'Out of stock' })
                  : submitting
                    ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
                    : added
                      ? t('productDetail.addedToCart', {}, { defaultValue: 'Added to cart ✓' })
                      : t(
                          'productDetail.addToCart',
                          { qty },
                          { defaultValue: 'Add {{qty}} to cart' },
                        )}
              </button>
            </div>
            {addError ? (
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-error')} role="alert">
                {addError}
              </p>
            ) : null}

            {product.nutrition ? (
              <section
                className={cm.cn(cm.sp('mt', 8), cm.sp('p', 5), 'bg-surface rounded-xl shadow-sm')}
              >
                <h2
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    cm.sp('mb', 2),
                    'uppercase tracking-wide text-on-surface-variant',
                  )}
                >
                  {t(
                    'productDetail.nutritionHeading',
                    {},
                    { defaultValue: 'Nutrition (per serving)' },
                  )}
                </h2>
                <dl className={cm.cn(cm.grid({ cols: 3, gap: 'sm' }), cm.textSize('sm'))}>
                  {product.nutrition.calories != null && (
                    <div>
                      <dt className="text-on-surface-variant">
                        {t('productDetail.calories', {}, { defaultValue: 'Calories' })}
                      </dt>
                      <dd className={cm.fontWeight('semibold')}>{product.nutrition.calories}</dd>
                    </div>
                  )}
                  {product.nutrition.protein_g != null && (
                    <div>
                      <dt className="text-on-surface-variant">
                        {t('productDetail.protein', {}, { defaultValue: 'Protein' })}
                      </dt>
                      <dd className={cm.fontWeight('semibold')}>{product.nutrition.protein_g}g</dd>
                    </div>
                  )}
                  {product.nutrition.fat_g != null && (
                    <div>
                      <dt className="text-on-surface-variant">
                        {t('productDetail.fat', {}, { defaultValue: 'Fat' })}
                      </dt>
                      <dd className={cm.fontWeight('semibold')}>{product.nutrition.fat_g}g</dd>
                    </div>
                  )}
                  {product.nutrition.carbs_g != null && (
                    <div>
                      <dt className="text-on-surface-variant">
                        {t('productDetail.carbs', {}, { defaultValue: 'Carbs' })}
                      </dt>
                      <dd className={cm.fontWeight('semibold')}>{product.nutrition.carbs_g}g</dd>
                    </div>
                  )}
                  {product.nutrition.sugar_g != null && (
                    <div>
                      <dt className="text-on-surface-variant">
                        {t('productDetail.sugar', {}, { defaultValue: 'Sugar' })}
                      </dt>
                      <dd className={cm.fontWeight('semibold')}>{product.nutrition.sugar_g}g</dd>
                    </div>
                  )}
                  {product.nutrition.sodium_mg != null && (
                    <div>
                      <dt className="text-on-surface-variant">
                        {t('productDetail.sodium', {}, { defaultValue: 'Sodium' })}
                      </dt>
                      <dd className={cm.fontWeight('semibold')}>{product.nutrition.sodium_mg}mg</dd>
                    </div>
                  )}
                </dl>
              </section>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
