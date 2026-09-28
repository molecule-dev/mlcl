import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { unwrapList } from '../lib/unwrap.js'

interface HostListing {
  id: string
  title: string
  city: string
  country: string
  thumbnail_url?: string | null
  status: string
  rating: number
  review_count: number
  price_per_night_cents: number
  total_bookings: number
}

interface Reservation {
  id: string
  listing_id: string
  listing_title: string
  thumbnail_url?: string | null
  guest_name: string | null
  guest_photo: string | null
  guest_country: string | null
  check_in_iso: string
  check_out_iso: string
  nights: number
  total_cents: number
  subtotal_cents: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  expires_at?: string | null
}

function fmtPrice(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`
}

function fmtRange(checkIn: string, checkOut: string) {
  const a = new Date(checkIn).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const b = new Date(checkOut).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${a} – ${b}`
}

export function HostDashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [hostListings, setHostListings] = useState<HostListing[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Retryable load — the shared LoadErrorBanner's Retry button calls this
  // and owns the pending/disabled state while it is in flight.
  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    const [hl, rv] = await Promise.all([
      http.get('/api/host-listings').catch(() => null),
      http.get('/api/reservations').catch(() => null),
    ])
    if (!hl && !rv) {
      setError(
        t(
          'hostDashboard.loadError',
          {},
          { defaultValue: 'Failed to load your hosting data. Please try again.' },
        ),
      )
      return
    }
    setHostListings(unwrapList<HostListing>(hl?.data))
    setReservations(unwrapList<Reservation>(rv?.data))
    setLoading(false)
  }, [http, t])

  useEffect(() => {
    void load()
  }, [load])

  const totals = useMemo(() => {
    // Earnings: confirmed/completed bookings paid out (subtotal minus
    // service fee = host earnings). Approximated from current reservations.
    const earnings_30d = reservations
      .filter(
        (r) =>
          (r.status === 'confirmed' || r.status === 'completed') &&
          Date.now() - new Date(r.check_out_iso).getTime() <= 30 * 24 * 60 * 60 * 1000,
      )
      .reduce((s, r) => s + Math.round(r.subtotal_cents * 0.88), 0)
    const earnings_ytd = reservations
      .filter(
        (r) =>
          (r.status === 'confirmed' || r.status === 'completed') &&
          new Date(r.check_in_iso).getFullYear() === new Date().getFullYear(),
      )
      .reduce((s, r) => s + Math.round(r.subtotal_cents * 0.88), 0)
    const active = hostListings.filter((h) => h.status === 'active').length
    const occupancy =
      active > 0
        ? Math.min(
            100,
            Math.round(
              (reservations.filter((r) => r.status === 'confirmed').length / active) * 100,
            ),
          )
        : 0
    const requests = reservations.filter((r) => r.status === 'pending').length
    return { earnings_30d, earnings_ytd, active, occupancy, requests }
  }, [hostListings, reservations])

  const upcomingReservations = reservations
    .filter((r) => r.status === 'confirmed' && new Date(r.check_in_iso) >= new Date())
    .sort((a, b) => new Date(a.check_in_iso).getTime() - new Date(b.check_in_iso).getTime())
    .slice(0, 4)

  const requestQueue = reservations.filter((r) => r.status === 'pending').slice(0, 4)

  return (
    <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header className={cm.cn(cm.sp('mb', 8))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.25em] text-primary-dark',
          )}
        >
          {t('hostDashboard.eyebrow', {}, { defaultValue: 'Hosting' })}
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
          {t('hostDashboard.heading', {}, { defaultValue: 'Welcome back, host' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t(
            'hostDashboard.subheading',
            {},
            {
              defaultValue:
                'Your earnings, calendar, and traveler conversations — all in one place.',
            },
          )}
        </p>
      </header>

      {error ? (
        <LoadErrorBanner
          message={error}
          retryLabel={t('common.retry', {}, { defaultValue: 'Retry' })}
          onRetry={load}
          className={cm.sp('mb', 8)}
        />
      ) : null}

      <section
        className={cm.cn(
          cm.sp('p', 10),
          'bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-white relative overflow-hidden',
          cm.sp('mb', 8),
        )}
      >
        <div
          className={cm.cn(
            cm.w(64),
            cm.h(64),
            cm.roundedFull,
            'absolute -right-16 -top-16 bg-accent/40 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            cm.w(48),
            cm.h(48),
            cm.roundedFull,
            'absolute -left-12 -bottom-12 bg-surface/10 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div className={'relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8'}>
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-[0.25em] text-accent-on-surface',
              )}
            >
              {t('status.last30Days', {}, { defaultValue: 'Last 30 days' })}
            </p>
            <p
              className={cm.cn(
                'text-6xl',
                cm.fontWeight('extrabold'),
                cm.sp('mt', 2),
                'leading-none tabular-nums',
              )}
              style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
            >
              {fmtPrice(totals.earnings_30d)}
            </p>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-white/85')}>
              {t(
                'hostDashboard.hero.earningsHelp',
                {},
                { defaultValue: 'Net of fees · Next payout in 4 days' },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', justify: 'between' }))}>
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-[0.25em] text-accent-on-surface',
                )}
              >
                {t('hostDashboard.hero.labelYtd', {}, { defaultValue: 'Year to date' })}
              </p>
              <p
                className={cm.cn(
                  cm.textSize('3xl'),
                  cm.fontWeight('extrabold'),
                  cm.sp('mt', 1),
                  'tabular-nums',
                )}
              >
                {fmtPrice(totals.earnings_ytd)}
              </p>
            </div>
            <div className={cm.sp('mt', 4)}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-[0.25em] text-accent-on-surface',
                )}
              >
                {t('hostDashboard.hero.labelOccupancy', {}, { defaultValue: 'Occupancy' })}
              </p>
              <p
                className={cm.cn(
                  cm.textSize('2xl'),
                  cm.fontWeight('extrabold'),
                  cm.sp('mt', 1),
                  'tabular-nums',
                )}
              >
                {totals.occupancy}%
              </p>
            </div>
          </div>
          <div
            className={cm.cn(
              cm.sp('p', 5),
              'bg-surface/15 backdrop-blur-md rounded-2xl ring-1 ring-white/20',
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-white/80',
              )}
            >
              {t('hostDashboard.queueTitle', {}, { defaultValue: 'Your queue' })}
            </p>
            <ul
              className={cm.cn(
                cm.sp('mt', 3),
                cm.flex({ direction: 'col', gap: 'sm' }),
                cm.textSize('sm'),
              )}
            >
              <QueueRow
                icon="schedule"
                label={t(
                  'hostDashboard.queueRequests',
                  { count: totals.requests },
                  { defaultValue: '{{count}} reservation requests' },
                )}
              />
              <QueueRow
                icon="event"
                label={t(
                  'hostDashboard.queueArrivals',
                  { count: upcomingReservations.length },
                  { defaultValue: '{{count}} arrivals next week' },
                )}
              />
              <QueueRow
                icon="cottage"
                label={t(
                  'hostDashboard.queueListings',
                  { count: totals.active },
                  { defaultValue: '{{count}} active listings' },
                )}
              />
            </ul>
            <Link
              to="/host/reservations"
              className={cm.cn(
                cm.sp('mt', 4),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.flex({ align: 'center', gap: 'xs', justify: 'center' }),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'inline-flex rounded-full bg-accent text-on-primary uppercase tracking-widest hover:bg-accent-hover transition-colors',
              )}
            >
              {t('hostDashboard.queueReview', {}, { defaultValue: 'Review queue' })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </div>
      </section>

      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-8')}>
        <section className={'lg:col-span-2 space-y-3'}>
          <header className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 2))}>
            <h2
              className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}
              style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
            >
              {t('hostDashboard.requestQueue', {}, { defaultValue: 'Reservation requests' })}
            </h2>
            <Link
              to="/host/reservations"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-primary-dark hover:underline',
              )}
            >
              {t('hostDashboard.seeAllRequests', {}, { defaultValue: 'See all' })}
            </Link>
          </header>
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className={cm.cn('h-28 rounded-2xl bg-surface-container animate-pulse')}
              />
            ))
          ) : requestQueue.length === 0 ? (
            <p
              className={cm.cn(
                cm.sp('p', 6),
                cm.textCenter,
                'rounded-2xl bg-surface-container-low text-on-surface-variant',
              )}
            >
              {t(
                'hostDashboard.requestEmpty',
                {},
                { defaultValue: 'No pending requests. Nice and quiet.' },
              )}
            </p>
          ) : (
            requestQueue.map((r) => (
              <Link
                key={r.id}
                to="/host/reservations"
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.flex({ align: 'center', gap: 'md' }),
                  'bg-surface rounded-2xl shadow-sm hover:shadow-md transition-shadow',
                  cm.accentCard({ tone: 'custom' }),
                )}
                style={{ ['--mol-accent' as string]: 'var(--color-accent)' }}
              >
                {r.guest_photo ? (
                  <img
                    src={r.guest_photo}
                    alt=""
                    className={cm.cn(cm.roundedFull, 'w-12 h-12 object-cover')}
                  />
                ) : (
                  <span
                    className={cm.cn(
                      cm.roundedFull,
                      cm.w(12),
                      cm.h(12),
                      'bg-surface-container flex items-center justify-center text-on-surface-variant material-symbols-outlined',
                    )}
                  >
                    person
                  </span>
                )}
                <div className={'flex-1 min-w-0'}>
                  <p
                    className={cm.cn(cm.fontWeight('bold'))}
                    style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
                  >
                    {r.guest_name ?? 'Guest'}
                  </p>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant tabular-nums')}>
                    {r.listing_title} · {fmtRange(r.check_in_iso, r.check_out_iso)} · {r.nights}n
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={cm.cn(cm.textSize('lg'), cm.fontWeight('extrabold'), 'tabular-nums')}
                  >
                    {fmtPrice(r.total_cents)}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-accent-on-surface uppercase tracking-widest font-bold',
                    )}
                  >
                    {t('hostDashboard.requestExpires', {}, { defaultValue: 'Awaiting reply' })}
                  </p>
                </div>
              </Link>
            ))
          )}
        </section>

        <section className={'space-y-3'}>
          <header className={cm.flex({ align: 'end', justify: 'between' })}>
            <h2
              className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}
              style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
            >
              {t('hostDashboard.upcoming', {}, { defaultValue: 'Upcoming arrivals' })}
            </h2>
          </header>
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className={cm.cn('h-24 rounded-2xl bg-surface-container animate-pulse')}
              />
            ))
          ) : upcomingReservations.length === 0 ? (
            <p
              className={cm.cn(
                cm.sp('p', 6),
                cm.textCenter,
                'rounded-2xl bg-surface-container-low text-on-surface-variant text-sm',
              )}
            >
              {t('hostDashboard.upcomingEmpty', {}, { defaultValue: 'No arrivals on the books.' })}
            </p>
          ) : (
            upcomingReservations.map((r) => (
              <div
                key={r.id}
                className={cm.cn(
                  cm.sp('p', 4),
                  'bg-surface rounded-2xl shadow-sm',
                  cm.accentCard({ tone: 'primary' }),
                )}
              >
                <p className={cm.accentCardLabel({ tone: 'primary' })}>
                  {new Date(r.check_in_iso).toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                <p className={cm.cn(cm.fontWeight('semibold'), cm.sp('mt', 1))}>
                  {r.guest_name ?? 'Guest'} · {r.listing_title}
                </p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(
                    'hostDashboard.arriveLine',
                    { country: r.guest_country ?? '—', nights: r.nights },
                    { defaultValue: 'From {{country}} · {{nights}} nights' },
                  )}
                </p>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  )
}

function QueueRow({ icon, label }: { icon: string; label: string }) {
  const cm = getClassMap()
  return (
    <li className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
      <span className="material-symbols-outlined text-accent" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </li>
  )
}
