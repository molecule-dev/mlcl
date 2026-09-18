import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { OrderSummaryCard } from '../components/OrderSummaryCard.js'
import { getBody, unwrapList } from '../lib/unwrap.js'

interface CartItem {
  id: string
  product_id: string
  name: string
  brand: string
  size: string
  qty: number
  price_cents: number
  thumbnail_url?: string | null
  substitution_pref?: 'best_match' | 'specific' | 'remove' | 'contact_me'
}

interface DeliverySlot {
  id: string
  date: string
  start_time: string
  end_time: string
  label: string
  fee_cents: number | null
  remaining_capacity?: number
}

const SUBSTITUTION_OPTIONS = ['best_match', 'specific', 'remove', 'contact_me'] as const
type SubPref = (typeof SUBSTITUTION_OPTIONS)[number]

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

interface CartResponse {
  items?: CartItem[]
  data?: CartItem[]
  delivery_fee_cents?: number
  free_delivery_threshold?: number
}

async function loadCart(
  http: ReturnType<typeof useHttpClient>,
): Promise<{ items: CartItem[]; deliveryFee: number; freeThreshold: number }> {
  const res = await http.get('/api/cart')
  const body = getBody<CartResponse>(res) ?? {}
  // Read the field, don't infer it. GET /api/cart answers a cart OBJECT —
  // `{ data, items, subtotal, delivery_fee_cents, … }` — not a list envelope, so
  // unwrapList correctly refuses to peel it (a `data` array beside application
  // fields is exactly the shape it must not mistake for pagination) and returned
  // []. The cart rendered empty while the API held the item, and every /cart and
  // /checkout test failed on the empty page rather than on the cause.
  const items = body.items ?? body.data ?? []
  return {
    items,
    deliveryFee: typeof body.delivery_fee_cents === 'number' ? body.delivery_fee_cents : 599,
    freeThreshold:
      typeof body.free_delivery_threshold === 'number' ? body.free_delivery_threshold : 3500,
  }
}

