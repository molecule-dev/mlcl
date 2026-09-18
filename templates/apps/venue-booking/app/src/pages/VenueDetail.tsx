import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Venue {
  id: string
  name: string
  subtitle?: string
  venue_type?: string
  city: string
  neighborhood?: string
  country?: string
  capacity: number
  rating: number
  review_count: number
  hourly_rate_cents?: number | null
  daily_rate_cents?: number | null
  minimum_hours?: number | null
  thumbnail_url?: string | null
  photos?: string[]
  amenities?: string[]
  badges?: string[]
  instant_book?: boolean
  superhost?: boolean
  host_id?: string
  host_name?: string
  description?: string
}

interface Review {
  id: string
  author_name: string
  author_avatar_url?: string | null
  rating: number
  event_type?: string
  comment: string
  created_at_iso: string
  host_response?: string | null
}

function fmtPrice(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`
}

export function VenueDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()

  const [venue, setVenue] = useState<Venue | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('14:00')
  const [endTime, setEndTime] = useState('20:00')
  const [guestCount, setGuestCount] = useState(20)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get(`/api/venues/${id}`),
      http.get(`/api/reviews?venue_id=${encodeURIComponent(id)}`),
    ])
      .then(([venueRes, reviewsRes]) => {
        if (cancelled) return
        const v = unwrapSingle<Venue>(venueRes)
        if (!v) {
          setError(t('venueDetail.notFound', {}, { defaultValue: 'We could not find that space.' }))
          return
        }
        setVenue(v)
        const list = unwrapList<Review>(reviewsRes)
        setReviews(list)
      })
      .catch(() => {
        if (cancelled) return
        setError(t('venueDetail.loadError', {}, { defaultValue: 'Failed to load venue.' }))
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const hours = useMemo(() => {
    if (!startTime || !endTime) return 0
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

  if (loading) {
    return (
      <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 12), cm.mxAuto)}>
        <div className={cm.cn('aspect-[2/1] rounded-2xl bg-surface-container animate-pulse')} />
      </div>
    )
  }

  if (error || !venue) {
    return (
      <div
        className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 16), cm.mxAuto, cm.textCenter)}
      >
        <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
          {error ??
            t('venueDetail.notFound', {}, { defaultValue: 'We could not find that space.' })}
        </p>
        <Link to="/search" className={cm.cn(cm.sp('mt', 4), 'inline-block text-primary font-bold')}>
          {t('venueDetail.backToSearch', {}, { defaultValue: 'Back to search' })}
        </Link>
      </div>
    )
  }

  const photos =
    venue.photos && venue.photos.length > 0
      ? venue.photos
      : venue.thumbnail_url
        ? [venue.thumbnail_url]
        : []

  return (
    <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      {/* Header band */}
      <header className={cm.sp('mb', 6)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.25em] text-primary',
          )}
        >
          {venue.neighborhood ? `${venue.neighborhood} · ${venue.city}` : venue.city}
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
          {venue.name}
        </h1>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
            cm.sp('mt', 3),
            cm.textSize('sm'),
            'text-on-surface-variant',
          )}
        >
          <span className={cm.flex({ align: 'center', gap: 'xs' })}>
            <span
              className={'material-symbols-outlined text-base text-warning'}
              aria-hidden="true"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
            <span className={cm.fontWeight('bold')}>{venue.rating.toFixed(2)}</span>
            <span>
              (
              {t(
                'common.countReviews',
                { count: venue.review_count },
                { defaultValue: '{{count}} reviews' },
              )}
              )
            </span>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {t(
              'venueDetail.capacity',
              { count: venue.capacity },
              { defaultValue: 'Up to {{count}} guests' },
            )}
          </span>
          {venue.venue_type ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="capitalize">{venue.venue_type}</span>
            </>
          ) : null}
          {venue.instant_book ? (
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                'bg-teal-100 text-teal-800 rounded-full text-xs font-bold uppercase tracking-widest',
              )}
            >
              {t('venueDetail.instantBook', {}, { defaultValue: 'Instant book' })}
            </span>
          ) : null}
          {venue.superhost ? (
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                'bg-orange-100 text-orange-800 rounded-full text-xs font-bold uppercase tracking-widest',
              )}
            >
              {t('venueDetail.superhost', {}, { defaultValue: 'Superhost' })}
            </span>
          ) : null}
        </div>
      </header>

      {/* Photo gallery — 1 large left + 4 small right per DESIGN.md */}
      <section className={cm.sp('mb', 8)}>
        <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-1 rounded-2xl overflow-hidden')}>
          <div className="relative aspect-[4/3] bg-surface-variant overflow-hidden">
            {photos[0] ? (
              <img
                src={photos[0]}
                alt={venue.name}
                className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
              />
            ) : null}
          </div>
          <div className={cm.cn('grid grid-cols-2 gap-1')}>
            {photos.slice(1, 5).map((p, i) => (
              <div key={i} className="relative aspect-square bg-surface-variant overflow-hidden">
                <img
                  src={p}
                  alt={`${venue.name} ${i + 2}`}
                  className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
                />
                {i === 3 && photos.length > 5 ? (
                  <span
                    className={cm.cn(
                      'absolute bottom-3 right-3 bg-surface text-primary font-bold uppercase tracking-widest text-xs rounded-full',
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                    )}
                  >
                    {t(
                      'venueDetail.showAllPhotos',
                      { count: photos.length },
                      { defaultValue: 'All {{count}} photos' },
                    )}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content + booking sidebar */}
      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-10')}>
        <div className={'lg:col-span-7 xl:col-span-8'}>
          {/* About */}
          <section className={cm.sp('mb', 10)}>
            <h2
              className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 3))}
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif', letterSpacing: '-0.02em' }}
            >
              {t('venueDetail.about', {}, { defaultValue: 'About this space' })}
            </h2>
            <p className={cm.cn(cm.textSize('base'), 'leading-relaxed text-on-surface-variant')}>
              {venue.description ??
                venue.subtitle ??
                t(
                  'venueDetail.aboutFallback',
                  { name: venue.name, appName: APP_NAME },
                  {
                    defaultValue:
                      "A distinctive space hand-vetted by the {{appName}} editors. Reach out to {{name}}'s host for a walkthrough.",
                  },
                )}
            </p>
          </section>

          {/* Amenities */}
          {venue.amenities && venue.amenities.length > 0 ? (
            <section className={cm.sp('mb', 10)}>
              <h2
                className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif', letterSpacing: '-0.02em' }}
              >
                {t('venueDetail.amenities', {}, { defaultValue: 'Amenities' })}
              </h2>
              <ul className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6')}>
                {venue.amenities.map((a) => (
                  <li
                    key={a}
                    className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('sm'))}
                  >
                    <span
                      className={'material-symbols-outlined text-base text-primary'}
                      aria-hidden="true"
                    >
                      check_circle
                    </span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Host card */}
          <section className={cm.sp('mb', 10)}>
            <div
              className={cm.cn(
                cm.sp('p', 6),
                'bg-surface-container-low rounded-2xl border border-outline-variant/40',
                cm.flex({ align: 'center', gap: 'md' }),
              )}
            >
              <div
                className={cm.cn(
                  'w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-on-primary text-xl font-extrabold',
                )}
              >
                {(venue.host_name ?? 'H').charAt(0)}
              </div>
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
                  {t(
                    'venueDetail.hostedBy',
                    { host: venue.host_name ?? 'the host' },
                    { defaultValue: 'Hosted by {{host}}' },
                  )}
                </p>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {venue.superhost
                    ? t(
                        'venueDetail.superhostMeta',
                        {},
                        { defaultValue: 'Superhost · responds within an hour · 96% response rate' },
                      )
                    : t(
                        'venueDetail.hostMeta',
                        {},
                        { defaultValue: 'Verified host · typically responds in a few hours' },
                      )}
                </p>
              </div>
            </div>
          </section>

          {/* Reviews */}
          <section className={cm.sp('mb', 10)}>
            <h2
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                cm.sp('mb', 4),
                cm.flex({ align: 'center', gap: 'sm' }),
              )}
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif', letterSpacing: '-0.02em' }}
            >
              <span
                className="material-symbols-outlined text-warning"
                aria-hidden="true"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
              {t(
                'venueDetail.reviewsHeading',
                { rating: venue.rating.toFixed(2), count: venue.review_count },
                { defaultValue: '{{rating}} · {{count}} reviews' },
              )}
            </h2>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
              {reviews.length > 0 ? (
                reviews.map((rv) => (
                  <article
                    key={rv.id}
                    className={cm.cn(
                      cm.sp('p', 5),
                      'bg-surface-container-lowest rounded-2xl border border-outline-variant/40',
                    )}
                  >
                    <header
                      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 2))}
                    >
                      {rv.author_avatar_url ? (
                        <img
                          src={rv.author_avatar_url}
                          alt=""
                          className={'w-10 h-10 rounded-full object-cover'}
                        />
                      ) : (
                        <div
                          className={
                            'w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold'
                          }
                        >
                          {rv.author_name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                          {rv.author_name}
                        </p>
                        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {new Date(rv.created_at_iso).toLocaleDateString(undefined, {
                            month: 'long',
                            year: 'numeric',
                          })}
                          {rv.event_type ? ` · ${rv.event_type}` : ''}
                        </p>
                      </div>
                      <div
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'xs' }),
                          'ml-auto text-warning text-sm font-bold',
                        )}
                      >
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={'material-symbols-outlined text-base'}
                            aria-hidden="true"
                            style={{
                              fontVariationSettings: i < rv.rating ? "'FILL' 1" : "'FILL' 0",
                            }}
                          >
                            star
                          </span>
                        ))}
                      </div>
                    </header>
                    <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed')}>{rv.comment}</p>
                    {rv.host_response ? (
                      <div
                        className={cm.cn(
                          cm.sp('mt', 3),
                          cm.sp('p', 4),
                          'rounded-xl bg-primary/5 border-l-4 border-primary',
                        )}
                      >
                        <p
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            'uppercase tracking-widest text-primary',
                          )}
                        >
                          {t(
                            'venueDetail.hostResponse',
                            { host: venue.host_name ?? 'host' },
                            { defaultValue: 'Response from {{host}}' },
                          )}
                        </p>
                        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'leading-relaxed')}>
                          {rv.host_response}
                        </p>
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'venueDetail.noReviews',
                    {},
                    { defaultValue: 'No reviews yet — be the first to book.' },
                  )}
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Booking sidebar */}
        <aside className={'lg:col-span-5 xl:col-span-4'}>
          <div
            className={cm.cn(
              'sticky top-24',
              cm.sp('p', 6),
              'bg-surface rounded-2xl shadow-lg border border-outline-variant/40',
            )}
          >
            {venue.hourly_rate_cents ? (
              <p className={cm.cn(cm.flex({ align: 'baseline', gap: 'xs' }))}>
                <span
                  className={cm.cn(cm.textSize('3xl'), cm.fontWeight('extrabold'), 'tabular-nums')}
                >
                  {fmtPrice(venue.hourly_rate_cents)}
                </span>
                <span
                  className={cm.cn(
                    cm.textSize('base'),
                    cm.fontWeight('semibold'),
                    'text-indigo-600',
                  )}
                >
                  {t('venueDetail.perHour', {}, { defaultValue: '/hr' })}
                </span>
              </p>
            ) : venue.daily_rate_cents ? (
              <p className={cm.cn(cm.flex({ align: 'baseline', gap: 'xs' }))}>
                <span
                  className={cm.cn(cm.textSize('3xl'), cm.fontWeight('extrabold'), 'tabular-nums')}
                >
                  {fmtPrice(venue.daily_rate_cents)}
                </span>
                <span
                  className={cm.cn(
                    cm.textSize('base'),
                    cm.fontWeight('semibold'),
                    'text-violet-600',
                  )}
                >
                  {t('venueDetail.perDay', {}, { defaultValue: '/day' })}
                </span>
              </p>
            ) : null}
            {venue.minimum_hours ? (
              <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                {t(
                  'venueDetail.minimum',
                  { count: venue.minimum_hours },
                  { defaultValue: '{{count}}-hour minimum' },
                )}
              </p>
            ) : null}

            <div
              className={cm.cn(
                cm.sp('mt', 5),
                'rounded-xl border border-outline-variant overflow-hidden divide-y divide-outline-variant',
              )}
            >
              <label
                className={cm.cn(cm.flex({ direction: 'col' }), cm.sp('px', 4), cm.sp('py', 3))}
              >
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
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={'bg-transparent border-0 outline-none font-semibold'}
                />
              </label>
              <div className={cm.cn('grid grid-cols-2')}>
                <label
                  className={cm.cn(cm.flex({ direction: 'col' }), cm.sp('px', 4), cm.sp('py', 3))}
                >
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
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={'bg-transparent border-0 outline-none font-semibold'}
                  />
                </label>
                <label
                  className={cm.cn(
                    cm.flex({ direction: 'col' }),
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'border-l border-outline-variant',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('venueDetail.endLabel', {}, { defaultValue: 'End' })}
                  </span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={'bg-transparent border-0 outline-none font-semibold'}
                  />
                </label>
              </div>
              <label
                className={cm.cn(cm.flex({ direction: 'col' }), cm.sp('px', 4), cm.sp('py', 3))}
              >
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
                  value={guestCount}
                  onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value) || 1))}
                  className={'bg-transparent border-0 outline-none font-semibold'}
                />
              </label>
            </div>

            <div
              className={cm.cn(
                cm.sp('mt', 4),
                cm.flex({ direction: 'col', gap: 'sm' }),
                cm.textSize('sm'),
              )}
            >
              {venue.hourly_rate_cents && hours > 0 ? (
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <span className="text-on-surface-variant">
                    {t(
                      'venueDetail.subtotalHours',
                      { count: hours },
                      { defaultValue: '{{count}} hours' },
                    )}
                  </span>
                  <span className="tabular-nums">{fmtPrice(subtotalCents)}</span>
                </div>
              ) : venue.daily_rate_cents ? (
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <span className="text-on-surface-variant">
                    {t('venueDetail.subtotalDay', {}, { defaultValue: 'Daily rate' })}
                  </span>
                  <span className="tabular-nums">{fmtPrice(subtotalCents)}</span>
                </div>
              ) : null}
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <span className="text-on-surface-variant">
                  {t(
                    'venueDetail.serviceFee',
                    { appName: APP_NAME },
                    { defaultValue: '{{appName}} service fee (10%)' },
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

            <Link
              to={`/book/${venue.id}`}
              className={cm.cn(
                cm.sp('mt', 5),
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
                'block bg-primary text-on-primary rounded-xl hover:bg-primary-container transition-colors shadow-md text-center',
              )}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {venue.instant_book ? 'bolt' : 'event_available'}
              </span>
              {venue.instant_book
                ? t('venueDetail.requestInstant', {}, { defaultValue: 'Book instantly' })
                : t('venueDetail.requestBook', {}, { defaultValue: 'Request to book' })}
            </Link>

            <p
              className={cm.cn(
                cm.sp('mt', 3),
                cm.textSize('xs'),
                cm.textCenter,
                'text-on-surface-variant',
              )}
            >
              {t(
                'venueDetail.noChargeYet',
                {},
                { defaultValue: 'You will not be charged until the host confirms.' },
              )}
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
