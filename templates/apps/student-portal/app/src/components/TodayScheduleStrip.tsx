import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type ApiScheduleEntry, subjectFor } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

/**
 * Today's class schedule rendered as a vertical strip of period cards.
 * Pulls live data from `/api/schedule/today`.
 */
export interface ScheduleEntry {
  id: string
  period: string
  subject: 'math' | 'science' | 'english' | 'history' | 'art' | 'pe' | 'language' | 'other'
  className: string
  teacher: string
  room: string
  startTime: string
  endTime: string
  status?: 'in-progress' | 'upcoming' | 'completed'
}

export interface TodayScheduleStripProps {
  entries?: readonly ScheduleEntry[]
  title?: string
}

const SUBJECT_BORDER: Record<ScheduleEntry['subject'], string> = {
  math: 'border-blue-500',
  science: 'border-green-600',
  english: 'border-violet-500',
  history: 'border-amber-500',
  art: 'border-pink-500',
  pe: 'border-teal-500',
  language: 'border-orange-500',
  other: 'border-border-secondary',
}

const SUBJECT_TINT: Record<ScheduleEntry['subject'], string> = {
  math: 'text-blue-600',
  science: 'text-success',
  english: 'text-violet-600',
  history: 'text-warning',
  art: 'text-pink-600',
  pe: 'text-teal-600',
  language: 'text-orange-600',
  other: 'text-foreground-secondary',
}

const STATUS_PILL: Record<NonNullable<ScheduleEntry['status']>, string> = {
  'in-progress': 'bg-secondary/15 text-secondary',
  upcoming: 'bg-primary/10 text-primary',
  completed: 'bg-on-surface/10 text-on-surface-variant',
}

function deriveStatus(start: string, end: string): NonNullable<ScheduleEntry['status']> {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const startDate = new Date(`${today}T${start}:00`)
  const endDate = new Date(`${today}T${end}:00`)
  if (now < startDate) return 'upcoming'
  if (now > endDate) return 'completed'
  return 'in-progress'
}

export function TodayScheduleStrip({ entries, title }: TodayScheduleStripProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [fetched, setFetched] = useState<ScheduleEntry[] | null>(null)
  const [loading, setLoading] = useState(entries ? false : true)

  useEffect(() => {
    if (entries) return
    let cancelled = false
    setLoading(true)
    http
      .get('/api/schedule/today')
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<ApiScheduleEntry>(res).map((e) => ({
          id: e.id,
          period: e.period_label ?? `Period ${e.weekday ?? '?'}`,
          subject: subjectFor(e.course_name, e.subject) as ScheduleEntry['subject'],
          className: e.course_name ?? '',
          teacher: e.teacher ?? '',
          room: e.room ?? '',
          startTime: e.start_time ?? '',
          endTime: e.end_time ?? '',
          status: e.start_time && e.end_time ? deriveStatus(e.start_time, e.end_time) : 'upcoming',
        }))
        setFetched(list)
      })
      .catch(() => setFetched([]))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, entries])

  const data: readonly ScheduleEntry[] = entries ?? fetched ?? []

  return (
    <section
      data-mol-id="today-schedule-strip"
      className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-[--color-schedule-card]')}
    >
      <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 5))}>
        <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {title ?? t('todayScheduleStrip.title', {}, { defaultValue: "Today's schedule" })}
        </h2>
        <span
          className={cm.cn(cm.textSize('xs'), 'font-bold uppercase tracking-widest text-primary')}
        >
          {t(
            'todayScheduleStrip.eyebrow',
            { count: data.length },
            { defaultValue: '{{count}} classes' },
          )}
        </span>
      </header>
      {loading ? (
        <p
          className={cm.cn(
            cm.sp('py', 6),
            cm.textCenter,
            cm.textSize('sm'),
            'text-on-surface-variant',
          )}
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : data.length === 0 ? (
        <p
          className={cm.cn(
            cm.sp('py', 6),
            cm.textCenter,
            cm.textSize('sm'),
            'text-on-surface-variant',
          )}
        >
          {t('todayScheduleStrip.empty', {}, { defaultValue: 'No classes today.' })}
        </p>
      ) : (
        <ol className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          {data.map((entry) => (
            <li
              key={entry.id}
              data-mol-id={`today-schedule-${entry.id}`}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl bg-surface shadow-sm border-l-4 hover:shadow-md transition-shadow',
                SUBJECT_BORDER[entry.subject],
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
                <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-[4.5rem]')}>
                  <span
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest',
                      SUBJECT_TINT[entry.subject],
                    )}
                  >
                    {entry.period}
                  </span>
                  <span
                    className={cm.cn(cm.textSize('sm'), 'font-bold tabular-nums text-on-surface')}
                  >
                    {entry.startTime}
                  </span>
                </div>
                <div>
                  <p className={cm.cn(cm.textSize('base'), 'font-semibold text-on-surface')}>
                    {entry.className}
                  </p>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(
                      'todayScheduleStrip.teacherRoom',
                      { teacher: entry.teacher, room: entry.room },
                      { defaultValue: '{{teacher}} · {{room}}' },
                    )}
                  </p>
                </div>
              </div>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                {entry.status && (
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.roundedFull,
                      'text-[10px] font-black uppercase tracking-widest',
                      STATUS_PILL[entry.status],
                    )}
                  >
                    {t(
                      `todayScheduleStrip.status.${entry.status}`,
                      {},
                      {
                        defaultValue:
                          entry.status === 'in-progress'
                            ? 'In class'
                            : entry.status === 'upcoming'
                              ? 'Upcoming'
                              : 'Done',
                      },
                    )}
                  </span>
                )}
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    'font-medium text-on-surface-variant tabular-nums',
                  )}
                >
                  {entry.endTime}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export default TodayScheduleStrip
