/**
 * Retailer comparison table — divide-y rows of retailer logos + price +
 * stock pill + a "Visit store" outline button. The lowest-price row gets
 * a primary left border + best_price_light background + "BEST" pill so
 * the eye lands there immediately.
 *
 * Translated from personal-finance/AccountRecentTransactions.tsx (the
 * editorial-table treatment — divide-y rows, uppercase 10px headers, hover
 * row tint) plus the DESIGN.md spec for "Price Comparison Table" (best-price
 * row left-border / best-price-light background / right-aligned bold price /
 * shipping subtext).
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { fmtUsd } from '../lib/unwrap.js'

export interface RetailerPriceRow {
  id: string
  retailer: string
  /** Material symbol glyph for this retailer (use building/storefront fallback). */
  glyph?: string
  price_cents: number
  shipping_cents: number
  in_stock: boolean
  url: string
  /** True for the row that has the lowest total. */
  is_best?: boolean
  /** Optional rating 1-5. */
  rating?: number
}

export interface RetailerPriceTableProps {
  rows: RetailerPriceRow[]
  /** Heading shown above the table; pass null to suppress. */
  heading?: string | null
  /** Eyebrow above the heading. */
  eyebrow?: string
}

export function RetailerPriceTable({ rows, heading, eyebrow }: RetailerPriceTableProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section
      data-mol-id="retailer-price-table"
      className={cm.cn(
        'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm overflow-hidden',
      )}
    >
      {(eyebrow || heading) && (
        <header
          className={cm.cn(cm.sp('px', 6), cm.sp('py', 5), 'border-b border-outline-variant/40')}
        >
          {eyebrow && (
            <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
              {eyebrow}
            </p>
          )}
          {heading && (
            <h2
              className={cm.cn(
                cm.sp('mt', 1),
                cm.textSize('xl'),
                cm.fontWeight('extrabold'),
                'tracking-tight text-on-surface',
              )}
            >
              {heading}
            </h2>
          )}
        </header>
      )}
      <div className={cm.cn('divide-y divide-outline-variant/30')}>
        <div
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.flex({ align: 'center' }),
            cm.textSize('xs'),
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant bg-surface-container-low',
          )}
        >
          <span className={cm.cn('flex-1')}>
            {t('retailerPriceTable.retailer', {}, { defaultValue: 'Retailer' })}
          </span>
          <span className={cm.cn('hidden sm:block w-28 text-right')}>
            {t('retailerPriceTable.shipping', {}, { defaultValue: 'Shipping' })}
          </span>
          <span className={cm.cn('w-28 text-right')}>
            {t('nav.total', {}, { defaultValue: 'Total' })}
          </span>
          <span className={cm.cn('w-28')} />
        </div>
        {rows.map((row) => {
          const total = row.price_cents + row.shipping_cents
          const isBest = !!row.is_best
          return (
            <div
              key={row.id}
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 4),
                cm.flex({ align: 'center' }),
                'transition-colors',
                isBest
                  ? 'bg-primary/5 border-l-4 border-primary'
                  : 'hover:bg-surface-container-low',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-1 min-w-0')}>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-9 w-9 shrink-0 rounded-lg',
                    isBest
                      ? 'bg-primary/15 text-primary'
                      : 'bg-surface-container text-on-surface-variant',
                  )}
                  aria-hidden="true"
                >
                  <span className={cm.cn('material-symbols-outlined text-lg')}>
                    {row.glyph ?? 'storefront'}
                  </span>
                </span>
                <div className={cm.cn('min-w-0')}>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'truncate text-on-surface',
                    )}
                  >
                    {row.retailer}
                  </p>
                  <p className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('xs'))}>
                    {row.in_stock ? (
                      <span className={cm.cn('text-secondary font-bold uppercase tracking-wider')}>
                        {t('retailerPriceTable.inStock', {}, { defaultValue: 'In stock' })}
                      </span>
                    ) : (
                      <span className={cm.cn('text-on-surface-variant uppercase tracking-wider')}>
                        {t('retailerPriceTable.outOfStock', {}, { defaultValue: 'Out of stock' })}
                      </span>
                    )}
                    {isBest && (
                      <span
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.sp('py', 0),
                          'rounded-full bg-primary text-on-primary font-black uppercase tracking-wider',
                        )}
                      >
                        {t('retailerPriceTable.best', {}, { defaultValue: 'Best' })}
                      </span>
                    )}
                    {row.rating !== undefined && (
                      <span
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'xs' }),
                          'text-on-surface-variant',
                        )}
                      >
                        <span
                          className={cm.cn('material-symbols-outlined text-sm text-tertiary')}
                          aria-hidden="true"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                        {row.rating.toFixed(1)}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  'hidden sm:block w-28 text-right tabular-nums text-on-surface-variant',
                )}
              >
                {row.shipping_cents === 0
                  ? t('nav.free', {}, { defaultValue: 'Free' })
                  : fmtUsd(row.shipping_cents)}
              </span>
              <span
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.fontWeight('extrabold'),
                  'w-28 text-right tabular-nums',
                  isBest ? 'text-primary' : 'text-on-surface',
                )}
              >
                {fmtUsd(total)}
              </span>
              <a
                href={row.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'hidden sm:flex items-center gap-1 ml-3 rounded-full uppercase tracking-wider transition-colors',
                  isBest
                    ? 'bg-primary text-on-primary hover:opacity-90'
                    : 'border border-outline-variant text-on-surface hover:bg-surface-container',
                )}
              >
                {t('retailerPriceTable.visit', {}, { defaultValue: 'Visit' })}
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  open_in_new
                </span>
              </a>
            </div>
          )
        })}
      </div>
    </section>
  )
}
