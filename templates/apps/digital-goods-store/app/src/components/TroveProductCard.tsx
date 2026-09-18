import type { MouseEvent } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { addToCart } from '../lib/cart.js'

/**
 * Bespoke product card for Trove — 16:10 cover image, file-type badge,
 * tabular price, hover-lift (translateY(-2px)) per DESIGN.md "Product Card"
 * spec. Pricing badge variants: free / paid / pwyw.
 *
 * Translated from online-store/ArrivalCard.tsx + the §2.x grid card recipe.
 */

export interface TroveProduct {
  id: string
  slug: string
  name: string
  /** Short tagline. */
  description?: string
  /** Cover image URL. */
  coverImage?: string
  /** Price in cents. 0 means free. */
  priceCents: number
  /** Optional original price in cents (shows strikethrough). */
  originalPriceCents?: number
  /** "free" | "paid" | "pwyw". */
  pricingModel?: 'free' | 'paid' | 'pwyw'
  /** File type label, e.g. "PDF", "ZIP", "FIGMA". */
  fileType?: string
  /** Total sales counter for storefront badges. */
  totalSales?: number
  /** Optional "NEW" / "SALE" / custom badge label. */
  badge?: 'new' | 'sale' | 'bestseller'
}

interface TroveProductCardProps {
  product: TroveProduct
  /** Link target prefix; defaults to /shop/{slug}. */
  hrefPrefix?: string
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100)
}

const BADGE_STYLES: Record<NonNullable<TroveProduct['badge']>, string> = {
  new: 'bg-success-container text-on-success-container',
  sale: 'bg-primary text-on-primary',
  bestseller: 'bg-secondary-container text-on-secondary-container',
}

export default function TroveProductCard({ product, hrefPrefix = '/shop' }: TroveProductCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const href = `${hrefPrefix}/${product.slug}`
  const isFree = product.pricingModel === 'free' || product.priceCents === 0
  const isPwyw = product.pricingModel === 'pwyw'

  const handleAddToCart = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addToCart({
      productId: product.id,
      productSlug: product.slug,
      name: product.name,
      coverImage: product.coverImage ?? null,
      fileType: product.fileType ?? null,
      priceCents: product.priceCents,
      originalPriceCents: product.originalPriceCents,
      quantity: 1,
    })
  }

  return (
    <article
      data-testid="product-card"
      data-product-slug={product.slug}
      className={cm.cn(
        'group bg-surface rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 relative',
      )}
    >
      <Link to={href} aria-label={product.name} className={cm.cn('block')}>
        <div
          className={cm.cn('relative bg-bg-secondary overflow-hidden')}
          style={{ aspectRatio: '16 / 10' }}
        >
          {product.coverImage ? (
            <img
              src={product.coverImage}
              alt={product.name}
              className={cm.cn(
                cm.w('full'),
                cm.h('full'),
                'object-cover transition-transform duration-500 group-hover:scale-105',
              )}
            />
          ) : (
            <div
              className={cm.cn(
                cm.w('full'),
                cm.h('full'),
                cm.flex({ align: 'center', justify: 'center' }),
                'bg-gradient-to-br from-primary-light to-accent-light',
              )}
            >
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 56 }}>
                {isPwyw ? 'volunteer_activism' : 'inventory_2'}
              </span>
            </div>
          )}
          {product.badge && (
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.roundedFull,
                cm.fontWeight('bold'),
                'absolute top-3 left-3 text-[10px] uppercase tracking-widest',
                BADGE_STYLES[product.badge],
              )}
            >
              {t(
                `troveProductCard.badge.${product.badge}`,
                {},
                { defaultValue: product.badge.toUpperCase() },
              )}
            </span>
          )}
          {product.fileType && (
            <span
              className={cm.cn(
                cm.sp('px', 2),
                cm.sp('py', 1),
                'absolute bottom-3 right-3 text-[10px] font-medium uppercase tracking-wider rounded-md bg-foreground/60 text-white',
              )}
              style={{ fontFamily: 'var(--font-family-mono)' }}
            >
              {product.fileType}
            </span>
          )}
        </div>
        <div className={cm.cn(cm.sp('p', 5))}>
          <h3
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.sp('mb', 1),
              'text-on-surface line-clamp-1 group-hover:text-primary transition-colors',
            )}
          >
            {product.name}
          </h3>
          {product.description && (
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('mb', 4),
                'text-on-surface-variant line-clamp-2',
              )}
            >
              {product.description}
            </p>
          )}
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'xs' }))}>
              {isFree ? (
                <span
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.roundedFull,
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'bg-info-light text-info',
                  )}
                >
                  {t('troveProductCard.free', {}, { defaultValue: 'Free' })}
                </span>
              ) : isPwyw ? (
                <span
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.roundedFull,
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'bg-accent-light text-accent',
                  )}
                >
                  {t('troveProductCard.pwyw', {}, { defaultValue: 'Pay what you want' })}
                </span>
              ) : (
                <>
                  <span
                    className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatPrice(product.priceCents)}
                  </span>
                  {product.originalPriceCents &&
                    product.originalPriceCents > product.priceCents && (
                      <span
                        className={cm.cn(cm.textSize('sm'), 'line-through text-on-surface-variant')}
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {formatPrice(product.originalPriceCents)}
                      </span>
                    )}
                </>
              )}
            </div>
            {product.totalSales && product.totalSales > 0 && (
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                )}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  download
                </span>
                {t(
                  'troveProductCard.salesCount',
                  { count: product.totalSales },
                  { defaultValue: '{{count}} sales' },
                )}
              </span>
            )}
          </div>
        </div>
      </Link>
      <div className={cm.cn(cm.sp('px', 5), cm.sp('pb', 5))}>
        <button
          type="button"
          onClick={handleAddToCart}
          data-testid="card-add-to-cart"
          aria-label={t('troveProductCard.addToCart', {}, { defaultValue: 'Add to cart' })}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'flex items-center justify-center gap-2 w-full bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors',
          )}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            shopping_cart
          </span>
          {isFree
            ? t('troveProductCard.getFree', {}, { defaultValue: 'Get for free' })
            : t('troveProductCard.addToCart', {}, { defaultValue: 'Add to cart' })}
        </button>
      </div>
    </article>
  )
}

export { TroveProductCard }
