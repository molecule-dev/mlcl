import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { parsePassengerCount } from '../lib/passengers.js'

interface FlightLeg {
  origin_code: string
  origin_city: string
  destination_code: string
  destination_city: string
  airline: string
  flight_number: string
  aircraft: string
  departure_time: string
  arrival_time: string
  duration_minutes: number
  cabin_class: string
}

interface FlightDetailModel {
  id: string
  airline: string
  legs: FlightLeg[]
  stops: number
  stop_airports: string[]
  base_fare: number
  taxes: number
  fees: number
  total: number
  refundable: boolean
  baggage_included: boolean
  amenities: string[]
}

interface ApiFlight {
  id: string
  airline: string
  airline_code?: string | null
  flight_number: string
  origin_code: string
  origin_city?: string | null
  destination_code: string
  destination_city?: string | null
  departure_time: string
  arrival_time: string
  duration_minutes: number
  stops: number
  stop_airports?: string[]
  cabin: string
  cabin_class?: string
  price: number
  price_cents: number
  refundable?: boolean
  baggage_included?: boolean
  aircraft?: string | null
  amenities?: string[]
}

function toModel(api: ApiFlight): FlightDetailModel {
  const total = api.price ?? api.price_cents / 100
  const taxes = Math.round(total * 0.08 * 100) / 100
  const fees = Math.round(total * 0.025 * 100) / 100
  const base = Math.max(0, Math.round((total - taxes - fees) * 100) / 100)
  return {
    id: api.id,
    airline: api.airline,
    legs: [
      {
        origin_code: api.origin_code,
        origin_city: api.origin_city ?? api.origin_code,
        destination_code: api.destination_code,
        destination_city: api.destination_city ?? api.destination_code,
        airline: api.airline,
        flight_number: api.flight_number,
        aircraft: api.aircraft ?? '',
        departure_time: api.departure_time,
        arrival_time: api.arrival_time,
        duration_minutes: api.duration_minutes,
        cabin_class: api.cabin_class ?? api.cabin ?? 'economy',
      },
    ],
    stops: Number(api.stops ?? 0),
    stop_airports: Array.isArray(api.stop_airports) ? api.stop_airports : [],
    base_fare: base,
    taxes,
    fees,
    total,
    refundable: Boolean(api.refundable),
    baggage_included: Boolean(api.baggage_included),
    amenities: Array.isArray(api.amenities) ? api.amenities : [],
  }
}

