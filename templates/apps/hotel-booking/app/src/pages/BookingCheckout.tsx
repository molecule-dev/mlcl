import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Property {
  id: string
  name: string
  city: string
  country: string
  price_per_night_cents: number
  thumbnail_url?: string | null
}

interface RoomType {
  id: string
  property_id: string
  name: string
  capacity: number
  price_per_night_cents: number
  resort_fee_cents: number
}

interface UserProfile {
  first_name: string
  last_name: string
  email: string | null
  name: string | null
}

function fmt(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`
}

function diffNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  if (Number.isNaN(ms) || ms <= 0) return 0
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

function defaultIso(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

export function BookingCheckout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [params] = useSearchParams()

  const [property, setProperty] = useState<Property | null>(null)
  const [rooms, setRooms] = useState<RoomType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const initialCheckIn = params.get('check_in') || defaultIso(14)
  const initialCheckOut = params.get('check_out') || defaultIso(17)
  const initialGuests = Math.max(1, Number(params.get('guests') ?? '2') || 2)
  const initialRoomId = params.get('room_id')

  const [checkIn, setCheckIn] = useState(initialCheckIn)
  const [checkOut, setCheckOut] = useState(initialCheckOut)
  const [guests, setGuests] = useState(initialGuests)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(initialRoomId)

  const [guest, setGuest] = useState({ firstName: '', lastName: '', email: '', phone: '' })
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple_pay' | 'google_pay'>('card')

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get(`/api/properties/${id}`).catch(() => null),
      http.get(`/api/properties/${id}/rooms`).catch(() => null),
      http.get('/api/profile/me').catch(() => null),
    ])
      .then(([pRes, rRes, uRes]) => {
        if (cancelled) return
        const prop = unwrapSingle<Property>(pRes)
        const rms = unwrapList<RoomType>(rRes)
        setProperty(prop)
        setRooms(rms)
        // Functional update keeps `selectedRoomId` out of the effect deps —
        // otherwise every room selection re-triggers the whole fetch and
        // flashes the loading state.
        if (rms.length > 0) setSelectedRoomId((current) => current ?? rms[0].id)
        const profile = unwrapSingle<UserProfile>(uRes)
        if (profile) {
          setGuest((g) => ({
            ...g,
            firstName: g.firstName || profile.first_name || '',
            lastName: g.lastName || profile.last_name || '',
            email: g.email || profile.email || '',
          }))
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(t('bookingCheckout.loadError', {}, { defaultValue: 'Failed to load property.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, http, t])

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) ?? rooms[0] ?? null,
    [rooms, selectedRoomId],
  )
  const nights = Math.max(1, diffNights(checkIn, checkOut))
  const baseRate = selectedRoom?.price_per_night_cents ?? property?.price_per_night_cents ?? 0
  const resortFee = (selectedRoom?.resort_fee_cents ?? 0) * nights
  const subtotal = baseRate * nights
  const taxes = Math.round(subtotal * 0.14)
  const total = subtotal + taxes + resortFee

  async function placeBooking(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRoom) return
    if (!checkIn || !checkOut) {
      setSubmitError(
        t(
          'bookingCheckout.datesRequired',
          {},
          { defaultValue: 'Please pick your check-in and check-out dates.' },
        ),
      )
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await http.post('/api/reservations', {
        room_id: selectedRoom.id,
        check_in: checkIn,
        check_out: checkOut,
        guests,
        special_requests: paymentMethod !== 'card' ? `payment:${paymentMethod}` : undefined,
      })
      const created = unwrapSingle<{ id: string }>(res)
      const tripId = created?.id ?? id ?? ''
      // Domain event: the booking committed — the funnel's conversion point.
      void track({
        name: 'booking.created',
        properties: {
          booking_id: tripId,
          property_id: id,
          room_id: selectedRoom.id,
          check_in: checkIn,
          check_out: checkOut,
          guests,
          total_cents: total,
        },
      })
      navigate(`/booking/${tripId}/confirmation`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setSubmitError(
        t(
          'bookingCheckout.submitError',
          { message },
          { defaultValue: 'Booking failed: {{message}}' },
        ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
        {t('bookingCheckout.heading', {}, { defaultValue: 'Confirm and book' })}
      </h1>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : !property ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-on-surface-variant')}>
          {t('bookingCheckout.notFound', {}, { defaultValue: 'Property not found.' })}
        </p>
      ) : (
        <form onSubmit={placeBooking} className={cm.grid({ cols: 12, gap: 'lg' })}>
          <div className={'col-span-12 lg:col-span-7 space-y-6'}>
            <section className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-xl shadow-sm')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 3))}>
                {t('bookingCheckout.tripHeading', {}, { defaultValue: 'Your trip' })}
              </h2>
              <div className={cm.grid({ cols: 2, gap: 'sm' })}>
                <Field
                  label={t('bookingCheckout.checkIn', {}, { defaultValue: 'Check-in' })}
                  value={checkIn}
                  onChange={setCheckIn}
                  type="date"
                />
                <Field
                  label={t('bookingCheckout.checkOut', {}, { defaultValue: 'Check-out' })}
                  value={checkOut}
                  onChange={setCheckOut}
                  type="date"
                />
              </div>
              <label className="block mt-3">
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'block',
                    cm.sp('mb', 1),
                  )}
                >
                  {t('nav.guests', {}, { defaultValue: 'Guests' })}
                </span>
                <select
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'w-full border border-outline-variant rounded-md',
                  )}
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              {rooms.length > 1 ? (
                <label className="block mt-3">
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'block',
                      cm.sp('mb', 1),
                    )}
                  >
                    {t('bookingCheckout.room', {}, { defaultValue: 'Room' })}
                  </span>
                  <select
                    value={selectedRoom?.id ?? ''}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'w-full border border-outline-variant rounded-md',
                    )}
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} — {fmt(r.price_per_night_cents)}/night
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </section>

            <section className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-xl shadow-sm')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 3))}>
                {t('bookingCheckout.guestHeading', {}, { defaultValue: 'Lead guest' })}
              </h2>
              <div className={cm.grid({ cols: 2, gap: 'sm' })}>
                <Field
                  label={t('form.firstName', {}, { defaultValue: 'First name' })}
                  value={guest.firstName}
                  onChange={(v) => setGuest((g) => ({ ...g, firstName: v }))}
                />
                <Field
                  label={t('form.lastName', {}, { defaultValue: 'Last name' })}
                  value={guest.lastName}
                  onChange={(v) => setGuest((g) => ({ ...g, lastName: v }))}
                />
                <Field
                  label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                  value={guest.email}
                  onChange={(v) => setGuest((g) => ({ ...g, email: v }))}
                  type="email"
                />
                <Field
                  label={t('form.phone', {}, { defaultValue: 'Phone' })}
                  value={guest.phone}
                  onChange={(v) => setGuest((g) => ({ ...g, phone: v }))}
                  type="tel"
                />
              </div>
            </section>

            <section className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-xl shadow-sm')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 3))}>
                {t('nav.paymentMethod', {}, { defaultValue: 'Payment method' })}
              </h2>
              <div className={'space-y-2'}>
                {(['card', 'apple_pay', 'google_pay'] as const).map((method) => (
                  <label
                    key={method}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'border border-outline-variant rounded-md cursor-pointer',
                    )}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method}
                      checked={paymentMethod === method}
                      onChange={() => setPaymentMethod(method)}
                    />
                    <span>
                      {t(
                        `bookingCheckout.payment.${method}`,
                        {},
                        {
                          defaultValue:
                            method === 'card'
                              ? 'Credit / debit card'
                              : method === 'apple_pay'
                                ? 'Apple Pay'
                                : 'Google Pay',
                        },
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </section>
          </div>

          <aside className={'col-span-12 lg:col-span-5'}>
            <div
              className={cm.cn(
                cm.sp('p', 5),
                'bg-surface rounded-xl shadow-sm sticky top-24 space-y-3',
              )}
            >
              <div className={cm.flex({ gap: 'sm' })}>
                <div
                  className={
                    'aspect-[4/3] w-24 bg-surface-variant rounded-md overflow-hidden flex-shrink-0'
                  }
                >
                  {property.thumbnail_url ? (
                    <img
                      src={property.thumbnail_url}
                      alt=""
                      className={'h-full w-full object-cover'}
                    />
                  ) : null}
                </div>
                <div className={'min-w-0'}>
                  <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                    {property.name}
                  </h2>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {property.city}, {property.country}
                  </p>
                  {selectedRoom ? (
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {selectedRoom.name}
                    </p>
                  ) : null}
                </div>
              </div>
              <dl
                className={cm.cn(
                  cm.textSize('sm'),
                  'space-y-1',
                  cm.sp('pt', 3),
                  'border-t border-outline-variant',
                )}
              >
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <dt>
                    {t(
                      'bookingCheckout.nights',
                      { count: nights, rate: fmt(baseRate) },
                      { defaultValue: '{{rate}} × {{count}} nights' },
                    )}
                  </dt>
                  <dd>{fmt(subtotal)}</dd>
                </div>
                {resortFee > 0 ? (
                  <div className={cm.flex({ align: 'center', justify: 'between' })}>
                    <dt>{t('bookingCheckout.resortFee', {}, { defaultValue: 'Resort fee' })}</dt>
                    <dd>{fmt(resortFee)}</dd>
                  </div>
                ) : null}
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <dt>{t('bookingCheckout.taxes', {}, { defaultValue: 'Taxes & fees' })}</dt>
                  <dd>{fmt(taxes)}</dd>
                </div>
              </dl>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('pt', 3),
                  cm.fontWeight('semibold'),
                  cm.textSize('lg'),
                  'border-t border-outline-variant',
                )}
              >
                <span>{t('nav.total', {}, { defaultValue: 'Total' })}</span>
                <span data-testid="booking-total">{fmt(total)}</span>
              </div>
              {submitError ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-error')} role="alert">
                  {submitError}
                </p>
              ) : null}
              <button
                type="submit"
                data-testid="confirm-booking"
                disabled={submitting || !selectedRoom}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.sp('mt', 4),
                  cm.fontWeight('semibold'),
                  'block w-full text-center bg-primary text-on-primary rounded-full hover:bg-primary-hover disabled:opacity-50',
                )}
              >
                {submitting
                  ? t('bookingCheckout.placing', {}, { defaultValue: 'Confirming…' })
                  : t(
                      'bookingCheckout.confirm',
                      { total: fmt(total) },
                      { defaultValue: 'Confirm booking · {{total}}' },
                    )}
              </button>
            </div>
          </aside>
        </form>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  const cm = getClassMap()
  return (
    <label className="block">
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md',
        )}
      />
    </label>
  )
}
