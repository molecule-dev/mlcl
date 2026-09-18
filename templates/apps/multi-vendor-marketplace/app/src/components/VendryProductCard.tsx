import { useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface VendryProduct {
  id: string
  name: string
  /** Price in cents (preferred). */
  price_cents?: number
  /** Optional original price for sale display, in cents. */
  original_price_cents?: number
  image_url?: string
  rating?: number
  review_count?: number
  vendor_id?: string
  vendor_slug?: string
  vendor_name?: string
  vendor_verified?: boolean
  on_sale?: boolean
  badge?: string
}

interface VendryProductCardProps {
  product: VendryProduct
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

/**
 * Marketplace product card with vendor attribution pill, sale badge,
 * favorite-on-hover, and elevation hover. Vendor pill uses the violet
 * info token (matches DESIGN.md vendor color #7c3aed).
 *
 * Translated from online-store's CategoryProductCard.tsx.
 */
export function VendryProductCard({ product }: VendryProductCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [favorited, setFavorited] = useState(false)

  const seed = product.id || product.name || 'product'
  const image = product.image_url ?? `https://picsum.photos/seed/vendry-${seed}/600/750`
  const ratingRounded = product.rating ? Math.round(product.rating * 10) / 10 : null
  const reviewCount = product.review_count ?? 0
  const priceCents = product.price_cents ?? 0
  const originalCents = product.original_price_cents
  const onSale = Boolean(product.on_sale && originalCents && originalCents > priceCents)

  const productHref = `/products/${product.id}`
  const vendorHref = product.vendor_slug ? `/vendors/${product.vendor_slug}` : null

  return (
    <article
      className={cm.cn(
        'group relative overflow-hidden rounded-2xl border border-outline-variant bg-surface transition-all hover:shadow-lg hover:-translate-y-0.5',
      )}
    >
      <Link to={productHref} aria-label={product.name} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-surface-container-low">
          <img
            src={image}
            alt={product.name}
            className={cm.cn(
              cm.w('full'),
              cm.h('full'),
              'object-cover transition-transform duration-500 group-hover:scale-105',
            )}
            loading="lazy"
          />
          {(onSale || product.badge) && (
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                cm.sp('px', 3),
                cm.sp('py', 1),
                'absolute left-0 top-0 rounded-br-xl bg-error text-on-error uppercase tracking-widest',
              )}
            >
              {product.badge ?? t('vendryProductCard.saleBadge', {}, { defaultValue: 'Sale' })}
            </span>
          )}
        </div>
      </Link>
      <button
        type="button"
        onClick={() => setFavorited((f) => !f)}
        aria-pressed={favorited}
        aria-label={t('vendryProductCard.favoriteAria', {}, { defaultValue: 'Save to favorites' })}
        className={cm.cn(
          cm.sp('p', 2),
          cm.roundedFull,
          'absolute right-3 top-3 bg-surface/90 backdrop-blur-md shadow-sm hover:bg-surface transition-colors',
        )}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontVariationSettings: favorited ? "'FILL' 1" : "'FILL' 0",
            color: favorited ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
          }}
          aria-hidden
        >
          favorite
        </span>
      </button>
      <div className={cm.cn(cm.sp('p', 4), cm.stack(2))}>
        {(product.vendor_name || vendorHref) && (
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
            )}
          >
            <span
              className="material-symbols-outlined text-info"
              style={{ fontSize: '14px' }}
              aria-hidden
            >
              storefront
            </span>
            {vendorHref ? (
              <Link
                to={vendorHref}
                className={'text-sky-700 dark:text-info hover:underline truncate'}
                onClick={(e) => e.stopPropagation()}
              >
                {product.vendor_name}
              </Link>
            ) : (
              <span className="text-sky-700 dark:text-info truncate">{product.vendor_name}</span>
            )}
            {product.vendor_verified && (
              <span
                className="material-symbols-outlined text-secondary"
                style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}
                aria-label={t(
                  'vendryProductCard.verified',
                  {},
                  { defaultValue: 'Verified vendor' },
                )}
              >
                verified
              </span>
            )}
          </div>
        )}
        <Link to={productHref} className="block">
          <h3
            className={cm.cn(
              cm.fontWeight('semibold'),
              'text-base text-on-surface line-clamp-1 hover:text-primary transition-colors',
            )}
          >
            {product.name}
          </h3>
        </Link>
        {ratingRounded !== null && (
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('xs'))}>
            <span
              className="material-symbols-outlined text-warning"
              style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}
              aria-hidden
            >
              star
            </span>
            <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
              {ratingRounded.toFixed(1)}
            </span>
            <span className="text-on-surface-variant">
              {t(
                'vendryProductCard.reviewCount',
                { count: reviewCount },
                { defaultValue: '({{count}})' },
              )}
            </span>
          </div>
        )}
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mt', 1))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-lg text-on-surface tabular-nums',
              onSale && 'text-error',
            )}
          >
            {formatCents(priceCents)}
          </span>
          {onSale && originalCents && (
            <span
              className={cm.cn(
                cm.textSize('sm'),
                'text-on-surface-variant tabular-nums line-through',
              )}
            >
              {formatCents(originalCents)}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

export default VendryProductCard
