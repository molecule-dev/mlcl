/**
 * Authed dashboard. Displays the host's real upcoming bookings,
 * counts/KPIs derived from the same set, and a sparkline of the past
 * 7 days. Empty-state CTA to share a booking link.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BookingListItem, type BookingRow } from '../components/BookingListItem.js'
import { TodayHeroCard } from '../components/TodayHeroCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface ApiBooking {
  id: string
  invitee_name: string
  invitee_email: string | null
  start_at: string
  end_at: string
  status: string
  notes: string | null
  event_type_id: string
}

interface ApiEventType {
  id: string
  name: string
  duration_minutes: number
}

interface KpiTone {
  label: string
  value: string | number
  sub: string
  icon: string
  borderClass: string
  iconClass: string
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function makeBookingRow(b: ApiBooking, eventTypes: Record<string, ApiEventType>): BookingRow {
  const et = eventTypes[b.event_type_id]
  return {
    id: b.id,
    invitee_name: b.invitee_name,
    invitee_email: b.invitee_email,
    start_at: typeof b.start_at === 'string' ? b.start_at : new Date(b.start_at).toISOString(),
    end_at: typeof b.end_at === 'string' ? b.end_at : new Date(b.end_at).toISOString(),
    status: b.status,
    event_type_name: et ? `${et.name} · ${et.duration_minutes} min` : null,
    notes: b.notes,
  }
}

function buildSparkline(bookings: ApiBooking[]): Array<{ day: string; bookings: number }> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const out: Array<{ day: string; bookings: number }> = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    const next = new Date(d.getTime() + 24 * 60 * 60 * 1000)
    const count = bookings.filter((b) => {
      const t = new Date(b.start_at).getTime()
      return t >= d.getTime() && t < next.getTime()
    }).length
    out.push({ day: DAY_NAMES[d.getDay()], bookings: count })
  }
  return out
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [bookings, setBookings] = useState<ApiBooking[]>([])
  const [eventTypes, setEventTypes] = useState<Record<string, ApiEventType>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get('/api/bookings').then((res) => unwrapList<ApiBooking>(res)),
      http.get('/api/event-types').then((res) => unwrapList<ApiEventType>(res)),
    ])
      .then(([bookingList, eventTypeList]) => {
        if (cancelled) return
        setBookings(bookingList)
        setEventTypes(Object.fromEntries(eventTypeList.map((et) => [et.id, et])))
      })
      .catch(() => {
        if (cancelled) return
        setError(
          t('dashboard.loadError', {}, { defaultValue: 'Could not load your dashboard data.' }),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const upcomingBookings = useMemo(() => {
    const now = Date.now()
    return bookings
      .filter((b) => b.status === 'scheduled' && new Date(b.start_at).getTime() >= now)
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
  }, [bookings])

  const todayBookings = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today.getTime() + 1000 * 60 * 60 * 24)
    return upcomingBookings.filter((b) => {
      const d = new Date(b.start_at)
      return d >= today && d < tomorrow
    })
  }, [upcomingBookings])

  const upcomingRows = useMemo(
    () => upcomingBookings.slice(0, 6).map((b) => makeBookingRow(b, eventTypes)),
    [upcomingBookings, eventTypes],
  )
  const next = upcomingBookings[0]
  const minsUntilNext = next
    ? Math.max(0, Math.round((new Date(next.start_at).getTime() - Date.now()) / 60000))
    : null

  const sparkline = useMemo(() => buildSparkline(bookings), [bookings])
  const weekCount = sparkline.reduce((sum, p) => sum + p.bookings, 0)

  const kpis: KpiTone[] = [
    {
      label: t('dashboard.kpis.bookedToday', {}, { defaultValue: 'Booked today' }),
      value: todayBookings.length,
      sub: t(
        'dashboard.kpis.bookedTodaySub',
        { count: todayBookings.length },
        { defaultValue: '{{count}} confirmed' },
      ),
      icon: 'event',
      borderClass: 'border-primary',
      iconClass: 'bg-primary/10 text-primary',
    },
    {
      label: t('dashboard.kpis.pending', {}, { defaultValue: 'Awaiting reply' }),
      value: bookings.filter((b) => b.status === 'pending').length,
      sub: t('dashboard.kpis.pendingSub', {}, { defaultValue: 'Reminders go out tonight' }),
      icon: 'hourglass_top',
      borderClass: 'border-amber-500',
      iconClass: 'bg-amber-500/10 text-warning',
    },
    {
      label: t('dashboard.kpis.weekTotal', {}, { defaultValue: 'Booked this week' }),
      value: weekCount,
      sub: t('dashboard.kpis.weekTotalSub', {}, { defaultValue: 'Past 7 days' }),
      icon: 'calendar_view_week',
      borderClass: 'border-emerald-500',
      iconClass: 'bg-emerald-500/10 text-success',
    },
  ]

  return (
    <div className={cm.cn(cm.stack(8), cm.sp('p', 8), 'max-w-[1440px] mx-auto')}>
      <header
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }))}
      >
        <div className={cm.stack(2)}>
          <h1
            data-testid="dashboard-greeting"
            className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('dashboard.greeting', {}, { defaultValue: 'Your schedule, at a glance' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('medium'),
              'text-on-surface-variant/80',
            )}
          >
            {t(
              'dashboard.subtitle',
              {},
              {
                defaultValue:
                  "Today's meetings, upcoming requests, and how the week is shaping up.",
              },
            )}
          </p>
        </div>
        <Link
          to="/event-types/new"
          data-testid="dashboard-new-link"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-full shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 active:scale-95 transition-all',
          )}
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            add
          </span>
          {t('dashboard.newLink', {}, { defaultValue: 'New booking link' })}
        </Link>
      </header>

      {error ? (
        <p
          role="alert"
          data-testid="dashboard-error"
          className={cm.cn(cm.textSize('sm'), 'text-error font-semibold')}
        >
          {error}
        </p>
      ) : null}

      <section className={cm.cn(cm.grid({ gap: 'xl' }), 'grid-cols-1 lg:grid-cols-12')}>
        <TodayHeroCard
          todayCount={todayBookings.length}
          weekCount={weekCount}
          history={sparkline}
          nextInvitee={next?.invitee_name}
          nextStartIn={
            minsUntilNext !== null
              ? t(
                  'dashboard.minutesAway',
                  { mins: minsUntilNext },
                  { defaultValue: 'in {{mins}}m' },
                )
              : undefined
          }
        />

        <div
          data-testid="dashboard-kpis"
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            cm.sp('p', 6),
            'gap-4 lg:col-span-4 bg-surface-container-lowest rounded-2xl shadow-sm',
          )}
        >
          <h3
            className={cm.cn(
              cm.textSize('sm'),
              'font-bold uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('status.thisWeek', {}, { defaultValue: 'This week' })}
          </h3>
          <div className={cm.stack(4)}>
            {kpis.map((k) => (
              <div
                key={String(k.label)}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('p', 4),
                  'bg-surface rounded-xl border-l-4 hover:-translate-y-0.5 transition-transform shadow-sm',
                  k.borderClass,
                )}
              >
                <span
                  className={cm.cn(
                    cm.sp('p', 3),
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    k.iconClass,
                  )}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                  >
                    {k.icon}
                  </span>
                </span>
                <div className={cm.flex1}>
                  <p
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {k.label}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('2xl'),
                      'font-extrabold tabular-nums text-on-surface',
                    )}
                  >
                    {k.value}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{k.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className={cm.cn(cm.sp('p', 8), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
      >
        <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}>
          <h2 className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight')}>
            {t('dashboard.upcomingHeading', {}, { defaultValue: 'Upcoming meetings' })}
          </h2>
          <Link
            to="/bookings"
            className={cm.cn(cm.textSize('sm'), 'font-bold text-primary hover:underline')}
          >
            {t('dashboard.viewAll', {}, { defaultValue: 'View all bookings →' })}
          </Link>
        </header>
        {loading ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('dashboard.loading', {}, { defaultValue: 'Loading your meetings…' })}
          </p>
        ) : upcomingRows.length === 0 ? (
          <div data-testid="dashboard-empty" className={cm.cn(cm.textCenter, cm.sp('py', 12))}>
            <span
              className={cm.cn('material-symbols-outlined text-5xl text-on-surface-variant/40')}
            >
              event_note
            </span>
            <p className={cm.cn(cm.textSize('base'), cm.sp('mt', 4), 'font-bold text-on-surface')}>
              {t('dashboard.empty.title', {}, { defaultValue: 'No upcoming meetings' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'dashboard.empty.body',
                {},
                { defaultValue: 'Share a booking link to start filling your calendar.' },
              )}
            </p>
            <Link
              to="/event-types/new"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.sp('mt', 4),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'inline-block bg-primary text-on-primary rounded-full hover:opacity-90',
              )}
            >
              {t('dashboard.empty.cta', {}, { defaultValue: 'Create your first booking link' })}
            </Link>
          </div>
        ) : (
          <ul data-testid="dashboard-upcoming" className={cm.stack(3)}>
            {upcomingRows.map((b) => (
              <li key={b.id}>
                <BookingListItem booking={b} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default Dashboard
