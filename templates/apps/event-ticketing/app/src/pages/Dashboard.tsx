import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { EventCard, type EventSummary } from '../components/EventCard.js'
import { KpiCard } from '../components/KpiCard.js'
import { type NotificationKind, NotificationRow } from '../components/NotificationRow.js'

interface DashboardSummary {
  events_published?: number
  tickets_sold?: number
  revenue_cents?: number
  upcoming_count?: number
}

interface ActivityItem {
  id: string
  kind: NotificationKind
  title: string
  body?: string
  time_ago: string
  to?: string
}

interface EventRow {
  id: string
  title: string
  category: string
  start_date: string
  start_time?: string | null
  venue?: string | null
  city?: string | null
  min_price?: number | null
  tickets_total?: number | null
  tickets_sold?: number | null
  status?: string | null
}

function rowToSummary(row: EventRow): EventSummary {
  const minPriceDollars = Number(row.min_price ?? 0)
  const isFree = minPriceDollars === 0
  const sold = Number(row.tickets_sold ?? 0)
  const total = Number(row.tickets_total ?? 0)
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    start_date: row.start_date,
    start_time: row.start_time ?? undefined,
    venue_name: row.venue ?? '',
    city: row.city ?? '',
    min_price: isFree ? undefined : Math.round(minPriceDollars * 100),
    is_free: isFree,
    is_sold_out: total > 0 && sold >= total ? true : undefined,
    tickets_sold: sold,
  }
}

