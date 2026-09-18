import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BookingItineraryRow } from '../components/BookingItineraryRow.js'
import { unwrapList } from '../lib/unwrap.js'

interface Booking {
  id: string
  listing_id: string
  listing_title: string
  city: string
  country: string
  thumbnail_url?: string | null
  check_in_iso: string
  check_out_iso: string
  guests: number
  nights: number
  // API statuses from `decorateBooking` — mapped onto the upcoming/past
  // tabs in `useMemo` below.
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  total_cents: number
  messages_unread?: number
  confirmation_code?: string
}

const TABS = ['upcoming', 'past'] as const
type Tab = (typeof TABS)[number]

export function Bookings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('upcoming')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/bookings')
      .then((res) => {
        if (!cancelled) setBookings(unwrapList<Booking>(res.data))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('bookings.loadError', {}, { defaultValue: 'Failed to load bookings.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const upcoming = useMemo(
    () => bookings.filter((b) => b.status === 'pending' || b.status === 'confirmed'),
    [bookings],
  )
  const past = useMemo(
    () => bookings.filter((b) => b.status === 'completed' || b.status === 'cancelled'),
    [bookings],
  )
  const visible = tab === 'upcoming' ? upcoming : past

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header
        className={cm.cn(
          cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.sp('mb', 6),
        )}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.25em] text-primary-dark',
            )}
          >
            {t('bookings.eyebrow', {}, { defaultValue: 'Your trips' })}
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
            {t('bookings.heading', {}, { defaultValue: 'Bookings' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {t(
              'bookings.subheading',
              { upcoming: upcoming.length, past: past.length },
              { defaultValue: '{{upcoming}} upcoming · {{past}} past' },
            )}
          </p>
        </div>
        <Link
          to="/search"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-sm',
          )}
        >
          {t('bookings.searchCta', {}, { defaultValue: 'Plan another trip' })}
        </Link>
      </header>

      <div
        className={cm.cn(cm.sp('mb', 6), cm.flex({ align: 'center', gap: 'sm' }))}
        role="tablist"
      >
        {TABS.map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            role="tab"
            aria-selected={tab === tabKey}
            onClick={() => setTab(tabKey)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest rounded-full transition-colors',
              tab === tabKey
                ? 'bg-primary text-on-primary'
                : 'bg-surface border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary',
            )}
          >
            {t(
              `bookings.tabs.${tabKey}`,
              {},
              { defaultValue: tabKey === 'upcoming' ? 'Upcoming' : 'Past' },
            )}
          </button>
        ))}
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={cm.cn('h-32 rounded-2xl bg-surface-container animate-pulse')} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('py', 20),
            cm.textCenter,
            cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
          )}
        >
          <span
            className="material-symbols-outlined text-6xl text-on-surface-variant"
            aria-hidden="true"
          >
            luggage
          </span>
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
            {tab === 'upcoming'
              ? t(
                  'bookings.empty.upcoming',
                  {},
                  { defaultValue: "No trips on the books — let's fix that." },
                )
              : t(
                  'bookings.empty.past',
                  {},
                  { defaultValue: 'Past bookings will appear here once you stay.' },
                )}
          </p>
          <Link
            to="/search"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'inline-block bg-primary text-on-primary rounded-full hover:bg-primary-container transition-colors',
            )}
          >
            {t('nav.browseStays', {}, { defaultValue: 'Browse stays' })}
          </Link>
        </div>
      ) : (
        <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          {visible.map((b) => (
            <li key={b.id}>
              <BookingItineraryRow booking={b} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
