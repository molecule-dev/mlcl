import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { ApiAssignment } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

interface CalendarEvent {
  day: number
  type: 'assignment' | 'exam' | 'activity'
  label: string
}

const TYPE_DOT = {
  assignment: 'bg-amber-500',
  exam: 'bg-rose-500',
  activity: 'bg-primary',
} as const

const TYPE_PILL = {
  assignment: 'bg-warning-light text-warning',
  exam: 'bg-rose-100 text-error',
  activity: 'bg-primary/10 text-primary',
} as const

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

function classifyEventType(title: string): CalendarEvent['type'] {
  if (/exam|midterm|final|test/i.test(title)) return 'exam'
  if (/assembly|meet|club|practice|fair/i.test(title)) return 'activity'
  return 'assignment'
}

export function Calendar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [assignments, setAssignments] = useState<ApiAssignment[]>([])
  const today = new Date()
  const todayDay = today.getDate()
  const month = today.getMonth()
  const year = today.getFullYear()
  const monthName = today.toLocaleString(undefined, { month: 'long' })

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/assignments')
      .then((res) => {
        if (cancelled) return
        setAssignments(unwrapList<ApiAssignment>(res))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http])

  const events: CalendarEvent[] = useMemo(() => {
    return assignments
      .filter((a) => a.due_date)
      .map((a) => {
        const d = new Date(a.due_date!)
        return {
          day: d.getMonth() === month && d.getFullYear() === year ? d.getDate() : -1,
          type: classifyEventType(a.title),
          label: a.title,
        }
      })
      .filter((e) => e.day > 0)
  }, [assignments, month, year])

  const grid = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1)
    const startOffset = firstOfMonth.getDay()
    const totalDays = new Date(year, month + 1, 0).getDate()
    const cells: (number | null)[] = []
    for (let i = 0; i < startOffset; i++) cells.push(null)
    for (let d = 1; d <= totalDays; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [month, year])

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xl' }))} data-mol-id="page-calendar">
      <header
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }))}
      >
        <div>
          <p
            className={cm.cn(cm.textSize('sm'), 'font-bold uppercase tracking-widest text-primary')}
          >
            {t('calendar.eyebrow', { year }, { defaultValue: 'School year · {{year}}' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('calendar.title', { month: monthName }, { defaultValue: '{{month}} events' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1')}>
            {t(
              'calendar.subtitle',
              {},
              {
                defaultValue:
                  'Assignment due-dates plotted on a month grid — exams stand out in red.',
              },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          {(['assignment', 'exam', 'activity'] as const).map((type) => (
            <span
              key={type}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.roundedFull,
                'text-[10px] font-black uppercase tracking-widest',
                TYPE_PILL[type],
              )}
            >
              <span className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, TYPE_DOT[type])} />
              {t(`calendar.legend.${type}`, {}, { defaultValue: type })}
            </span>
          ))}
        </div>
      </header>

      <section
        className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface-container-lowest shadow-sm')}
      >
        <div className={cm.cn('grid grid-cols-7 gap-2')}>
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className={cm.cn(
                cm.textCenter,
                cm.sp('py', 2),
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t(`calendar.day.${d.toLowerCase()}`, {}, { defaultValue: d })}
            </div>
          ))}
          {grid.map((day, i) => {
            if (day === null) {
              return (
                <div
                  key={`empty-${i}`}
                  className={cm.cn('rounded-lg bg-surface-container-low/50')}
                  style={{ minHeight: 100 }}
                />
              )
            }
            const dayEvents = events.filter((e) => e.day === day)
            const isToday = day === todayDay
            const isWeekend = i % 7 === 0 || i % 7 === 6
            return (
              <div
                key={day}
                data-mol-id={`calendar-day-${day}`}
                className={cm.cn(
                  cm.sp('p', 2),
                  cm.flex({ direction: 'col', gap: 'xs' }),
                  'rounded-lg border transition-colors',
                  isToday
                    ? 'bg-primary/10 border-2 border-primary'
                    : isWeekend
                      ? 'bg-surface-container-low/40 border-outline-variant/20 text-on-surface-variant'
                      : 'bg-surface border-outline-variant/40',
                )}
                style={{ minHeight: 100 }}
              >
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    'font-bold tabular-nums',
                    isToday ? 'text-primary' : 'text-on-surface',
                  )}
                >
                  {day}
                </span>
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                  {dayEvents.map((e, idx) => (
                    <span
                      key={`${day}-${idx}-${e.label}`}
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        cm.roundedFull,
                        'truncate font-bold',
                        TYPE_PILL[e.type],
                      )}
                    >
                      {e.label}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default Calendar
export { Calendar as CalendarPage }
