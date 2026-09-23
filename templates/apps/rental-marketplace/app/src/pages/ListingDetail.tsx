import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Listing {
  id: string
  title: string
  city: string
  country: string
  address: string
  description: string
  rating: number
  review_count: number
  price_per_night_cents: number
  cleaning_fee_cents: number
  /** Per-listing service-fee rate (0..1, default 0.12), returned by the API. */
  service_fee_rate?: number
  thumbnail_url?: string | null
  gallery: string[]
  max_guests: number
  bedrooms: number
  beds: number
  bathrooms: number
  property_type: string
  amenities: string[]
  house_rules: string
  host_id: string
  host_name: string
  host_photo: string
  host_is_superhost: boolean
  host_response_rate: number
  host_years: number
  instant_book: boolean
  badges: string[]
}

interface Review {
  id: string
  guest_name: string
  guest_photo: string
  rating: number
  comment: string
  created_at: string
}

function fmtPrice(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`
}

export function ListingDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [listing, setListing] = useState<Listing | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(2)
  const [reserving, setReserving] = useState(false)
  const [reserveError, setReserveError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get(`/api/listings/${id}`).catch(() => null),
      http.get(`/api/reviews?listing_id=${encodeURIComponent(id)}`).catch(() => null),
    ])
      .then(([listingRes, reviewsRes]) => {
        if (cancelled) return
        const single = unwrapSingle<Listing>(listingRes)
        if (!single) {
          // fall back to list lookup against /api/listings (mock-server)
          http.get('/api/listings').then((res) => {
            if (cancelled) return
            const all = unwrapList<Listing>(res.data)
            const match = all.find((l) => l.id === id) ?? null
            setListing(match)
          })
        } else {
          setListing(single)
        }
        const allReviews = unwrapList<Review>(reviewsRes?.data)
        setReviews(allReviews)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('listingDetail.loadError', {}, { defaultValue: 'Failed to load listing.' }))
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
      <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
        <div className={cm.cn('h-12 w-2/3 bg-surface-container animate-pulse rounded')} />
        <div
          className={cm.cn('aspect-[16/9] mt-6 bg-surface-container animate-pulse rounded-2xl')}
        />
      </div>
    )
  }
  if (error || !listing) {
    return (
      <div
        className={cm.cn(cm.maxW('xl'), cm.sp('px', 6), cm.sp('py', 20), cm.mxAuto, cm.textCenter)}
      >
        <span
          className="material-symbols-outlined text-6xl text-on-surface-variant"
          aria-hidden="true"
        >
          cottage
        </span>
        <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mt', 4))}>
          {error ??
            t('listingDetail.notFound', {}, { defaultValue: "We couldn't find that listing." })}
        </p>
        <Link
          to="/search"
          className={cm.cn(
            cm.sp('mt', 6),
            cm.sp('px', 5),
            cm.sp('py', 2),
            'inline-block rounded-full bg-primary text-on-primary font-semibold',
          )}
        >
          {t('nav.browseStays', {}, { defaultValue: 'Browse stays' })}
        </Link>
      </div>
    )
  }

  const nights =
    checkIn && checkOut
      ? Math.max(
          0,
          Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000),
        )
      : 0
  const subtotal = nights * listing.price_per_night_cents
  const serviceFee = Math.round(subtotal * (listing.service_fee_rate ?? 0.12))
  const total = subtotal + serviceFee + listing.cleaning_fee_cents

  return (
    <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header className={cm.cn(cm.sp('mb', 6))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.25em] text-primary-dark',
          )}
        >
          {listing.property_type}
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
          {listing.title}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mt', 2),
            cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
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
            {listing.rating.toFixed(2)} · {listing.review_count}{' '}
            {t('listingDetail.reviews', {}, { defaultValue: 'reviews' })}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {listing.city}, {listing.country}
          </span>
          {listing.host_is_superhost ? (
            <>
              <span aria-hidden="true">·</span>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'text-warning font-semibold',
                )}
              >
                <span
                  className={'material-symbols-outlined text-base'}
                  aria-hidden="true"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  workspace_premium
                </span>
                {t('listingDetail.superhost', {}, { defaultValue: 'Superhost' })}
              </span>
            </>
          ) : null}
        </p>
      </header>

      <div
        className={cm.cn(
          'grid grid-cols-1 md:grid-cols-4 gap-2 sm:gap-3 rounded-2xl overflow-hidden',
          cm.sp('mb', 8),
        )}
      >
        <div
          className={cm.cn(
            'relative md:col-span-2 md:row-span-2 aspect-[4/3] md:aspect-auto bg-surface-variant overflow-hidden',
          )}
        >
          {listing.gallery[0] ? (
            <img
              src={listing.gallery[0]}
              alt={listing.title}
              className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
            />
          ) : null}
        </div>
        {listing.gallery.slice(1, 5).map((src, i) => (
          <div
            key={i}
            className={cm.cn('relative aspect-[4/3] bg-surface-variant overflow-hidden')}
          >
            <img src={src} alt="" className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')} />
            {i === 3 ? (
              <div
                className={cm.cn(
                  'absolute inset-0 bg-foreground/40',
                  cm.flex({ align: 'center', justify: 'center' }),
                )}
              >
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'text-white uppercase tracking-widest',
                  )}
                >
                  +{Math.max(0, listing.gallery.length - 5)}{' '}
                  {t('listingDetail.morePhotos', {}, { defaultValue: 'more photos' })}
                </span>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-12')}>
        <div className={'lg:col-span-2 space-y-10'}>
          <section
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
              cm.sp('pb', 6),
              'border-b border-outline-variant/40',
            )}
          >
            <img
              src={listing.host_photo}
              alt=""
              className={cm.cn(cm.roundedFull, 'w-16 h-16 object-cover')}
            />
            <div className={'flex-1'}>
              <h2
                className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}
                style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
              >
                {t(
                  'listingDetail.hostedBy',
                  { host: listing.host_name },
                  { defaultValue: 'Hosted by {{host}}' },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                {t(
                  'listingDetail.hostMeta',
                  { years: listing.host_years, response: listing.host_response_rate },
                  { defaultValue: '{{years}} years hosting · {{response}}% response rate' },
                )}
              </p>
            </div>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {listing.max_guests} {t('listingDetail.guests', {}, { defaultValue: 'guests' })} ·{' '}
              {listing.bedrooms} {t('listingDetail.bedrooms', {}, { defaultValue: 'bedrooms' })} ·{' '}
              {listing.beds} {t('listingDetail.beds', {}, { defaultValue: 'beds' })} ·{' '}
              {listing.bathrooms} {t('listingDetail.bathrooms', {}, { defaultValue: 'baths' })}
            </p>
          </section>

          <section>
            <h3
              className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 3))}
              style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
            >
              {t('listingDetail.about', {}, { defaultValue: 'About this place' })}
            </h3>
            <p className={cm.cn(cm.textSize('base'), 'text-on-surface leading-relaxed')}>
              {listing.description}
            </p>
          </section>

          <section>
            <h3
              className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}
              style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
            >
              {t('listingDetail.amenities', {}, { defaultValue: 'What this place offers' })}
            </h3>
            <ul className={cm.cn('grid grid-cols-1 sm:grid-cols-2 gap-3')}>
              {listing.amenities.map((a) => (
                <li
                  key={a}
                  className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('sm'))}
                >
                  <span className="material-symbols-outlined text-primary-dark" aria-hidden="true">
                    check_circle
                  </span>
                  {a}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3
              className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}
              style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
            >
              {t('listingDetail.houseRules', {}, { defaultValue: 'House rules' })}
            </h3>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
              {listing.house_rules}
            </p>
          </section>

          <section>
            <h3
              className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}
              style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
            >
              {t(
                'listingDetail.reviewsHeading',
                { count: listing.review_count, rating: listing.rating.toFixed(2) },
                { defaultValue: '{{rating}} · {{count}} reviews' },
              )}
            </h3>
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-6')}>
              {reviews.slice(0, 4).map((r) => (
                <article
                  key={r.id}
                  className={cm.cn(
                    cm.sp('p', 5),
                    'bg-surface-container-low rounded-2xl border border-outline-variant/40',
                  )}
                >
                  <header className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                    <img
                      src={r.guest_photo}
                      alt=""
                      className={cm.cn(cm.roundedFull, 'w-10 h-10 object-cover')}
                    />
                    <div>
                      <p className={cm.fontWeight('semibold')}>{r.guest_name}</p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {new Date(r.created_at).toLocaleDateString(undefined, {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </header>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.sp('mt', 3),
                      'text-on-surface leading-relaxed',
                    )}
                  >
                    {r.comment}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className={'lg:col-span-1'}>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              'sticky top-24 bg-surface rounded-2xl shadow-lg border border-outline-variant/40 space-y-4',
            )}
          >
            <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
              <span
                className={cm.cn(cm.textSize('2xl'), cm.fontWeight('extrabold'), 'tabular-nums')}
              >
                {fmtPrice(listing.price_per_night_cents)}
              </span>
              <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('listingDetail.perNight', {}, { defaultValue: 'per night' })}
              </span>
            </div>
            <div className={cm.cn('grid grid-cols-2 gap-2')}>
              <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('form.checkIn', {}, { defaultValue: 'Check in' })}
                </span>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'bg-surface-container-low rounded-xl border border-outline-variant font-semibold',
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
                  {t('form.checkOut', {}, { defaultValue: 'Check out' })}
                </span>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'bg-surface-container-low rounded-xl border border-outline-variant font-semibold',
                  )}
                />
              </label>
            </div>
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
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'bg-surface-container-low rounded-xl border border-outline-variant font-semibold',
                )}
              >
                {Array.from({ length: listing.max_guests }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            {nights > 0 ? (
              <div
                className={cm.cn(
                  cm.sp('pt', 3),
                  'border-t border-outline-variant/40 space-y-2 tabular-nums',
                )}
              >
                <Row
                  label={t(
                    'listingDetail.priceRow',
                    { price: fmtPrice(listing.price_per_night_cents), nights },
                    { defaultValue: '{{price}} × {{nights}} nights' },
                  )}
                  value={fmtPrice(subtotal)}
                />
                <Row
                  label={t('listingDetail.cleaningFee', {}, { defaultValue: 'Cleaning fee' })}
                  value={fmtPrice(listing.cleaning_fee_cents)}
                />
                <Row
                  label={t('listingDetail.serviceFee', {}, { defaultValue: 'Service fee' })}
                  value={fmtPrice(serviceFee)}
                />
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('pt', 2),
                    'border-t border-outline-variant/40 font-bold',
                  )}
                >
                  <span>{t('nav.total', {}, { defaultValue: 'Total' })}</span>
                  <span>{fmtPrice(total)}</span>
                </div>
              </div>
            ) : null}

            <button
              type="button"
              disabled={reserving || nights <= 0}
              onClick={async () => {
                if (!listing || nights <= 0) {
                  setReserveError(
                    t(
                      'listingDetail.pickDates',
                      {},
                      { defaultValue: 'Pick check-in and check-out dates first.' },
                    ),
                  )
                  return
                }
                setReserving(true)
                setReserveError(null)
                try {
                  const resp = (await http.post('/api/bookings', {
                    listing_id: listing.id,
                    check_in: new Date(checkIn).toISOString(),
                    check_out: new Date(checkOut).toISOString(),
                    guests,
                  })) as { data?: { id?: string } } | { id?: string }
                  const respObj = (resp ?? {}) as Record<string, unknown>
                  const data = (respObj.data ?? respObj) as { id?: string }
                  track({
                    name: 'rental.booked',
                    properties: {
                      listing_id: listing.id,
                      ...(data?.id ? { booking_id: data.id } : {}),
                      guests,
                      nights,
                      instant_book: listing.instant_book,
                    },
                  })
                  if (data?.id) {
                    navigate(`/bookings/${data.id}`)
                  } else {
                    navigate('/bookings')
                  }
                } catch (err) {
                  const e = err as { message?: string; statusText?: string; status?: number }
                  setReserveError(
                    e?.message ??
                      e?.statusText ??
                      t(
                        'listingDetail.bookFailed',
                        {},
                        { defaultValue: 'Could not reserve. Try again or sign in first.' },
                      ),
                  )
                } finally {
                  setReserving(false)
                }
              }}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
                'w-full rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-lg disabled:opacity-60',
              )}
            >
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                {listing.instant_book ? 'bolt' : 'event_available'}
              </span>
              {reserving
                ? t('listingDetail.reserving', {}, { defaultValue: 'Reserving…' })
                : listing.instant_book
                  ? t(
                      'listingDetail.instantBook',
                      {},
                      { defaultValue: 'Reserve now · Instant book' },
                    )
                  : t('listingDetail.requestBook', {}, { defaultValue: 'Request to book' })}
            </button>
            {reserveError ? (
              <p className={cm.cn(cm.textSize('xs'), cm.textCenter, 'text-error')}>
                {reserveError}
              </p>
            ) : null}
            <p className={cm.cn(cm.textSize('xs'), cm.textCenter, 'text-on-surface-variant')}>
              {t(
                'listingDetail.noChargeYet',
                {},
                { defaultValue: "You won't be charged until the host confirms." },
              )}
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.textSize('sm'))}>
      <span className="text-on-surface-variant">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
