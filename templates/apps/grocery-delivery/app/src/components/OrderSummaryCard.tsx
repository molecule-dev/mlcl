import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface CartLine {
  name: string
  qty: number
  price_cents: number
}

interface OrderSummaryCardProps {
  itemCount: number
  subtotalCents: number
  deliveryFeeCents: number
  /** Optional sales tax in cents (rendered as a separate row). */
  taxCents?: number
  /** Human-readable delivery slot, e.g. "Tomorrow, 9–11 AM". */
  slotLabel: string
  /** Up-to-3 line preview shown above the totals. */
  preview?: ReadonlyArray<CartLine>
  /** Where the primary CTA navigates ("/cart" or "/checkout"). */
  ctaTo: string
  ctaKey: string
  ctaDefault: string
  /** Subtotal needed for free delivery, in cents. Drives a progress bar. */
  freeDeliveryThresholdCents?: number
  /** Render the empty-cart variant (icon + browse link). */
  emptyState?: boolean
}

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Sticky right-hand cart summary used by Shop, Cart, and Checkout.
 * Green header band with item-count chip + slot pill, optional preview
 * lines, free-delivery progress meter, totals, and a full-width CTA.
 *
 * Translated from food-delivery/CartHero.tsx, recoloured for Bushel and
 * extended with the free-delivery progress meter (DESIGN.md
 * "Cart Drawer" section).
 */
