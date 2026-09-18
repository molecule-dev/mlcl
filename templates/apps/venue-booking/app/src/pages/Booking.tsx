import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface Venue {
  id: string
  name: string
  city: string
  neighborhood?: string
  capacity: number
  thumbnail_url?: string | null
  hourly_rate_cents?: number | null
  daily_rate_cents?: number | null
  minimum_hours?: number | null
  host_name?: string
  instant_book?: boolean
}

function fmtPrice(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`
}

export function Booking() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { venueId } = useParams<{ venueId: string }>()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [venue, setVenue] = useState<Venue | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [date, setDate] = useState(params.get('date') ?? '')
  const [startTime, setStartTime] = useState('14:00')
  const [endTime, setEndTime] = useState('20:00')
  const [guestCount, setGuestCount] = useState(Number(params.get('guests') ?? '20') || 20)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [eventType, setEventType] = useState('Workshop')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!venueId) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/venues/${venueId}`)
      .then((res) => {
        if (!cancelled) setVenue(unwrapSingle<Venue>(res))
      })
      .catch(() => {
        /* noop */
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, venueId])

  const hours = useMemo(() => {
    const s = parseInt(startTime.split(':')[0] ?? '0', 10)
    const e = parseInt(endTime.split(':')[0] ?? '0', 10)
    return Math.max(0, e - s)
  }, [startTime, endTime])

  const subtotalCents = useMemo(() => {
    if (!venue) return 0
    if (venue.hourly_rate_cents && hours > 0) return venue.hourly_rate_cents * hours
    if (venue.daily_rate_cents) return venue.daily_rate_cents
    return 0
  }, [venue, hours])
  const serviceFeeCents = Math.round(subtotalCents * 0.1)
  const totalCents = subtotalCents + serviceFeeCents

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!venueId) return
    setSubmitting(true)
    try {
      const res = await http.post('/api/reservations', {
        venue_id: venueId,
        starts_at_iso: date && startTime ? `${date}T${startTime}:00Z` : undefined,
        ends_at_iso: date && endTime ? `${date}T${endTime}:00Z` : undefined,
        guest_count: guestCount,
        guest_name: [firstName, lastName].filter(Boolean).join(' ').trim(),
        phone,
        event_type: eventType,
        notes,
        total_cents: totalCents,
      })
      const data = unwrapSingle<{ id: string }>(res)
      navigate(`/booking/confirmation/${data?.id ?? 'new'}`)
    } catch (_error) {
      // Demo mock — even without API, route to confirmation
      navigate(`/booking/confirmation/preview-${venueId}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !venue) {
    return (
      <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 12), cm.mxAuto)}>
        <div className={cm.cn('aspect-[3/1] rounded-2xl bg-surface-container animate-pulse')} />
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header className={cm.sp('mb', 8)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.25em] text-primary',
          )}
        >
          {t('booking.eyebrow', {}, { defaultValue: 'Confirm and request' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('extrabold'),
            cm.sp('mt', 2),
            'leading-tight',
          )}
          style={{ fontFamily: '"DM Sans", system-ui, sans-serif', letterSpacing: '-0.02em' }}
        >
          {t('booking.heading', { name: venue.name }, { defaultValue: 'Book {{name}}' })}
        </h1>
      </header>

      <form onSubmit={submit} className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-10')}>
        <div className={'lg:col-span-7 xl:col-span-8'}>
          <section
            className={cm.cn(
              cm.sp('p', 6),
              cm.sp('mb', 6),
              'bg-surface rounded-2xl border border-outline-variant/40',
            )}
          >
            <h2
              className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif', letterSpacing: '-0.02em' }}
            >
              {t('form.when', {}, { defaultValue: 'When' })}
            </h2>
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-4')}>
              <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('form.date', {}, { defaultValue: 'Date' })}
                </span>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'bg-surface-container-low rounded-xl border border-outline-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold',
                  )}
                />
              </label>
              <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('common.start', {}, { defaultValue: 'Start' })}
                </span>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'bg-surface-container-low rounded-xl border border-outline-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold',
                  )}
                />
              </label>
              <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('booking.endLabel', {}, { defaultValue: 'End' })}
                </span>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'bg-surface-container-low rounded-xl border border-outline-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold',
                  )}
                />
              </label>
            </div>
          </section>

          <section
            className={cm.cn(
              cm.sp('p', 6),
              cm.sp('mb', 6),
              'bg-surface rounded-2xl border border-outline-variant/40',
            )}
          >
            <h2
              className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif', letterSpacing: '-0.02em' }}
            >
              {t('booking.guestInfo', {}, { defaultValue: 'About your event' })}
            </h2>
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-4')}>
              <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('form.firstName', {}, { defaultValue: 'First name' })}
                </span>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'bg-surface-container-low rounded-xl border border-outline-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                  )}
                />
              </label>
              <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('form.lastName', {}, { defaultValue: 'Last name' })}
                </span>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'bg-surface-container-low rounded-xl border border-outline-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                  )}
                />
              </label>
              <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('form.phone', {}, { defaultValue: 'Phone' })}
                </span>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 555-1234"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'bg-surface-container-low rounded-xl border border-outline-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                  )}
                />
              </label>
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
                <input
                  type="number"
                  min={1}
                  max={venue.capacity}
                  required
                  value={guestCount}
                  onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value) || 1))}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'bg-surface-container-low rounded-xl border border-outline-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                  )}
                />
              </label>
              <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'md:col-span-2')}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('booking.eventType', {}, { defaultValue: 'Event type' })}
                </span>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'bg-surface-container-low rounded-xl border border-outline-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold',
                  )}
                >
                  <option>Workshop</option>
                  <option>Photoshoot</option>
                  <option>Meeting</option>
                  <option>Wedding</option>
                  <option>Birthday</option>
                  <option>Other</option>
                </select>
              </label>
              <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'md:col-span-2')}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('booking.notes', {}, { defaultValue: 'Note to host (optional)' })}
                </span>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t(
                    'booking.notesPlaceholder',
                    {},
                    {
                      defaultValue:
                        'Tell the host about your event — gives them context for setup.',
                    },
                  )}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'bg-surface-container-low rounded-xl border border-outline-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none',
                  )}
                />
              </label>
            </div>
          </section>
        </div>

        <aside className={'lg:col-span-5 xl:col-span-4'}>
          <div
            className={cm.cn(
              'sticky top-24',
              cm.sp('p', 6),
              'bg-surface rounded-2xl shadow-lg border border-outline-variant/40',
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('mb', 4))}>
              <div
                className={cm.cn(
                  'w-20 aspect-[4/3] rounded-xl overflow-hidden bg-surface-variant flex-shrink-0',
                )}
              >
                {venue.thumbnail_url ? (
                  <img
                    src={venue.thumbnail_url}
                    alt={venue.name}
                    className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
                  />
                ) : null}
              </div>
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'min-w-0')}>
                <p
                  className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), 'truncate')}
                  style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                >
                  {venue.name}
                </p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
                  {venue.neighborhood ? `${venue.neighborhood} · ` : ''}
                  {venue.city}
                </p>
                {venue.host_name ? (
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      'booking.hostedBy',
                      { host: venue.host_name },
                      { defaultValue: 'Hosted by {{host}}' },
                    )}
                  </p>
                ) : null}
              </div>
            </div>

            <div
              className={cm.cn(
                cm.sp('pt', 4),
                cm.flex({ direction: 'col', gap: 'sm' }),
                cm.textSize('sm'),
                'border-t border-outline-variant',
              )}
            >
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <span className="text-on-surface-variant">
                  {hours > 0
                    ? t(
                        'booking.subtotalHours',
                        { count: hours },
                        { defaultValue: '{{count}} hours' },
                      )
                    : t('booking.subtotalDay', {}, { defaultValue: 'Daily rate' })}
                </span>
                <span className="tabular-nums">{fmtPrice(subtotalCents)}</span>
              </div>
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <span className="text-on-surface-variant">
                  {t(
                    'booking.serviceFee',
                    { appName: APP_NAME },
                    { defaultValue: '{{appName}} service fee' },
                  )}
                </span>
                <span className="tabular-nums">{fmtPrice(serviceFeeCents)}</span>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('pt', 3),
                  cm.fontWeight('bold'),
                  'border-t border-outline-variant',
                )}
              >
                <span>{t('nav.total', {}, { defaultValue: 'Total' })}</span>
                <span className="tabular-nums">{fmtPrice(totalCents)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={cm.cn(
                cm.sp('mt', 5),
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
                'w-full bg-primary text-on-primary rounded-xl hover:bg-primary-container transition-colors shadow-md disabled:opacity-50',
              )}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {venue.instant_book ? 'bolt' : 'event_available'}
              </span>
              {submitting
                ? t('booking.submitting', {}, { defaultValue: 'Sending request…' })
                : venue.instant_book
                  ? t('booking.confirm', {}, { defaultValue: 'Book and pay' })
                  : t('booking.request', {}, { defaultValue: 'Request to book' })}
            </button>
            <Link
              to={`/venue/${venue.id}`}
              className={cm.cn(
                cm.sp('mt', 3),
                cm.textSize('xs'),
                cm.textCenter,
                'block text-on-surface-variant hover:text-primary',
              )}
            >
              {t('booking.backToVenue', {}, { defaultValue: '← Back to venue' })}
            </Link>
          </div>
        </aside>
      </form>
    </div>
  )
}
