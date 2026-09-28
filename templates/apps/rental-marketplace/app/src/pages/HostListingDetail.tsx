import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface HostListing {
  id: string
  title: string
  city: string
  country: string
  thumbnail_url?: string | null
  status: string
  rating: number
  review_count: number
  price_per_night: number
  price_per_night_cents: number
  cleaning_fee: number
  cleaning_fee_cents: number
  total_bookings: number
  instant_book: boolean
  max_guests: number
  images: string[]
  gallery: string[]
}

interface BookingRow {
  id: string
  check_in_iso: string
  check_out_iso: string
  status: string
}

const TABS = ['calendar', 'pricing', 'photos', 'rules'] as const
type Tab = (typeof TABS)[number]

function fmtPrice(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString()}`
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function buildBookedDates(bookings: BookingRow[]): Set<string> {
  const out = new Set<string>()
  for (const b of bookings) {
    if (b.status === 'cancelled') continue
    const start = new Date(b.check_in_iso)
    const end = new Date(b.check_out_iso)
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      out.add(isoDate(d))
    }
  }
  return out
}

export function HostListingDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [listing, setListing] = useState<HostListing | null>(null)
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('calendar')

  // Pricing form (cents-stable; render in dollars).
  const [weekdayPrice, setWeekdayPrice] = useState('')
  const [weekendPrice, setWeekendPrice] = useState('')
  const [cleaningFee, setCleaningFee] = useState('')
  const [pricingSaved, setPricingSaved] = useState(false)
  const [pricingError, setPricingError] = useState<string | null>(null)
  const [pricingSaving, setPricingSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get(`/api/listings/${id}`).catch(() => null),
      http.get(`/api/reservations`).catch(() => null),
    ])
      .then(([listingRes, reservationsRes]) => {
        if (cancelled) return
        const l = unwrapSingle<HostListing>(listingRes)
        if (l) {
          setListing(l)
          const dollars = l.price_per_night ?? l.price_per_night_cents / 100
          setWeekdayPrice(`$${dollars.toFixed(0)}`)
          setWeekendPrice(`$${Math.round(dollars * 1.18)}`)
          const cleaning = l.cleaning_fee ?? l.cleaning_fee_cents / 100
          setCleaningFee(`$${cleaning.toFixed(0)}`)
        }
        // Filter bookings down to those for this listing.
        const allBookings = unwrapList<BookingRow & { listing_id: string }>(reservationsRes?.data)
        setBookings(allBookings.filter((b) => b.listing_id === id))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id])

  const bookedDates = useMemo(() => buildBookedDates(bookings), [bookings])

  async function savePricing() {
    if (!listing) return
    setPricingSaving(true)
    setPricingError(null)
    setPricingSaved(false)
    try {
      const priceNum = Number(weekdayPrice.replace(/[^\d.]/g, ''))
      const cleanNum = Number(cleaningFee.replace(/[^\d.]/g, ''))
      if (!Number.isFinite(priceNum) || priceNum <= 0) throw new Error('Invalid weekday rate')
      const payload: Record<string, unknown> = {
        price_per_night: priceNum,
      }
      if (Number.isFinite(cleanNum) && cleanNum >= 0) payload.cleaning_fee = cleanNum
      const res = await http.put(`/api/listings/${listing.id}`, payload)
      const updated = unwrapSingle<HostListing>(res)
      if (updated) setListing(updated)
      setPricingSaved(true)
      setTimeout(() => setPricingSaved(false), 2500)
    } catch (err) {
      setPricingError(err instanceof Error ? err.message : 'Failed to save pricing')
    } finally {
      setPricingSaving(false)
    }
  }

  if (loading)
    return (
      <div
        className={cm.cn(
          cm.maxW('5xl'),
          cm.sp('px', 6),
          cm.sp('py', 8),
          cm.mxAuto,
          'h-96 bg-surface-container animate-pulse rounded-2xl',
        )}
      />
    )
  if (!listing) {
    return (
      <div
        className={cm.cn(cm.maxW('xl'), cm.sp('px', 6), cm.sp('py', 20), cm.mxAuto, cm.textCenter)}
      >
        <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
          {t('hostListingDetail.notFound', {}, { defaultValue: 'Listing not found.' })}
        </p>
        <Link
          to="/host/listings"
          className={cm.cn(
            cm.sp('mt', 6),
            cm.sp('px', 5),
            cm.sp('py', 2),
            'inline-block rounded-full bg-primary text-on-primary font-semibold',
          )}
        >
          {t('hostListingDetail.backCta', {}, { defaultValue: 'Back to listings' })}
        </Link>
      </div>
    )
  }

  const photos =
    listing.gallery && listing.gallery.length > 0 ? listing.gallery : (listing.images ?? [])
  const month = startOfMonth(new Date())
  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const startWeekday = month.getDay()

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header className={cm.cn(cm.sp('mb', 6))}>
        <Link
          to="/host/listings"
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.25em] text-primary-dark hover:underline',
          )}
        >
          ← {t('hostListingDetail.eyebrow', {}, { defaultValue: 'All listings' })}
        </Link>
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
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {listing.city}, {listing.country} · {fmtPrice(listing.price_per_night_cents)}/night ·{' '}
          {listing.max_guests} guests
        </p>
      </header>

      <section className={cm.cn('grid grid-cols-1 sm:grid-cols-3 gap-4', cm.sp('mb', 6))}>
        <KpiCard
          label={t('hostListingDetail.kpi.bookings', {}, { defaultValue: 'Trips hosted' })}
          value={listing.total_bookings.toString()}
        />
        <KpiCard
          label={t(
            'hostListingDetail.kpi.confirmedNights',
            {},
            { defaultValue: 'Booked nights ahead' },
          )}
          value={bookedDates.size.toString()}
        />
        <KpiCard
          label={t('form.rating', {}, { defaultValue: 'Rating' })}
          value={
            listing.review_count > 0
              ? `${listing.rating.toFixed(2)} · ${listing.review_count}`
              : '—'
          }
        />
      </section>

      <div className={cm.cn(cm.sp('mb', 6), cm.flex({ align: 'center', gap: 'sm' }))}>
        {TABS.map((tk) => (
          <button
            key={tk}
            type="button"
            onClick={() => setTab(tk)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest rounded-full transition-colors',
              tab === tk
                ? 'bg-primary text-on-primary'
                : 'bg-surface border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary',
            )}
          >
            {t(
              `hostListingDetail.tab.${tk}`,
              {},
              { defaultValue: tk[0].toUpperCase() + tk.slice(1) },
            )}
          </button>
        ))}
      </div>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface rounded-2xl shadow-sm',
          cm.accentCard({ tone: 'primary' }),
        )}
      >
        {tab === 'calendar' && (
          <div>
            <header
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 3))}
            >
              <h2
                className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}
                style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
              >
                {t('hostListingDetail.calendar.heading', {}, { defaultValue: 'Calendar' })}
              </h2>
              <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {monthLabel}
              </span>
            </header>
            <div
              className={cm.cn(
                'grid grid-cols-7 gap-1 text-center',
                cm.textSize('xs'),
                cm.fontWeight('bold'),
              )}
            >
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <span
                  key={i}
                  className={cm.cn(
                    cm.sp('py', 2),
                    'text-on-surface-variant uppercase tracking-widest',
                  )}
                >
                  {d}
                </span>
              ))}
              {Array.from({ length: 42 }).map((_, i) => {
                const day = i - startWeekday + 1
                const inMonth = day >= 1 && day <= daysInMonth
                const dateStr = inMonth
                  ? isoDate(new Date(month.getFullYear(), month.getMonth(), day))
                  : ''
                const isBooked = inMonth && bookedDates.has(dateStr)
                return (
                  <span
                    key={i}
                    className={cm.cn(
                      cm.sp('py', 2),
                      cm.fontWeight('semibold'),
                      'rounded-md aspect-square flex items-center justify-center',
                      !inMonth
                        ? 'text-on-surface-variant/40'
                        : isBooked
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-low text-on-surface',
                    )}
                  >
                    {inMonth ? day : ''}
                  </span>
                )
              })}
            </div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mt', 4),
                cm.flex({ align: 'center', gap: 'md' }),
                'text-on-surface-variant',
              )}
            >
              <span className={cm.flex({ align: 'center', gap: 'xs' })}>
                <span
                  className={cm.cn(cm.w(3), cm.h(3), 'rounded-sm bg-primary')}
                  aria-hidden="true"
                />
                {t('hostListingDetail.calendar.booked', {}, { defaultValue: 'Booked' })}
              </span>
              <span className={cm.flex({ align: 'center', gap: 'xs' })}>
                <span
                  className={cm.cn(cm.w(3), cm.h(3), 'rounded-sm bg-surface-container-low')}
                  aria-hidden="true"
                />
                {t('hostListingDetail.calendar.available', {}, { defaultValue: 'Available' })}
              </span>
            </p>
          </div>
        )}
        {tab === 'pricing' && (
          <div className={'space-y-4'}>
            <h2
              className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}
              style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </h2>
            <div className={cm.cn('grid grid-cols-1 sm:grid-cols-3 gap-3')}>
              <PriceField
                label={t('hostListingDetail.pricing.weekday', {}, { defaultValue: 'Weekday rate' })}
                value={weekdayPrice}
                onChange={setWeekdayPrice}
              />
              <PriceField
                label={t(
                  'hostListingDetail.pricing.weekend',
                  {},
                  { defaultValue: 'Weekend rate (display only)' },
                )}
                value={weekendPrice}
                onChange={setWeekendPrice}
              />
              <PriceField
                label={t(
                  'hostListingDetail.pricing.cleaning',
                  {},
                  { defaultValue: 'Cleaning fee' },
                )}
                value={cleaningFee}
                onChange={setCleaningFee}
              />
            </div>
            <div className={cm.flex({ align: 'center', gap: 'md' })}>
              <button
                type="button"
                onClick={savePricing}
                disabled={pricingSaving}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  'rounded-full bg-primary text-on-primary disabled:opacity-50',
                )}
              >
                {pricingSaving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('hostListingDetail.pricing.save', {}, { defaultValue: 'Save pricing' })}
              </button>
              {pricingSaved && (
                <span className={cm.cn(cm.textSize('sm'), 'text-success')}>
                  {t('common.saved', {}, { defaultValue: 'Saved' })}
                </span>
              )}
              {pricingError && (
                <span className={cm.cn(cm.textSize('sm'), 'text-error')}>{pricingError}</span>
              )}
            </div>
          </div>
        )}
        {tab === 'photos' && (
          <div>
            <h2
              className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 3))}
              style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
            >
              {t('hostListingDetail.photos.heading', {}, { defaultValue: 'Photos' })}
            </h2>
            <div className={cm.cn('grid grid-cols-2 sm:grid-cols-4 gap-3')}>
              {photos.length === 0 ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant col-span-4')}>
                  {t(
                    'hostListingDetail.photos.empty',
                    {},
                    { defaultValue: 'No photos uploaded yet.' },
                  )}
                </p>
              ) : (
                photos.map((src, i) => (
                  <div
                    key={`${src}-${i}`}
                    className={cm.cn('aspect-[4/3] rounded-xl bg-surface-variant overflow-hidden')}
                  >
                    <img
                      src={src}
                      alt=""
                      className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        {tab === 'rules' && (
          <div className={'space-y-4'}>
            <h2
              className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}
              style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
            >
              {t('hostListingDetail.rules.heading', {}, { defaultValue: 'House rules' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
              {t(
                'hostListingDetail.rules.copy',
                {},
                {
                  defaultValue:
                    'Set guest expectations and protect your home — these are surfaced before booking confirmation.',
                },
              )}
            </p>
            <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.textSize('sm'))}>
              {[
                'No parties or events',
                'No smoking',
                'Quiet hours after 10pm',
                'Pets welcome with prior notice',
              ].map((r) => (
                <li key={r} className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <span className="material-symbols-outlined text-primary-dark" aria-hidden="true">
                    check_circle
                  </span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 5),
        'bg-surface rounded-2xl shadow-sm',
        cm.accentCard({ tone: 'custom' }),
      )}
      style={{ ['--mol-accent' as string]: 'var(--color-accent)' }}
    >
      <p className={cm.accentCardLabel({ tone: 'custom' })}>{label}</p>
      <p
        className={cm.cn(
          cm.textSize('2xl'),
          cm.fontWeight('extrabold'),
          cm.sp('mt', 1),
          'tabular-nums',
        )}
      >
        {value}
      </p>
    </div>
  )
}

function PriceField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
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
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.fontWeight('semibold'),
          'bg-surface-container-low rounded-xl border border-outline-variant tabular-nums focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
        )}
      />
    </label>
  )
}