function fmtUsd(cents?: number): string {
  if (typeof cents !== 'number') return '$—'
  const dollars = cents / 100
  return `$${dollars.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [upcoming, setUpcoming] = useState<EventSummary[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [summaryRes, eventsRes, activityRes] = await Promise.all([
          http.get('/api/dashboard/summary'),
          http.get('/api/events?mine=true&limit=6'),
          http.get('/api/dashboard/activity'),
        ])
        if (cancelled) return
        setSummary(summaryRes.data as DashboardSummary)
        setUpcoming(((eventsRes.data as EventRow[]) ?? []).map(rowToSummary))
        setActivity((activityRes.data as ActivityItem[]) ?? [])
      } catch (e) {
        if (!cancelled) setError((e as Error).message ?? 'Failed to load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http])

  const eventsPublished = summary?.events_published ?? 0
  const ticketsSold = summary?.tickets_sold ?? 0
  const revenue = summary?.revenue_cents ?? 0
  const upcomingCount =
    summary?.upcoming_count ?? upcoming.filter((e) => new Date(e.start_date) >= new Date()).length

  return (
    <div
      className={cm.cn(cm.sp('p', 8), cm.stack(8), 'max-w-7xl w-full mx-auto')}
      data-mol-id="page-dashboard"
    >
      {/* Hero band */}
      <section
        className={cm.cn(
          'relative overflow-hidden rounded-3xl text-white shadow-xl shadow-primary/20',
        )}
        style={{
          background:
            'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-mid) 50%, var(--color-secondary) 100%)',
        }}
      >
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/10 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn('absolute -left-12 top-0 w-48 h-48 rounded-full opacity-30 blur-3xl')}
          style={{ background: 'var(--color-accent)' }}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            'relative p-8 md:p-12 grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-8 items-center',
          )}
        >
          <div>
            <p className={cm.cn('text-xs font-black uppercase tracking-widest mb-3 opacity-70')}>
              {t(
                'dashboard.eyebrow',
                { app: APP_NAME },
                { defaultValue: '{{app}} · Organizer console' },
              )}
            </p>
            <h1
              className={cm.cn(
                'text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-3',
              )}
            >
              {ticketsSold > 0
                ? t('dashboard.heading.selling', {}, { defaultValue: 'Tonight is shaping up.' })
                : eventsPublished > 0
                  ? t('dashboard.heading.live', {}, { defaultValue: 'Doors are open.' })
                  : t('dashboard.heading.empty', {}, { defaultValue: 'Welcome aboard.' })}
            </h1>
            <p className={cm.cn('text-base text-white/80 max-w-md leading-relaxed')}>
              {ticketsSold > 0
                ? t(
                    'dashboard.body.selling',
                    { tickets: ticketsSold.toLocaleString() },
                    {
                      defaultValue:
                        '{{tickets}} tickets sold across your live events. Keep the momentum — schedule your next show or push an announcement.',
                    },
                  )
                : eventsPublished > 0
                  ? t(
                      'dashboard.body.live',
                      { count: eventsPublished },
                      {
                        defaultValue:
                          '{{count}} event live and ready for sales. Share the link or set up another one.',
                      },
                    )
                  : t(
                      'dashboard.body.empty',
                      {},
                      {
                        defaultValue:
                          'Set up your first event to start selling — multi-tier pricing, instant payouts, and check-in from your phone.',
                      },
                    )}
            </p>
            <div className={cm.cn('mt-6 flex items-center gap-3 flex-wrap')}>
              <Link
                to="/events/new"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  'rounded-full bg-surface text-primary font-bold inline-flex items-center gap-2 shadow-md hover:-translate-y-0.5 transition-transform',
                )}
                data-mol-id="cta-host-event"
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  add_circle
                </span>
                {t('dashboard.cta.host', {}, { defaultValue: 'Host an event' })}
              </Link>
              <Link
                to="/events"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  'rounded-full border border-surface/40 hover:bg-surface/10 font-bold inline-flex items-center gap-2',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  explore
                </span>
                {t('dashboard.cta.discover', {}, { defaultValue: 'Browse events' })}
              </Link>
            </div>
          </div>
          <div
            className={cm.cn(
              'rounded-2xl bg-surface/10 backdrop-blur-md p-6 border border-surface/15',
            )}
          >
            <p
              className={cm.cn('text-[10px] font-black uppercase tracking-widest opacity-70 mb-2')}
            >
              {t('dashboard.revenuePill', {}, { defaultValue: 'Lifetime gross sales' })}
            </p>
            <p
              className={cm.cn('text-5xl font-extrabold tabular-nums tracking-tight')}
              data-mol-id="dashboard-revenue"
            >
              {fmtUsd(revenue)}
            </p>
            <div className={cm.cn('mt-4 flex items-center gap-2 text-sm font-semibold')}>
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                payments
              </span>
              {t(
                'dashboard.revenueDelta',
                { count: ticketsSold },
                { defaultValue: '{{count}} tickets sold' },
              )}
            </div>
          </div>
        </div>
      </section>

      {/* KPI row */}
      {error ? (
        <div
          className={cm.cn('p-4 rounded-xl bg-error-container text-on-error-container text-sm')}
          role="alert"
        >
          {t(
            'dashboard.summaryError',
            { msg: error },
            { defaultValue: 'Could not load dashboard data: {{msg}}' },
          )}
        </div>
      ) : null}
      <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}>
        <KpiCard
          label={t('dashboard.kpi.published', {}, { defaultValue: 'Published events' })}
          value={loading ? '—' : eventsPublished.toLocaleString()}
          icon="event_available"
          trend="flat"
          trendLabel=""
          accent="primary"
        />
        <KpiCard
          label={t('dashboard.kpi.sold', {}, { defaultValue: 'Tickets sold' })}
          value={loading ? '—' : ticketsSold.toLocaleString()}
          icon="confirmation_number"
          trend="flat"
          trendLabel=""
          accent="rose"
        />
        <KpiCard
          label={t('dashboard.kpi.revenue', {}, { defaultValue: 'Gross revenue' })}
          value={loading ? '—' : fmtUsd(revenue)}
          icon="payments"
          trend="flat"
          trendLabel=""
          accent="success"
        />
        <KpiCard
          label={t('dashboard.kpi.upcoming', {}, { defaultValue: 'Upcoming events' })}
          value={loading ? '—' : upcomingCount.toLocaleString()}
          icon="schedule"
          trend="flat"
          trendLabel=""
          accent="info"
        />
      </div>

      {/* Two-pane: upcoming events + activity feed */}
      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3')}>
        <section className={cm.cn('lg:col-span-2 stack-y space-y-5')}>
          <header className={cm.flex({ align: 'end', justify: 'between' })}>
            <div>
              <p
                className={cm.cn('text-xs font-black uppercase tracking-widest text-primary mb-1')}
              >
                {t('dashboard.upcomingEyebrow', {}, { defaultValue: 'Your shows' })}
              </p>
              <h2 className={cm.cn('text-2xl font-extrabold tracking-tight')}>
                {t('dashboard.upcomingHeading', {}, { defaultValue: 'Your events' })}
              </h2>
            </div>
            <Link
              to="/events/new"
              className={cm.cn(cm.textSize('sm'), 'font-bold text-primary hover:underline')}
            >
              {t('dashboard.upcomingViewAll', {}, { defaultValue: '+ New event' })}
            </Link>
          </header>
          {upcoming.length === 0 ? (
            <div
              className={cm.cn(
                cm.textCenter,
                cm.sp('py', 12),
                'rounded-2xl border border-dashed border-outline-variant/60',
              )}
              data-mol-id="dashboard-empty-events"
            >
              <span
                className={cm.cn('material-symbols-outlined text-5xl text-primary/40')}
                aria-hidden="true"
              >
                event
              </span>
              <p className={cm.cn(cm.sp('mt', 3), cm.textSize('sm'), cm.textMuted)}>
                {t(
                  'dashboard.empty.events',
                  {},
                  {
                    defaultValue:
                      'You haven’t hosted an event yet. Set one up in under three minutes.',
                  },
                )}
              </p>
              <Link
                to="/events/new"
                className={cm.cn(
                  'inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full text-white font-bold shadow-md shadow-primary/30',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                }}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  add
                </span>
                {t('dashboard.empty.cta', {}, { defaultValue: 'Host your first event' })}
              </Link>
            </div>
          ) : (
            <div
              className={cm.cn(
                cm.grid({ gap: 'md' }),
                'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 mt-4',
              )}
            >
              {upcoming.map((evt) => (
                <EventCard key={evt.id} event={evt} variant="compact" />
              ))}
            </div>
          )}
        </section>

        <section className={cm.cn(cm.stack(4))}>
          <header className={cm.flex({ align: 'end', justify: 'between' })}>
            <div>
              <p
                className={cm.cn('text-xs font-black uppercase tracking-widest text-primary mb-1')}
              >
                {t('status.live', {}, { defaultValue: 'Live' })}
              </p>
              <h2 className={cm.cn('text-2xl font-extrabold tracking-tight')}>
                {t('nav.recentActivity', {}, { defaultValue: 'Recent activity' })}
              </h2>
            </div>
            <Link
              to="/notifications"
              className={cm.cn(cm.textSize('sm'), 'font-bold text-primary hover:underline')}
            >
              {t('dashboard.activityAll', {}, { defaultValue: 'All →' })}
            </Link>
          </header>
          {activity.length === 0 ? (
            <p
              className={cm.cn(cm.textCenter, cm.sp('py', 8), 'text-on-surface-variant text-sm')}
              data-mol-id="dashboard-empty-activity"
            >
              {t(
                'dashboard.empty.activity',
                {},
                { defaultValue: 'Activity from your events will show up here.' },
              )}
            </p>
          ) : (
            <div className={cm.cn(cm.stack(2))}>
              {activity.slice(0, 8).map((a) => (
                <NotificationRow
                  key={a.id}
                  kind={a.kind}
                  title={a.title}
                  body={a.body}
                  timeAgo={a.time_ago}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default Dashboard
