import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { TicketStub } from '../components/TicketStub.js'

interface TicketRow {
  id: string
  ref_code: string
  qr_payload?: string
  status?: string
}

interface OrderRow {
  id: string
  user_id: string
  event_id: string
  tier_id?: string | null
  quantity: number
  subtotal_cents: number
  fees_cents: number
  total_cents: number
  currency?: string
  status: string
  confirmation_code?: string
  created_at: string
  tickets?: TicketRow[]
}

interface EventRow {
  id: string
  title: string
  start_date: string
  start_time?: string | null
  venue?: string | null
  venue_address?: string | null
  city?: string | null
}

interface TierRow {
  id: string
  name: string
  description?: string | null
}

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
}

function fmtWhen(iso: string, time?: string | null): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const wk = d.toLocaleDateString(undefined, { weekday: 'short' })
  const dt = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${wk} · ${dt}${time ? ` · ${time}` : ''}`
}

export function OrderConfirmation() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const http = useHttpClient()
  const [order, setOrder] = useState<OrderRow | null>(null)
  const [event, setEvent] = useState<EventRow | null>(null)
  const [tier, setTier] = useState<TierRow | null>(null)
  const [tickets, setTickets] = useState<TicketRow[]>([])
  const [profileName, setProfileName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const orderRes = await http.get(`/api/orders/${id}`)
        if (cancelled) return
        let ord = orderRes.data as OrderRow
        // Stripe redirected back with session_id but webhook hasn't
        // fulfilled the order yet (typical when running locally
        // without Stripe webhook forwarding). Simulate fulfillment.
        if (sessionId && ord.status !== 'paid') {
          try {
            const sim = await http.post('/api/orders/simulate', { order_id: ord.id })
            if (sim.data && (sim.data as OrderRow).status === 'paid') {
              ord = sim.data as OrderRow
            }
          } catch (_error) {
            /* fall through — UI will display pending state */
          }
        }
        setOrder(ord)
        const [evtRes, profileRes, tierRes, ticketsRes] = await Promise.all([
          http.get(`/api/events/${ord.event_id}`).catch(() => ({ data: null })),
          http.get('/api/profile/me').catch(() => ({ data: null })),
          ord.tier_id
            ? http.get(`/api/ticket-tiers/${ord.tier_id}`).catch(() => ({ data: null }))
            : Promise.resolve({ data: null }),
          // Order-issued tickets are returned in the POST response but the
          // detail endpoint doesn't include them. Pull tickets owned by this
          // user that belong to the order's event.
          http
            .get(`/api/tickets?event_id=${encodeURIComponent(String(ord.event_id))}`)
            .catch(() => ({ data: [] })),
        ])
        if (cancelled) return
        setEvent(evtRes.data as EventRow | null)
        const profile = profileRes.data as {
          displayName?: string
          firstName?: string
          lastName?: string
        } | null
        if (profile) {
          setProfileName(
            profile.displayName?.trim() ||
              [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
              '',
          )
        }
        setTier(tierRes.data as TierRow | null)
        const allTickets = (ticketsRes.data as TicketRow[]) ?? []
        // The order's tickets all share the same order_id; we don't have it
        // on TicketRow here so we use embedded tickets if present, else show
        // every ticket for this event/user (close enough for confirmation).
        setTickets(
          ord.tickets && ord.tickets.length > 0 ? ord.tickets : allTickets.slice(0, ord.quantity),
        )
      } catch (e) {
        if (!cancelled) setError((e as Error).message ?? 'Failed to load order')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http, id, sessionId])

  if (loading) {
    return (
      <div
        className={cm.cn(cm.sp('p', 8), cm.textCenter, cm.textMuted)}
        data-mol-id="page-order-confirmation"
      >
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }
  if (error || !order) {
    return (
      <div className={cm.cn(cm.sp('p', 8), cm.textCenter)} data-mol-id="page-order-confirmation">
        <p role="alert" className={cm.cn('text-error font-bold')}>
          {error ?? t('orderConfirmation.notFound', {}, { defaultValue: 'Order not found.' })}
        </p>
        <Link to="/my-tickets" className={cm.cn('inline-block mt-4 text-primary font-bold')}>
          {t('orderConfirmation.backToTickets', {}, { defaultValue: 'Back to my tickets' })}
        </Link>
      </div>
    )
  }

  const subtotal = order.subtotal_cents
  const fees = order.fees_cents
  const total = order.total_cents

  return (
    <div
      className={cm.cn(cm.sp('p', 8), cm.stack(8), 'max-w-5xl w-full mx-auto')}
      data-mol-id="page-order-confirmation"
    >
      {/* Celebration hero */}
      <section
        className={cm.cn(
          'relative overflow-hidden rounded-3xl p-10 md:p-14 text-white shadow-2xl shadow-primary/30',
        )}
        style={{
          background:
            'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-mid) 50%, var(--color-secondary) 100%)',
        }}
      >
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/10 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn('absolute -left-12 top-0 w-48 h-48 rounded-full opacity-30 blur-3xl')}
          style={{ background: 'var(--color-accent)' }}
          aria-hidden="true"
        />
        <div
          className={cm.cn('relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-center')}
        >
          <div>
            <p
              className={cm.cn('text-xs font-black uppercase tracking-widest opacity-80 mb-3')}
              data-mol-id="confirmation-code"
            >
              {t(
                'orderConfirmation.eyebrow',
                { ref: order.confirmation_code ?? order.id },
                { defaultValue: 'Order #{{ref}}' },
              )}
            </p>
            <h1
              className={cm.cn('text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05]')}
            >
              {order.status === 'paid'
                ? t('orderConfirmation.heading', {}, { defaultValue: 'You’re in!' })
                : order.status === 'refunded'
                  ? t(
                      'orderConfirmation.headingRefunded',
                      {},
                      { defaultValue: 'This order was refunded.' },
                    )
                  : t(
                      'orderConfirmation.headingProcessing',
                      {},
                      { defaultValue: 'Order processing' },
                    )}
            </h1>
            <p className={cm.cn(cm.textSize('lg'), 'mt-3 max-w-md text-white/85 leading-relaxed')}>
              {order.status === 'paid'
                ? t(
                    'orderConfirmation.body',
                    {},
                    {
                      defaultValue:
                        'Your QR tickets are ready. Open them from My Tickets to scan at the door.',
                    },
                  )
                : t(
                    'orderConfirmation.bodyOther',
                    { status: order.status },
                    { defaultValue: 'Order status: {{status}}.' },
                  )}
            </p>
            <div className={cm.cn('mt-6 flex flex-wrap items-center gap-3')}>
              <Link
                to="/my-tickets"
                data-mol-id="open-my-tickets"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  'rounded-full bg-surface text-primary font-bold inline-flex items-center gap-2 shadow-md',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  qr_code_2
                </span>
                {t('orderConfirmation.openLibrary', {}, { defaultValue: 'Open my tickets' })}
              </Link>
            </div>
          </div>
          <div className={cm.cn('relative')}>
            <div
              className={cm.cn('absolute inset-0 rounded-full bg-surface/15 blur-2xl')}
              aria-hidden="true"
            />
            <div
              className={cm.cn(
                'relative w-32 h-32 rounded-full bg-surface text-primary flex items-center justify-center shadow-lg',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined')}
                style={{ fontSize: '4rem', fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                check_circle
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Tickets */}
      <section className={cm.cn(cm.stack(4))}>
        <header className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn('text-2xl font-extrabold tracking-tight')}>
            {t('orderConfirmation.ticketsHeading', {}, { defaultValue: 'Your tickets' })}
          </h2>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'text-on-surface-variant font-bold uppercase tracking-widest',
            )}
            data-mol-id="ticket-count"
          >
            {t(
              'orderConfirmation.ticketsCount',
              { count: tickets.length || order.quantity },
              { defaultValue: '{{count}} passes' },
            )}
          </span>
        </header>
        <div className={cm.cn(cm.stack(4))} data-mol-id="ticket-list">
          {tickets.length === 0 ? (
            <p className={cm.cn(cm.textCenter, cm.sp('py', 6), cm.textMuted)}>
              {t(
                'orderConfirmation.noTickets',
                {},
                { defaultValue: 'Tickets are being issued — refresh in a moment.' },
              )}
            </p>
          ) : null}
          {tickets.map((tk) => (
            <TicketStub
              key={tk.id}
              eventName={event?.title ?? t('ticket.eventFallback', {}, { defaultValue: 'Event' })}
              tier={tier?.name ?? '—'}
              holderName={
                profileName || t('ticket.holderFallback', {}, { defaultValue: 'Ticket holder' })
              }
              whenLabel={event ? fmtWhen(event.start_date, event.start_time) : '—'}
              venueName={event?.venue ?? '—'}
              venueAddress={event?.venue_address ?? ''}
              refCode={tk.ref_code}
              qrSlug={tk.ref_code}
              status={{
                label:
                  order.status === 'paid'
                    ? t('orderConfirmation.status.active', {}, { defaultValue: 'Active' })
                    : order.status === 'refunded'
                      ? t('orderConfirmation.status.refunded', {}, { defaultValue: 'Refunded' })
                      : order.status,
                tone:
                  order.status === 'paid'
                    ? 'active'
                    : order.status === 'refunded'
                      ? 'refunded'
                      : 'used',
              }}
            />
          ))}
        </div>
      </section>

      {/* Order summary */}
      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-2 items-start')}>
        <section
          className={cm.cn(
            'p-6 rounded-2xl bg-surface border border-outline-variant/40 shadow-sm stack-y space-y-4',
          )}
        >
          <h3 className={cm.cn('text-lg font-extrabold tracking-tight')}>
            {t('nav.orderSummary', {}, { defaultValue: 'Order summary' })}
          </h3>
          <ul className={cm.cn(cm.stack(2))}>
            <li className={cm.flex({ align: 'baseline', justify: 'between' })}>
              <div>
                <p className={cm.cn(cm.textSize('sm'), 'font-bold')}>
                  {order.quantity} ×{' '}
                  {tier?.name ??
                    t('orderConfirmation.tierFallback', {}, { defaultValue: 'Ticket' })}
                </p>
                {tier?.description ? (
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {tier.description}
                  </p>
                ) : null}
              </div>
              <span className={cm.cn(cm.textSize('sm'), 'tabular-nums font-bold')}>
                {fmt(subtotal)}
              </span>
            </li>
          </ul>
          <hr className={cm.cn('border-outline-variant/40')} />
          <div className={cm.cn(cm.stack(1))}>
            <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t('nav.subtotal', {}, { defaultValue: 'Subtotal' })}
              </span>
              <span className={cm.cn(cm.textSize('sm'), 'tabular-nums')}>{fmt(subtotal)}</span>
            </div>
            <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t('orderConfirmation.fees', {}, { defaultValue: 'Service fee' })}
              </span>
              <span className={cm.cn(cm.textSize('sm'), 'tabular-nums')}>{fmt(fees)}</span>
            </div>
          </div>
          <hr className={cm.cn('border-outline-variant/40')} />
          <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
            <span
              className={cm.cn(
                'text-xs font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('nav.total', {}, { defaultValue: 'Total' })}
            </span>
            <span
              className={cm.cn('text-2xl font-extrabold tabular-nums tracking-tight')}
              style={{ color: 'var(--color-primary)' }}
              data-mol-id="order-total"
            >
              {fmt(total)}
            </span>
          </div>
        </section>

        <section
          className={cm.cn('p-6 rounded-2xl border border-outline-variant/40 stack-y space-y-4')}
          style={{ background: 'var(--color-background)' }}
        >
          <p className={cm.cn('text-xs font-black uppercase tracking-widest text-primary')}>
            {t('orderConfirmation.nextEyebrow', {}, { defaultValue: 'What’s next' })}
          </p>
          <h3 className={cm.cn('text-xl font-extrabold tracking-tight')}>
            {t('orderConfirmation.nextHeading', {}, { defaultValue: 'Get ready for showtime' })}
          </h3>
          <ul className={cm.cn(cm.stack(3))}>
            <li className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }))}>
              <span
                className={cm.cn('w-9 h-9 rounded-xl flex items-center justify-center')}
                style={{
                  background: 'var(--color-background-tertiary)',
                  color: 'var(--color-primary)',
                }}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  qr_code_2
                </span>
              </span>
              <div className={cm.stack(0)}>
                <p className={cm.cn(cm.textSize('sm'), 'font-bold')}>
                  {t('orderConfirmation.next.qrTitle', {}, { defaultValue: 'Open your QR pass' })}
                </p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(
                    'orderConfirmation.next.qrBody',
                    {},
                    { defaultValue: 'Each ticket has a unique reference. Show it at check-in.' },
                  )}
                </p>
              </div>
            </li>
            <li className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }))}>
              <span
                className={cm.cn('w-9 h-9 rounded-xl flex items-center justify-center')}
                style={{
                  background: 'var(--color-background-tertiary)',
                  color: 'var(--color-primary)',
                }}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  group
                </span>
              </span>
              <div className={cm.stack(0)}>
                <p className={cm.cn(cm.textSize('sm'), 'font-bold')}>
                  {t(
                    'orderConfirmation.next.transferTitle',
                    {},
                    { defaultValue: 'Transfer to a friend' },
                  )}
                </p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(
                    'orderConfirmation.next.transferBody',
                    {},
                    { defaultValue: 'Open a ticket and tap Transfer to email it to someone else.' },
                  )}
                </p>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </div>
  )
}

export default OrderConfirmation
