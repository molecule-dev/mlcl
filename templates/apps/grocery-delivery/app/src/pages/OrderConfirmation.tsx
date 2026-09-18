import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { StatusTimeline } from '@molecule/app-status-timeline-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

const STEPS = [
  { key: 'placed', defaultLabel: 'Order placed' },
  { key: 'shopping', defaultLabel: 'Picking your items' },
  { key: 'packed', defaultLabel: 'Packed and ready' },
  { key: 'on_the_way', defaultLabel: 'On the way' },
  { key: 'delivered', defaultLabel: 'Delivered' },
] as const

interface OrderItem {
  id: string
  name?: string
  qty: number
  price_cents: number
}

interface Order {
  id: string
  status?: string
  items?: OrderItem[]
  subtotal_cents?: number
  delivery_fee_cents?: number
  tip_cents?: number
  tax_cents?: number
  total_cents?: number
  delivery_slot?: string
  address?: string
}

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function OrderConfirmation() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/orders/${id}`)
      .then((res) => unwrapSingle<Order>(res))
      .then((o) => {
        if (!cancelled) setOrder(o)
      })
      .catch(() => {
        if (!cancelled) setOrder(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id])

  const items = order?.items ?? []
  const subtotal = order?.subtotal_cents ?? items.reduce((s, i) => s + i.qty * i.price_cents, 0)
  const deliveryFee = order?.delivery_fee_cents ?? 0
  const tip = order?.tip_cents ?? 0
  const tax = order?.tax_cents ?? Math.round(subtotal * 0.0875)
  const total = order?.total_cents ?? subtotal + deliveryFee + tip + tax
  const slot =
    order?.delivery_slot ??
    t('orderConfirmation.slotSample', {}, { defaultValue: 'your scheduled window' })
  const address =
    order?.address ??
    t('orderConfirmation.address', {}, { defaultValue: '742 Evergreen Terrace, Springfield 54321' })
  const currentStep =
    (order?.status as 'placed' | 'shopping' | 'packed' | 'on_the_way' | 'delivered' | undefined) ??
    'placed'

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 10), cm.mxAuto, 'space-y-8')}>
      <section
        className={
          'relative overflow-hidden rounded-[2rem] text-center p-10 lg:p-14 text-white shadow-2xl'
        }
        style={{
          background:
            'linear-gradient(135deg, var(--color-gradient-start) 0%, var(--color-gradient-mid) 50%, var(--color-gradient-end) 100%)',
        }}
      >
        <div
          className={
            'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl pointer-events-none'
          }
          aria-hidden="true"
        />
        <div
          className={
            'absolute -left-20 -top-20 w-56 h-56 rounded-full bg-lime-300/30 blur-3xl pointer-events-none'
          }
          aria-hidden="true"
        />

        <div className="relative z-10">
          <div
            className={
              'mx-auto inline-flex items-center justify-center w-20 h-20 rounded-full bg-surface shadow-xl mb-6'
            }
          >
            <span
              className="material-symbols-outlined text-5xl text-primary-dark"
              aria-hidden="true"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
          </div>
          <p className={'text-[11px] font-black uppercase tracking-widest text-white/80 mb-2'}>
            {t('orderConfirmation.eyebrow', {}, { defaultValue: 'Order confirmed' })}
          </p>
          <h1
            className={'text-4xl md:text-5xl font-black tracking-tight'}
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            {t('orderConfirmation.heading', {}, { defaultValue: 'Order placed!' })}
          </h1>
          <p className={'text-base md:text-lg text-white/90 mt-3 max-w-xl mx-auto'}>
            {t(
              'orderConfirmation.subheading',
              { slot },
              { defaultValue: 'Your bushel arrives during {{slot}}.' },
            )}
          </p>
          <span
            className={
              'inline-flex items-center gap-2 mt-4 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-surface/20 backdrop-blur-md'
            }
            data-test="order-ref"
          >
            <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
              tag
            </span>
            {t(
              'orderConfirmation.orderRef',
              { id: order?.id ?? id ?? '' },
              { defaultValue: '#{{id}}' },
            )}
          </span>
        </div>
      </section>

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12')}>
        <section className={'lg:col-span-7 bg-surface-container-lowest rounded-2xl shadow-sm p-6'}>
          <header className={'mb-4'}>
            <p
              className={'text-[11px] font-black uppercase tracking-widest text-primary-dark mb-1'}
            >
              {t('orderConfirmation.progressEyebrow', {}, { defaultValue: 'What happens next' })}
            </p>
            <h2
              className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {t('orderConfirmation.progressHeading', {}, { defaultValue: 'Order progress' })}
            </h2>
          </header>
          <StatusTimeline
            currentKey={currentStep}
            steps={STEPS.map((s) => ({
              key: s.key,
              label: t(`orderConfirmation.step.${s.key}`, {}, { defaultValue: s.defaultLabel }),
            }))}
          />
        </section>

        <aside
          className={
            'lg:col-span-5 bg-surface-container-lowest rounded-2xl shadow-sm p-6 space-y-4'
          }
        >
          <div>
            <p
              className={
                'text-[11px] font-black uppercase tracking-widest text-on-surface-variant mb-2'
              }
            >
              {t('orderConfirmation.summaryHeading', {}, { defaultValue: 'Order summary' })}
            </p>
            <ul className={'text-sm space-y-1.5'} data-test="order-items">
              {loading ? (
                <li className={'text-on-surface-variant'}>
                  {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
                </li>
              ) : items.length === 0 ? (
                <li className={'text-on-surface-variant'}>
                  {t('orderConfirmation.noItems', {}, { defaultValue: 'No items.' })}
                </li>
              ) : (
                items.map((item, idx) => (
                  <li key={item.id ?? idx} className={'flex items-baseline gap-2'}>
                    <span
                      className={
                        'inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary-dark text-[10px] font-black tabular-nums'
                      }
                    >
                      {item.qty}
                    </span>
                    <span className={'flex-1 text-on-surface'}>
                      {item.name ??
                        t('orderConfirmation.itemFallback', {}, { defaultValue: 'Item' })}
                    </span>
                    <span className="text-on-surface-variant tabular-nums text-[12px]">
                      {fmt(item.qty * item.price_cents)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className={'border-t border-outline-variant/40 pt-3 space-y-1.5 text-sm'}>
            <div className={'flex items-baseline justify-between'}>
              <span className="text-on-surface-variant">
                {t('nav.subtotal', {}, { defaultValue: 'Subtotal' })}
              </span>
              <span className="font-semibold tabular-nums">{fmt(subtotal)}</span>
            </div>
            <div className={'flex items-baseline justify-between'}>
              <span className="text-on-surface-variant">
                {t('orderConfirmation.delivery', {}, { defaultValue: 'Delivery' })}
              </span>
              <span className="font-semibold tabular-nums">
                {deliveryFee === 0 ? t('nav.free', {}, { defaultValue: 'Free' }) : fmt(deliveryFee)}
              </span>
            </div>
            {tip > 0 ? (
              <div className={'flex items-baseline justify-between'}>
                <span className="text-on-surface-variant">
                  {t('orderConfirmation.tip', {}, { defaultValue: 'Tip' })}
                </span>
                <span className="font-semibold tabular-nums">{fmt(tip)}</span>
              </div>
            ) : null}
            <div className={'flex items-baseline justify-between'}>
              <span className="text-on-surface-variant">
                {t('form.tax', {}, { defaultValue: 'Tax' })}
              </span>
              <span className="font-semibold tabular-nums">{fmt(tax)}</span>
            </div>
            <div
              className={
                'border-t border-outline-variant/40 pt-2 mt-2 flex items-baseline justify-between'
              }
            >
              <span className={'text-base font-extrabold'}>
                {t('nav.total', {}, { defaultValue: 'Total' })}
              </span>
              <span
                className={'text-xl font-black text-primary-dark tabular-nums'}
                data-test="order-total"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                {fmt(total)}
              </span>
            </div>
          </div>

          <p className={'text-xs text-on-surface-variant pt-2 border-t border-outline-variant/40'}>
            <span
              className={'material-symbols-outlined text-base align-middle mr-1 text-primary-dark'}
              aria-hidden="true"
            >
              place
            </span>
            {address}
          </p>
        </aside>
      </div>

      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'md', wrap: 'wrap' }))}
      >
        <Link
          to={`/order/${id ?? ''}`}
          className={cm.cn(
            cm.sp('px', 8),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'inline-flex items-center gap-2 bg-primary text-on-primary rounded-full hover:shadow-lg transition-shadow',
          )}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            local_shipping
          </span>
          {t('orderConfirmation.trackCta', {}, { defaultValue: 'Track order' })}
        </Link>
        <Link
          to="/shop"
          className={cm.cn(
            cm.sp('px', 8),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'inline-flex items-center gap-2 border-2 border-primary text-primary-dark rounded-full hover:bg-primary/5 transition-colors',
          )}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            storefront
          </span>
          {t('orderConfirmation.continueCta', {}, { defaultValue: 'Continue shopping' })}
        </Link>
      </div>
    </div>
  )
}
