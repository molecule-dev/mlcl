import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

interface TripPassenger {
  name: string
  ticket_number: string
  seat: string
  meal: string
  status: 'checked_in' | 'pending'
}

interface TripSegment {
  origin_code: string
  origin_city: string
  destination_code: string
  destination_city: string
  airline: string
  flight_number: string
  departure_iso: string
  arrival_iso: string
  duration_minutes: number
  cabin_class: string
  gate?: string
  terminal?: string
}

interface TripModel {
  id: string
  airline: string
  confirmation_code: string
  status: 'upcoming' | 'completed' | 'cancelled' | 'pending_payment'
  total_price: number
  paid_at: string | null
  checked_in_at: string | null
  segments: TripSegment[]
  passengers: TripPassenger[]
}

interface ApiTrip {
  id: string
  status: string
  kind: string
  flight_payload?: Record<string, unknown>
  passenger_count?: number
  cabin?: string
  total_cents?: number
  confirmation_code?: string | null
  created_at?: string
  booked_at?: string | null
}

function toTripModel(api: ApiTrip): TripModel {
  const fp = (api.flight_payload ?? {}) as Record<string, unknown>
  const segments: TripSegment[] = []
  const airline = String(fp.airline ?? '')
  segments.push({
    origin_code: String(fp.origin_code ?? ''),
    origin_city: String(fp.origin_city ?? fp.origin_code ?? ''),
    destination_code: String(fp.destination_code ?? ''),
    destination_city: String(fp.destination_city ?? fp.destination_code ?? ''),
    airline,
    flight_number: String(fp.flight_number ?? ''),
    departure_iso: String(fp.departure_time ?? ''),
    arrival_iso: String(fp.arrival_time ?? ''),
    duration_minutes: Number(fp.duration_minutes ?? 0),
    cabin_class: String(fp.cabin ?? api.cabin ?? 'economy'),
  })
  let status: TripModel['status'] = 'upcoming'
  if (api.status === 'cancelled') status = 'cancelled'
  else if (api.status === 'pending_payment') status = 'pending_payment'
  else if (api.status === 'booked') {
    const dep = String(fp.departure_time ?? '')
    status = dep && new Date(dep).getTime() < Date.now() ? 'completed' : 'upcoming'
  }
  const checkedInRaw = fp.checked_in_at
  const checked_in_at = typeof checkedInRaw === 'string' && checkedInRaw ? checkedInRaw : null
  return {
    id: String(api.id),
    airline,
    confirmation_code: api.confirmation_code ?? `SKYL-${String(api.id).slice(0, 4).toUpperCase()}`,
    status,
    total_price: (api.total_cents ?? 0) / 100,
    paid_at: api.booked_at ?? api.created_at ?? null,
    checked_in_at,
    segments,
    passengers: [],
  }
}

const STATUS_EYEBROW_DEFAULTS: Record<TripModel['status'], string> = {
  upcoming: 'Upcoming · Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  pending_payment: 'Pending payment',
}

function fmtPrice(value: number): string {
  return `$${Math.round(value).toLocaleString()}`
}

function fmtDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function fmtTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function fmtDuration(minutes: number): string {
  if (!minutes) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function TripDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const [trip, setTrip] = useState<TripModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkingIn, setCheckingIn] = useState(false)
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'shared' | 'error'>('idle')

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get(`/api/trips/${encodeURIComponent(id)}`)
      .then((res) => {
        if (cancelled) return
        const data = (res as { data?: ApiTrip }).data ?? (res as unknown as ApiTrip)
        if (!data || !data.id) throw new Error('No trip payload')
        setTrip(toTripModel(data))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        console.error('[TripDetail] failed:', err)
        setError(t('tripDetail.errorMessage', {}, { defaultValue: 'Could not load trip.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  async function handleCancel() {
    if (!trip) return
    try {
      await http.put(`/api/trips/${encodeURIComponent(trip.id)}/cancel`, {})
      void track({ name: 'trip.cancelled', properties: { trip_id: trip.id } })
      navigate('/trips', { replace: true })
    } catch (err: unknown) {
      console.error('[TripDetail] cancel failed:', err)
      setError(t('tripDetail.cancelError', {}, { defaultValue: 'Could not cancel trip.' }))
    }
  }

  async function handleCheckIn() {
    if (!trip || checkingIn || trip.checked_in_at || trip.status !== 'upcoming') return
    setCheckingIn(true)
    try {
      const res = (await http.post(`/api/trips/${encodeURIComponent(trip.id)}/check-in`, {})) as {
        data?: ApiTrip
      }
      const updated = (res?.data ?? res) as ApiTrip
      if (updated && updated.id) {
        setTrip(toTripModel(updated))
        void track({ name: 'trip.checked_in', properties: { trip_id: updated.id } })
      }
    } catch (err: unknown) {
      console.error('[TripDetail] check-in failed:', err)
      setError(
        t('tripDetail.checkInError', {}, { defaultValue: 'Could not check in. Try again later.' }),
      )
    } finally {
      setCheckingIn(false)
    }
  }

  function handleChangeFlight() {
    if (!trip) return
    const seg = trip.segments[0]
    const params = new URLSearchParams()
    if (seg?.origin_code) params.set('origin', seg.origin_code)
    if (seg?.destination_code) params.set('destination', seg.destination_code)
    navigate(`/search${params.toString() ? `?${params.toString()}` : ''}`)
  }

  async function handleShare() {
    if (!trip) return
    const shareData = {
      title: t(
        'tripDetail.shareTitle',
        { code: trip.confirmation_code },
        { defaultValue: 'Trip {{code}}' },
      ),
      text: t(
        'tripDetail.shareText',
        {
          from: trip.segments[0]?.origin_code ?? '',
          to: trip.segments[0]?.destination_code ?? '',
          code: trip.confirmation_code,
        },
        { defaultValue: 'My trip {{from}} → {{to}} (confirmation {{code}})' },
      ),
      url: window.location.href,
    }
    try {
      const nav = window.navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
      if (typeof nav.share === 'function') {
        await nav.share(shareData)
        setShareStatus('shared')
      } else if (window.navigator.clipboard?.writeText) {
        await window.navigator.clipboard.writeText(window.location.href)
        setShareStatus('copied')
      } else {
        setShareStatus('error')
        return
      }
      window.setTimeout(() => setShareStatus('idle'), 3000)
    } catch (err: unknown) {
      console.error('[TripDetail] share failed:', err)
      setShareStatus('error')
      window.setTimeout(() => setShareStatus('idle'), 3000)
    }
  }

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
        {t('tripDetail.loading', {}, { defaultValue: 'Loading trip…' })}
      </div>
    )
  }

  if (error || !trip) {
    return (
      <div
        className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 16), cm.mxAuto, cm.textCenter)}
      >
        <p className={cm.cn('text-error', cm.fontWeight('semibold'))}>
          {error ?? t('tripDetail.notFound', {}, { defaultValue: 'Trip not found.' })}
        </p>
        <Link
          to="/trips"
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
          {t('tripDetail.backToTrips', {}, { defaultValue: 'Back to trips' })}
        </Link>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <Link
        to="/trips"
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
        {t('tripDetail.backToTrips', {}, { defaultValue: 'Back to trips' })}
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
        <div
          className={cm.cn(
            'relative z-10',
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          )}
        >
          <div className={'min-w-0'}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-[0.25em] text-accent',
              )}
            >
              {t(
                `tripDetail.status.${trip.status}`,
                {},
                { defaultValue: STATUS_EYEBROW_DEFAULTS[trip.status] },
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
              {trip.segments[0]?.origin_code} <span className="text-accent">→</span>{' '}
              {trip.segments[trip.segments.length - 1]?.destination_code}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 3), 'text-white/85')}>
              {trip.segments.length > 1 &&
              trip.segments[0]?.departure_iso !==
                trip.segments[trip.segments.length - 1]?.departure_iso
                ? t(
                    'tripDetail.dates',
                    {
                      dep: fmtDate(trip.segments[0]?.departure_iso ?? ''),
                      ret: fmtDate(trip.segments[trip.segments.length - 1]?.departure_iso ?? ''),
                    },
                    { defaultValue: '{{dep}} → {{ret}}' },
                  )
                : fmtDate(trip.segments[0]?.departure_iso ?? '')}
            </p>
          </div>
          <div
            className={cm.cn(
              cm.sp('p', 4),
              'bg-surface/15 backdrop-blur-md rounded-2xl ring-1 ring-white/25 text-right',
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-[0.25em] text-accent',
              )}
            >
              {t('tripDetail.confirmationLabel', {}, { defaultValue: 'Confirmation' })}
            </p>
            <p
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('bold'),
                cm.sp('mt', 1),
                'tabular-nums tracking-widest leading-none',
              )}
            >
              {trip.confirmation_code}
            </p>
          </div>
        </div>
      </section>

      <div className={cm.cn(cm.sp('mt', 8), 'grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6')}>
        {/* Segments */}
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
            {t('tripDetail.segmentsHeading', {}, { defaultValue: 'Itinerary' })}
          </h2>
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
            {trip.segments.map((segment, idx) => (
              <li
                key={idx}
                className={cm.cn(idx > 0 ? 'border-t border-outline-variant/40 pt-6' : '')}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'rounded-full bg-primary/10 text-primary uppercase tracking-widest',
                    )}
                  >
                    {segment.airline} · {segment.flight_number}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {fmtDate(segment.departure_iso)} · {fmtDuration(segment.duration_minutes)}
                  </span>
                </div>
                <div className={cm.cn(cm.sp('mt', 4), cm.flex({ align: 'center', gap: 'md' }))}>
                  <div className="text-center">
                    <p
                      className={cm.cn(
                        cm.textSize('xl'),
                        cm.fontWeight('bold'),
                        'tabular-nums leading-none',
                      )}
                    >
                      {fmtTime(segment.departure_iso)}
                    </p>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        cm.sp('mt', 1),
                        'uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {segment.origin_code}
                    </p>
                  </div>
                  <div className={'flex-1 relative'}>
                    <div
                      className={
                        'absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-outline'
                      }
                      aria-hidden="true"
                    />
                    <div
                      className={
                        'absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary'
                      }
                      aria-hidden="true"
                    />
                    <div
                      className={
                        'absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary'
                      }
                      aria-hidden="true"
                    />
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'relative text-center bg-surface px-2 mx-auto w-fit uppercase tracking-widest text-nonstop',
                      )}
                    >
                      {t('tripDetail.nonstop', {}, { defaultValue: 'Nonstop' })}
                    </p>
                  </div>
                  <div className="text-center">
                    <p
                      className={cm.cn(
                        cm.textSize('xl'),
                        cm.fontWeight('bold'),
                        'tabular-nums leading-none',
                      )}
                    >
                      {fmtTime(segment.arrival_iso)}
                    </p>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        cm.sp('mt', 1),
                        'uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {segment.destination_code}
                    </p>
                  </div>
                </div>
                {segment.gate || segment.terminal ? (
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.sp('mt', 4),
                      cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
                      'text-on-surface-variant',
                    )}
                  >
                    {segment.terminal ? (
                      <span className={cm.flex({ align: 'center', gap: 'xs' })}>
                        <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                          domain
                        </span>
                        {t(
                          'tripDetail.terminal',
                          { value: segment.terminal },
                          { defaultValue: 'Terminal {{value}}' },
                        )}
                      </span>
                    ) : null}
                    {segment.gate ? (
                      <span className={cm.flex({ align: 'center', gap: 'xs' })}>
                        <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                          door_sliding
                        </span>
                        {t(
                          'tripDetail.gate',
                          { value: segment.gate },
                          { defaultValue: 'Gate {{value}}' },
                        )}
                      </span>
                    ) : null}
                    <span className={cm.flex({ align: 'center', gap: 'xs' })}>
                      <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                        airline_seat_recline_normal
                      </span>
                      {t(
                        `tripDetail.cabin.${segment.cabin_class}`,
                        {},
                        { defaultValue: segment.cabin_class.replace('_', ' ') },
                      )}
                    </span>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          {trip.passengers.length > 0 ? (
            <div className={cm.cn(cm.sp('mt', 8), 'border-t border-outline-variant/40')}>
              <h3
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.sp('mt', 6),
                  cm.sp('mb', 4),
                  'uppercase tracking-[0.25em] text-on-surface-variant',
                )}
              >
                {t('tripDetail.passengersHeading', {}, { defaultValue: 'Passengers' })}
              </h3>
              <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
                {trip.passengers.map((passenger) => (
                  <li
                    key={passenger.ticket_number}
                    className={cm.cn(
                      cm.sp('p', 4),
                      cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
                      'bg-surface-container-low rounded-xl ring-1 ring-outline-variant/40',
                    )}
                  >
                    <div>
                      <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                        {passenger.name}
                      </p>
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-on-surface-variant tabular-nums tracking-widest',
                        )}
                      >
                        {passenger.ticket_number}
                      </p>
                    </div>
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'sm' }),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                      )}
                    >
                      <span
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          'rounded-full bg-surface-container text-on-surface-variant uppercase tracking-widest',
                        )}
                      >
                        {t(
                          'tripDetail.seat',
                          { value: passenger.seat },
                          { defaultValue: 'Seat {{value}}' },
                        )}
                      </span>
                      <span
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          'rounded-full bg-surface-container text-on-surface-variant uppercase tracking-widest',
                        )}
                      >
                        {passenger.meal}
                      </span>
                      <span
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          'rounded-full uppercase tracking-widest',
                          passenger.status === 'checked_in'
                            ? 'bg-cheapest-light text-cheapest'
                            : 'bg-surface-container text-on-surface-variant',
                        )}
                      >
                        {t(
                          `tripDetail.passengerStatus.${passenger.status}`,
                          {},
                          { defaultValue: passenger.status.replace('_', ' ') },
                        )}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {/* Action card */}
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
              {t('tripDetail.actionsHeading', {}, { defaultValue: 'Manage' })}
            </h2>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={checkingIn || !!trip.checked_in_at || trip.status !== 'upcoming'}
                data-testid="trip-check-in"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
                  'rounded-xl bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed',
                )}
              >
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  qr_code_2
                </span>
                {trip.checked_in_at
                  ? t('tripDetail.checkedIn', {}, { defaultValue: 'Checked in' })
                  : checkingIn
                    ? t('tripDetail.checkingIn', {}, { defaultValue: 'Checking in…' })
                    : t('tripDetail.checkIn', {}, { defaultValue: 'Check in passengers' })}
              </button>
              <button
                type="button"
                onClick={handleChangeFlight}
                data-testid="trip-change-flight"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
                  'rounded-xl bg-surface-container ring-1 ring-outline-variant text-on-surface hover:bg-surface-container-high transition-colors',
                )}
              >
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  edit_calendar
                </span>
                {t('tripDetail.changeFlight', {}, { defaultValue: 'Change flight' })}
              </button>
              <button
                type="button"
                onClick={handleShare}
                data-testid="trip-share"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
                  'rounded-xl bg-surface-container ring-1 ring-outline-variant text-on-surface hover:bg-surface-container-high transition-colors',
                )}
              >
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  share
                </span>
                {shareStatus === 'copied'
                  ? t('tripDetail.shareCopied', {}, { defaultValue: 'Link copied' })
                  : shareStatus === 'shared'
                    ? t('status.shared', {}, { defaultValue: 'Shared' })
                    : shareStatus === 'error'
                      ? t('tripDetail.shareError', {}, { defaultValue: 'Could not share' })
                      : t('tripDetail.share', {}, { defaultValue: 'Share itinerary' })}
              </button>
              <ConfirmButton
                label={
                  <>
                    <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                      cancel
                    </span>
                    {trip.status === 'cancelled'
                      ? t('tripDetail.cancelled', {}, { defaultValue: 'Cancelled' })
                      : t('tripDetail.cancel', {}, { defaultValue: 'Cancel trip' })}
                  </>
                }
                confirmLabel={t(
                  'tripDetail.cancelConfirm',
                  {},
                  { defaultValue: 'Cancel this trip? This cannot be undone.' },
                )}
                pendingLabel={t('common.cancellingEllipsis', {}, { defaultValue: 'Cancelling…' })}
                onConfirm={handleCancel}
                disabled={trip.status === 'cancelled'}
                disarmSeconds={6}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
                  'rounded-xl text-error hover:bg-error/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              />
            </div>
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
              {t('tripDetail.priceHeading', {}, { defaultValue: 'Receipt' })}
            </h3>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t('tripDetail.tripId', { id }, { defaultValue: 'Trip {{id}}' })}
            </p>
            {trip.paid_at ? (
              <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                {t(
                  'tripDetail.paidOn',
                  { date: fmtDate(trip.paid_at) },
                  { defaultValue: 'Paid on {{date}}' },
                )}
              </p>
            ) : null}
            <p
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                cm.sp('mt', 4),
                'tabular-nums leading-none',
              )}
            >
              {fmtPrice(trip.total_price)}
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
