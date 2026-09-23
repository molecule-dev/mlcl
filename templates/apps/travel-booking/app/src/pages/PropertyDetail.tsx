import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Property {
  id: string
  name: string
  city: string
  country: string
  description: string
  rating: number
  review_count: number
  amenities: string[]
  gallery: string[]
  price_per_night_cents: number
  badges?: string[]
}

interface Review {
  id: string
  property_id: string
  author: string
  date_iso: string
  rating: number
  body: string
}

const AMENITY_ICON: Record<string, string> = {
  Onsen: 'hot_tub',
  Spa: 'spa',
  Pool: 'pool',
  'Plunge pool': 'pool',
  Hammam: 'hot_tub',
  Sauna: 'hot_tub',
  'Hot tub': 'hot_tub',
  Restaurant: 'restaurant',
  'Mezcal cellar': 'local_bar',
  'Wine cellar': 'local_bar',
  'Free Wi-Fi': 'wifi',
  Concierge: 'support_agent',
  Garden: 'park',
  Gardens: 'park',
  'Sea access': 'sailing',
  'Lake access': 'sailing',
  'Private dock': 'directions_boat',
  'Private boat': 'directions_boat',
  'Rooftop terrace': 'roofing',
  'Pet friendly': 'pets',
  'Air conditioning': 'ac_unit',
  'Hiking trails': 'hiking',
  'Mountain trails': 'hiking',
  'Glacier tours': 'hiking',
  'Wildlife tours': 'pets',
  Fireplace: 'fireplace',
  'Open fireplace': 'fireplace',
  'Breakfast included': 'restaurant',
  'Tea house': 'emoji_food_beverage',
  'Aurora viewing': 'nights_stay',
  Stargazing: 'nights_stay',
  'Sea kayaks': 'kayaking',
  Bicycles: 'directions_bike',
  'Kaiseki dining': 'restaurant',
  'Vineyard tours': 'agriculture',
  'Horseback riding': 'pets',
  'All-inclusive': 'restaurant_menu',
}

