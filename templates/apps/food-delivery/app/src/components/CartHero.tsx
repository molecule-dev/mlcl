import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface CartItem {
  name: string
  qty: number
  price_cents: number
}

interface CartHeroProps {
  itemCount: number
  subtotalCents: number
  deliveryFeeCents: number
  estimatedMinutes: string
  /** Optional preview of last 3 items in the cart for the sticky sidebar. */
  preview?: ReadonlyArray<CartItem>
  /** Restaurant name. */
  fromName?: string
}

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Sticky right-hand cart sidebar / hero pattern. Shows order subtotal,
 * delivery fee, estimated arrival, item preview list, and a sticky
 * Checkout CTA. Translated from online-store's CartOrderSummary +
 * CartItem pattern, recoloured to Chariot's amber primary.
 */
export function CartHero({
  itemCount,
  subtotalCents,
  deliveryFeeCents,
  estimatedMinutes,
  preview,
  fromName,
}: CartHeroProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const total = subtotalCents + deliveryFeeCents
  const empty = itemCount === 0

  return (
    <aside
      className={
        'rounded-2xl bg-surface-container-lowest shadow-lg overflow-hidden lg:sticky lg:top-24'
      }
    >
      <div className={'bg-primary text-on-primary p-5'}>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <span className="text-[11px] font-bold uppercase tracking-widest opacity-90">
            {t('cartHero.title', {}, { defaultValue: 'Your order' })}
          </span>
          <span
            className={
              'px-2 py-0.5 rounded-full text-[11px] font-extrabold tabular-nums bg-surface/20 backdrop-blur-md'
            }
          >
            {itemCount}
          </span>
        </div>
        {fromName && <p className={'text-sm font-bold mt-2'}>{fromName}</p>}
        {!empty && (
          <p className={'text-[11px] font-mono opacity-90 mt-1 tabular-nums'}>
            {t(
              'cartHero.eta',
              { mins: estimatedMinutes },
              { defaultValue: 'Arriving in {{mins}} min' },
            )}
          </p>
        )}
      </div>

      {empty ? (
        <div className={'p-6 text-center'}>
          <span
            className="material-symbols-outlined text-5xl text-on-surface-variant/40"
            aria-hidden="true"
          >
            shopping_bag
          </span>
          <p className={'text-sm text-on-surface-variant mt-3'}>
            {t('cartHero.empty', {}, { defaultValue: 'Your cart is empty.' })}
          </p>
          <Link
            to="/restaurants"
            className={'inline-block mt-4 text-sm font-bold text-primary hover:underline'}
          >
            {t('cartHero.browseCta', {}, { defaultValue: 'Browse restaurants →' })}
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
                      'inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold tabular-nums'
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
            </ul>
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
                {t('cartHero.delivery', {}, { defaultValue: 'Delivery' })}
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
            <div
              className={
                'border-t border-outline-variant/40 pt-2 mt-3 flex items-baseline justify-between'
              }
            >
              <span className={'text-base font-extrabold'}>
                {t('nav.total', {}, { defaultValue: 'Total' })}
              </span>
              <span className={'text-xl font-extrabold text-primary tabular-nums'}>
                {fmt(total)}
              </span>
            </div>
          </div>

          <div className={'px-5 pb-5'}>
            <Link
              to="/checkout"
              className={
                'block w-full text-center px-6 py-3 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors shadow-md shadow-primary/20'
              }
            >
              {t(
                'cartHero.checkoutCta',
                { total: fmt(total) },
                { defaultValue: 'Checkout · {{total}}' },
              )}
            </Link>
          </div>
        </>
      )}
    </aside>
  )
}
