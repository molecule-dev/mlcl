import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  cartCount,
  cartSubtotalCents,
  clearGuestCart,
  type GuestCart,
  readGuestCart,
  setQty as setLineQty,
  writeGuestCart,
} from '../lib/guest-cart.js'

const TIP_PRESETS = [15, 18, 20, 22] as const

function fmtCents(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function GuestCart() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [cart, setCart] = useState<GuestCart>(() => readGuestCart())
  const [tipPct, setTipPct] = useState<number>(18)
  const [splitWays, setSplitWays] = useState<number>(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [customerEmail, setCustomerEmail] = useState('')

  const updateCart = useCallback((next: GuestCart) => {
    setCart(next)
    writeGuestCart(next)
  }, [])

  useEffect(() => {
    setCart(readGuestCart())
  }, [])

  const subtotal = cartSubtotalCents(cart)
  const tax = Math.round(subtotal * 0.0875)
  const tip = Math.round(subtotal * (tipPct / 100))
  const total = subtotal + tax + tip
  const perPerson = Math.round(total / Math.max(1, splitWays))

  const handlePay = useCallback(async () => {
    if (!cart.ownerId) {
      setError(
        t(
          'guestCart.ownerMissing',
          {},
          { defaultValue: 'Cart is missing the restaurant owner. Re-scan the QR code.' },
        ),
      )
      return
    }
    if (cart.lines.length === 0) return
    setSubmitting(true)
    setError(null)
    try {
      const res = (await http.post('/api/guest/orders', {
        owner_id: cart.ownerId,
        table_number: cart.tableNumber,
        customer_email: customerEmail || undefined,
        tip_pct: tipPct,
        items: cart.lines.map((l) => ({
          menu_item_id: l.id,
          quantity: l.qty,
          special_instructions: l.note,
        })),
      })) as { id?: string }
      // Conversion point: the guest submitted the cart to the kitchen.
      void track({
        name: 'order.placed',
        properties: {
          orderId: res?.id,
          itemCount: cartCount(cart),
          subtotalCents: subtotal,
          tipPct,
          table: cart.tableNumber ?? undefined,
        },
      })
      clearGuestCart()
      setSuccess(
        t(
          'guestCart.success',
          {},
          { defaultValue: 'Order placed. Sit tight — your kitchen got it.' },
        ),
      )
      setCart({ ownerId: cart.ownerId, tableNumber: cart.tableNumber, lines: [] })
      if (res?.id) {
        setTimeout(
          () =>
            navigate(
              `/menu/guest?owner=${cart.ownerId}${cart.tableNumber ? `&table=${cart.tableNumber}` : ''}`,
            ),
          1500,
        )
      }
    } catch (error) {
      logError('guestCart.pay', error)
      setError(t('guestCart.payError', {}, { defaultValue: 'Could not place order. Try again.' }))
    } finally {
      setSubmitting(false)
    }
  }, [cart, customerEmail, subtotal, tipPct, http, navigate, t])

  if (cart.lines.length === 0 && !success) {
    return (
      <div
        className={cm.cn(
          cm.minH('screen'),
          cm.flex({ direction: 'col', justify: 'center', align: 'center' }),
          cm.sp('p', 8),
          cm.stack(4),
        )}
      >
        <p
          data-testid="guestcart-empty"
          className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}
        >
          {t('guestCart.empty', {}, { defaultValue: 'Your cart is empty.' })}
        </p>
        <Link to="/menu/guest" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
          {t('guestCart.backToMenu', {}, { defaultValue: 'Browse the menu' })}
        </Link>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface-container-low pb-32')}>
      <header
        className={cm.cn(cm.maxW('lg'), cm.mxAuto, cm.sp('px', 5), cm.sp('pt', 8), cm.sp('pb', 4))}
      >
        <Link
          to="/menu/guest"
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary hover:underline inline-flex items-center gap-1',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-base align-middle')}
            aria-hidden="true"
          >
            arrow_back
          </span>
          {t('guestCart.backToMenu', {}, { defaultValue: 'Keep ordering' })}
        </Link>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.sp('mt', 2),
            'font-extrabold tracking-tight font-display',
          )}
        >
          {t('guestCart.heading', {}, { defaultValue: 'Your table' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'guestCart.subheading',
            {},
            { defaultValue: 'Review and place your order — we will confirm at the kitchen.' },
          )}
        </p>
      </header>

      <main className={cm.cn(cm.maxW('lg'), cm.mxAuto, cm.sp('px', 5), cm.stack(5))}>
        {success ? (
          <p
            data-testid="guestcart-success"
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-2xl bg-success/10 text-on-surface text-center font-semibold',
            )}
          >
            {success}
          </p>
        ) : null}
        {error ? (
          <p
            data-testid="guestcart-error"
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-2xl bg-error/10 text-error text-center font-semibold',
            )}
          >
            {error}
          </p>
        ) : null}

        {cart.lines.length > 0 ? (
          <section
            className={cm.cn(
              cm.sp('p', 5),
              'bg-surface-container-lowest rounded-2xl shadow-sm',
              cm.stack(3),
            )}
          >
            {cart.lines.map((line) => (
              <div
                key={line.id}
                data-testid={`guestcart-line-${line.id}`}
                className={cm.flex({ align: 'start', gap: 'md' })}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(8),
                    cm.h(8),
                    cm.roundedFull,
                    'bg-primary/10 text-primary font-extrabold tabular-nums flex-shrink-0',
                  )}
                >
                  {line.qty}
                </span>
                <div className={cm.flex1}>
                  <p
                    className={cm.cn(
                      cm.textSize('base'),
                      cm.fontWeight('semibold'),
                      'font-display',
                    )}
                  >
                    {line.name}
                  </p>
                  {line.note && (
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant italic')}>
                      {line.note}
                    </p>
                  )}
                </div>
                <div className={cm.flex({ align: 'center', gap: 'xs' })}>
                  <button
                    type="button"
                    aria-label={t('guestCart.decrement', {}, { defaultValue: 'Decrease quantity' })}
                    data-testid={`guestcart-dec-${line.id}`}
                    onClick={() => updateCart(setLineQty(cart, line.id, line.qty - 1))}
                    className={cm.cn(
                      cm.w(7),
                      cm.h(7),
                      cm.roundedFull,
                      cm.flex({ align: 'center', justify: 'center' }),
                      'bg-surface-container font-bold',
                    )}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    aria-label={t('guestCart.increment', {}, { defaultValue: 'Increase quantity' })}
                    data-testid={`guestcart-inc-${line.id}`}
                    onClick={() => updateCart(setLineQty(cart, line.id, line.qty + 1))}
                    className={cm.cn(
                      cm.w(7),
                      cm.h(7),
                      cm.roundedFull,
                      cm.flex({ align: 'center', justify: 'center' }),
                      'bg-surface-container font-bold',
                    )}
                  >
                    +
                  </button>
                </div>
                <span className={cm.cn(cm.textSize('base'), 'font-extrabold tabular-nums')}>
                  {fmtCents(line.priceCents * line.qty)}
                </span>
              </div>
            ))}
          </section>
        ) : null}

        <section
          className={cm.cn(
            cm.sp('p', 5),
            'bg-surface-container-lowest rounded-2xl shadow-sm',
            cm.stack(4),
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('guestCart.tipHeading', {}, { defaultValue: 'Tip' })}
          </h2>
          <div className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-4')}>
            {TIP_PRESETS.map((p) => {
              const active = tipPct === p
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTipPct(p)}
                  data-testid={`guestcart-tip-${p}`}
                  className={cm.cn(
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    cm.roundedFull,
                    'transition-colors',
                    active
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface-variant',
                  )}
                >
                  {p}%
                </button>
              )
            })}
          </div>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant text-center')}>
            {t(
              'guestCart.tipAmount',
              { amount: fmtCents(tip) },
              { defaultValue: 'Tip: {{amount}}' },
            )}
          </p>
        </section>

        <section
          className={cm.cn(
            cm.sp('p', 5),
            'bg-surface-container-lowest rounded-2xl shadow-sm',
            cm.stack(3),
          )}
        >
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('guestCart.splitHeading', {}, { defaultValue: 'Split bill' })}
            </h2>
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
              {t(
                'guestCart.perPerson',
                { amount: fmtCents(perPerson) },
                { defaultValue: '{{amount}} per person' },
              )}
            </span>
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('p', 2),
              'rounded-full bg-surface-container',
            )}
          >
            <button
              type="button"
              onClick={() => setSplitWays((s) => Math.max(1, s - 1))}
              data-testid="guestcart-split-dec"
              className={cm.cn(
                cm.w(8),
                cm.h(8),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'bg-surface-container-lowest font-bold',
              )}
            >
              −
            </button>
            <span className={cm.cn(cm.textSize('lg'), 'font-extrabold tabular-nums font-display')}>
              {t('guestCart.ways', { count: splitWays }, { defaultValue: '{{count}} ways' })}
            </span>
            <button
              type="button"
              onClick={() => setSplitWays((s) => Math.min(8, s + 1))}
              data-testid="guestcart-split-inc"
              className={cm.cn(
                cm.w(8),
                cm.h(8),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'bg-surface-container-lowest font-bold',
              )}
            >
              +
            </button>
          </div>
        </section>

        <section
          className={cm.cn(
            cm.sp('p', 5),
            'bg-surface-container-lowest rounded-2xl shadow-sm',
            cm.stack(2),
          )}
        >
          <label
            htmlFor="guest-email"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('guestCart.emailLabel', {}, { defaultValue: 'Email for receipt (optional)' })}
          </label>
          <input
            id="guest-email"
            data-testid="guestcart-email"
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="you@example.com"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              'bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-0',
            )}
          />
        </section>

        <section
          className={cm.cn(
            cm.sp('p', 5),
            'bg-surface-container-lowest rounded-2xl shadow-sm',
            cm.stack(2),
          )}
        >
          <Row
            label={t('nav.subtotal', {}, { defaultValue: 'Subtotal' })}
            value={fmtCents(subtotal)}
          />
          <Row
            label={t('guestCart.tax', {}, { defaultValue: 'Tax (8.75%)' })}
            value={fmtCents(tax)}
          />
          <Row
            label={t('guestCart.tipRow', { pct: tipPct }, { defaultValue: 'Tip ({{pct}}%)' })}
            value={fmtCents(tip)}
          />
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('pt', 3),
              'border-t border-outline-variant',
            )}
          >
            <p className={cm.cn(cm.textSize('lg'), 'font-extrabold font-display')}>
              {t('nav.total', {}, { defaultValue: 'Total' })}
            </p>
            <p
              data-testid="guestcart-total"
              className={cm.cn(cm.textSize('3xl'), 'font-extrabold tabular-nums font-display')}
            >
              {fmtCents(total)}
            </p>
          </div>
        </section>
      </main>

      {cart.lines.length > 0 ? (
        <button
          onClick={handlePay}
          disabled={submitting}
          type="button"
          data-testid="guestcart-pay"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 4),
            cm.fontWeight('bold'),
            'fixed bottom-4 left-1/2 -translate-x-1/2 w-[min(94vw,28rem)] rounded-full bg-gradient-to-br from-success to-success/80 text-on-success-container shadow-2xl shadow-success/30 hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
            credit_card
          </span>
          {submitting
            ? t('guestCart.placing', {}, { defaultValue: 'Placing order…' })
            : t(
                'guestCart.payCta',
                { amount: fmtCents(total) },
                { defaultValue: 'Place order · {{amount}}' },
              )}
        </button>
      ) : null}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.flex({ align: 'center', justify: 'between' })}>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{label}</p>
      <p className={cm.cn(cm.textSize('sm'), 'tabular-nums')}>{value}</p>
    </div>
  )
}
