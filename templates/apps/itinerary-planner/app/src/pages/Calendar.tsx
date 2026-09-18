/**
 * Calendar — month grid spanning every active trip. Each cell can show
 * up to two trip pills (color-coded by status) and a +N overflow chip.
 * Header offers prev/next month navigation and a "Today" jump-back.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { TripStatus } from '../components/TripCoverCard.js'
import { type TripRow, tripRowToSummary } from '../lib/api.js'

const STATUS_LABEL: Record<TripStatus, string> = {
  confirmed: 'Confirmed',
  in_progress: 'In progress',
  tentative: 'Tentative',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const STATUS_PILL: Record<TripStatus, { bg: string; text: string }> = {
  confirmed: { bg: 'bg-cyan-100 dark:bg-cyan-900/40', text: 'text-cyan-800 dark:text-cyan-200' },
  in_progress: { bg: 'bg-success-light', text: 'text-success' },
  tentative: { bg: 'bg-warning-light', text: 'text-warning' },
  completed: { bg: 'bg-surface-secondary', text: 'text-foreground' },
  cancelled: { bg: 'bg-rose-100 dark:bg-rose-900/40', text: 'text-rose-800 dark:text-rose-200' },
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtMonthHeader(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function Calendar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [trips, setTrips] = useState<TripRow[]>([])

  useEffect(() => {
    let cancelled = false
    http
      .get<TripRow[]>('/trips')
      .then((r) => {
        if (!cancelled) setTrips(Array.isArray(r.data) ? r.data : [])
      })
      .catch(() => {
        if (!cancelled) setTrips([])
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const summaries = useMemo(() => trips.map(tripRowToSummary), [trips])

  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))

  // Auto-snap cursor to first month with active trips on first load
  useEffect(() => {
    if (summaries.length === 0) return
    const live = summaries.find((s) => s.status === 'in_progress' || s.status === 'confirmed')
    const target = live ? new Date(live.start_iso) : new Date(summaries[0].start_iso)
    setCursor(new Date(target.getFullYear(), target.getMonth(), 1))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaries.length])

  const tripsOnDay = (date: Date) => {
    const tt = date.getTime()
    return summaries.filter((trip) => {
      const start = new Date(trip.start_iso).getTime()
      const end = new Date(trip.end_iso).getTime()
      return tt >= start - 86_400_000 && tt <= end
    })
  }

  const grid = useMemo(() => {
    const first = startOfMonth(cursor)
    const firstDow = (first.getDay() + 6) % 7
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
    const cells: { date: Date; inMonth: boolean }[] = []
    for (let i = 0; i < firstDow; i++) {
      const d = new Date(first)
      d.setDate(d.getDate() - (firstDow - i))
      cells.push({ date: d, inMonth: false })
    }
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), day), inMonth: true })
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1].date
      const d = new Date(last)
      d.setDate(d.getDate() + 1)
      cells.push({ date: d, inMonth: false })
    }
    return cells
  }, [cursor])

  const visibleTrips = useMemo(() => {
    const set = new Set<string>()
    for (const cell of grid) {
      for (const trip of tripsOnDay(cell.date)) set.add(trip.id)
    }
    return summaries.filter((t) => set.has(t.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, summaries])

  const today = new Date()
  const todayKey = dayKey(today)

  const prevMonth = () => setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  const nextMonth = () => setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  const goToday = () => setCursor(startOfMonth(new Date()))

  return (
    <div
      className={cm.cn(
        cm.maxW('7xl'),
        cm.sp('px', 8),
        cm.sp('py', 10),
        cm.mxAuto,
        cm.flex({ direction: 'col', gap: 'lg' }),
      )}
    >
      <header
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }))}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.25em] text-primary',
            )}
          >
            {t('calendar.eyebrow', {}, { defaultValue: 'The year ahead' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              cm.fontWeight('extrabold'),
              cm.sp('mt', 2),
              'leading-tight tracking-tight',
            )}
            style={{ fontFamily: '"Plus Jakarta Sans", -apple-system, sans-serif' }}
          >
            {t('calendar.heading', {}, { defaultValue: 'Every trip on a single calendar.' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('base'),
              cm.sp('mt', 2),
              cm.maxW('2xl'),
              'text-on-surface-variant leading-relaxed',
            )}
          >
            {t(
              'calendar.subheading',
              {},
              {
                defaultValue:
                  'Spot conflicts, plan recovery days between trips, and see when collaborators are travelling with you.',
              },
            )}
          </p>
        </div>
      </header>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface rounded-2xl shadow-sm border border-outline-variant/40',
        )}
      >
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
          )}
        >
          <h2
            data-testid="calendar-month-header"
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('extrabold'),
              'tabular-nums tracking-tight',
            )}
            style={{ fontFamily: '"Plus Jakarta Sans", -apple-system, sans-serif' }}
          >
            {fmtMonthHeader(cursor)}
          </h2>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <button
              type="button"
              onClick={prevMonth}
              className={cm.cn(
                cm.sp('p', 2),
                'rounded-full text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors',
              )}
              aria-label={t('calendar.prevMonth', {}, { defaultValue: 'Previous month' })}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                chevron_left
              </span>
            </button>
            <button
              type="button"
              onClick={goToday}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest rounded-full bg-surface-container-low text-on-surface-variant hover:text-primary',
              )}
            >
              {t('status.today', {}, { defaultValue: 'Today' })}
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className={cm.cn(
                cm.sp('p', 2),
                'rounded-full text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors',
              )}
              aria-label={t('calendar.nextMonth', {}, { defaultValue: 'Next month' })}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                chevron_right
              </span>
            </button>
          </div>
        </header>

        <div
          className={cm.cn(
            cm.sp('mt', 4),
            'grid grid-cols-7 gap-px bg-outline-variant rounded-xl overflow-hidden',
          )}
        >
          {WEEKDAYS.map((label) => (
            <div
              key={label}
              className={cm.cn(
                cm.sp('px', 2),
                cm.sp('py', 2),
                cm.textCenter,
                cm.textSize('xs'),
                cm.fontWeight('extrabold'),
                'uppercase tracking-widest text-on-surface-variant bg-surface-container-low',
              )}
            >
              {t(`calendar.weekday.${label.toLowerCase()}`, {}, { defaultValue: label })}
            </div>
          ))}
          {grid.map((cell) => {
            const tripsForCell = tripsOnDay(cell.date)
            const k = dayKey(cell.date)
            const isToday = k === todayKey
            return (
              <div
                key={k}
                className={cm.cn(
                  cm.sp('p', 2),
                  'min-h-[112px] bg-surface flex flex-col gap-1',
                  cell.inMonth ? '' : 'opacity-50',
                  isToday ? 'ring-2 ring-primary ring-inset' : '',
                )}
              >
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'tabular-nums',
                    isToday ? 'text-primary' : 'text-on-surface-variant',
                  )}
                >
                  {cell.date.getDate()}
                </span>
                {tripsForCell.slice(0, 2).map((trip) => {
                  const theme = STATUS_PILL[trip.status]
                  return (
                    <Link
                      key={`${k}-${trip.id}`}
                      to={`/trips/${trip.id}`}
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'py-0.5 truncate rounded-md hover:opacity-90 transition-opacity',
                        theme.bg,
                        theme.text,
                      )}
                      title={trip.destination}
                    >
                      {trip.destination}
                    </Link>
                  )
                })}
                {tripsForCell.length > 2 ? (
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'tabular-nums text-on-surface-variant',
                    )}
                  >
                    +{tripsForCell.length - 2}
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      {visibleTrips.length > 0 ? (
        <section className={cm.flex({ direction: 'col', gap: 'sm' })}>
          <h2
            className={cm.cn(cm.textSize('xl'), cm.fontWeight('extrabold'), 'tracking-tight')}
            style={{ fontFamily: '"Plus Jakarta Sans", -apple-system, sans-serif' }}
          >
            {t('calendar.legendHeading', {}, { defaultValue: 'Trips on this month' })}
          </h2>
          <ul className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3')}>
            {visibleTrips.map((trip) => {
              const theme = STATUS_PILL[trip.status]
              return (
                <li
                  key={trip.id}
                  className={cm.cn(
                    cm.sp('p', 4),
                    cm.flex({ align: 'center', gap: 'sm' }),
                    'rounded-xl bg-surface border border-outline-variant/40 hover:border-primary transition-colors',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'py-0.5 uppercase tracking-widest rounded-full',
                      theme.bg,
                      theme.text,
                    )}
                  >
                    {t(
                      `calendar.status.${trip.status}`,
                      {},
                      { defaultValue: STATUS_LABEL[trip.status] },
                    )}
                  </span>
                  <Link
                    to={`/trips/${trip.id}`}
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'hover:text-primary',
                    )}
                  >
                    {trip.destination}
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
