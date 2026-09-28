/**
 * Bookings — flights, hotels, activities, rental cars threaded across
 * every active trip. Uses real data from /api/bookings + /api/trips.
 * The "Forward a booking" CTA opens an inline modal that POSTs to
 * /api/bookings (vendor/dates/cost/confirmation).
 */

import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { BookingRow, TripRow } from '../lib/api.js'

type StatusFilter = 'all' | 'confirmed' | 'pending' | 'cancelled'
type BookingKind = 'flight' | 'hotel' | 'car' | 'other' | 'train' | 'activity'

const TYPE_THEME: Record<
  BookingKind,
  { icon: string; stripe: string; chip: string; chipText: string; defaultLabel: string }
> = {
  flight: {
    icon: 'flight',
    stripe: 'var(--color-cyan-700)',
    chip: 'bg-cyan-100 dark:bg-cyan-900/40',
    chipText: 'text-cyan-800 dark:text-cyan-200',
    defaultLabel: 'Flight',
  },
  hotel: {
    icon: 'hotel',
    stripe: 'var(--color-violet-500)',
    chip: 'bg-violet-100 dark:bg-violet-900/40',
    chipText: 'text-violet-800 dark:text-violet-200',
    defaultLabel: 'Hotel',
  },
  activity: {
    icon: 'local_activity',
    stripe: 'var(--color-emerald-600)',
    chip: 'bg-success-light',
    chipText: 'text-success',
    defaultLabel: 'Activity',
  },
  car: {
    icon: 'directions_car',
    stripe: 'var(--color-orange-600)',
    chip: 'bg-orange-100 dark:bg-orange-900/40',
    chipText: 'text-orange-800 dark:text-orange-200',
    defaultLabel: 'Rental car',
  },
  train: {
    icon: 'train',
    stripe: 'var(--color-pink-500)',
    chip: 'bg-pink-100 dark:bg-pink-900/40',
    chipText: 'text-pink-800 dark:text-pink-200',
    defaultLabel: 'Train',
  },
  other: {
    icon: 'confirmation_number',
    stripe: 'var(--color-border-secondary)',
    chip: 'bg-surface-secondary',
    chipText: 'text-foreground',
    defaultLabel: 'Other',
  },
}

const STATUS_THEME: Record<
  StatusFilter,
  { pillBg: string; pillText: string; defaultLabel: string }
> = {
  all: { pillBg: 'bg-surface-container-low', pillText: 'text-on-surface', defaultLabel: 'All' },
  confirmed: {
    pillBg: 'bg-cyan-100 dark:bg-cyan-900/40',
    pillText: 'text-cyan-800 dark:text-cyan-200',
    defaultLabel: 'Confirmed',
  },
  pending: { pillBg: 'bg-warning-light', pillText: 'text-warning', defaultLabel: 'Pending' },
  cancelled: {
    pillBg: 'bg-rose-100 dark:bg-rose-900/40',
    pillText: 'text-rose-800 dark:text-rose-200',
    defaultLabel: 'Cancelled',
  },
}

