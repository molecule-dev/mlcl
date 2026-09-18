import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface FeaturedProduct {
  id: string
  name: string
  brand: string
  category: string
  size: string
  price_cents: number
  unit_price_cents?: number
  unit_label?: string
  in_stock?: boolean
  rating?: number
  review_count?: number
  thumbnail_url?: string | null
  badges?: ReadonlyArray<'organic' | 'sale' | 'new' | 'local'>
}

interface FeaturedProductsGridProps {
  products: ReadonlyArray<FeaturedProduct>
  /** Grid density preset. `2-3-5` is the default Shop grid; `2-3-4` is the
   * featured-row preset (one fewer column at xl). */
  cols?: '2-3-5' | '2-3-4'
  /** Called when the user taps the floating add chip on a card. */
  onAdd?: (productId: string) => void
}

const CATEGORY_GRADIENT: Record<string, string> = {
  produce: 'linear-gradient(135deg, var(--color-success) 0%, var(--color-gradient-end) 100%)',
  dairy: 'linear-gradient(135deg, #fef9c3 0%, #fde68a 100%)',
  bakery: 'linear-gradient(135deg, #fed7aa 0%, #f59e0b 100%)',
  meat: 'linear-gradient(135deg, #fda4af 0%, #e11d48 100%)',
  pantry: 'linear-gradient(135deg, #fde68a 0%, #d97706 100%)',
  frozen: 'linear-gradient(135deg, #bae6fd 0%, #0284c7 100%)',
  beverages: 'linear-gradient(135deg, #c7d2fe 0%, #6366f1 100%)',
  household: 'linear-gradient(135deg, #e9d5ff 0%, #9333ea 100%)',
  default: 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
}

const BADGE_LABEL: Record<string, { label: string; cls: string }> = {
  organic: { label: 'Organic', cls: 'bg-success-container text-on-success-container' },
  sale: { label: 'Sale', cls: 'bg-error-container text-on-error-container' },
  new: { label: 'New', cls: 'bg-info-container text-on-info-container' },
  local: { label: 'Local', cls: 'bg-primary text-on-primary' },
}

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Editorial 5-column product grid (3 on tablet, 2 on mobile). Each card
 * has a category-gradient image well, stacked badges (organic/sale/new),
 * brand · name · size, prominent price, and a floating round add chip.
 *
 * Translated from food-delivery/FeaturedRestaurantsGrid.tsx, retuned to
 * grocery product semantics with the Bushel category palette.
 */
export function FeaturedProductsGrid({
  products,
  cols = '2-3-5',
  onAdd,
}: FeaturedProductsGridProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const gridCls =
    cols === '2-3-4'
      ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4'
      : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'

  if (products.length === 0) return null

  return (
    <div className={gridCls}>
      {products.map((p) => {
        const gradient = CATEGORY_GRADIENT[p.category] ?? CATEGORY_GRADIENT.default
        const inStock = p.in_stock !== false
        const badges = (p.badges ?? []).slice(0, 2)
        return (
          <div
            key={p.id}
            className={
              'group relative bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden'
            }
          >
            <Link to={`/product/${p.id}`} className="block">
              <div
                className={
                  'aspect-square relative overflow-hidden flex items-center justify-center'
                }
                style={{ background: gradient }}
                aria-hidden="true"
              >
                {p.thumbnail_url ? (
                  <img
                    src={p.thumbnail_url}
                    alt=""
                    loading="lazy"
                    className={
                      'w-full h-full object-cover group-hover:scale-105 transition-transform'
                    }
                  />
                ) : (
                  <span className="material-symbols-outlined text-[60px] text-white/60">
                    shopping_basket
                  </span>
                )}
                {!inStock && (
                  <div
                    className={'absolute inset-0 bg-foreground/55 flex items-center justify-center'}
                  >
                    <span
                      className={
                        'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-surface text-on-surface'
                      }
                    >
                      {t('featuredProductsGrid.outOfStock', {}, { defaultValue: 'Out of stock' })}
                    </span>
                  </div>
                )}
                {badges.length > 0 && (
                  <div className={'absolute top-2 left-2 flex flex-col gap-1'}>
                    {badges.map((b) => {
                      const meta = BADGE_LABEL[b]
                      if (!meta) return null
                      return (
                        <span
                          key={b}
                          className={cm.cn(
                            'px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest shadow-sm',
                            meta.cls,
                          )}
                        >
                          {t(`featuredProductsGrid.badge.${b}`, {}, { defaultValue: meta.label })}
                        </span>
                      )
                    })}
                  </div>
                )}
                {p.rating != null && (
                  <span
                    className={
                      'absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface/95 text-on-surface shadow-sm'
                    }
                  >
                    <span
                      className="material-symbols-outlined text-[12px] text-warning"
                      aria-hidden="true"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    <span className="tabular-nums">{p.rating.toFixed(1)}</span>
                  </span>
                )}
              </div>

              <div className={'p-3'}>
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant truncate">
                  {p.brand}
                </p>
                <h3
                  className={
                    'text-sm font-extrabold tracking-tight text-on-surface line-clamp-2 mt-0.5 group-hover:text-primary transition-colors'
                  }
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  {p.name}
                </h3>
                <p className={'text-[11px] text-on-surface-variant mt-0.5'}>{p.size}</p>
                <div className={'mt-2 flex items-baseline gap-2'}>
                  <span
                    className={'text-base font-black tabular-nums text-on-surface'}
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                  >
                    {fmt(p.price_cents)}
                  </span>
                  {p.unit_price_cents && p.unit_label && (
                    <span className="text-[10px] text-on-surface-variant">
                      {fmt(p.unit_price_cents)}/{p.unit_label}
                    </span>
                  )}
                </div>
              </div>
            </Link>

            {inStock && onAdd && (
              <button
                type="button"
                onClick={() => onAdd(p.id)}
                aria-label={t(
                  'featuredProductsGrid.addAria',
                  { name: p.name },
                  { defaultValue: 'Add {{name}} to cart' },
                )}
                className={
                  'absolute bottom-3 right-3 w-9 h-9 rounded-full bg-primary text-on-primary shadow-md hover:bg-primary/90 active:scale-95 transition-all inline-flex items-center justify-center'
                }
              >
                <span className={'material-symbols-outlined text-lg'} aria-hidden="true">
                  add
                </span>
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