export function Cart() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<CartItem[]>([])
  const [slots, setSlots] = useState<DeliverySlot[]>([])
  const [slotId, setSlotId] = useState<string>('')
  const [deliveryFee, setDeliveryFee] = useState<number>(599)
  const [freeThreshold, setFreeThreshold] = useState<number>(3500)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      loadCart(http),
      http
        .get('/api/delivery-slots')
        .then((res) => unwrapList<DeliverySlot>(res))
        .catch(() => [] as DeliverySlot[]),
    ])
      .then(([cart, slotList]) => {
        if (cancelled) return
        setItems(cart.items)
        setDeliveryFee(cart.deliveryFee)
        setFreeThreshold(cart.freeThreshold)
        setSlots(slotList)
        if (slotList.length > 0) setSlotId(slotList[0].id)
      })
      .catch(() => {
        if (!cancelled) setError(t('cart.loadError', {}, { defaultValue: 'Failed to load cart.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function refresh(): Promise<void> {
    try {
      const cart = await loadCart(http)
      setItems(cart.items)
      setDeliveryFee(cart.deliveryFee)
      setFreeThreshold(cart.freeThreshold)
    } catch (_error) {
      // leave stale state in place; surfaced errors come from the failing action
    }
  }

  async function setItemQty(itemId: string, nextQty: number): Promise<void> {
    if (nextQty <= 0) {
      try {
        await http.delete(`/api/cart/items/${itemId}`)
        setItems((prev) => prev.filter((i) => i.id !== itemId))
      } catch (_error) {
        setError(t('cart.removeError', {}, { defaultValue: 'Could not remove item.' }))
      }
      return
    }
    try {
      await http.put(`/api/cart/items/${itemId}`, { quantity: nextQty })
      await refresh()
    } catch (_error) {
      setError(t('cart.updateError', {}, { defaultValue: 'Could not update item.' }))
    }
  }

  async function setItemSub(itemId: string, pref: SubPref): Promise<void> {
    try {
      await http.put(`/api/cart/items/${itemId}`, { substitutionPreference: pref })
      setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, substitution_pref: pref } : i)))
    } catch (_error) {
      setError(t('cart.updateError', {}, { defaultValue: 'Could not update preference.' }))
    }
  }

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.price_cents * i.qty, 0), [items])
  const slotInfo = slots.find((s) => s.id === slotId) ?? null
  const itemCount = items.reduce((s, i) => s + i.qty, 0)
  const slotLabel = slotInfo?.label ?? t('cart.noSlot', {}, { defaultValue: 'Pick a slot' })
  const checkoutHref = slotId ? `/checkout?slot=${slotId}` : '/checkout'

  return (
    <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header className={cm.sp('mb', 8)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            'font-black uppercase tracking-widest text-primary-dark mb-1',
          )}
        >
          {t('cart.eyebrow', {}, { defaultValue: 'Your bushel' })}
        </p>
        <h1
          className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          {t('cart.heading', {}, { defaultValue: 'Your cart' })}
        </h1>
      </header>

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12')}>
        <section className={'lg:col-span-7 space-y-6'}>
          {error ? (
            <p className={cm.cn(cm.sp('py', 4), cm.textCenter, 'text-error')} role="alert">
              {error}
            </p>
          ) : null}
          {loading ? (
            <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : items.length === 0 ? (
            <div
              className={cm.cn(
                cm.sp('py', 20),
                'rounded-2xl bg-surface-container-lowest text-center',
              )}
            >
              <span
                className="material-symbols-outlined text-6xl text-on-surface-variant/40"
                aria-hidden="true"
              >
                shopping_basket
              </span>
              <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 3), cm.textMuted)}>
                {t('cart.empty', {}, { defaultValue: 'Your cart is empty.' })}
              </p>
              <Link
                to="/shop"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 3),
                  cm.sp('mt', 6),
                  cm.fontWeight('bold'),
                  'inline-flex items-center gap-2 bg-primary text-on-primary rounded-full hover:shadow-lg transition-shadow',
                )}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  storefront
                </span>
                {t('cart.shopCta', {}, { defaultValue: 'Start shopping' })}
              </Link>
            </div>
          ) : (
            <ul className={'space-y-3'}>
              {items.map((item) => (
                <li
                  key={item.id}
                  data-test="cart-item"
                  data-product-id={item.product_id}
                  className={cm.cn(
                    cm.sp('p', 4),
                    cm.flex({ align: 'start', gap: 'md' }),
                    'bg-surface-container-lowest rounded-2xl shadow-sm border-l-4 border-primary',
                  )}
                >
                  <div
                    className={
                      'h-20 w-20 bg-surface-container rounded-xl flex-shrink-0 overflow-hidden'
                    }
                  >
                    {item.thumbnail_url ? (
                      <img
                        src={item.thumbnail_url}
                        alt=""
                        className={'h-full w-full object-cover'}
                      />
                    ) : (
                      <div
                        className={
                          'h-full w-full flex items-center justify-center text-on-surface-variant/40'
                        }
                      >
                        <span className="material-symbols-outlined text-3xl">shopping_basket</span>
                      </div>
                    )}
                  </div>
                  <div className={'flex-1 min-w-0'}>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        'font-black uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {item.brand}
                    </p>
                    <h2
                      className={cm.cn(cm.textSize('base'), 'font-extrabold tracking-tight mt-0.5')}
                      style={{ fontFamily: 'DM Sans, sans-serif' }}
                    >
                      {item.name}
                    </h2>
                    <p className={cm.cn(cm.textSize('xs'), cm.textMuted, 'mt-0.5')}>{item.size}</p>

                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' }),
                        cm.sp('mt', 3),
                      )}
                    >
                      <div
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'sm' }),
                          cm.sp('px', 2),
                          'border border-outline-variant rounded-full py-0.5',
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setItemQty(item.id, item.qty - 1)}
                          className={cm.cn(
                            cm.sp('px', 2),
                            cm.fontWeight('bold'),
                            'text-on-surface hover:text-primary',
                          )}
                          aria-label={t('cart.decrement', {}, { defaultValue: 'Decrement' })}
                        >
                          −
                        </button>
                        <span
                          data-test="qty"
                          className={cm.cn(cm.fontWeight('bold'), 'tabular-nums w-6 text-center')}
                        >
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setItemQty(item.id, item.qty + 1)}
                          className={cm.cn(
                            cm.sp('px', 2),
                            cm.fontWeight('bold'),
                            'text-on-surface hover:text-primary',
                          )}
                          aria-label={t('cart.increment', {}, { defaultValue: 'Increment' })}
                        >
                          +
                        </button>
                      </div>
                      <span
                        className={cm.cn(
                          cm.textSize('lg'),
                          'font-black tabular-nums text-primary-dark',
                        )}
                        style={{ fontFamily: 'DM Sans, sans-serif' }}
                      >
                        {fmt(item.price_cents * item.qty)}
                      </span>
                    </div>

                    <label className={cm.cn(cm.sp('mt', 3), 'block')}>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'font-black uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {t('cart.substitutionLabel', {}, { defaultValue: 'If unavailable' })}
                      </span>
                      <select
                        aria-label={t(
                          'cart.substitutionLabel',
                          {},
                          { defaultValue: 'If unavailable' },
                        )}
                        value={item.substitution_pref ?? 'best_match'}
                        onChange={(e) => setItemSub(item.id, e.target.value as SubPref)}
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 2),
                          cm.sp('mt', 1),
                          cm.w('full'),
                          cm.textSize('sm'),
                          'border border-outline-variant rounded-lg bg-surface-container-lowest',
                        )}
                      >
                        {SUBSTITUTION_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {t(
                              `cart.substitution.${opt}`,
                              {},
                              {
                                defaultValue:
                                  opt === 'best_match'
                                    ? 'Pick best match'
                                    : opt === 'specific'
                                      ? 'Specific substitute only'
                                      : opt === 'remove'
                                        ? 'Remove if missing'
                                        : 'Contact me',
                              },
                            )}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => setItemQty(item.id, 0)}
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.sp('mt', 2),
                        'text-on-surface-variant hover:text-error underline',
                      )}
                    >
                      {t('cart.remove', {}, { defaultValue: 'Remove' })}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {items.length > 0 && (
            <div
              className={cm.cn(cm.sp('p', 5), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
            >
              <h2
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-black uppercase tracking-widest text-primary-dark mb-3',
                )}
              >
                {t('cart.slotHeading', {}, { defaultValue: 'Delivery slot' })}
              </h2>
              {slots.length === 0 ? (
                <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                  {t(
                    'cart.noSlots',
                    {},
                    { defaultValue: 'No delivery slots are currently available.' },
                  )}
                </p>
              ) : (
                <div className={'grid grid-cols-1 sm:grid-cols-2 gap-2'}>
                  {slots.slice(0, 8).map((s) => {
                    const isActive = slotId === s.id
                    return (
                      <label
                        key={s.id}
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 3),
                          cm.flex({ align: 'center', justify: 'between' }),
                          'border-2 rounded-xl cursor-pointer transition-all',
                          isActive
                            ? 'border-primary bg-primary/5'
                            : 'border-outline-variant hover:border-primary/40',
                        )}
                      >
                        <span className={cm.flex({ align: 'center', gap: 'sm' })}>
                          <input
                            type="radio"
                            name="slot"
                            value={s.id}
                            checked={isActive}
                            onChange={() => setSlotId(s.id)}
                            className="accent-primary"
                          />
                          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                            {s.label}
                          </span>
                        </span>
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            (s.fee_cents ?? deliveryFee) === 0
                              ? 'text-success'
                              : 'text-on-surface-variant',
                          )}
                        >
                          {(s.fee_cents ?? deliveryFee) === 0
                            ? t('nav.free', {}, { defaultValue: 'Free' })
                            : fmt(s.fee_cents ?? deliveryFee)}
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        <aside className={'lg:col-span-5'}>
          <OrderSummaryCard
            itemCount={itemCount}
            subtotalCents={subtotal}
            deliveryFeeCents={slotInfo?.fee_cents ?? deliveryFee}
            taxCents={0}
            slotLabel={slotLabel}
            preview={items
              .slice(0, 3)
              .map((i) => ({ name: i.name, qty: i.qty, price_cents: i.price_cents }))}
            ctaTo={checkoutHref}
            ctaKey="cart.checkoutCta"
            ctaDefault="Continue to checkout · {{total}}"
            freeDeliveryThresholdCents={freeThreshold}
            emptyState={items.length === 0}
          />
        </aside>
      </div>
    </div>
  )
}
