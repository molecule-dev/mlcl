import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ScheduleItem } from '../components/ScheduleItem.js'
import { StatPill } from '../components/StatPill.js'
import type { CalendarEvent } from '../lib/api.js'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function startOfWeek(date: Date): Date {
  const day = date.getDay() // Sunday=0
  const diff = day === 0 ? -6 : 1 - day // shift to Monday
  const monday = new Date(date)
  monday.setDate(date.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function dayOffset(start: Date, eventISO: string | null): number | null {
  if (!eventISO) return null
  const event = new Date(eventISO)
  const startOfEvent = new Date(event)
  startOfEvent.setHours(0, 0, 0, 0)
  const ms = startOfEvent.getTime() - start.getTime()
  const days = Math.round(ms / (24 * 60 * 60 * 1000))
  if (days < 0 || days > 6) return null
  return days
}

export function Calendar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get<CalendarEvent[]>('/api/me/calendar')
      .then((res) => {
        if (cancelled) return
        setEvents(res.data)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load calendar')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const thisWeekStart = useMemo(() => startOfWeek(new Date()), [])

  const stats = useMemo(() => {
    const now = Date.now()
    const weekFromNow = now + 7 * 24 * 60 * 60 * 1000
    const inWeek = events.filter((e) => {
      if (!e.starts_at) return false
      const ms = new Date(e.starts_at).getTime()
      return ms >= now && ms <= weekFromNow
    })
    return {
      classes: inWeek.filter((e) => e.kind === 'class').length,
      assignments: inWeek.filter((e) => e.kind === 'assignment').length,
      total: events.length,
    }
  }, [events])

  const eventsThisWeek = useMemo(() => {
    return events
      .map((e) => ({ ...e, day: dayOffset(thisWeekStart, e.starts_at) }))
      .filter((e): e is CalendarEvent & { day: number } => e.day !== null)
  }, [events, thisWeekStart])

  const todayEvents = useMemo(() => {
    const todayDay = (new Date().getDay() + 6) % 7 // Mon=0..Sun=6
    return eventsThisWeek.filter((e) => e.day === todayDay).slice(0, 5)
  }, [eventsThisWeek])

  return (
    <div className={cm.stack(8)} data-testid="calendar-root">
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-4')}
      >
        <div className={cm.stack(1)}>
          <span className={cm.cn('text-[11px] font-black uppercase tracking-widest text-primary')}>
            {t('nav.schedule', {}, { defaultValue: 'Schedule' })}
          </span>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t(
              'calendar.title',
              {
                week: thisWeekStart.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                }),
              },
              { defaultValue: 'Calendar — week of {{week}}' },
            )}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xl')}>
            {t(
              'calendar.body',
              {},
              {
                defaultValue:
                  'Live classes and assignment deadlines from courses you own or are enrolled in.',
              },
            )}
          </p>
        </div>
      </header>

      {error ? (
        <div
          role="alert"
          className={cm.cn(cm.sp('p', 4), 'rounded-xl bg-error-container text-on-error-container')}
        >
          {error}
        </div>
      ) : null}

      <section className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-3')}>
        <StatPill
          icon="event"
          tone="primary"
          label={t('calendar.statClasses', {}, { defaultValue: 'Live classes this week' })}
          value={String(stats.classes)}
        />
        <StatPill
          icon="assignment"
          tone="success"
          label={t('calendar.statDeadlines', {}, { defaultValue: 'Deadlines this week' })}
          value={String(stats.assignments)}
        />
        <StatPill
          icon="meeting_room"
          tone="secondary"
          label={t('calendar.statTotal', {}, { defaultValue: 'Total upcoming events' })}
          value={String(stats.total)}
        />
      </section>

      <section
        data-testid="calendar-grid"
        className={cm.cn(
          'overflow-x-auto rounded-2xl bg-surface-container-lowest border border-outline-variant/10',
        )}
      >
        <div className={cm.cn('min-w-[920px]')}>
          <div
            className={cm.cn(
              cm.grid({ cols: 7, gap: 'none' }),
              'border-b border-outline-variant/15',
            )}
          >
            {DAY_LABELS.map((day, idx) => {
              const date = new Date(thisWeekStart)
              date.setDate(thisWeekStart.getDate() + idx)
              return (
                <div
                  key={day}
                  className={cm.cn(
                    cm.sp('p', 3),
                    cm.stack(0),
                    'text-center',
                    idx === (new Date().getDay() + 6) % 7 && 'bg-primary-container/40',
                  )}
                >
                  <span
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t(`calendar.day_${day}`, {}, { defaultValue: day })}
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('lg'),
                      cm.fontWeight('bold'),
                      idx === (new Date().getDay() + 6) % 7 ? 'text-primary' : 'text-on-surface',
                    )}
                  >
                    {date.getDate()}
                  </span>
                </div>
              )
            })}
          </div>
          <div className={cm.cn(cm.grid({ cols: 7, gap: 'none' }), 'min-h-[280px]')}>
            {DAY_LABELS.map((_, dayIdx) => {
              const dayEvents = eventsThisWeek.filter((e) => e.day === dayIdx).slice(0, 6)
              return (
                <div
                  key={dayIdx}
                  className={cm.cn(
                    cm.sp('p', 2),
                    cm.stack(2),
                    'border-r border-outline-variant/10 last:border-r-0',
                  )}
                  data-testid={`calendar-column-${dayIdx}`}
                >
                  {dayEvents.length === 0 ? (
                    <div className={cm.cn('text-[10px] text-on-surface-variant/60 italic')}>—</div>
                  ) : (
                    dayEvents.map((e) => (
                      <Link
                        key={e.id}
                        to={e.url}
                        data-testid={`calendar-event-${e.id}`}
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.sp('py', 1.5),
                          'rounded-lg shadow-sm overflow-hidden block',
                          e.kind === 'class'
                            ? 'bg-primary text-on-primary'
                            : 'bg-secondary text-on-secondary',
                        )}
                      >
                        <p
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            'leading-tight',
                          )}
                        >
                          {e.title}
                        </p>
                        <p
                          className={cm.cn(
                            'text-[10px] uppercase tracking-widest opacity-90 font-bold',
                          )}
                        >
                          {e.kind}
                          {e.starts_at
                            ? ' · ' +
                              new Date(e.starts_at).toLocaleTimeString(undefined, {
                                hour: 'numeric',
                                minute: '2-digit',
                              })
                            : ''}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className={cm.stack(4)}>
        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            'tracking-tight text-on-surface',
          )}
        >
          {t('calendar.agendaTitle', {}, { defaultValue: "Today's agenda" })}
        </h2>
        <div className={cm.stack(3)} data-testid="calendar-agenda">
          {loading ? (
            <div className={cm.cn(cm.sp('p', 4), 'text-on-surface-variant')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </div>
          ) : todayEvents.length === 0 ? (
            <div
              className={cm.cn(
                cm.sp('p', 4),
                'rounded-xl bg-surface-container-lowest text-on-surface-variant text-sm',
              )}
            >
              {t('calendar.noToday', {}, { defaultValue: 'Nothing on the agenda today.' })}
            </div>
          ) : (
            todayEvents.map((e, i) => (
              <ScheduleItem
                key={e.id}
                id={e.id}
                title={e.title}
                course={e.kind}
                instructor={undefined}
                startTime={
                  e.starts_at
                    ? new Date(e.starts_at).toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : ''
                }
                endTime={
                  e.ends_at
                    ? new Date(e.ends_at).toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : ''
                }
                location={undefined}
                status={e.kind === 'class' ? 'live' : undefined}
                tone={i === 0 ? 'primary' : i === 1 ? 'secondary' : 'tertiary'}
              />
            ))
          )}
        </div>
      </section>
    </div>
  )
}

export default Calendar
