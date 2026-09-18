import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface CalEvent {
  id: string
  title: string
  date: string // YYYY-MM-DD
  time: string // HH:MM
  duration_min: number
  speaker_id: number // 1-5
  meeting_id?: string | null
  conference_url?: string | null
}

const SPEAKER_BG: Record<number, string> = {
  1: 'var(--color-speaker-1)',
  2: 'var(--color-speaker-2)',
  3: 'var(--color-speaker-3)',
  4: 'var(--color-speaker-4)',
  5: 'var(--color-speaker-5)',
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function buildMonthGrid(d: Date): Date[][] {
  const first = startOfMonth(d)
  const startDow = (first.getDay() + 6) % 7 // Mon=0
  const start = new Date(first)
  start.setDate(start.getDate() - startDow)
  const grid: Date[][] = []
  const cursor = new Date(start)
  for (let w = 0; w < 6; w++) {
    const week: Date[] = []
    for (let dow = 0; dow < 7; dow++) {
      week.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    grid.push(week)
  }
  return grid
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function Calendar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [events, setEvents] = useState<CalEvent[]>([])
  const [month, setMonth] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/calendar_events')
      .then((res) => {
        if (!cancelled) setEvents(unwrapList<CalEvent>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('calendar.loadError', {}, { defaultValue: 'Failed to load calendar.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const grid = useMemo(() => buildMonthGrid(month), [month])
  const upcoming = useMemo(() => {
    const today = dayKey(new Date())
    const future = events.filter((e) => e.date >= today).slice(0, 8)
    if (future.length > 0) return future
    // No future events — surface the most recent ones so existing
    // (past-dated) meetings are still discoverable on initial load.
    return [...events].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 8)
  }, [events])
  const hasFutureEvents = useMemo(() => {
    const today = dayKey(new Date())
    return events.some((e) => e.date >= today)
  }, [events])

  const monthName = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('calendar.heading', {}, { defaultValue: 'Calendar' })}
        </h1>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <button
            type="button"
            aria-label={t('calendar.previousMonth', {}, { defaultValue: 'Previous month' })}
            onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'border border-outline rounded-md',
            )}
          >
            ‹
          </button>
          <span
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              'bg-surface-container rounded-md min-w-[180px] text-center',
            )}
          >
            {monthName}
          </span>
          <button
            type="button"
            aria-label={t('calendar.nextMonth', {}, { defaultValue: 'Next month' })}
            onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'border border-outline rounded-md',
            )}
          >
            ›
          </button>
        </div>
      </header>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
        <section className={cm.cn('col-span-12 lg:col-span-8', cm.card(), cm.sp('p', 4))}>
          <div
            className={cm.cn(
              'grid grid-cols-7 gap-2',
              cm.textSize('xs'),
              'uppercase tracking-wide',
              'text-on-surface-variant',
              cm.sp('mb', 2),
            )}
          >
            {(
              [
                ['mon', 'Mon'],
                ['tue', 'Tue'],
                ['wed', 'Wed'],
                ['thu', 'Thu'],
                ['fri', 'Fri'],
                ['sat', 'Sat'],
                ['sun', 'Sun'],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="text-center">
                {t(`calendar.dow.${key}`, {}, { defaultValue: label })}
              </div>
            ))}
          </div>
          <div className={'grid grid-cols-7 gap-2'}>
            {grid.flat().map((d) => {
              const isCurrent = d.getMonth() === month.getMonth()
              const dk = dayKey(d)
              const dayEvents = events.filter((e) => e.date === dk)
              return (
                <button
                  type="button"
                  key={dk}
                  onClick={() => setSelectedDay(dk === selectedDay ? null : dk)}
                  className={cm.cn(
                    'min-h-[80px] p-2 rounded-md text-left',
                    isCurrent ? 'bg-surface' : 'bg-surface-container',
                    selectedDay === dk ? 'ring-2 ring-primary' : 'hover:bg-surface-container',
                  )}
                >
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      isCurrent ? '' : 'text-on-surface-variant',
                    )}
                  >
                    {d.getDate()}
                  </p>
                  <ul className={cm.cn(cm.sp('mt', 1), 'space-y-1')}>
                    {dayEvents.slice(0, 3).map((e) => (
                      <li
                        key={e.id}
                        className={cm.cn(
                          cm.sp('px', 1),
                          cm.textSize('xs'),
                          'rounded truncate text-on-primary',
                        )}
                        style={{
                          backgroundColor: SPEAKER_BG[e.speaker_id] ?? 'var(--mol-color-primary)',
                        }}
                      >
                        {e.time} {e.title}
                      </li>
                    ))}
                    {dayEvents.length > 3 ? (
                      <li className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        +{dayEvents.length - 3}
                      </li>
                    ) : null}
                  </ul>
                </button>
              )
            })}
          </div>
        </section>

        <aside className={cm.cn('col-span-12 lg:col-span-4', cm.card(), cm.sp('p', 5))}>
          <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
            {selectedDay
              ? new Date(selectedDay).toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })
              : hasFutureEvents
                ? t('status.upcoming', {}, { defaultValue: 'Upcoming' })
                : t('calendar.recent', {}, { defaultValue: 'Recent' })}
          </h2>
          {loading ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : error ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p>
          ) : (
            (() => {
              const visible = selectedDay ? events.filter((e) => e.date === selectedDay) : upcoming
              if (visible.length === 0) {
                return (
                  <div
                    data-mol-id="calendar-event-list"
                    data-mol-empty="true"
                    className={cm.cn(cm.sp('py', 4), cm.textSize('sm'), 'text-on-surface-variant')}
                  >
                    {selectedDay
                      ? t(
                          'calendar.noEventsForDay',
                          {},
                          { defaultValue: 'No meetings scheduled for this day.' },
                        )
                      : t(
                          'calendar.noUpcomingEvents',
                          {},
                          {
                            defaultValue:
                              'No upcoming meetings. Connect a calendar from Integrations to populate this list.',
                          },
                        )}
                  </div>
                )
              }
              return (
                <ul className={'space-y-3'} data-mol-id="calendar-event-list">
                  {visible.map((e) => (
                    <li
                      key={e.id}
                      data-mol-id={`calendar-event-${e.id}`}
                      className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }))}
                    >
                      <span
                        className={'h-2 w-2 rounded-full mt-2 shrink-0'}
                        style={{ backgroundColor: SPEAKER_BG[e.speaker_id] }}
                      />
                      <div className={'min-w-0'}>
                        {e.meeting_id ? (
                          <Link
                            to={`/meetings/${e.meeting_id}`}
                            data-mol-id={`calendar-event-link-${e.id}`}
                            className={cm.cn(
                              cm.textSize('sm'),
                              cm.fontWeight('medium'),
                              'hover:underline truncate block',
                            )}
                          >
                            {e.title}
                          </Link>
                        ) : (
                          <span
                            data-mol-id={`calendar-event-title-${e.id}`}
                            className={cm.cn(
                              cm.textSize('sm'),
                              cm.fontWeight('medium'),
                              'truncate block',
                            )}
                          >
                            {e.title}
                          </span>
                        )}
                        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {e.date} · {e.time} · {e.duration_min}m
                          {e.conference_url ? (
                            <>
                              {' '}
                              ·{' '}
                              <a
                                href={e.conference_url}
                                target="_blank"
                                rel="noreferrer"
                                className={cm.cn('hover:underline', cm.textPrimary)}
                              >
                                {t('calendar.joinCta', {}, { defaultValue: 'Join' })}
                              </a>
                            </>
                          ) : null}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            })()
          )}
        </aside>
      </div>
    </div>
  )
}
