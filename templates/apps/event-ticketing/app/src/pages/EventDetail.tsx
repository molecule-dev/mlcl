import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface EventDetailRow {
  id: string
  title: string
  description?: string | null
  category: string
  start_date: string
  end_date?: string | null
  start_time?: string | null
  end_time?: string | null
  venue?: string | null
  venue_address?: string | null
  city?: string | null
  cover_image_key?: string | null
  organizer_user_id?: string | null
  tags?: string[] | null
}

interface TicketTierRow {
  id: string
  name: string
  description?: string | null
  price_cents: number
  quantity_total: number
  quantity_sold: number
}

function fmtDate(iso: string): { weekday: string; date: string; time: string } {
  const d = new Date(iso)
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: 'long' }),
    date: d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  }
}

function fmtPrice(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
}

export function EventDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth<{ id?: string }>()
  const { id } = useParams()
  const [event, setEvent] = useState<EventDetailRow | null>(null)
  const [tiers, setTiers] = useState<TicketTierRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [evtRes, tierRes] = await Promise.all([
          http.get(`/api/events/${id}`),
          http.get(`/api/ticket-tiers?event_id=${encodeURIComponent(String(id))}`),
        ])
        if (cancelled) return
        setEvent(evtRes.data as EventDetailRow)
        setTiers((tierRes.data as TicketTierRow[]) ?? [])
      } catch (e) {
        if (!cancelled) setError((e as Error).message ?? 'Failed to load event')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http, id])

  const evt = event
  const list = tiers
  const start = evt ? fmtDate(evt.start_date) : null

  const subtotal = useMemo(() => {
    return list.reduce((sum, tier) => sum + (counts[tier.id] ?? 0) * tier.price_cents, 0)
  }, [list, counts])
  const totalCount = useMemo(() => Object.values(counts).reduce((a, b) => a + b, 0), [counts])
  const selectedTierId = useMemo(
    () => Object.entries(counts).find(([, qty]) => qty > 0)?.[0] ?? null,
    [counts],
  )

  function adjust(tierId: string, delta: number, available: number) {
    setCounts((prev) => {
      const cur = prev[tierId] ?? 0
      const next = Math.max(0, Math.min(available, cur + delta))
      const updated = { ...prev, [tierId]: next }
      if (delta > 0) {
        for (const k of Object.keys(updated)) {
          if (k !== tierId) updated[k] = 0
        }
      }
      return updated
    })
  }

  async function handlePurchase(e: React.MouseEvent) {
    e.preventDefault()
    if (!evt || !selectedTierId) return
    const quantity = counts[selectedTierId] ?? 0
    if (quantity === 0) return
    // Anonymous users are bounced to /signup with a return path so they
    // can complete the purchase right after creating an account.
    if (!isAuthenticated) {
      navigate(`/signup?redirect=${encodeURIComponent(`/events/${evt.id}`)}`)
      return
    }
    setPurchasing(true)
    setPurchaseError(null)
    try {
      const res = await http.post('/api/orders', {
        event_id: evt.id,
        tier_id: selectedTierId,
        quantity,
      })
      const order = res.data as { id: string; checkoutUrl?: string }
      void track({
        name: 'order.created',
        properties: { order_id: order.id, event_id: evt.id, tier_id: selectedTierId, quantity },
      })
      // Paid orders return a Stripe Checkout URL; the success_url
      // redirects the buyer back to /orders/:id/confirmation, which
      // finalizes (or simulates) fulfillment.
      if (order.checkoutUrl) {
        window.location.href = order.checkoutUrl
        return
      }
      navigate(`/orders/${order.id}/confirmation`)
    } catch (err) {
      setPurchaseError((err as Error).message ?? 'Could not complete checkout')
      setPurchasing(false)
    }
  }

  if (loading) {
    return (
      <div
        className={cm.cn(cm.sp('p', 8), cm.textCenter, cm.textMuted)}
        data-mol-id="page-event-detail"
      >
        {t('eventDetail.loading', {}, { defaultValue: 'Loading event…' })}
      </div>
    )
  }

  if (!evt || !start) {
    return (
      <div className={cm.cn(cm.sp('p', 8), cm.textCenter)} data-mol-id="page-event-detail">
        <p role="alert" className={cm.cn('text-on-error font-bold')}>
          {t('eventDetail.notFound', {}, { defaultValue: error ?? 'Event not found.' })}
        </p>
        <Link to="/events" className={cm.cn('inline-block mt-4 text-primary font-bold')}>
          {t('eventDetail.back', {}, { defaultValue: 'Back to discover' })}
        </Link>
      </div>
    )
  }

  return (
    <div
      className={cm.cn(cm.sp('p', 8), cm.stack(8), 'max-w-7xl w-full mx-auto')}
      data-mol-id="page-event-detail"
    >
      {/* Hero banner */}
      <section
        className={cm.cn(
          'relative overflow-hidden rounded-3xl text-white shadow-2xl shadow-primary/30 min-h-[360px] p-10 md:p-16',
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
        <div className={cm.cn('relative z-10 max-w-3xl')}>
          <Link
            to="/events"
            className={cm.cn(
              'inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-white/70 hover:text-white mb-6',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              arrow_back
            </span>
            {t('eventDetail.back', {}, { defaultValue: 'Back to discover' })}
          </Link>
          <p className={cm.cn('text-xs font-black uppercase tracking-widest opacity-80 mb-3')}>
            {evt.category}
          </p>
          <h1
            className={cm.cn('text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05]')}
          >
            {evt.title}
          </h1>
          <div
            className={cm.cn(
              'mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium',
            )}
          >
            <span className={cm.flex({ align: 'center', gap: 'xs' })}>
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                event
              </span>
              {start.weekday} · {start.date}
            </span>
            <span className={cm.flex({ align: 'center', gap: 'xs' })}>
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                schedule
              </span>
              {evt.start_time ?? start.time} {evt.end_time ? `– ${evt.end_time}` : null}
            </span>
            {evt.venue ? (
              <span className={cm.flex({ align: 'center', gap: 'xs' })}>
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  place
                </span>
                {evt.venue}
                {evt.city ? ` · ${evt.city}` : ''}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3 items-start')}>
        {/* Left — about + venue + organizer */}
        <div className={cm.cn('lg:col-span-2 stack-y space-y-8')}>
          <article
            className={cm.cn(
              'p-8 rounded-2xl bg-surface border border-outline-variant/40 shadow-sm stack-y space-y-3',
            )}
          >
            <p className={cm.cn('text-xs font-black uppercase tracking-widest text-primary')}>
              {t('nav.about', {}, { defaultValue: 'About' })}
            </p>
            <h2 className={cm.cn('text-2xl font-extrabold tracking-tight')}>
              {t('eventDetail.aboutHeading', {}, { defaultValue: 'What to expect' })}
            </h2>
            {evt.description ? (
              <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant leading-relaxed')}>
                {evt.description}
              </p>
            ) : null}
            {Array.isArray(evt.tags) && evt.tags.length > 0 ? (
              <div className={cm.cn('mt-4 flex items-center gap-3 flex-wrap')}>
                {evt.tags.map((tag) => (
                  <span
                    key={tag}
                    className={cm.cn(
                      'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-surface-container-low text-on-surface-variant',
                    )}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </article>

          <article
            className={cm.cn(
              'p-8 rounded-2xl bg-surface border border-outline-variant/40 shadow-sm stack-y space-y-4',
            )}
          >
            <p className={cm.cn('text-xs font-black uppercase tracking-widest text-primary')}>
              {t('eventDetail.venueEyebrow', {}, { defaultValue: 'Venue' })}
            </p>
            <h2 className={cm.cn('text-2xl font-extrabold tracking-tight')}>
              {evt.venue ??
                t('eventDetail.venueTbd', {}, { defaultValue: 'Venue to be announced' })}
            </h2>
            {evt.venue_address ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {evt.venue_address}
                {evt.city ? `, ${evt.city}` : ''}
              </p>
            ) : null}
            <div
              className={cm.cn(
                'mt-2 h-48 rounded-xl border border-outline-variant/40 relative overflow-hidden',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--color-background), var(--color-background-tertiary))',
              }}
              aria-hidden="true"
            >
              <span
                className={cm.cn(
                  'absolute inset-0 flex items-center justify-center material-symbols-outlined text-5xl text-primary/50',
                )}
              >
                map
              </span>
              <div
                className={cm.cn(
                  'absolute right-4 top-4 px-3 py-1 rounded-full text-xs font-bold bg-surface/95 shadow-md text-primary',
                )}
              >
                {t('eventDetail.directions', {}, { defaultValue: 'Get directions →' })}
              </div>
            </div>
          </article>
        </div>

        {/* Right — ticket tier selector */}
        <aside className={cm.cn('lg:sticky lg:top-6 stack-y space-y-4')}>
          <article
            className={cm.cn(
              'p-6 rounded-2xl bg-surface border-2 border-primary/30 shadow-lg shadow-primary/10 stack-y space-y-5',
            )}
          >
            <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
              <h3 className={cm.cn('text-lg font-extrabold tracking-tight')}>
                {t('eventDetail.ticketsHeading', {}, { defaultValue: 'Tickets' })}
              </h3>
              <span
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full',
                )}
                style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}
              >
                {t('eventDetail.onSale', {}, { defaultValue: 'On sale' })}
              </span>
            </header>
            <div className={cm.cn(cm.stack(3))}>
              {list.length === 0 ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant text-center py-4')}>
                  {t(
                    'eventDetail.noTiers',
                    {},
                    { defaultValue: 'No ticket tiers have been published yet.' },
                  )}
                </p>
              ) : null}
              {list.map((tier) => {
                const available = Math.max(0, tier.quantity_total - tier.quantity_sold)
                const lowStock = available > 0 && available <= 50
                const soldOut = available === 0
                const count = counts[tier.id] ?? 0
                return (
                  <div
                    key={tier.id}
                    className={cm.cn('p-4 rounded-xl border')}
                    style={{
                      borderStyle: 'dashed',
                      borderColor: 'var(--color-border-secondary)',
                      background: 'var(--color-background)',
                    }}
                  >
                    <div className={cm.flex({ align: 'start', justify: 'between', gap: 'md' })}>
                      <div className={cm.cn(cm.stack(1), 'flex-1 min-w-0')}>
                        <p className={cm.cn(cm.textSize('sm'), 'font-extrabold text-on-surface')}>
                          {tier.name}
                        </p>
                        {tier.description ? (
                          <p
                            className={cm.cn(
                              cm.textSize('xs'),
                              'text-on-surface-variant leading-snug',
                            )}
                          >
                            {tier.description}
                          </p>
                        ) : null}
                        <p
                          className={cm.cn(
                            'text-lg font-extrabold tabular-nums tracking-tight mt-1',
                          )}
                          style={{ color: 'var(--color-primary)' }}
                        >
                          {fmtPrice(tier.price_cents)}
                        </p>
                      </div>
                      {soldOut ? (
                        <span
                          className={cm.cn(
                            'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white',
                          )}
                          style={{ background: 'var(--color-error)' }}
                        >
                          {t('eventDetail.soldOut', {}, { defaultValue: 'Sold out' })}
                        </span>
                      ) : (
                        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'shrink-0')}>
                          <button
                            type="button"
                            aria-label={t(
                              'eventDetail.decrement',
                              {},
                              { defaultValue: 'Remove one' },
                            )}
                            disabled={count === 0}
                            onClick={() => adjust(tier.id, -1, available)}
                            className={cm.cn(
                              'w-9 h-9 rounded-lg border border-primary/40 text-primary font-bold disabled:opacity-40 hover:bg-primary/5',
                            )}
                          >
                            −
                          </button>
                          <span className={cm.cn('w-7 text-center font-bold tabular-nums')}>
                            {count}
                          </span>
                          <button
                            type="button"
                            aria-label={t('eventDetail.increment', {}, { defaultValue: 'Add one' })}
                            onClick={() => adjust(tier.id, +1, available)}
                            disabled={count >= available}
                            className={cm.cn(
                              'w-9 h-9 rounded-lg text-white font-bold disabled:opacity-40',
                            )}
                            style={{
                              background:
                                'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                            }}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                    {lowStock ? (
                      <p
                        className={cm.cn(cm.textSize('xs'), 'mt-2 font-bold')}
                        style={{ color: 'var(--color-warning)' }}
                      >
                        {t(
                          'eventDetail.lowStock',
                          { count: available },
                          { defaultValue: 'Only {{count}} left at this tier' },
                        )}
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </div>

            <div
              className={cm.cn('p-4 rounded-xl flex items-center justify-between')}
              style={{ background: 'var(--color-background-secondary)' }}
            >
              <div>
                <p
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('nav.subtotal', {}, { defaultValue: 'Subtotal' })}
                </p>
                <p
                  className={cm.cn('text-2xl font-extrabold tabular-nums tracking-tight')}
                  style={{ color: 'var(--color-primary)' }}
                >
                  {fmtPrice(subtotal)}
                </p>
              </div>
              <button
                type="button"
                disabled={totalCount === 0 || purchasing}
                onClick={handlePurchase}
                data-mol-id="purchase-tickets-button"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  'rounded-full text-white font-bold shadow-md shadow-primary/30 hover:-translate-y-0.5 transition-transform inline-flex items-center gap-2',
                  totalCount === 0 || purchasing ? 'opacity-50 cursor-not-allowed' : '',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                }}
              >
                {purchasing
                  ? t('eventDetail.purchasing', {}, { defaultValue: 'Processing…' })
                  : !isAuthenticated
                    ? t(
                        'eventDetail.signInToBuy',
                        { count: totalCount },
                        { defaultValue: 'Sign in to buy · {{count}}' },
                      )
                    : t(
                        'eventDetail.checkout',
                        { count: totalCount },
                        { defaultValue: 'Buy now · {{count}}' },
                      )}
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  arrow_forward
                </span>
              </button>
            </div>
            {purchaseError ? (
              <p role="alert" className={cm.cn(cm.textSize('xs'), 'text-error font-bold')}>
                {purchaseError}
              </p>
            ) : null}
          </article>

          {/* Organizer-only: the attendees endpoint 404s for anyone else. */}
          {isAuthenticated && evt.organizer_user_id && user?.id === evt.organizer_user_id ? (
            <Link
              to={`/events/${evt.id}/attendees`}
              className={cm.cn(
                'p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/40 flex items-center justify-between hover:-translate-y-0.5 hover:shadow-sm transition-all',
              )}
            >
              <div>
                <p
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('eventDetail.organizerTools', {}, { defaultValue: 'Organizer tools' })}
                </p>
                <p className={cm.cn(cm.textSize('sm'), 'font-bold text-on-surface mt-0.5')}>
                  {t('eventDetail.attendeesCta', {}, { defaultValue: 'Attendees & check-in →' })}
                </p>
              </div>
              <span
                className={cm.cn('material-symbols-outlined text-2xl text-primary')}
                aria-hidden="true"
              >
                qr_code_scanner
              </span>
            </Link>
          ) : null}
        </aside>
      </div>
    </div>
  )
}

export default EventDetail
