/**
 * Editorial product card — gradient image splash with a category emoji,
 * "best price" pill in primary, retailer-count footer, drop badge in the
 * top-right when a drop has been detected, group-hover lift.
 *
 * Translated from coupon-deals-platform/DealCard.tsx and online-store's
 * ProductCard family — same rounded-xl shadow + group-hover lift, swapped
 * for a category-glyph splash and the Bargain-specific "from $X" / "across N
 * stores" affordances per DESIGN.md's Product Card spec.
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { fmtUsd } from '../lib/unwrap.js'

export interface ProductPriceCardProduct {
  id: string
  name: string
  brand: string
  category: string
  best_price_cents: number
  list_price_cents: number
  retailer_count: number
  drop_pct?: number
  in_stock: boolean
}

export interface ProductPriceCardProps {
  product: ProductPriceCardProduct
  /** Render as a `<Link to="/products/:id">` (default true). */
  linked?: boolean
}

const CATEGORY_GLYPH: Record<string, string> = {
  Electronics: 'devices',
  Headphones: 'headphones',
  Laptops: 'laptop_mac',
  Phones: 'smartphone',
  Cameras: 'photo_camera',
  Home: 'chair',
  Kitchen: 'cooking',
  Fitness: 'fitness_center',
  Apparel: 'checkroom',
  Beauty: 'spa',
  Books: 'menu_book',
  Toys: 'toys',
  Outdoor: 'hiking',
  Gaming: 'sports_esports',
}

export function ProductPriceCard({ product, linked = true }: ProductPriceCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const glyph = CATEGORY_GLYPH[product.category] ?? 'shopping_bag'
  const dropPct = product.drop_pct ?? 0
  const hasDrop = dropPct > 0

  const inner = (
    <article
      data-mol-id={`product-card-${product.id}`}
      className={cm.cn(
        'group relative block overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm',
        'border border-outline-variant/30',
        'transition-all hover:-translate-y-0.5 hover:shadow-md',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'relative h-40 overflow-hidden bg-gradient-to-br from-primary-container/40 to-secondary-container/30',
        )}
      >
        <span
          className={cm.cn(
            'material-symbols-outlined text-6xl text-primary/70 transition-transform group-hover:scale-110',
          )}
          aria-hidden="true"
          style={{ fontVariationSettings: "'FILL' 1, 'wght' 300" }}
        >
          {glyph}
        </span>

        {hasDrop && (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('extrabold'),
              'absolute top-3 right-3 rounded-full bg-secondary text-on-secondary uppercase tracking-wider',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
              trending_down
            </span>
            {t('productPriceCard.drop', { pct: dropPct }, { defaultValue: '-{{pct}}%' })}
          </span>
        )}
        {!product.in_stock && (
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              'absolute top-3 left-3 rounded-full bg-surface text-on-surface-variant font-bold uppercase tracking-wider',
            )}
          >
            {t('productPriceCard.outOfStock', {}, { defaultValue: 'Out of stock' })}
          </span>
        )}
      </div>

      <div className={cm.cn(cm.sp('p', 4), 'space-y-2')}>
        <p
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {product.brand}
        </p>
        <h3
          className={cm.cn(
            cm.textSize('base'),
            cm.fontWeight('semibold'),
            'leading-snug line-clamp-2 text-on-surface',
          )}
        >
          {product.name}
        </h3>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'sm' }))}>
          <span className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
            {t('productPriceCard.from', {}, { defaultValue: 'from' })}
          </span>
          <span
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('extrabold'),
              'tabular-nums text-on-surface',
            )}
          >
            {fmtUsd(product.best_price_cents)}
          </span>
          {product.list_price_cents > product.best_price_cents && (
            <span
              className={cm.cn(
                cm.textSize('sm'),
                'tabular-nums line-through text-on-surface-variant',
              )}
            >
              {fmtUsd(product.list_price_cents)}
            </span>
          )}
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.textSize('xs'),
            'pt-1 text-on-surface-variant',
          )}
        >
          <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'font-medium')}>
            <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
              storefront
            </span>
            {t(
              'productPriceCard.retailerCount',
              { count: product.retailer_count },
              { defaultValue: '{{count}} retailers' },
            )}
          </span>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.fontWeight('bold'),
              'text-primary',
            )}
          >
            {t('productPriceCard.compare', {}, { defaultValue: 'Compare' })}
            <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
              arrow_forward
            </span>
          </span>
        </div>
      </div>
    </article>
  )

  return linked ? (
    <Link to={`/products/${product.id}`} className={cm.cn('block')}>
      {inner}
    </Link>
  ) : (
    inner
  )
}
