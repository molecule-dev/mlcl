import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface UpcomingBooking {
  id: string
  guest_name: string
  venue_name: string
  starts_at_iso: string
  ends_at_iso: string
  guest_count: number
  total_cents: number
}

interface PerformancePoint {
  month: string
  revenue_cents: number
  bookings: number
}

interface HostMetrics {
  host_name: string
  metrics: {
    monthly_revenue_cents: number
    monthly_revenue_delta_pct: number
    occupancy_rate_pct: number
    occupancy_delta_pct: number
    active_bookings: number
    active_bookings_delta: number
    response_rate_pct: number
  }
  upcoming_bookings: UpcomingBooking[]
  performance: PerformancePoint[]
}

const FALLBACK_METRICS: HostMetrics = {
  host_name: 'Maya',
  metrics: {
    monthly_revenue_cents: 824500,
    monthly_revenue_delta_pct: 18.4,
    occupancy_rate_pct: 72,
    occupancy_delta_pct: 6.1,
    active_bookings: 14,
    active_bookings_delta: 3,
    response_rate_pct: 96,
  },
  upcoming_bookings: [
    {
      id: 'r_001',
      guest_name: 'Anika R.',
      venue_name: 'The Aerie Loft',
      starts_at_iso: '2026-05-12T15:00:00Z',
      ends_at_iso: '2026-05-12T22:00:00Z',
      guest_count: 45,
      total_cents: 134750,
    },
    {
      id: 'r_010',
      guest_name: 'Studio LeRoux',
      venue_name: 'The Aerie Loft',
      starts_at_iso: '2026-05-18T08:00:00Z',
      ends_at_iso: '2026-05-18T18:00:00Z',
      guest_count: 24,
      total_cents: 192500,
    },
    {
      id: 'r_011',
      guest_name: 'Vihaan + Sam',
      venue_name: 'The Aerie Loft',
      starts_at_iso: '2026-05-22T18:00:00Z',
      ends_at_iso: '2026-05-22T23:00:00Z',
      guest_count: 60,
      total_cents: 96250,
    },
  ],
  performance: [
    { month: 'Nov', revenue_cents: 612000, bookings: 9 },
    { month: 'Dec', revenue_cents: 580000, bookings: 8 },
    { month: 'Jan', revenue_cents: 654000, bookings: 10 },
    { month: 'Feb', revenue_cents: 698500, bookings: 11 },
    { month: 'Mar', revenue_cents: 740000, bookings: 12 },
    { month: 'Apr', revenue_cents: 824500, bookings: 14 },
  ],
}