function fmtMoney(cents: number): string {
  return cents > 0 ? `$${Math.round(cents / 100).toLocaleString()}` : '\u2014'
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function coerceKind(s: string): BookingKind {
  const lower = (s || '').toLowerCase()
  if (
    lower === 'flight' ||
    lower === 'hotel' ||
    lower === 'activity' ||
    lower === 'car' ||
    lower === 'train'
  )
    return lower
  return 'other'
}

function coerceStatus(s: string | null | undefined): 'confirmed' | 'pending' | 'cancelled' {
  if (s === 'pending' || s === 'cancelled') return s
  return 'confirmed'
}

export function Bookings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [trips, setTrips] = useState<TripRow[]>([])
  const [status, setStatus] = useState<StatusFilter>('all')
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const tripsById = useMemo(() => {
    const m = new Map<string, TripRow>()
    for (const trip of trips) m.set(trip.id, trip)
    return m
  }, [trips])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [bookingsResp, tripsResp] = await Promise.all([
        http.get<BookingRow[]>('/bookings'),
        http.get<TripRow[]>('/trips'),
      ])
      setBookings(Array.isArray(bookingsResp.data) ? bookingsResp.data : [])
      setTrips(Array.isArray(tripsResp.data) ? tripsResp.data : [])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('bookings.errors.load', {}, { defaultValue: 'Could not load bookings.' }),
      )
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const totals = useMemo(() => {
    const totalCents = bookings.reduce(
      (sum, b) => sum + (coerceStatus(b.status) === 'cancelled' ? 0 : Number(b.cost_cents ?? 0)),
      0,
    )
    const pending = bookings.filter((b) => coerceStatus(b.status) === 'pending').length
    const confirmed = bookings.filter((b) => coerceStatus(b.status) === 'confirmed').length
    return { totalCents, pending, confirmed }
  }, [bookings])

  const filtered = useMemo(() => {
    if (status === 'all') return bookings
    return bookings.filter((b) => coerceStatus(b.status) === status)
  }, [bookings, status])

  return (
    <div
      className={cm.cn(
        cm.maxW('7xl'),
        cm.sp('px', 8),
        cm.sp('py', 10),
        cm.mxAuto,
        cm.flex({ direction: 'col', gap: 'lg' }),
      )}
    >
      <header
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }))}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.25em] text-primary',
            )}
          >
            {t('bookings.eyebrow', {}, { defaultValue: 'Confirmation inbox' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              cm.fontWeight('extrabold'),
              cm.sp('mt', 2),
              'leading-tight tracking-tight',
            )}
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {t('bookings.heading', {}, { defaultValue: 'Every booking, threaded by trip.' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('base'),
              cm.sp('mt', 2),
              cm.maxW('2xl'),
              'text-on-surface-variant leading-relaxed',
            )}
          >
            {t(
              'bookings.subheading',
              {},
              {
                defaultValue:
                  'Add a confirmation manually or forward an email \u2014 it lands here, attached to the trip.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          data-testid="bookings-new"
          onClick={() => setShowForm((v) => !v)}
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 'sm' }),
            'rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-md',
          )}
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            forward_to_inbox
          </span>
          {t('bookings.forwardCta', {}, { defaultValue: 'Add booking' })}
        </button>
      </header>

      {error ? (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl bg-error/10 text-error border border-error/30',
          )}
        >
          {error}
        </div>
      ) : null}

      {showForm ? (
        <BookingForm
          trips={trips}
          onCancel={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false)
            await refresh()
          }}
        />
      ) : null}

      <div className={cm.cn('grid grid-cols-1 sm:grid-cols-3 gap-5')}>
        <article
          className={cm.cn(
            cm.sp('p', 5),
            cm.accentCard({ tone: 'primary' }),
            'bg-surface rounded-2xl shadow-sm',
          )}
        >
          <p className={cm.accentCardLabel({ tone: 'primary' })}>
            {t('bookings.summary.total', {}, { defaultValue: 'Total committed' })}
          </p>
          <p
            data-testid="bookings-total"
            className={cm.cn(cm.sp('mt', 2), 'text-3xl font-extrabold tracking-tight tabular-nums')}
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {fmtMoney(totals.totalCents)}
          </p>
        </article>
        <article
          className={cm.cn(
            cm.sp('p', 5),
            cm.accentCard({ tone: 'custom' }),
            'bg-surface rounded-2xl shadow-sm',
          )}
          style={{ ['--mol-accent' as string]: 'var(--color-cyan-700)' }}
        >
          <p className={cm.accentCardLabel({ tone: 'custom' })}>
            {t('bookings.summary.confirmed', {}, { defaultValue: 'Confirmed' })}
          </p>
          <p
            data-testid="bookings-confirmed-count"
            className={cm.cn(cm.sp('mt', 2), 'text-3xl font-extrabold tracking-tight tabular-nums')}
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {totals.confirmed}
          </p>
        </article>
        <article
          className={cm.cn(
            cm.sp('p', 5),
            cm.accentCard({ tone: 'custom' }),
            'bg-surface rounded-2xl shadow-sm',
          )}
          style={{ ['--mol-accent' as string]: 'var(--color-amber-500)' }}
        >
          <p className={cm.accentCardLabel({ tone: 'custom' })}>
            {t('bookings.summary.pending', {}, { defaultValue: 'Awaiting confirmation' })}
          </p>
          <p
            data-testid="bookings-pending-count"
            className={cm.cn(cm.sp('mt', 2), 'text-3xl font-extrabold tracking-tight tabular-nums')}
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {totals.pending}
          </p>
        </article>
      </div>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))} role="tablist">
        {(['all', 'confirmed', 'pending', 'cancelled'] as StatusFilter[]).map((key) => {
          const theme = STATUS_THEME[key]
          const active = status === key
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStatus(key)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest rounded-full transition-colors',
                active
                  ? cm.cn(theme.pillBg, theme.pillText, 'shadow-sm')
                  : 'bg-surface-container-low text-on-surface-variant hover:text-primary',
              )}
            >
              {t(`bookings.filter.${key}`, {}, { defaultValue: theme.defaultLabel })}
            </button>
          )
        })}
      </div>

      {!loading && filtered.length === 0 ? (
        <div
          data-testid="bookings-empty"
          className={cm.cn(
            cm.sp('p', 12),
            cm.textCenter,
            'rounded-3xl bg-surface-container-low border border-outline-variant/40',
          )}
        >
          <span
            className="material-symbols-outlined text-4xl text-on-surface-variant"
            aria-hidden="true"
          >
            forward_to_inbox
          </span>
          <h2
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('extrabold'),
              cm.sp('mt', 3),
              'tracking-tight',
            )}
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {t('bookings.empty.heading', {}, { defaultValue: 'No bookings yet.' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'bookings.empty.body',
              {},
              { defaultValue: 'Add a flight, hotel, or activity to start the inbox.' },
            )}
          </p>
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <section
          className={cm.cn(
            'bg-surface rounded-2xl shadow-sm border border-outline-variant/40 overflow-hidden',
          )}
        >
          <ul data-testid="bookings-list" className={cm.cn('divide-y divide-surface-container')}>
            {filtered.map((booking) => {
              const kind = coerceKind(booking.kind)
              const stat = coerceStatus(booking.status)
              const theme = TYPE_THEME[kind]
              const trip = tripsById.get(booking.trip_id)
              return (
                <li
                  key={booking.id}
                  data-testid="bookings-row"
                  className={cm.cn(
                    cm.sp('p', 5),
                    cm.flex({ gap: 'md' }),
                    cm.accentCard({ tone: 'custom' }),
                    'hover:bg-surface-container-low transition-colors',
                  )}
                  style={{ ['--mol-accent' as string]: theme.stripe }}
                >
                  <span
                    className={cm.cn(
                      'flex-shrink-0 w-12 h-12 rounded-2xl bg-primary-container/40 text-primary flex items-center justify-center',
                    )}
                  >
                    <span
                      className={'material-symbols-outlined text-2xl'}
                      aria-hidden="true"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {theme.icon}
                    </span>
                  </span>
                  <div className={cm.cn(cm.flex1, cm.flex({ direction: 'col', gap: 'xs' }))}>
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
                      <span
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'py-0.5 uppercase tracking-widest rounded-full',
                          theme.chip,
                          theme.chipText,
                        )}
                      >
                        {t(`bookings.type.${kind}`, {}, { defaultValue: theme.defaultLabel })}
                      </span>
                      <span
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'py-0.5 uppercase tracking-widest rounded-full',
                          STATUS_THEME[stat].pillBg,
                          STATUS_THEME[stat].pillText,
                        )}
                      >
                        {t(
                          `bookings.status.${stat}`,
                          {},
                          { defaultValue: STATUS_THEME[stat].defaultLabel },
                        )}
                      </span>
                      {booking.confirmation_code ? (
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            'tabular-nums text-on-surface-variant',
                          )}
                        >
                          #{booking.confirmation_code}
                        </span>
                      ) : null}
                    </div>
                    <h3
                      className={cm.cn(
                        cm.textSize('base'),
                        cm.fontWeight('extrabold'),
                        'tracking-tight',
                      )}
                      style={{ fontFamily: 'var(--font-headline)' }}
                    >
                      {booking.title}
                    </h3>
                    {booking.detail ? (
                      <p
                        className={cm.cn(
                          cm.textSize('sm'),
                          'text-on-surface-variant leading-relaxed',
                        )}
                      >
                        {booking.detail}
                      </p>
                    ) : null}
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.sp('mt', 1),
                        cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
                        'text-on-surface-variant tabular-nums',
                      )}
                    >
                      <span className={cm.flex({ align: 'center', gap: 'xs' })}>
                        <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                          event
                        </span>
                        {fmtDate(booking.start_at)}
                        {booking.end_at ? ` \u2013 ${fmtDate(booking.end_at)}` : ''}
                      </span>
                      {booking.vendor ? (
                        <span className={cm.flex({ align: 'center', gap: 'xs' })}>
                          <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                            storefront
                          </span>
                          {booking.vendor}
                        </span>
                      ) : null}
                      {trip ? (
                        <span className={cm.flex({ align: 'center', gap: 'xs' })}>
                          <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                            luggage
                          </span>
                          {trip.destination ?? trip.name}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div
                    className={cm.cn(
                      'hidden sm:block text-right',
                      cm.flex({ direction: 'col', gap: 'xs' }),
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.textSize('xl'),
                        cm.fontWeight('extrabold'),
                        'tabular-nums tracking-tight',
                      )}
                      style={{ fontFamily: 'var(--font-headline)' }}
                    >
                      {fmtMoney(Number(booking.cost_cents ?? 0))}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function BookingForm({
  trips,
  onCancel,
  onSaved,
}: {
  trips: TripRow[]
  onCancel: () => void
  onSaved: () => Promise<void> | void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [tripId, setTripId] = useState<string>(trips[0]?.id ?? '')
  const [kind, setKind] = useState<BookingKind>('flight')
  const [title, setTitle] = useState('')
  const [vendor, setVendor] = useState('')
  const [detail, setDetail] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [costCents, setCostCents] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!tripId || !title) return
    setSubmitting(true)
    setError('')
    try {
      await http.post('/bookings', {
        trip_id: tripId,
        kind: kind === 'train' || kind === 'activity' ? 'other' : kind,
        title,
        vendor: vendor || undefined,
        detail: detail || undefined,
        confirmation_code: confirmation || undefined,
        start_at: startAt ? new Date(startAt).toISOString() : undefined,
        end_at: endAt ? new Date(endAt).toISOString() : undefined,
        cost_cents: Math.max(0, Math.round(costCents * 100)),
      })
      void track({ name: 'booking.created', properties: { trip_id: tripId, kind } })
      await onSaved()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('bookings.errors.create', {}, { defaultValue: 'Could not create booking.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (trips.length === 0) {
    return (
      <div
        data-testid="bookings-no-trips"
        className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-warning-light text-warning text-sm')}
      >
        {t(
          'bookings.noTrips',
          {},
          { defaultValue: 'Create a trip first \u2014 bookings attach to a trip.' },
        )}
      </div>
    )
  }

  return (
    <form
      data-testid="bookings-form"
      onSubmit={submit}
      className={cm.cn(
        cm.sp('p', 6),
        'rounded-2xl bg-surface border border-outline-variant',
        cm.flex({ direction: 'col', gap: 'md' }),
      )}
    >
      <h3
        className={cm.cn(cm.textSize('lg'), cm.fontWeight('extrabold'))}
        style={{ fontFamily: 'var(--font-headline)' }}
      >
        {t('bookings.formHeading', {}, { defaultValue: 'New booking' })}
      </h3>
      {error ? (
        <div role="alert" className={cm.cn(cm.textSize('sm'), 'text-error')}>
          {error}
        </div>
      ) : null}
      <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-3')}>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('bookings.field.trip', {}, { defaultValue: 'Trip' })}
          </span>
          <select
            data-testid="bookings-form-trip"
            required
            value={tripId}
            onChange={(e) => setTripId(e.target.value)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-xl bg-surface-container-low border border-outline-variant outline-none focus:border-primary',
            )}
          >
            {trips.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {trip.destination ?? trip.name}
              </option>
            ))}
          </select>
        </label>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('form.kind', {}, { defaultValue: 'Kind' })}
          </span>
          <select
            data-testid="bookings-form-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as BookingKind)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-xl bg-surface-container-low border border-outline-variant outline-none focus:border-primary',
            )}
          >
            <option value="flight">
              {t('bookings.type.flight', {}, { defaultValue: 'Flight' })}
            </option>
            <option value="hotel">{t('bookings.type.hotel', {}, { defaultValue: 'Hotel' })}</option>
            <option value="car">
              {t('bookings.type.car', {}, { defaultValue: 'Rental car' })}
            </option>
            <option value="other">{t('bookings.type.other', {}, { defaultValue: 'Other' })}</option>
          </select>
        </label>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('form.title', {}, { defaultValue: 'Title' })}
          </span>
          <input
            data-testid="bookings-form-title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-xl bg-surface-container-low border border-outline-variant outline-none focus:border-primary',
            )}
          />
        </label>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('bookings.field.vendor', {}, { defaultValue: 'Vendor' })}
          </span>
          <input
            data-testid="bookings-form-vendor"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-xl bg-surface-container-low border border-outline-variant outline-none focus:border-primary',
            )}
          />
        </label>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('common.start', {}, { defaultValue: 'Start' })}
          </span>
          <input
            data-testid="bookings-form-start"
            type="date"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-xl bg-surface-container-low border border-outline-variant outline-none focus:border-primary',
            )}
          />
        </label>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('bookings.field.endAt', {}, { defaultValue: 'End' })}
          </span>
          <input
            data-testid="bookings-form-end"
            type="date"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-xl bg-surface-container-low border border-outline-variant outline-none focus:border-primary',
            )}
          />
        </label>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('bookings.field.confirmation', {}, { defaultValue: 'Confirmation #' })}
          </span>
          <input
            data-testid="bookings-form-confirmation"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-xl bg-surface-container-low border border-outline-variant outline-none focus:border-primary',
            )}
          />
        </label>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('bookings.field.cost', {}, { defaultValue: 'Cost (USD)' })}
          </span>
          <input
            data-testid="bookings-form-cost"
            type="number"
            min={0}
            value={costCents}
            onChange={(e) => setCostCents(Number(e.target.value) || 0)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-xl bg-surface-container-low border border-outline-variant outline-none focus:border-primary tabular-nums',
            )}
          />
        </label>
      </div>
      <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
        <span
          className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest text-on-surface-variant')}
        >
          {t('form.notes', {}, { defaultValue: 'Notes' })}
        </span>
        <textarea
          data-testid="bookings-form-detail"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          rows={2}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'rounded-xl bg-surface-container-low border border-outline-variant outline-none focus:border-primary',
          )}
        />
      </label>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'end', gap: 'sm' }))}>
        <button
          type="button"
          onClick={onCancel}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest rounded-full bg-surface-container-low text-on-surface-variant',
          )}
        >
          {t('common.cancel', {}, { defaultValue: 'Cancel' })}
        </button>
        <button
          data-testid="bookings-form-submit"
          type="submit"
          disabled={submitting || !tripId || !title}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest rounded-full bg-primary text-on-primary disabled:opacity-50',
          )}
        >
          {submitting
            ? t('bookings.saving', {}, { defaultValue: 'Saving\u2026' })
            : t('bookings.save', {}, { defaultValue: 'Save booking' })}
        </button>
      </div>
    </form>
  )
}
