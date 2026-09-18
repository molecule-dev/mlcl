import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface PaymentMethod {
  id: string
  brand: string
  last4: string
  isDefault: boolean
}

interface ProfileDigest {
  paymentMethods: PaymentMethod[]
  firstName?: string
  lastName?: string
  email?: string | null
  phone?: string
}

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
  name: string
  description?: string
  capacity?: number
  price_per_night_cents: number
}

function fmt(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`
}

function diffNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  if (Number.isNaN(ms) || ms <= 0) return 0
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

function todayISO(offset = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

export function Booking() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const http = useHttpClient()

  const [property, setProperty] = useState<Property | null>(null)
  const [rooms, setRooms] = useState<RoomType[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [checkIn, setCheckIn] = useState(params.get('check_in') ?? todayISO(7))
  const [checkOut, setCheckOut] = useState(params.get('check_out') ?? todayISO(11))
  const [guests, setGuests] = useState(Number(params.get('guests') ?? 2))

  const [guest, setGuest] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  })
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [specialRequests, setSpecialRequests] = useState('')

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get(`/api/accommodations/${id}`).catch(() => null),
      http.get(`/api/accommodations/${id}/rooms`).catch(() => null),
      http.get('/api/profile/me').catch(() => null),
    ])
      .then(([pRes, rRes, profRes]) => {
        if (cancelled) return
        const rawProp = unwrapSingle<Property>(pRes)
        setProperty(
          rawProp
            ? {
                ...rawProp,
                price_per_night_cents: Number(rawProp.price_per_night_cents ?? 0),
              }
            : null,
        )
        const roomsList = unwrapList<RoomType>(rRes).map((r) => ({
          ...r,
          price_per_night_cents: Number(r.price_per_night_cents ?? 0),
          capacity: Number(r.capacity ?? 0),
        }))
        setRooms(roomsList)
        if (roomsList[0]) setSelectedRoomId(roomsList[0].id)
        const profile = unwrapSingle<ProfileDigest>(profRes)
        if (profile) {
          setGuest({
            firstName: profile.firstName ?? '',
            lastName: profile.lastName ?? '',
            email: profile.email ?? '',
            phone: profile.phone ?? '',
          })
          const methods = Array.isArray(profile.paymentMethods) ? profile.paymentMethods : []
          setPaymentMethods(methods)
          const def = methods.find((m) => m.isDefault) ?? methods[0]
          if (def) setSelectedPaymentId(def.id)
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(t('booking.loadError', {}, { defaultValue: 'Failed to load property.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, http, t])

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId],
  )

  const ratePerNight = selectedRoom?.price_per_night_cents ?? property?.price_per_night_cents ?? 0
  const nights = diffNights(checkIn, checkOut)
  const subtotal = ratePerNight * Math.max(nights, 1)
  const cleaningFee = Math.round(ratePerNight * 0.08)
  const taxes = Math.round(subtotal * 0.13)
  const total = subtotal + cleaningFee + taxes

  async function placeBooking(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRoom) {
      setError(t('booking.noRoomError', {}, { defaultValue: 'Pick a room before confirming.' }))
      return
    }
    if (nights < 1) {
      setError(
        t('booking.invalidDates', {}, { defaultValue: 'Pick valid check-in and check-out dates.' }),
      )
      return
    }
    if (paymentMethods.length > 0 && !selectedPaymentId) {
      setError(
        t(
          'booking.noPaymentSelected',
          {},
          { defaultValue: 'Pick a payment method before confirming.' },
        ),
      )
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const created = await http.post('/api/bookings', {
        room_id: selectedRoom.id,
        check_in: checkIn,
        check_out: checkOut,
        guests,
        special_requests: specialRequests || undefined,
        payment_method_id: selectedPaymentId || undefined,
      })
      const data = (created.data ?? created) as { id?: string }
      const tripId = data?.id
      navigate(tripId ? `/trips/${tripId}` : '/trips', { replace: true })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('booking.submitError', {}, { defaultValue: 'Booking failed.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.maxW('6xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <Link
        to={id ? `/property/${id}` : '/search'}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('sm'),
          'text-on-surface-variant hover:text-primary',
        )}
      >
        <span className={'material-symbols-outlined text-base'} aria-hidden="true">
          arrow_back
        </span>
        {t('booking.backLink', {}, { defaultValue: 'Back to property' })}
      </Link>

      <header className={cm.sp('mt', 4)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.25em] text-primary',
          )}
        >
          {t('booking.eyebrow', {}, { defaultValue: 'Checkout' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('extrabold'),
            cm.sp('mt', 2),
            'leading-tight tracking-tight',
          )}
          style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
        >
          {t('booking.heading', {}, { defaultValue: 'Confirm your trip' })}
        </h1>
      </header>

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : !property ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-on-surface-variant')}>
          {t('booking.notFound', {}, { defaultValue: 'Property not found.' })}
        </p>
      ) : (
        <form
          onSubmit={placeBooking}
          data-testid="booking-form"
          className={cm.cn(cm.sp('mt', 8), 'grid grid-cols-1 lg:grid-cols-12 gap-8')}
        >
          <div className={'lg:col-span-7 space-y-6'}>
            <section
              className={cm.cn(
                cm.sp('p', 6),
                'bg-surface rounded-2xl shadow-sm border-l-4 border-primary',
              )}
            >
              <h2
                className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 4))}
                style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
              >
                {t('booking.tripHeading', {}, { defaultValue: 'Trip details' })}
              </h2>
              <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-3')}>
                <Field
                  id="booking-check-in"
                  label={t('form.checkIn', {}, { defaultValue: 'Check in' })}
                  type="date"
                  value={checkIn}
                  onChange={setCheckIn}
                />
                <Field
                  id="booking-check-out"
                  label={t('form.checkOut', {}, { defaultValue: 'Check out' })}
                  type="date"
                  value={checkOut}
                  onChange={setCheckOut}
                />
                <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('nav.guests', {}, { defaultValue: 'Guests' })}
                  </span>
                  <select
                    data-testid="booking-guests"
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.fontWeight('semibold'),
                      'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
                    )}
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            {rooms.length > 0 ? (
              <section className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-2xl shadow-sm')}>
                <h2
                  className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 4))}
                  style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
                >
                  {t('booking.roomHeading', {}, { defaultValue: 'Pick your room' })}
                </h2>
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
                  {rooms.map((r) => (
                    <label
                      key={r.id}
                      data-testid={`booking-room-${r.id}`}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        'border rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors',
                        selectedRoomId === r.id
                          ? 'border-primary bg-primary/5'
                          : 'border-outline-variant hover:border-primary/60',
                      )}
                    >
                      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                        <input
                          type="radio"
                          name="roomType"
                          value={r.id}
                          checked={selectedRoomId === r.id}
                          onChange={() => setSelectedRoomId(r.id)}
                          className="accent-primary"
                        />
                        <div>
                          <p className={cm.fontWeight('semibold')}>{r.name}</p>
                          {r.description ? (
                            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                              {r.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <span className={cm.cn(cm.fontWeight('bold'), 'tabular-nums')}>
                        {fmt(r.price_per_night_cents)}
                        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant ml-1')}>
                          / {t('booking.perNight', {}, { defaultValue: 'night' })}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            ) : null}

            <section
              className={cm.cn(
                cm.sp('p', 6),
                'bg-surface rounded-2xl shadow-sm border-l-4 border-primary',
              )}
            >
              <h2
                className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 4))}
                style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
              >
                {t('booking.guestHeading', {}, { defaultValue: 'Lead guest' })}
              </h2>
              <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-3')}>
                <Field
                  id="booking-first-name"
                  label={t('form.firstName', {}, { defaultValue: 'First name' })}
                  value={guest.firstName}
                  onChange={(v) => setGuest((g) => ({ ...g, firstName: v }))}
                />
                <Field
                  id="booking-last-name"
                  label={t('form.lastName', {}, { defaultValue: 'Last name' })}
                  value={guest.lastName}
                  onChange={(v) => setGuest((g) => ({ ...g, lastName: v }))}
                />
                <Field
                  id="booking-email"
                  label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                  value={guest.email}
                  onChange={(v) => setGuest((g) => ({ ...g, email: v }))}
                  type="email"
                />
                <Field
                  id="booking-phone"
                  label={t('form.phone', {}, { defaultValue: 'Phone' })}
                  value={guest.phone}
                  onChange={(v) => setGuest((g) => ({ ...g, phone: v }))}
                  type="tel"
                />
              </div>
              <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.sp('mt', 4))}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('booking.specialRequests', {}, { defaultValue: 'Special requests' })}
                </span>
                <textarea
                  data-testid="booking-special-requests"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  rows={3}
                  placeholder={t(
                    'booking.specialRequestsPlaceholder',
                    {},
                    { defaultValue: 'Anything the host should know?' },
                  )}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.fontWeight('medium'),
                    'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none',
                  )}
                />
              </label>
            </section>

            <section
              className={cm.cn(
                cm.sp('p', 6),
                'bg-surface rounded-2xl shadow-sm border-l-4 border-accent',
              )}
            >
              <h2
                className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 4))}
                style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
              >
                {t('nav.paymentMethod', {}, { defaultValue: 'Payment method' })}
              </h2>
              {paymentMethods.length === 0 ? (
                <p
                  data-testid="booking-no-payment-method"
                  className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
                >
                  {t('booking.noPaymentMethods', {}, { defaultValue: 'No saved payment methods.' })}{' '}
                  <Link to="/account" className="text-primary font-semibold hover:underline">
                    {t('booking.addPaymentLink', {}, { defaultValue: 'Add one in Account →' })}
                  </Link>
                </p>
              ) : (
                <div
                  className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
                  data-testid="booking-payment-methods"
                >
                  {paymentMethods.map((m) => (
                    <label
                      key={m.id}
                      data-testid={`booking-payment-${m.id}`}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'sm' }),
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        'border rounded-xl cursor-pointer transition-colors',
                        selectedPaymentId === m.id
                          ? 'border-primary bg-primary/5'
                          : 'border-outline-variant hover:border-primary/60',
                      )}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={m.id}
                        checked={selectedPaymentId === m.id}
                        onChange={() => setSelectedPaymentId(m.id)}
                        className="accent-primary"
                      />
                      <span
                        className="material-symbols-outlined text-on-surface-variant"
                        aria-hidden="true"
                      >
                        credit_card
                      </span>
                      <span className={cm.cn(cm.fontWeight('semibold'))}>
                        {m.brand.toUpperCase()} •••• {m.last4}
                      </span>
                      {m.isDefault ? (
                        <span
                          className={cm.cn(
                            cm.sp('px', 2),
                            cm.sp('py', 1),
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            'rounded-full bg-primary-container text-primary uppercase tracking-widest ml-auto',
                          )}
                        >
                          {t('booking.defaultBadge', {}, { defaultValue: 'Default' })}
                        </span>
                      ) : null}
                    </label>
                  ))}
                </div>
              )}
              <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 3), 'text-on-surface-variant')}>
                {t(
                  'booking.paymentManageHint',
                  {},
                  { defaultValue: 'Manage saved payment methods in Account → Payment methods.' },
                )}
              </p>
            </section>

            <section className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-2xl shadow-sm')}>
              <h2
                className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 4))}
                style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
              >
                {t('booking.policyHeading', {}, { defaultValue: 'Cancellation & terms' })}
              </h2>
              <ul className={cm.cn('text-sm', cm.flex({ direction: 'col', gap: 'sm' }))}>
                <li className={cm.flex({ align: 'start', gap: 'sm' })}>
                  <span
                    className="material-symbols-outlined text-success"
                    aria-hidden="true"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                  <span>
                    {t(
                      'booking.policy1',
                      {},
                      { defaultValue: 'Free cancellation up to 7 days before check-in.' },
                    )}
                  </span>
                </li>
                <li className={cm.flex({ align: 'start', gap: 'sm' })}>
                  <span
                    className="material-symbols-outlined text-success"
                    aria-hidden="true"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                  <span>
                    {t(
                      'booking.policy2',
                      {},
                      {
                        defaultValue: 'No charge today — your card is held for confirmation only.',
                      },
                    )}
                  </span>
                </li>
                <li className={cm.flex({ align: 'start', gap: 'sm' })}>
                  <span
                    className="material-symbols-outlined text-success"
                    aria-hidden="true"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                  <span>
                    {t(
                      'booking.policy3',
                      { appName: APP_NAME },
                      {
                        defaultValue:
                          'Trip protection covered by {{appName}} — 24/7 concierge support.',
                      },
                    )}
                  </span>
                </li>
              </ul>
              <label
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('mt', 4),
                  cm.textSize('sm'),
                )}
              >
                <input
                  type="checkbox"
                  data-testid="booking-agree-terms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  required
                  className="accent-primary"
                />
                <span>
                  {t(
                    'booking.agreeTerms',
                    { appName: APP_NAME },
                    {
                      defaultValue: "I agree to {{appName}}'s house rules and cancellation policy.",
                    },
                  )}
                </span>
              </label>
            </section>
          </div>

          <aside className={'lg:col-span-5'}>
            <div
              className={cm.cn(
                cm.sp('p', 6),
                'bg-surface rounded-2xl shadow-xl sticky top-24 border border-outline-variant/40',
              )}
            >
              <div className={cm.flex({ gap: 'sm' })}>
                <div
                  className={
                    'aspect-[4/3] w-28 bg-surface-variant rounded-xl overflow-hidden flex-shrink-0'
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
                  <h2
                    className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}
                    style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
                  >
                    {property.name}
                  </h2>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {property.city}, {property.country}
                  </p>
                  <p
                    className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-on-surface-variant')}
                  >
                    {t(
                      'booking.tripSummary',
                      { nights, guests },
                      { defaultValue: '{{nights}} nights · {{guests}} guests' },
                    )}
                  </p>
                </div>
              </div>
              <ul
                className={cm.cn(
                  'text-sm',
                  cm.sp('mt', 5),
                  cm.sp('pt', 5),
                  'border-t border-outline-variant/60 space-y-2',
                )}
              >
                <li className={cm.flex({ align: 'center', justify: 'between' })}>
                  <span className="text-on-surface-variant">
                    {t(
                      'booking.lineRate',
                      { rate: fmt(ratePerNight), count: nights },
                      { defaultValue: '{{rate}} × {{count}} nights' },
                    )}
                  </span>
                  <span data-testid="booking-subtotal" className="tabular-nums font-semibold">
                    {fmt(subtotal)}
                  </span>
                </li>
                <li className={cm.flex({ align: 'center', justify: 'between' })}>
                  <span className="text-on-surface-variant">
                    {t('booking.lineCleaning', {}, { defaultValue: 'Cleaning fee' })}
                  </span>
                  <span className="tabular-nums font-semibold">{fmt(cleaningFee)}</span>
                </li>
                <li className={cm.flex({ align: 'center', justify: 'between' })}>
                  <span className="text-on-surface-variant">
                    {t('booking.lineTaxes', {}, { defaultValue: 'Taxes & fees' })}
                  </span>
                  <span className="tabular-nums font-semibold">{fmt(taxes)}</span>
                </li>
              </ul>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('pt', 4),
                  cm.sp('mt', 4),
                  cm.fontWeight('bold'),
                  cm.textSize('lg'),
                  'border-t border-outline-variant/60',
                )}
              >
                <span>{t('nav.total', {}, { defaultValue: 'Total' })}</span>
                <span data-testid="booking-total" className="tabular-nums">
                  {fmt(total)}
                </span>
              </div>
              {error ? (
                <p
                  data-testid="booking-error"
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mt', 4),
                    cm.sp('p', 3),
                    'rounded-xl bg-error/10 text-error border border-error/30',
                  )}
                >
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                data-testid="booking-confirm"
                disabled={
                  submitting ||
                  !agreeTerms ||
                  !selectedRoomId ||
                  (paymentMethods.length > 0 && !selectedPaymentId)
                }
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.sp('mt', 5),
                  cm.fontWeight('bold'),
                  cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
                  'block w-full rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-lg disabled:opacity-60',
                )}
              >
                {submitting
                  ? t('booking.placing', {}, { defaultValue: 'Confirming…' })
                  : t(
                      'booking.confirm',
                      { total: fmt(total) },
                      { defaultValue: 'Confirm trip · {{total}}' },
                    )}
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  arrow_forward
                </span>
              </button>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.textCenter,
                  cm.sp('mt', 3),
                  'text-on-surface-variant',
                )}
              >
                {t('booking.noChargeYet', {}, { defaultValue: "You won't be charged yet." })}
              </p>
            </div>
          </aside>
        </form>
      )}
    </div>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  type = 'text',
}: {
  id?: string
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  const cm = getClassMap()
  return (
    <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.fontWeight('semibold'),
          'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
        )}
      />
    </label>
  )
}