function fmtPrice(cents: number, opts: { compact?: boolean } = {}): string {
  if (opts.compact && cents >= 100000) {
    return `$${(cents / 100000).toFixed(1)}K`
  }
  return `$${Math.round(cents / 100).toLocaleString()}`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function fmtTimeRange(starts: string, ends: string): string {
  const a = new Date(starts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  const b = new Date(ends).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${a}–${b}`
}

function buildPath(
  points: PerformancePoint[],
  width: number,
  height: number,
): { line: string; area: string; coords: { x: number; y: number; p: PerformancePoint }[] } {
  if (points.length < 2) return { line: '', area: '', coords: [] }
  const max = Math.max(...points.map((p) => p.revenue_cents)) || 1
  const min = Math.min(...points.map((p) => p.revenue_cents))
  const span = Math.max(max - min, 1)
  const coords = points.map((p, i) => ({
    x: (i / (points.length - 1)) * width,
    y: height - 8 - ((p.revenue_cents - min) / span) * (height - 16),
    p,
  }))
  const line = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`)
    .join(' ')
  const area = `${line} L ${width} ${height} L 0 ${height} Z`
  return { line, area, coords }
}

const QUICK_ACTIONS = [
  { icon: 'add_business', key: 'addListing', defaultText: 'Add a new listing' },
  { icon: 'price_change', key: 'updatePricing', defaultText: 'Update pricing' },
  { icon: 'calendar_month', key: 'blockDates', defaultText: 'Block dates' },
  { icon: 'photo_camera', key: 'editPhotos', defaultText: 'Edit photography' },
] as const

export function HostDashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [data, setData] = useState<HostMetrics>(FALLBACK_METRICS)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/host_metrics')
      .then((res) => {
        const m = unwrapSingle<HostMetrics>(res)
        if (!cancelled && m) setData(m)
      })
      .catch(() => {
        /* keep fallback */
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const { line, area, coords } = useMemo(
    () => buildPath(data.performance, 600, 160),
    [data.performance],
  )

  return (
    <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      {/* Hero metric card */}
      <section
        className={cm.cn(
          cm.sp('p', 8),
          cm.sp('mb', 8),
          'relative overflow-hidden bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-on-primary',
        )}
      >
        <div
          className={cm.cn(
            cm.w(80),
            cm.h(80),
            cm.roundedFull,
            'absolute -right-24 -top-24 bg-surface/10 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            cm.w(64),
            cm.h(64),
            cm.roundedFull,
            'absolute -left-20 -bottom-20 bg-accent/30 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div className="relative z-10">
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.25em] text-accent-bright',
            )}
          >
            {t('hostDashboard.eyebrow', {}, { defaultValue: 'Host overview' })}
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
            {t(
              'hostDashboard.heading',
              { name: data.host_name },
              { defaultValue: 'Welcome back, {{name}}' },
            )}
          </h1>
          <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 4), 'text-on-primary/85')}>
            {t('hostDashboard.thisMonth', {}, { defaultValue: 'This month' })}
          </p>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mt', 1),
              'tracking-widest uppercase text-on-primary/60',
            )}
          >
            {t('hostDashboard.revenueLabel', {}, { defaultValue: 'Gross revenue' })}
          </p>
          <p
            className={cm.cn(
              cm.sp('mt', 2),
              'text-6xl font-extrabold tracking-tighter tabular-nums',
            )}
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif', letterSpacing: '-0.04em' }}
          >
            {fmtPrice(data.metrics.monthly_revenue_cents)}
          </p>
          <span
            className={cm.cn(
              cm.sp('mt', 3),
              'inline-flex items-center gap-2 px-3 py-1 bg-surface/20 backdrop-blur-md rounded-full text-sm font-bold',
            )}
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              trending_up
            </span>
            {t(
              'hostDashboard.revenueDelta',
              { pct: data.metrics.monthly_revenue_delta_pct.toFixed(1) },
              { defaultValue: '+{{pct}}% vs. last month' },
            )}
          </span>
        </div>
      </section>

      {/* KPI quad */}
      <section className={cm.cn(cm.sp('mb', 8), 'grid grid-cols-2 lg:grid-cols-4 gap-4')}>
        <div
          className={cm.cn(
            cm.sp('p', 5),
            'bg-surface rounded-2xl shadow-sm border-l-4 border-primary hover:-translate-y-0.5 transition-transform',
          )}
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            {t('hostDashboard.kpi.occupancy', {}, { defaultValue: 'Occupancy' })}
          </p>
          <p className={cm.cn(cm.sp('mt', 2), 'text-3xl font-extrabold tabular-nums')}>
            {data.metrics.occupancy_rate_pct}%
          </p>
          <p className={cm.cn(cm.textSize('xs'), 'text-success font-semibold')}>
            +{data.metrics.occupancy_delta_pct.toFixed(1)}% MoM
          </p>
        </div>
        <div
          className={cm.cn(
            cm.sp('p', 5),
            'bg-surface rounded-2xl shadow-sm border-l-4 border-accent hover:-translate-y-0.5 transition-transform',
          )}
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            {t('hostDashboard.kpi.bookings', {}, { defaultValue: 'Active bookings' })}
          </p>
          <p className={cm.cn(cm.sp('mt', 2), 'text-3xl font-extrabold tabular-nums')}>
            {data.metrics.active_bookings}
          </p>
          <p className={cm.cn(cm.textSize('xs'), 'text-success font-semibold')}>
            +{data.metrics.active_bookings_delta} this week
          </p>
        </div>
        <div
          className={cm.cn(
            cm.sp('p', 5),
            'bg-surface rounded-2xl shadow-sm border-l-4 border-teal-600 hover:-translate-y-0.5 transition-transform',
          )}
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            {t('hostDashboard.kpi.response', {}, { defaultValue: 'Response rate' })}
          </p>
          <p className={cm.cn(cm.sp('mt', 2), 'text-3xl font-extrabold tabular-nums')}>
            {data.metrics.response_rate_pct}%
          </p>
          <p className={cm.cn(cm.textSize('xs'), 'text-success font-semibold')}>
            {t('hostDashboard.kpi.responseHint', {}, { defaultValue: 'Within 1 hour' })}
          </p>
        </div>
        <div
          className={cm.cn(
            cm.sp('p', 5),
            'bg-surface rounded-2xl shadow-sm border-l-4 border-amber-500 hover:-translate-y-0.5 transition-transform',
          )}
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            {t('hostDashboard.kpi.rating', {}, { defaultValue: 'Avg rating' })}
          </p>
          <p className={cm.cn(cm.sp('mt', 2), 'text-3xl font-extrabold tabular-nums')}>4.93</p>
          <p className={cm.cn(cm.textSize('xs'), 'text-success font-semibold')}>312 reviews</p>
        </div>
      </section>

      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-6')}>
        {/* Performance chart */}
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'lg:col-span-2 bg-surface rounded-2xl shadow-sm border border-outline-variant/40',
          )}
        >
          <header className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 4))}>
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('hostDashboard.chart.eyebrow', {}, { defaultValue: 'Last 6 months' })}
              </p>
              <h2
                className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mt', 1))}
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                {t('hostDashboard.chart.heading', {}, { defaultValue: 'Listing performance' })}
              </h2>
            </div>
          </header>
          <svg
            viewBox="0 0 600 180"
            className={'w-full h-44'}
            role="img"
            aria-label={t(
              'hostDashboard.chart.aria',
              {},
              { defaultValue: '6-month revenue trend' },
            )}
          >
            <defs>
              <linearGradient id="hd-area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#hd-area)" />
            <path
              d={line}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {coords.map((c, i) => (
              <g key={i}>
                <circle cx={c.x} cy={c.y} r="3.5" fill="var(--color-primary)" />
                <text
                  x={c.x}
                  y={175}
                  fontSize="10"
                  textAnchor="middle"
                  className="fill-on-surface-variant tabular-nums"
                >
                  {c.p.month}
                </text>
              </g>
            ))}
          </svg>
          <div
            className={cm.cn(
              cm.sp('mt', 3),
              cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
              cm.textSize('sm'),
            )}
          >
            <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
              <span className={'w-3 h-3 rounded-full bg-primary'} aria-hidden="true" />
              <span className="text-on-surface-variant">
                {t('hostDashboard.chart.revenue', {}, { defaultValue: 'Gross revenue' })}
              </span>
            </span>
            <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'hostDashboard.chart.summary',
                { revenue: fmtPrice(data.metrics.monthly_revenue_cents, { compact: true }) },
                { defaultValue: 'Up to {{revenue}} this month' },
              )}
            </span>
          </div>
        </section>

        {/* Quick actions */}
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface rounded-2xl shadow-sm border border-outline-variant/40',
          )}
        >
          <h2
            className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            {t('hostDashboard.actions.heading', {}, { defaultValue: 'Quick actions' })}
          </h2>
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            {QUICK_ACTIONS.map((a) => (
              <li key={a.key}>
                <button
                  type="button"
                  onClick={() => {}}
                  className={cm.cn(
                    cm.sp('p', 4),
                    cm.flex({ align: 'center', gap: 'md' }),
                    'w-full rounded-xl bg-surface-container-low border border-outline-variant/40 hover:border-primary/40 hover:bg-primary/5 transition-colors text-left',
                  )}
                >
                  {/* TODO: dispatch host quick-action */}
                  <span
                    className={cm.cn(
                      'w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center',
                    )}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {a.icon}
                    </span>
                  </span>
                  <span className={cm.fontWeight('semibold')}>
                    {t(`hostDashboard.actions.${a.key}`, {}, { defaultValue: a.defaultText })}
                  </span>
                  <span
                    className="material-symbols-outlined text-on-surface-variant ml-auto"
                    aria-hidden="true"
                  >
                    chevron_right
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Upcoming bookings */}
      <section
        className={cm.cn(
          cm.sp('mt', 8),
          cm.sp('p', 6),
          'bg-surface rounded-2xl shadow-sm border border-outline-variant/40',
        )}
      >
        <header className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 4))}>
          <h2
            className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            {t('hostDashboard.upcoming.heading', {}, { defaultValue: 'Upcoming bookings' })}
          </h2>
          <Link
            to="/reservations"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-primary hover:underline',
            )}
          >
            {t('common.viewAll', {}, { defaultValue: 'View all' })}
          </Link>
        </header>
        <div className="overflow-x-auto">
          <table className={'w-full text-sm'}>
            <thead>
              <tr className="text-left text-on-surface-variant">
                <th className={'text-[10px] font-black uppercase tracking-widest py-2 pr-4'}>
                  {t('hostDashboard.upcoming.guest', {}, { defaultValue: 'Guest' })}
                </th>
                <th className={'text-[10px] font-black uppercase tracking-widest py-2 pr-4'}>
                  {t('hostDashboard.upcoming.venue', {}, { defaultValue: 'Venue' })}
                </th>
                <th className={'text-[10px] font-black uppercase tracking-widest py-2 pr-4'}>
                  {t('form.date', {}, { defaultValue: 'Date' })}
                </th>
                <th className={'text-[10px] font-black uppercase tracking-widest py-2 pr-4'}>
                  {t('nav.guests', {}, { defaultValue: 'Guests' })}
                </th>
                <th
                  className={
                    'text-[10px] font-black uppercase tracking-widest py-2 pr-4 text-right'
                  }
                >
                  {t('nav.total', {}, { defaultValue: 'Total' })}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {data.upcoming_bookings.map((b) => (
                <tr key={b.id} className={'hover:bg-primary/5 transition-colors'}>
                  <td className={cm.cn(cm.sp('py', 3), cm.sp('pr', 4), cm.fontWeight('bold'))}>
                    {b.guest_name}
                  </td>
                  <td className={cm.cn(cm.sp('py', 3), cm.sp('pr', 4), 'text-on-surface-variant')}>
                    {b.venue_name}
                  </td>
                  <td className={cm.cn(cm.sp('py', 3), cm.sp('pr', 4), 'tabular-nums')}>
                    <p className={cm.fontWeight('semibold')}>{fmtDate(b.starts_at_iso)}</p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {fmtTimeRange(b.starts_at_iso, b.ends_at_iso)}
                    </p>
                  </td>
                  <td className={cm.cn(cm.sp('py', 3), cm.sp('pr', 4), 'tabular-nums')}>
                    {b.guest_count}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('py', 3),
                      cm.sp('pr', 4),
                      cm.fontWeight('bold'),
                      'tabular-nums text-right',
                    )}
                  >
                    {fmtPrice(b.total_cents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
