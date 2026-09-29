import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Trip {
  id: string
  property_id: string
  property_name: string
  city: string
  country: string
  thumbnail_url?: string | null
  check_in_iso: string
  check_out_iso: string
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled'
  total_cents: number
}

const STATUS_BADGE: Record<Trip['status'], string> = {
  upcoming: 'bg-info/10 text-info',
  in_progress: 'bg-primary/10 text-primary',
  completed: 'bg-success/10 text-success',
  cancelled: 'bg-error/10 text-error',
}

// Inspiration rail from the design's "Planning your next escape?" section —
// editorial destination cards (sample content, like the landing journal).
const INSPIRATION = [
  {
    id: 'insp-1',
    name: 'Oia Sunset Villas',
    location: 'Santorini, Greece',
    from_cents: 45000,
    thumbnail: 'https://picsum.photos/seed/sojourn-insp1/640/480',
  },
  {
    id: 'insp-2',
    name: 'Reef Gate Lodge',
    location: 'Port Douglas, Australia',
    from_cents: 52000,
    thumbnail: 'https://picsum.photos/seed/sojourn-insp2/640/480',
  },
  {
    id: 'insp-3',
    name: 'Alpine Quiet House',
    location: 'Aspen, United States',
    from_cents: 61000,
    thumbnail: 'https://picsum.photos/seed/sojourn-insp3/640/480',
  },
] as const

function fmt(cents: number): string {
  return `$${Math.round(cents / 100)}`
}

function fmtDateRange(checkIn: string, checkOut: string): string {
  const a = new Date(checkIn).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const b = new Date(checkOut).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${a} – ${b}`
}

export function Trips() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/trips')
      .then((res) => {
        if (!cancelled) setTrips(unwrapList<Trip>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('trips.loadError', {}, { defaultValue: 'Failed to load trips.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const upcoming = trips.filter((t) => t.status === 'upcoming' || t.status === 'in_progress')
  const past = trips.filter((t) => t.status === 'completed' || t.status === 'cancelled')

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
        {t('trips.heading', {}, { defaultValue: 'Your trips' })}
      </h1>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : trips.length === 0 ? (
        <div className={cm.cn(cm.sp('py', 20), cm.textCenter, 'text-on-surface-variant')}>
          <p className={cm.cn(cm.textSize('lg'))}>
            {t('trips.empty', {}, { defaultValue: 'No trips yet.' })}
          </p>
          <Link
            to="/search"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.sp('mt', 4),
              cm.fontWeight('semibold'),
              'inline-block bg-primary text-on-primary rounded-full hover:bg-primary-hover',
            )}
          >
            {t('trips.searchCta', {}, { defaultValue: 'Find your next stay' })}
          </Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 ? (
            <section className={cm.sp('mb', 8)}>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mb', 3))}>
                {t('status.upcoming', {}, { defaultValue: 'Upcoming' })}
              </h2>
              <ul className={'space-y-3'}>
                {upcoming.map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </ul>
            </section>
          ) : null}
          {past.length > 0 ? (
            <section>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mb', 3))}>
                {t('trips.pastHeading', {}, { defaultValue: 'Past' })}
              </h2>
              <ul className={'space-y-3'}>
                {past.map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </ul>
            </section>
          ) : null}

          {/* Inspiration — the design's "Planning your next escape?" rail */}
          <section className={cm.sp('mt', 12)}>
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mb', 4))}>
              {t('trips.inspiration.heading', {}, { defaultValue: 'Planning your next escape?' })}
            </h2>
            <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-3')}>
              {INSPIRATION.map((item) => (
                <Link
                  key={item.id}
                  to="/search"
                  data-mol-id={`trips-inspiration-${item.id}`}
                  className={cm.cn(
                    'group bg-surface rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden',
                  )}
                >
                  <div className="aspect-[4/3] bg-surface-variant overflow-hidden">
                    <img
                      src={item.thumbnail}
                      alt=""
                      className={cm.cn(
                        cm.w('full'),
                        cm.h('full'),
                        'object-cover transition-transform duration-500 group-hover:scale-105',
                      )}
                    />
                  </div>
                  <div className={cm.sp('p', 4)}>
                    <p className={cm.cn('text-sm font-semibold text-on-surface tracking-tight')}>
                      {item.name}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {item.location}
                    </p>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.sp('mt', 2),
                        cm.fontWeight('semibold'),
                        'text-on-surface',
                      )}
                    >
                      {t(
                        'trips.inspiration.fromPrice',
                        { price: fmt(item.from_cents) },
                        { defaultValue: 'From ${{price}} / night' },
                      )}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )

  function TripCard({ trip }: { trip: Trip }) {
    return (
      <li>
        <Link
          to={`/trips/${trip.id}`}
          className={cm.cn(
            cm.sp('p', 4),
            cm.flex({ align: 'center', gap: 'md' }),
            'block bg-surface rounded-xl shadow-sm hover:shadow-md transition-shadow',
          )}
        >
          <div
            className={
              'aspect-[4/3] w-32 flex-shrink-0 bg-surface-variant rounded-lg overflow-hidden'
            }
          >
            {trip.thumbnail_url ? (
              <img src={trip.thumbnail_url} alt="" className={'h-full w-full object-cover'} />
            ) : null}
          </div>
          <div className={'flex-1 min-w-0'}>
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                {trip.property_name}
              </h3>
              <span
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.textSize('xs'),
                  cm.fontWeight('medium'),
                  'rounded-full',
                  STATUS_BADGE[trip.status],
                )}
              >
                {t(
                  `trips.status.${trip.status}`,
                  {},
                  { defaultValue: trip.status.replace('_', ' ') },
                )}
              </span>
            </div>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {trip.city}, {trip.country}
            </p>
            <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
              {fmtDateRange(trip.check_in_iso, trip.check_out_iso)} · {fmt(trip.total_cents)}
            </p>
          </div>
        </Link>
      </li>
    )
  }
}