function fmtPrice(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`
}

function diffNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  if (Number.isNaN(ms) || ms <= 0) return 0
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

export function PropertyDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [property, setProperty] = useState<Property | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bookmarked, setBookmarked] = useState(false)
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(2)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryIndex, setGalleryIndex] = useState(0)

  useEffect(() => {
    if (!galleryOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGalleryOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [galleryOpen])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get(`/api/accommodations/${id}`).catch(() => null),
      http.get(`/api/accommodations/${id}/reviews`).catch(() => null),
      http.get('/api/favorites').catch(() => null),
    ])
      .then(([pRes, revRes, favRes]) => {
        if (cancelled) return
        const raw = unwrapSingle<Property>(pRes)
        if (raw) {
          track({
            name: 'destination.viewed',
            properties: { property_id: id, city: raw.city, country: raw.country },
          })
        }
        setProperty(
          raw
            ? {
                ...raw,
                rating: Number(raw.rating ?? 0),
                review_count: Number(raw.review_count ?? 0),
                price_per_night_cents: Number(raw.price_per_night_cents ?? 0),
                gallery: Array.isArray(raw.gallery) ? raw.gallery : [],
                amenities: Array.isArray(raw.amenities) ? raw.amenities : [],
                badges: Array.isArray(raw.badges) ? raw.badges : [],
              }
            : null,
        )
        setReviews(
          unwrapList<Review>(revRes).map((r) => ({
            ...r,
            property_id: (r as Review & { resourceId?: string }).resourceId ?? r.property_id,
            author: (r as Review & { author?: string; userId?: string }).author ?? 'Guest',
            date_iso:
              (r as Review & { date_iso?: string; createdAt?: string }).date_iso ??
              (r as Review & { createdAt?: string }).createdAt ??
              new Date().toISOString(),
          })),
        )
        const favIds = unwrapList<{ resourceId?: string; property_id?: string }>(favRes)
          .map((f) => f.resourceId ?? f.property_id)
          .filter(Boolean)
        setBookmarked(favIds.includes(id))
      })
      .catch(() => {
        if (cancelled) return
        setError(t('propertyDetail.loadError', {}, { defaultValue: 'Failed to load property.' }))
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, http, t])

  const nights = diffNights(checkIn, checkOut)
  const subtotal = property ? property.price_per_night_cents * Math.max(nights, 1) : 0
  const cleaningFee = property ? Math.round(property.price_per_night_cents * 0.08) : 0
  const taxes = Math.round(subtotal * 0.12)
  const total = subtotal + cleaningFee + taxes
  const heroBadges = useMemo(() => property?.badges?.filter(Boolean) ?? [], [property])

  return (
    <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <Link
        to="/search"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('sm'),
          'text-on-surface-variant hover:text-primary',
        )}
      >
        <span className={'material-symbols-outlined text-base'} aria-hidden="true">
          arrow_back
        </span>
        {t('propertyDetail.backLink', {}, { defaultValue: 'Back to search' })}
      </Link>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <div className={cm.cn(cm.sp('mt', 6), cm.flex({ direction: 'col', gap: 'md' }))}>
          <div className={cm.cn('aspect-[16/8] rounded-2xl bg-surface-container animate-pulse')} />
          <div className={cm.cn('h-10 w-1/2 rounded-xl bg-surface-container animate-pulse')} />
          <div className={cm.cn('h-4 w-1/3 rounded-xl bg-surface-container animate-pulse')} />
        </div>
      ) : !property ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-on-surface-variant')}>
          {t('propertyDetail.notFound', {}, { defaultValue: 'Property not found.' })}
        </p>
      ) : (
        <>
          <div
            className={cm.cn(
              cm.sp('mt', 6),
              'grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3 rounded-2xl overflow-hidden',
            )}
          >
            <div
              className={
                'relative aspect-[4/3] lg:aspect-auto lg:h-[480px] bg-surface-variant overflow-hidden'
              }
            >
              <img
                src={property.gallery[0] ?? ''}
                alt={t(
                  'propertyDetail.heroImageAlt',
                  { name: property.name },
                  { defaultValue: '{{name}} hero photograph' },
                )}
                className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
              />
              <div
                className={cm.cn('absolute top-4 left-4', cm.flex({ direction: 'col', gap: 'xs' }))}
              >
                {heroBadges.slice(0, 2).map((b) => (
                  <span
                    key={b}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest rounded-full bg-accent/95 text-on-accent backdrop-blur-md',
                    )}
                  >
                    {t(`propertyDetail.badge.${b}`, {}, { defaultValue: b.replace('_', ' ') })}
                  </span>
                ))}
              </div>
              <button
                type="button"
                data-testid="property-bookmark-toggle"
                onClick={async () => {
                  const next = !bookmarked
                  setBookmarked(next)
                  try {
                    if (next) await http.post(`/api/favorites/${property.id}`, {})
                    else await http.delete(`/api/favorites/${property.id}`)
                    track({
                      name: next ? 'favorite.added' : 'favorite.removed',
                      properties: { property_id: property.id },
                    })
                  } catch (error) {
                    logError('propertyDetail.toggleBookmark', error)
                    setBookmarked(!next)
                  }
                }}
                className={cm.cn(
                  cm.w(11),
                  cm.h(11),
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.roundedFull,
                  'absolute top-4 right-4 bg-surface/95 shadow-md hover:scale-110 transition-transform',
                )}
                aria-label={t('propertyDetail.bookmarkAria', {}, { defaultValue: 'Save property' })}
              >
                <span
                  className="material-symbols-outlined text-accent"
                  style={{ fontVariationSettings: bookmarked ? "'FILL' 1" : "'FILL' 0" }}
                  aria-hidden="true"
                >
                  favorite
                </span>
              </button>
            </div>
            <div className={'hidden lg:grid grid-cols-2 grid-rows-2 gap-3'}>
              {property.gallery.slice(1, 5).map((src, i) => (
                <div key={i} className="relative aspect-[4/3] bg-surface-variant overflow-hidden">
                  <img
                    src={src}
                    alt=""
                    className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
                  />
                  {i === 3 ? (
                    <div
                      className={cm.cn(
                        'absolute inset-0 bg-foreground/30',
                        cm.flex({ align: 'center', justify: 'center' }),
                      )}
                    >
                      <button
                        type="button"
                        data-testid="property-all-photos"
                        onClick={() => {
                          setGalleryIndex(0)
                          setGalleryOpen(true)
                        }}
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 2),
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'uppercase tracking-widest bg-surface text-primary rounded-full shadow-md',
                        )}
                      >
                        {t(
                          'propertyDetail.allPhotos',
                          { count: property.gallery.length },
                          { defaultValue: 'All {{count}} photos' },
                        )}
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className={cm.cn(cm.sp('mt', 8), 'grid grid-cols-1 lg:grid-cols-12 gap-10')}>
            <div className={'lg:col-span-8'}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-[0.25em] text-primary',
                )}
              >
                {property.city}, {property.country}
              </p>
              <h1
                className={cm.cn(
                  cm.textSize('5xl'),
                  cm.fontWeight('extrabold'),
                  cm.sp('mt', 2),
                  'leading-tight tracking-tight',
                )}
                style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
              >
                {property.name}
              </h1>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
                  cm.sp('mt', 4),
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.fontWeight('semibold'),
                  )}
                >
                  <span
                    className="material-symbols-outlined text-warning"
                    aria-hidden="true"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                  {property.rating.toFixed(1)}
                  <span className={cm.cn(cm.fontWeight('normal'), 'text-on-surface-variant')}>
                    {' '}
                    {t(
                      'propertyDetail.reviewCount',
                      { count: property.review_count },
                      { defaultValue: '({{count}} reviews)' },
                    )}
                  </span>
                </span>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.textSize('sm'),
                    'text-on-surface-variant',
                  )}
                >
                  <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                    verified
                  </span>
                  {t(
                    'propertyDetail.verified',
                    { appName: APP_NAME },
                    { defaultValue: '{{appName}}-verified property' },
                  )}
                </span>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.textSize('sm'),
                    'text-on-surface-variant',
                  )}
                >
                  <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                    shield_lock
                  </span>
                  {t('propertyDetail.freeCancellation', {}, { defaultValue: 'Free cancellation' })}
                </span>
              </div>
              <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 6), 'leading-relaxed')}>
                {property.description}
              </p>

              <section className={cm.sp('mt', 10)}>
                <h2
                  className={cm.cn(
                    cm.textSize('2xl'),
                    cm.fontWeight('extrabold'),
                    cm.sp('mb', 4),
                    'leading-tight tracking-tight',
                  )}
                  style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
                >
                  {t(
                    'propertyDetail.amenitiesHeading',
                    {},
                    { defaultValue: 'What this place offers' },
                  )}
                </h2>
                <ul className={'grid grid-cols-2 md:grid-cols-3 gap-3'}>
                  {property.amenities.map((a) => (
                    <li
                      key={a}
                      className={cm.cn(
                        cm.sp('p', 4),
                        cm.flex({ align: 'center', gap: 'sm' }),
                        'bg-surface-container-low rounded-xl',
                      )}
                    >
                      <span className="material-symbols-outlined text-primary" aria-hidden="true">
                        {AMENITY_ICON[a] ?? 'check_circle'}
                      </span>
                      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{a}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {reviews.length > 0 ? (
                <section className={cm.sp('mt', 10)}>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('mb', 4))}>
                    <h2
                      className={cm.cn(
                        cm.textSize('2xl'),
                        cm.fontWeight('extrabold'),
                        'leading-tight tracking-tight',
                      )}
                      style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
                    >
                      {t('propertyDetail.reviewsHeading', {}, { defaultValue: 'Recent reviews' })}
                    </h2>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.fontWeight('semibold'),
                      )}
                    >
                      <span
                        className="material-symbols-outlined text-warning"
                        aria-hidden="true"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                      {property.rating.toFixed(1)}
                      <span
                        className={cm.cn(
                          cm.fontWeight('normal'),
                          cm.textSize('sm'),
                          'text-on-surface-variant',
                        )}
                      >
                        {' '}
                        · {property.review_count}
                      </span>
                    </span>
                  </div>
                  <ul className={'grid grid-cols-1 md:grid-cols-2 gap-4'}>
                    {reviews.slice(0, 4).map((r) => (
                      <li
                        key={r.id}
                        className={cm.cn(cm.sp('p', 5), 'bg-surface-container-low rounded-2xl')}
                      >
                        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                            <div
                              className={cm.cn(
                                cm.w(10),
                                cm.h(10),
                                cm.roundedFull,
                                cm.flex({ align: 'center', justify: 'center' }),
                                cm.fontWeight('bold'),
                                'bg-primary text-on-primary',
                              )}
                            >
                              {r.author.charAt(0)}
                            </div>
                            <div>
                              <p className={cm.cn(cm.fontWeight('semibold'))}>{r.author}</p>
                              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                                {new Date(r.date_iso).toLocaleDateString(undefined, {
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                            </div>
                          </div>
                          <span
                            className={cm.cn(
                              cm.flex({ align: 'center', gap: 'xs' }),
                              cm.textSize('sm'),
                              cm.fontWeight('semibold'),
                            )}
                          >
                            <span
                              className={'material-symbols-outlined text-base text-warning'}
                              aria-hidden="true"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              star
                            </span>
                            {r.rating.toFixed(1)}
                          </span>
                        </div>
                        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 3), 'leading-relaxed')}>
                          {r.body}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>

            <aside className={'lg:col-span-4'}>
              <div
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface rounded-2xl shadow-xl sticky top-24 border border-outline-variant/40',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'xs' }), cm.sp('mb', 4))}>
                  <span
                    className={cm.cn(
                      cm.textSize('3xl'),
                      cm.fontWeight('extrabold'),
                      'tabular-nums',
                    )}
                  >
                    {fmtPrice(property.price_per_night_cents)}
                  </span>
                  <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {' '}
                    / {t('propertyDetail.night', {}, { defaultValue: 'night' })}
                  </span>
                </div>
                <div
                  className={cm.cn(
                    'grid grid-cols-2 border border-outline-variant rounded-xl overflow-hidden',
                  )}
                >
                  <label
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'flex flex-col border-r border-outline-variant',
                    )}
                  >
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
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'bg-transparent border-0 outline-none',
                      )}
                    />
                  </label>
                  <label className={cm.cn(cm.sp('px', 3), cm.sp('py', 2), 'flex flex-col')}>
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
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'bg-transparent border-0 outline-none',
                      )}
                    />
                  </label>
                  <label
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'col-span-2 flex flex-col border-t border-outline-variant',
                    )}
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
                    <select
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value))}
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'bg-transparent border-0 outline-none',
                      )}
                    >
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>
                          {t(
                            'common.countGuests',
                            { count: n },
                            { defaultValue: '{{count}} guests' },
                          )}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <Link
                  to={(() => {
                    const params = new URLSearchParams()
                    if (checkIn) params.set('check_in', checkIn)
                    if (checkOut) params.set('check_out', checkOut)
                    if (guests) params.set('guests', String(guests))
                    const qs = params.toString()
                    return `/booking/${property.id}${qs ? `?${qs}` : ''}`
                  })()}
                  data-testid="property-reserve"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.sp('mt', 4),
                    cm.fontWeight('bold'),
                    cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                    'block w-full text-center bg-primary text-on-primary rounded-xl hover:bg-primary-container transition-colors shadow-lg',
                  )}
                >
                  {t('propertyDetail.bookCta', {}, { defaultValue: 'Reserve' })}
                  <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                    arrow_forward
                  </span>
                </Link>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.textCenter,
                    cm.sp('mt', 3),
                    'text-on-surface-variant',
                  )}
                >
                  {t(
                    'propertyDetail.noChargeYet',
                    {},
                    { defaultValue: "You won't be charged yet" },
                  )}
                </p>

                {nights > 0 ? (
                  <ul
                    className={cm.cn(
                      cm.sp('mt', 5),
                      cm.sp('pt', 5),
                      cm.flex({ direction: 'col', gap: 'sm' }),
                      'border-t border-outline-variant/60 text-sm',
                    )}
                  >
                    <li className={cm.flex({ align: 'center', justify: 'between' })}>
                      <span className="text-on-surface-variant">
                        {t(
                          'propertyDetail.lineRate',
                          { price: fmtPrice(property.price_per_night_cents), nights },
                          { defaultValue: '{{price}} × {{nights}} nights' },
                        )}
                      </span>
                      <span className="tabular-nums font-semibold">{fmtPrice(subtotal)}</span>
                    </li>
                    <li className={cm.flex({ align: 'center', justify: 'between' })}>
                      <span className="text-on-surface-variant">
                        {t('propertyDetail.lineCleaning', {}, { defaultValue: 'Cleaning fee' })}
                      </span>
                      <span className="tabular-nums font-semibold">{fmtPrice(cleaningFee)}</span>
                    </li>
                    <li className={cm.flex({ align: 'center', justify: 'between' })}>
                      <span className="text-on-surface-variant">
                        {t('propertyDetail.lineTaxes', {}, { defaultValue: 'Taxes & fees' })}
                      </span>
                      <span className="tabular-nums font-semibold">{fmtPrice(taxes)}</span>
                    </li>
                    <li
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between' }),
                        cm.sp('pt', 3),
                        'border-t border-outline-variant/60 font-bold text-base',
                      )}
                    >
                      <span>{t('nav.total', {}, { defaultValue: 'Total' })}</span>
                      <span className="tabular-nums">{fmtPrice(total)}</span>
                    </li>
                  </ul>
                ) : (
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.sp('mt', 4),
                      cm.textCenter,
                      'text-on-surface-variant',
                    )}
                  >
                    {t(
                      'propertyDetail.pickDatesHint',
                      {},
                      { defaultValue: 'Pick your dates to see the full price breakdown.' },
                    )}
                  </p>
                )}
              </div>
            </aside>
          </div>

          {galleryOpen ? (
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t(
                'propertyDetail.galleryAria',
                {},
                { defaultValue: 'Property photo gallery' },
              )}
              data-testid="property-gallery-modal"
              className="fixed inset-0 z-50 bg-inverse-surface/90 flex flex-col"
            >
              <div
                role="presentation"
                className="flex items-center justify-between p-4 text-inverse-on-surface"
                onClick={() => setGalleryOpen(false)}
              >
                <span className="text-sm tabular-nums" data-testid="property-gallery-counter">
                  {t(
                    'propertyDetail.galleryCounter',
                    { current: galleryIndex + 1, total: property.gallery.length },
                    { defaultValue: '{{current}} / {{total}}' },
                  )}
                </span>
                <button
                  type="button"
                  data-testid="property-gallery-close"
                  onClick={(e) => {
                    e.stopPropagation()
                    setGalleryOpen(false)
                  }}
                  className="rounded-full bg-surface/15 hover:bg-surface/25 p-2"
                  aria-label={t(
                    'propertyDetail.galleryCloseAria',
                    {},
                    { defaultValue: 'Close gallery' },
                  )}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    close
                  </span>
                </button>
              </div>
              <div className="flex-1 flex items-center justify-center px-4 pb-4">
                <button
                  type="button"
                  data-testid="property-gallery-prev"
                  onClick={() =>
                    setGalleryIndex(
                      (i) => (i - 1 + property.gallery.length) % property.gallery.length,
                    )
                  }
                  disabled={property.gallery.length <= 1}
                  className="rounded-full bg-inverse-on-surface/15 hover:bg-inverse-on-surface/25 text-inverse-on-surface p-3 disabled:opacity-40"
                  aria-label={t(
                    'propertyDetail.galleryPrevAria',
                    {},
                    { defaultValue: 'Previous photo' },
                  )}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    chevron_left
                  </span>
                </button>
                <img
                  src={property.gallery[galleryIndex] ?? ''}
                  alt={t(
                    'propertyDetail.galleryImageAlt',
                    { name: property.name, n: galleryIndex + 1 },
                    { defaultValue: '{{name}} photo {{n}}' },
                  )}
                  className="max-h-[80vh] max-w-full object-contain rounded-xl mx-4"
                />
                <button
                  type="button"
                  data-testid="property-gallery-next"
                  onClick={() => setGalleryIndex((i) => (i + 1) % property.gallery.length)}
                  disabled={property.gallery.length <= 1}
                  className="rounded-full bg-inverse-on-surface/15 hover:bg-inverse-on-surface/25 text-inverse-on-surface p-3 disabled:opacity-40"
                  aria-label={t(
                    'propertyDetail.galleryNextAria',
                    {},
                    { defaultValue: 'Next photo' },
                  )}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    chevron_right
                  </span>
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
