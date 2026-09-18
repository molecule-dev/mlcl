/**
 * Calendar — week/day grid showing the host's real bookings from
 * /api/bookings. Confirmed = scheduled status; Cancelled is hidden by
 * default (toggleable). Clicking an event navigates to /bookings/:id.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface ApiBooking {
  id: string
  invitee_name: string
  start_at: string
  end_at: string
  status: string
  event_type_id: string
}

interface ApiEventType {
  id: string
  name: string
  duration_minutes: number
}

interface VisualEvent {
  id: string
  title: string
  startHour: number
  durationHours: number
  dayIdx: number
  status: string
}

const STATUS_TONE: Record<string, string> = {
  scheduled: 'border-emerald-500 bg-emerald-500/10 text-success',
  pending: 'border-amber-500 bg-amber-500/10 text-warning',
  cancelled: 'border-rose-500 bg-rose-500/10 text-error',
  completed: 'border-border-secondary bg-slate-500/10 text-foreground',
  no_show: 'border-border-secondary bg-slate-500/10 text-foreground',
}

function startOfWeek(d: Date) {
  const out = new Date(d)
  const day = out.getDay()
  const diff = day === 0 ? -6 : 1 - day
  out.setDate(out.getDate() + diff)
  out.setHours(0, 0, 0, 0)
  return out
}

export function Calendar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [view, setView] = useState<'week' | 'day'>('week')
  const [anchor, setAnchor] = useState(() => new Date())
  const [bookings, setBookings] = useState<ApiBooking[]>([])
  const [eventTypes, setEventTypes] = useState<Record<string, ApiEventType>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/bookings').then((res) => unwrapList<ApiBooking>(res)),
      http.get('/api/event-types').then((res) => unwrapList<ApiEventType>(res)),
    ])
      .then(([bookingList, etList]) => {
        if (cancelled) return
        setBookings(bookingList)
        setEventTypes(Object.fromEntries(etList.map((et) => [et.id, et])))
      })
      .catch(() => {
        // Calendar still renders the grid; show empty.
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const monday = useMemo(() => startOfWeek(anchor), [anchor])
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday)
        d.setDate(d.getDate() + i)
        return d
      }),
    [monday],
  )
  const hours = useMemo(() => Array.from({ length: 11 }, (_, i) => 8 + i), [])
  const monthLabel = monday.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const visualEvents: VisualEvent[] = useMemo(() => {
    const startWeek = monday.getTime()
    const endWeek = startWeek + 7 * 24 * 60 * 60 * 1000
    return bookings
      .filter((b) => {
        const t = new Date(b.start_at).getTime()
        return t >= startWeek && t < endWeek
      })
      .map((b) => {
        const start = new Date(b.start_at)
        const end = new Date(b.end_at)
        const dayIdx = Math.floor((start.getTime() - startWeek) / (24 * 60 * 60 * 1000))
        const startHour = start.getHours() + start.getMinutes() / 60
        const durationHours = (end.getTime() - start.getTime()) / (60 * 60 * 1000)
        const et = eventTypes[b.event_type_id]
        return {
          id: b.id,
          title: et ? `${et.name} — ${b.invitee_name}` : b.invitee_name,
          startHour,
          durationHours,
          dayIdx,
          status: b.status,
        }
      })
  }, [bookings, eventTypes, monday])

  return (
    <div className={cm.cn(cm.stack(6), cm.sp('p', 8), 'max-w-[1440px] mx-auto')}>
      <header
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }))}
      >
        <div className={cm.stack(2)}>
          <p
            className={cm.cn(cm.textSize('xs'), 'font-bold uppercase tracking-widest text-primary')}
          >
            {t('calendar.eyebrow', {}, { defaultValue: 'Schedule grid' })}
          </p>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
            {monthLabel}
          </h1>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('p', 1),
              'gap-1 bg-surface-container-low rounded-full',
            )}
          >
            {(['week', 'day'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'rounded-full uppercase tracking-widest transition-colors',
                  view === v
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface',
                )}
              >
                {t(`calendar.view.${v}`, {}, { defaultValue: v })}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label={t('calendar.prevWeek', {}, { defaultValue: 'Previous week' })}
            onClick={() =>
              setAnchor((d) => {
                const nd = new Date(d)
                nd.setDate(nd.getDate() - 7)
                return nd
              })
            }
            className={cm.cn(
              cm.sp('p', 2),
              cm.roundedFull,
              'border border-outline-variant hover:bg-surface-container-low transition-colors',
            )}
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              chevron_left
            </span>
          </button>
          <button
            type="button"
            data-testid="calendar-today"
            onClick={() => setAnchor(new Date())}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'rounded-full uppercase tracking-widest border border-outline-variant hover:bg-surface-container-low transition-colors',
            )}
          >
            {t('status.today', {}, { defaultValue: 'Today' })}
          </button>
          <button
            type="button"
            aria-label={t('calendar.nextWeek', {}, { defaultValue: 'Next week' })}
            onClick={() =>
              setAnchor((d) => {
                const nd = new Date(d)
                nd.setDate(nd.getDate() + 7)
                return nd
              })
            }
            className={cm.cn(
              cm.sp('p', 2),
              cm.roundedFull,
              'border border-outline-variant hover:bg-surface-container-low transition-colors',
            )}
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              chevron_right
            </span>
          </button>
        </div>
      </header>

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('calendar.loading', {}, { defaultValue: 'Loading bookings…' })}
        </p>
      ) : null}

      <section
        data-testid="calendar-grid"
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-3xl shadow-sm overflow-hidden',
        )}
      >
        <div
          className={cm.cn('grid border-b border-outline-variant/40')}
          style={{ gridTemplateColumns: '64px repeat(7, minmax(0, 1fr))' }}
        >
          <div />
          {days.map((d, i) => {
            const isToday = d.toDateString() === new Date().toDateString()
            return (
              <div key={i} className={cm.cn(cm.sp('py', 3), cm.textCenter)}>
                <p
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {d.toLocaleDateString(undefined, { weekday: 'short' })}
                </p>
                <p
                  className={cm.cn(
                    cm.textSize('lg'),
                    'font-extrabold tabular-nums',
                    isToday ? 'text-primary' : 'text-on-surface',
                  )}
                >
                  {d.getDate()}
                </p>
              </div>
            )
          })}
        </div>

        <div
          className={cm.cn('relative grid')}
          style={{ gridTemplateColumns: '64px repeat(7, minmax(0, 1fr))' }}
        >
          {hours.map((h) => (
            <div
              key={`h-${h}`}
              className={cm.cn(
                cm.textRight,
                cm.sp('pr', 2),
                cm.sp('pt', 2),
                'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border-t border-outline-variant/30',
              )}
              style={{ height: 60 }}
            >
              {`${((h - 1) % 12) + 1}${h < 12 ? 'a' : 'p'}`}
            </div>
          ))}

          {days.map((_day, dayIdx) => (
            <div
              key={`col-${dayIdx}`}
              className={cm.cn('relative border-l border-outline-variant/30')}
              style={{
                gridColumn: dayIdx + 2,
                gridRow: `1 / span ${hours.length}`,
                height: hours.length * 60,
              }}
            >
              {hours.map((_h, i) => (
                <div
                  key={`slot-${dayIdx}-${i}`}
                  className={cm.cn('border-t border-outline-variant/20')}
                  style={{ height: 60 }}
                />
              ))}
              {visualEvents
                .filter((e) => e.dayIdx === dayIdx)
                // Day view: only today's column. dayIdx is Monday-based
                // (startOfWeek), getDay() is Sunday-based — shift by 6.
                .filter(() => view === 'week' || dayIdx === (new Date().getDay() + 6) % 7)
                .map((e) => {
                  const startMin = (e.startHour - 8) * 60
                  const heightPx = Math.max(20, e.durationHours * 60)
                  return (
                    <Link
                      key={e.id}
                      to={`/bookings/${e.id}`}
                      data-testid={`calendar-event-${e.id}`}
                      className={cm.cn(
                        'absolute left-1 right-1 rounded-lg border-l-4 px-2 py-1 shadow-sm overflow-hidden block hover:shadow-md transition-shadow',
                        STATUS_TONE[e.status] ?? STATUS_TONE.scheduled,
                      )}
                      style={{ top: startMin, height: heightPx }}
                    >
                      <p className={cm.cn(cm.textSize('xs'), 'font-bold truncate')}>{e.title}</p>
                      <p className={cm.cn('text-[10px] font-mono tabular-nums opacity-80')}>
                        {new Date(
                          `1970-01-01T${String(Math.floor(e.startHour)).padStart(2, '0')}:${String(Math.round((e.startHour % 1) * 60)).padStart(2, '0')}:00`,
                        ).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </Link>
                  )
                })}
            </div>
          ))}
        </div>

        {!loading && visualEvents.length === 0 ? (
          <p
            data-testid="calendar-empty"
            className={cm.cn(
              cm.sp('mt', 4),
              cm.textSize('sm'),
              cm.textCenter,
              'text-on-surface-variant',
            )}
          >
            {t('calendar.empty', {}, { defaultValue: 'No bookings on the calendar this week.' })}
          </p>
        ) : null}
      </section>
    </div>
  )
}

export default Calendar