function fmtPrice(value: number): string {
  return `$${Math.round(value).toLocaleString()}`
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function FlightDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id = '' } = useParams()
  const [searchParams] = useSearchParams()
  const passengers = parsePassengerCount(searchParams.get('passengers'))
  const [flight, setFlight] = useState<FlightDetailModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get(`/api/flights/${encodeURIComponent(id)}`)
      .then((res) => {
        if (cancelled) return
        const data = (res as { data?: ApiFlight }).data ?? (res as unknown as ApiFlight)
        if (!data || !data.id) throw new Error('No flight payload')
        setFlight(toModel(data))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        console.error('[FlightDetail] failed:', err)
        setError(
          t('flightDetail.errorMessage', {}, { defaultValue: 'Could not load flight details.' }),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (loading) {
    return (
      <div
        className={cm.cn(
          cm.maxW('5xl'),
          cm.sp('px', 6),
          cm.sp('py', 16),
          cm.mxAuto,
          cm.textCenter,
          'text-on-surface-variant',
        )}
      >
        {t('flightDetail.loading', {}, { defaultValue: 'Loading flight details…' })}
      </div>
    )
  }

  if (error || !flight) {
    return (
      <div
        className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 16), cm.mxAuto, cm.textCenter)}
      >
        <p className={cm.cn('text-error', cm.fontWeight('semibold'))}>
          {error ?? t('flightDetail.notFound', {}, { defaultValue: 'Flight not found.' })}
        </p>
        <Link
          to="/search"
          className={cm.cn(
            cm.sp('mt', 4),
            cm.flex({ align: 'center', gap: 'xs', justify: 'center' }),
            cm.textSize('sm'),
            'text-primary hover:underline',
          )}
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            arrow_back
          </span>
          {t('flightDetail.backToResults', {}, { defaultValue: 'Back to results' })}
        </Link>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <Link
        to="/search"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          'text-primary hover:underline',
        )}
      >
        <span className={'material-symbols-outlined text-base'} aria-hidden="true">
          arrow_back
        </span>
        {t('flightDetail.backToResults', {}, { defaultValue: 'Back to results' })}
      </Link>

      {/* Hero */}
      <section
        className={cm.cn(
          cm.sp('p', 8),
          cm.sp('mt', 4),
          'relative overflow-hidden bg-gradient-to-br from-primary via-secondary to-primary-container text-white rounded-[2rem] shadow-lg',
        )}
      >
        <div
          className={cm.cn(
            cm.w(64),
            cm.h(64),
            cm.roundedFull,
            'absolute -right-20 -top-20 bg-surface/10 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            cm.w(48),
            cm.h(48),
            cm.roundedFull,
            'absolute -left-12 -bottom-12 bg-accent/30 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div className="relative z-10">
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.25em] text-accent',
            )}
          >
            {flight.stops === 0
              ? t(
                  'flightDetail.eyebrow',
                  { airline: flight.airline },
                  { defaultValue: '{{airline}} · Direct itinerary' },
                )
              : t(
                  'flightDetail.eyebrowWithStops',
                  { airline: flight.airline },
                  { defaultValue: '{{airline}} · Itinerary' },
                )}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('5xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 2),
              'leading-[0.95] tracking-tight tabular-nums',
            )}
          >
            {flight.legs[0].origin_code} <span className="text-accent">→</span>{' '}
            {flight.legs[flight.legs.length - 1].destination_code}
          </h1>
          <div
            className={cm.cn(
              cm.sp('mt', 6),
              cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
              cm.textSize('sm'),
              'text-white/85',
            )}
          >
            <span className={cm.flex({ align: 'center', gap: 'xs' })}>
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                flight_takeoff
              </span>
              {fmtDate(flight.legs[0].departure_time)} · {fmtTime(flight.legs[0].departure_time)}
            </span>
            <span className={cm.flex({ align: 'center', gap: 'xs' })}>
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                schedule
              </span>
              {fmtDuration(flight.legs.reduce((sum, l) => sum + l.duration_minutes, 0))}
            </span>
            <span className={cm.flex({ align: 'center', gap: 'xs' })}>
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                connecting_airports
              </span>
              {flight.stops === 0
                ? t('flightDetail.nonstop', {}, { defaultValue: 'Nonstop' })
                : t(
                    'flightDetail.stops',
                    { count: flight.stops },
                    { defaultValue: '{{count}} stop' },
                  )}
              {flight.stops > 0 && flight.stop_airports.length > 0
                ? ` · ${flight.stop_airports.join(', ')}`
                : ''}
            </span>
          </div>
        </div>
      </section>

      <div className={cm.cn(cm.sp('mt', 8), 'grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6')}>
        {/* Itinerary detail */}
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface rounded-2xl shadow-sm ring-1 ring-outline-variant/40',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 4),
              'uppercase tracking-[0.25em] text-on-surface-variant',
            )}
          >
            {t('flightDetail.itineraryHeading', {}, { defaultValue: 'Itinerary' })}
          </h2>
          {flight.legs.map((leg, idx) => (
            <div
              key={idx}
              className={cm.cn(idx > 0 ? 'border-t border-outline-variant/40 pt-6 mt-6' : '')}
            >
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
                <span
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest rounded-full bg-primary/10 text-primary',
                  )}
                >
                  {leg.airline} · {leg.flight_number}
                </span>
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {leg.aircraft}
                </span>
                <span
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest rounded-full bg-surface-container text-on-surface-variant',
                  )}
                >
                  {t(
                    `flightDetail.cabin.${leg.cabin_class}`,
                    {},
                    { defaultValue: leg.cabin_class.replace('_', ' ') },
                  )}
                </span>
              </div>
              <div className={cm.cn(cm.sp('mt', 5), cm.flex({ align: 'start', gap: 'lg' }))}>
                <div className={'flex flex-col items-center pt-1'}>
                  <span className={'w-3 h-3 rounded-full bg-primary'} aria-hidden="true" />
                  <span
                    className={'flex-1 w-px border-l-2 border-dashed border-outline my-1 min-h-12'}
                    aria-hidden="true"
                  />
                  <span className={'w-3 h-3 rounded-full bg-primary'} aria-hidden="true" />
                </div>
                <div className={'flex-1 flex flex-col gap-6'}>
                  <div>
                    <p
                      className={cm.cn(
                        cm.textSize('xl'),
                        cm.fontWeight('bold'),
                        'tabular-nums leading-none',
                      )}
                    >
                      {fmtTime(leg.departure_time)} · {leg.origin_code}
                    </p>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.sp('mt', 1),
                        'text-on-surface-variant',
                      )}
                    >
                      {leg.origin_city} · {fmtDate(leg.departure_time)}
                    </p>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.sp('mt', 2),
                        cm.fontWeight('bold'),
                        'uppercase tracking-widest text-on-surface-variant tabular-nums',
                      )}
                    >
                      {t(
                        'flightDetail.duration',
                        { duration: fmtDuration(leg.duration_minutes) },
                        { defaultValue: 'Flight time {{duration}}' },
                      )}
                    </p>
                  </div>
                  <div>
                    <p
                      className={cm.cn(
                        cm.textSize('xl'),
                        cm.fontWeight('bold'),
                        'tabular-nums leading-none',
                      )}
                    >
                      {fmtTime(leg.arrival_time)} · {leg.destination_code}
                    </p>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.sp('mt', 1),
                        'text-on-surface-variant',
                      )}
                    >
                      {leg.destination_city} · {fmtDate(leg.arrival_time)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className={cm.cn(cm.sp('mt', 8), 'border-t border-outline-variant/40')}>
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mt', 6),
                cm.sp('mb', 3),
                'uppercase tracking-[0.25em] text-on-surface-variant',
              )}
            >
              {t('flightDetail.amenitiesHeading', {}, { defaultValue: 'On-board' })}
            </h3>
            <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }))}>
              {flight.amenities.map((amenity) => (
                <span
                  key={amenity}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    cm.flex({ align: 'center', gap: 'xs' }),
                    'rounded-full bg-surface-container text-on-surface-variant',
                  )}
                >
                  <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                    check_circle
                  </span>
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Fare card */}
        <aside className={'space-y-4'}>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface rounded-2xl shadow-sm ring-1 ring-outline-variant/40',
            )}
          >
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 4),
                'uppercase tracking-[0.25em] text-on-surface-variant',
              )}
            >
              {t('flightDetail.fareHeading', {}, { defaultValue: 'Fare breakdown' })}
            </h2>
            <dl className={cm.cn('flex flex-col gap-2', cm.textSize('sm'))}>
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <dt className="text-on-surface-variant">
                  {t('flightDetail.baseFare', {}, { defaultValue: 'Base fare' })}
                </dt>
                <dd className="tabular-nums font-semibold">{fmtPrice(flight.base_fare)}</dd>
              </div>
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <dt className="text-on-surface-variant">
                  {t('flightDetail.taxes', {}, { defaultValue: 'Taxes' })}
                </dt>
                <dd className="tabular-nums font-semibold">{fmtPrice(flight.taxes)}</dd>
              </div>
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <dt className="text-on-surface-variant">
                  {t('flightDetail.fees', {}, { defaultValue: 'Service fees' })}
                </dt>
                <dd className="tabular-nums font-semibold">{fmtPrice(flight.fees)}</dd>
              </div>
              {passengers > 1 ? (
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <dt className="text-on-surface-variant">
                    {t(
                      'flightDetail.travelers',
                      { count: passengers },
                      { defaultValue: 'Travelers' },
                    )}
                  </dt>
                  <dd className="tabular-nums font-semibold">×{passengers}</dd>
                </div>
              ) : null}
            </dl>
            <div
              className={cm.cn(
                cm.sp('mt', 4),
                cm.sp('pt', 4),
                cm.flex({ align: 'baseline', justify: 'between' }),
                'border-t border-outline-variant/40',
              )}
            >
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('nav.total', {}, { defaultValue: 'Total' })}
              </span>
              <span
                className={cm.cn(
                  cm.textSize('3xl'),
                  cm.fontWeight('bold'),
                  'tabular-nums text-primary',
                )}
              >
                {fmtPrice(flight.total * passengers)}
              </span>
            </div>
            <Link
              to={`/book/${id}?passengers=${passengers}`}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.sp('mt', 6),
                cm.fontWeight('bold'),
                cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
                'w-full rounded-xl bg-accent text-on-accent hover:bg-accent/90 transition-colors shadow-lg',
              )}
            >
              {t('flightDetail.book', {}, { defaultValue: 'Continue to booking' })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>

          <div
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface rounded-2xl shadow-sm ring-1 ring-outline-variant/40',
            )}
          >
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 3),
                'uppercase tracking-[0.25em] text-on-surface-variant',
              )}
            >
              {t('flightDetail.policyHeading', {}, { defaultValue: 'Policies' })}
            </h3>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
              {flight.refundable
                ? t(
                    'flightDetail.policy.refundable',
                    {},
                    { defaultValue: 'Refundable up to 24 hours before departure.' },
                  )
                : t(
                    'flightDetail.policy.nonRefundable',
                    {},
                    {
                      defaultValue:
                        'Cancellation available within 24 hours of booking. After that, $150 change fee applies.',
                    },
                  )}
            </p>
            <ul
              className={cm.cn(
                cm.sp('mt', 4),
                cm.flex({ direction: 'col', gap: 'xs' }),
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              <li className={cm.flex({ align: 'center', gap: 'xs' })}>
                <span
                  className={'material-symbols-outlined text-base text-primary'}
                  aria-hidden="true"
                >
                  work
                </span>
                {flight.baggage_included
                  ? t(
                      'flightDetail.baggage.carryOnIncluded',
                      {},
                      { defaultValue: '1 carry-on included' },
                    )
                  : t(
                      'flightDetail.baggage.carryOnPaid',
                      {},
                      { defaultValue: 'Carry-on $35 each way' },
                    )}
              </li>
              <li className={cm.flex({ align: 'center', gap: 'xs' })}>
                <span
                  className={'material-symbols-outlined text-base text-primary'}
                  aria-hidden="true"
                >
                  luggage
                </span>
                {t(
                  'flightDetail.baggage.checkedPaid',
                  {},
                  { defaultValue: 'Checked bag $35 each way' },
                )}
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
