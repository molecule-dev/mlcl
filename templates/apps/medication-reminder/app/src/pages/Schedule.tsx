import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { hourOfScheduledTime, weekdayIndexOfDate } from '../lib/scheduleFormat.js'
import { unwrapList } from '../lib/unwrap.js'

interface Dose {
  id: string
  medication_id: string
  medication_name: string
  pill_color: 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'yellow'
  scheduled_at: string
  scheduled_time?: string
  scheduled_date?: string
  status: 'taken' | 'missed' | 'upcoming' | 'skipped'
}

const PILL_COLOR: Record<Dose['pill_color'], string> = {
  blue: 'var(--color-pill-blue)',
  green: 'var(--color-pill-green)',
  orange: 'var(--color-pill-orange)',
  purple: 'var(--color-pill-purple)',
  pink: 'var(--color-pill-pink)',
  yellow: 'var(--color-pill-yellow)',
}

const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22] as const
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export function Schedule() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [doses, setDoses] = useState<Dose[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/doses?filter=week')
      .then((res) => {
        if (!cancelled) setDoses(unwrapList<Dose>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('schedule.loadError', {}, { defaultValue: 'Failed to load schedule.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const grid = useMemo(() => {
    // Group by [day-of-week-index, hour] → doses. We bucket by the wall-clock
    // `scheduled_time` (HH:MM) and `scheduled_date` (YYYY-MM-DD) the user
    // originally scheduled, NOT by `scheduled_at` (UTC ISO). Otherwise an
    // "08:00" reminder lands in the 11:00 row for a UTC+3 viewer because
    // `new Date("...T08:00:00Z").getHours()` returns the local hour.
    const map = new Map<string, Dose[]>()
    for (const d of doses) {
      let dayIdx: number
      let hour: number
      if (d.scheduled_date && d.scheduled_time) {
        dayIdx = weekdayIndexOfDate(d.scheduled_date)
        hour = hourOfScheduledTime(d.scheduled_time)
      } else {
        const dt = new Date(d.scheduled_at)
        dayIdx = (dt.getUTCDay() + 6) % 7
        hour = dt.getUTCHours()
      }
      if (dayIdx < 0 || Number.isNaN(hour)) continue
      const key = `${dayIdx}-${hour}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(d)
    }
    return map
  }, [doses])

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, 'space-y-6')}>
      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('schedule.heading', {}, { defaultValue: 'Weekly schedule' })}
        </h1>
        <p className={cm.cn(cm.textSize('base'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t('schedule.subheading', {}, { defaultValue: 'Every dose, every day, at a glance.' })}
        </p>
      </header>

      <div className={cm.cn(cm.card(), 'overflow-x-auto')}>
        <table className={cm.cn('w-full text-left text-sm')}>
          <thead>
            <tr className={cm.cn('border-b border-outline-variant')}>
              <th
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 3),
                  'text-on-surface-variant',
                  cm.fontWeight('medium'),
                  'w-16',
                )}
              >
                {t('schedule.timeColumn', {}, { defaultValue: 'Time' })}
              </th>
              {WEEKDAYS.map((d) => (
                <th
                  key={d}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 3),
                    'text-on-surface-variant',
                    cm.fontWeight('medium'),
                    cm.textCenter,
                  )}
                >
                  {t(`schedule.day.${d.toLowerCase()}`, {}, { defaultValue: d })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((h) => {
              const hasAnyDose = WEEKDAYS.some((_, dayIdx) => grid.has(`${dayIdx}-${h}`))
              if (!hasAnyDose) return null
              return (
                <tr key={h} className={cm.cn('border-b border-outline-variant')}>
                  <td
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 3),
                      cm.textSize('xs'),
                      'text-on-surface-variant',
                      cm.fontWeight('medium'),
                    )}
                  >
                    {h.toString().padStart(2, '0')}:00
                  </td>
                  {WEEKDAYS.map((_, dayIdx) => {
                    const cellDoses = grid.get(`${dayIdx}-${h}`) ?? []
                    return (
                      <td key={dayIdx} className={cm.cn(cm.sp('px', 2), cm.sp('py', 2))}>
                        <div className={cm.flex({ align: 'center', gap: 'xs', justify: 'center' })}>
                          {cellDoses.map((d) => (
                            <span
                              key={d.id}
                              title={`${d.medication_name} · ${t(
                                `doseRow.status.${d.status}`,
                                {},
                                { defaultValue: d.status },
                              )}`}
                              className={cm.cn(cm.h(4), cm.w(4), 'rounded-full inline-block')}
                              style={{
                                backgroundColor: PILL_COLOR[d.pill_color],
                                opacity:
                                  d.status === 'missed' ? 0.4 : d.status === 'upcoming' ? 0.7 : 1,
                                border:
                                  d.status === 'missed'
                                    ? '1px dashed var(--color-dose-missed)'
                                    : 'none',
                              }}
                            />
                          ))}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.textCenter)}>
        {t(
          'schedule.legend',
          {},
          { defaultValue: 'Filled circles = taken or upcoming · faded outline = missed dose' },
        )}
      </p>
    </div>
  )
}