export function OrderSummaryCard({
  itemCount,
  subtotalCents,
  deliveryFeeCents,
  taxCents,
  slotLabel,
  preview,
  ctaTo,
  ctaKey,
  ctaDefault,
  freeDeliveryThresholdCents,
  emptyState = false,
}: OrderSummaryCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const total = subtotalCents + deliveryFeeCents + (taxCents ?? 0)
  const remaining = freeDeliveryThresholdCents
    ? Math.max(0, freeDeliveryThresholdCents - subtotalCents)
    : 0
  const progressPct = freeDeliveryThresholdCents
    ? Math.min(100, Math.round((subtotalCents / freeDeliveryThresholdCents) * 100))
    : 0
  const freeReached =
    freeDeliveryThresholdCents != null && subtotalCents >= freeDeliveryThresholdCents

  return (
    <aside
      className={
        'rounded-2xl bg-surface-container-lowest shadow-lg overflow-hidden lg:sticky lg:top-24'
      }
    >
      <div
        className={'p-5 text-white'}
        style={{
          background:
            'linear-gradient(135deg, var(--color-primary) 0%, var(--color-gradient-end) 100%)',
        }}
      >
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <span className="text-[11px] font-black uppercase tracking-widest opacity-90">
            {t('orderSummaryCard.title', {}, { defaultValue: 'Your bushel' })}
          </span>
          <span
            className={
              'px-2 py-0.5 rounded-full text-[11px] font-extrabold tabular-nums bg-surface/20 backdrop-blur-md'
            }
          >
            {itemCount}
          </span>
        </div>
        <p className={'text-sm font-bold mt-2'}>
          <span
            className={'material-symbols-outlined text-base align-middle mr-1'}
            aria-hidden="true"
          >
            schedule
          </span>
          {slotLabel}
        </p>
      </div>

      {emptyState ? (
        <div className={'p-6 text-center'}>
          <span
            className="material-symbols-outlined text-5xl text-on-surface-variant/40"
            aria-hidden="true"
          >
            shopping_basket
          </span>
          <p className={'text-sm text-on-surface-variant mt-3'}>
            {t('orderSummaryCard.empty', {}, { defaultValue: 'Your cart is empty.' })}
          </p>
          <Link
            to="/shop"
            className={'inline-block mt-4 text-sm font-bold text-primary-dark hover:underline'}
          >
            {t('orderSummaryCard.browseCta', {}, { defaultValue: 'Browse the aisles →' })}
          </Link>
        </div>
      ) : (
        <>
          {preview && preview.length > 0 && (
            <ul className={'px-5 pt-5 space-y-2'}>
              {preview.slice(0, 3).map((item, idx) => (
                <li key={idx} className={'flex items-center gap-2 text-sm'}>
                  <span
                    className={
                      'inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary-dark text-[11px] font-black tabular-nums'
                    }
                  >
                    {item.qty}
                  </span>
                  <span className={'flex-1 truncate text-on-surface'}>{item.name}</span>
                  <span className="text-on-surface-variant tabular-nums text-[12px] font-mono">
                    {fmt(item.price_cents * item.qty)}
                  </span>
                </li>
              ))}
              {preview.length > 3 && (
                <li className={'text-[11px] text-on-surface-variant pl-8'}>
                  {t(
                    'orderSummaryCard.morePreview',
                    { n: preview.length - 3 },
                    { defaultValue: '+ {{n}} more' },
                  )}
                </li>
              )}
            </ul>
          )}

          {freeDeliveryThresholdCents != null && itemCount > 0 && (
            <div className={'px-5 pt-4'}>
              <div className={'h-1.5 rounded-full overflow-hidden bg-surface-container'}>
                <div
                  className={'h-full rounded-full transition-all'}
                  style={{
                    width: `${progressPct}%`,
                    background: freeReached
                      ? 'var(--color-primary)'
                      : 'linear-gradient(90deg, var(--color-primary), var(--color-gradient-end))',
                  }}
                  aria-hidden="true"
                />
              </div>
              <p className={'text-[11px] text-on-surface-variant mt-1.5'}>
                {freeReached
                  ? t(
                      'orderSummaryCard.freeDeliveryReached',
                      {},
                      { defaultValue: 'Free delivery unlocked.' },
                    )
                  : t(
                      'orderSummaryCard.freeDeliveryProgress',
                      { remaining: fmt(remaining) },
                      { defaultValue: '{{remaining}} away from free delivery.' },
                    )}
              </p>
            </div>
          )}

          <div className={'p-5 space-y-2 text-sm'}>
            <div className={'flex items-baseline justify-between'}>
              <span className="text-on-surface-variant">
                {t('nav.subtotal', {}, { defaultValue: 'Subtotal' })}
              </span>
              <span className="font-semibold tabular-nums">{fmt(subtotalCents)}</span>
            </div>
            <div className={'flex items-baseline justify-between'}>
              <span className="text-on-surface-variant">
                {t('orderSummaryCard.delivery', {}, { defaultValue: 'Delivery' })}
              </span>
              <span
                className={cm.cn(
                  'font-semibold tabular-nums',
                  deliveryFeeCents === 0 ? 'text-success' : '',
                )}
              >
                {deliveryFeeCents === 0
                  ? t('nav.free', {}, { defaultValue: 'Free' })
                  : fmt(deliveryFeeCents)}
              </span>
            </div>
            {taxCents != null && (
              <div className={'flex items-baseline justify-between'}>
                <span className="text-on-surface-variant">
                  {t('form.tax', {}, { defaultValue: 'Tax' })}
                </span>
                <span className="font-semibold tabular-nums">{fmt(taxCents)}</span>
              </div>
            )}
            <div
              className={
                'border-t border-outline-variant/40 pt-2 mt-3 flex items-baseline justify-between'
              }
            >
              <span className={'text-base font-extrabold'}>
                {t('nav.total', {}, { defaultValue: 'Total' })}
              </span>
              <span
                className={'text-xl font-black text-primary-dark tabular-nums'}
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                {fmt(total)}
              </span>
            </div>
          </div>

          <div className={'px-5 pb-5'}>
            <Link
              to={ctaTo}
              className={
                'block w-full text-center px-6 py-3 font-bold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors shadow-md shadow-primary/20'
              }
            >
              {t(ctaKey, { total: fmt(total) }, { defaultValue: ctaDefault })}
            </Link>
          </div>
        </>
      )}
    </aside>
  )
}
