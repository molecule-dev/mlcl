import { useEffect, useMemo, useRef, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type ApiScheduleEntry, subjectFor } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

const SUBJECT_BG: Record<string, string> = {
  math: 'bg-blue-500/10 border-l-4 border-blue-500',
  science: 'bg-green-600/10 border-l-4 border-green-600',
  english: 'bg-violet-500/10 border-l-4 border-violet-500',
  history: 'bg-amber-500/10 border-l-4 border-amber-500',
  art: 'bg-pink-500/10 border-l-4 border-pink-500',
  pe: 'bg-teal-500/10 border-l-4 border-teal-500',
  language: 'bg-orange-500/10 border-l-4 border-orange-500',
  other: 'bg-gray-500/10 border-l-4 border-border-secondary',
}

const SUBJECT_LABEL: Record<string, string> = {
  math: 'text-blue-700',
  science: 'text-success',
  english: 'text-violet-700',
  history: 'text-warning',
  art: 'text-pink-700',
  pe: 'text-teal-700',
  language: 'text-orange-700',
  other: 'text-foreground',
}

interface Period {
  id: string
  label: string
  start: string
  end: string
}

interface Block {
  period: string
  day: number
  subject: string
  className: string
  teacher: string
  room: string
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const

function timeToMinutes(s: string): number {
  const [h, m] = s.split(':').map((p) => Number.parseInt(p, 10))
  return h * 60 + m
}

export function Schedule() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [entries, setEntries] = useState<ApiScheduleEntry[]>([])
  const [loading, setLoading] = useState(true)
  const initialDay = (() => {
    const d = new Date().getUTCDay()
    if (d === 0 || d === 6) return 0
    return Math.max(0, Math.min(4, d - 1))
  })()
  const [activeDay, setActiveDay] = useState(initialDay)
  // The week grid is wider than a phone; when it overflows, keep the
  // selected day's column scrolled into view instead of always showing Mon.
  const gridScrollRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = gridScrollRef.current
    if (!el || el.scrollWidth <= el.clientWidth) return
    const colWidth = 180 + 12
    const left = Math.max(0, 120 + activeDay * colWidth - 12)
    el.scrollTo({ left, behavior: 'smooth' })
  }, [activeDay, loading])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/schedule')
      .then((r) => unwrapList<ApiScheduleEntry>(r))
      .then((data) => {
        if (cancelled) return
        setEntries(data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const periods: Period[] = useMemo(() => {
    const seen = new Map<string, Period>()
    for (const e of entries) {
      const key = e.period_label ?? `${e.start_time ?? ''}-${e.end_time ?? ''}`
      if (!key || seen.has(key)) continue
      seen.set(key, {
        id: key,
        label: e.period_label ?? key,
        start: e.start_time ?? '',
        end: e.end_time ?? '',
      })
    }
    return [...seen.values()].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start))
  }, [entries])

  const grid = useMemo(() => {
    const map = new Map<string, Block>()
    for (const e of entries) {
      const day = (e.weekday ?? e.day ?? 1) - 1
      if (day < 0 || day > 4) continue
      const periodId = e.period_label ?? `${e.start_time ?? ''}-${e.end_time ?? ''}`
      map.set(`${periodId}:${day}`, {
        period: periodId,
        day,
        subject: subjectFor(e.course_name, e.subject),
        className: e.course_name ?? '',
        teacher: e.teacher ?? '',
        room: e.room ?? '',
      })
    }
    return map
  }, [entries])

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xl' }))} data-mol-id="page-schedule">
      <header
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }))}
      >
        <div>
          <p
            className={cm.cn(cm.textSize('sm'), 'font-bold uppercase tracking-widest text-primary')}
          >
            {t('schedule.eyebrow', {}, { defaultValue: 'Spring term' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('schedule.title', {}, { defaultValue: 'Weekly schedule' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1')}>
            {t(
              'schedule.subtitle',
              {},
              {
                defaultValue:
                  'Subject-coloured blocks. Tap any class to jump to the course detail.',
              },
            )}
          </p>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('p', 1),
            'rounded-full bg-surface-container-low',
          )}
        >
          {DAYS.map((d, i) => (
            <button
              key={d}
              type="button"
              onClick={() => setActiveDay(i)}
              data-mol-id={`schedule-day-${d.toLowerCase()}`}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('xs'),
                'rounded-full font-bold uppercase tracking-widest transition-colors',
                activeDay === i
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {t(`schedule.day.${d.toLowerCase()}`, {}, { defaultValue: d })}
            </button>
          ))}
        </div>
      </header>

      <section
        ref={gridScrollRef}
        className={cm.cn(cm.sp('p', 5), 'rounded-2xl overflow-x-auto bg-[--color-schedule-card]')}
      >
        {loading ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('schedule.loading', {}, { defaultValue: 'Loading schedule…' })}
          </p>
        ) : periods.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('schedule.empty', {}, { defaultValue: 'No classes scheduled.' })}
          </p>
        ) : (
          <div
            className={cm.cn('grid')}
            style={{ gridTemplateColumns: '120px repeat(5, minmax(180px, 1fr))', gap: '12px' }}
          >
            <div />
            {DAYS.map((d, i) => (
              <div
                key={d}
                className={cm.cn(
                  cm.textCenter,
                  cm.sp('py', 2),
                  'text-[10px] font-black uppercase tracking-widest',
                  activeDay === i ? 'text-primary' : 'text-on-surface-variant',
                )}
              >
                {t(`schedule.day.${d.toLowerCase()}`, {}, { defaultValue: d })}
              </div>
            ))}

            {periods.map((p) => (
              <PeriodRow key={p.id} period={p} cm={cm} activeDay={activeDay} grid={grid} t={t} />
            ))}
          </div>
        )}
      </section>

      <section className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
          {t('schedule.legendTitle', {}, { defaultValue: 'Subject legend' })}
        </h2>
        <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }))}>
          {Object.entries(SUBJECT_LABEL).map(([key, tone]) => (
            <span
              key={key}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                'rounded-full bg-surface-container-low font-bold uppercase tracking-widest',
                tone,
              )}
            >
              <span
                className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, SUBJECT_BG[key].split(' ')[1])}
              />
              {t(`schedule.legend.${key}`, {}, { defaultValue: key })}
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}

function PeriodRow({
  period,
  cm,
  activeDay,
  grid,
  t,
}: {
  period: Period
  cm: ReturnType<typeof getClassMap>
  activeDay: number
  grid: Map<string, Block>
  t: ReturnType<typeof useTranslation>['t']
}) {
  return (
    <>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.sp('px', 3),
          cm.sp('py', 4),
          'rounded-xl bg-surface text-on-surface',
        )}
      >
        <span className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
          {period.label}
        </span>
        <span className={cm.cn(cm.textSize('xs'), 'font-bold tabular-nums text-on-surface mt-1')}>
          {period.start}
        </span>
        <span className={cm.cn(cm.textSize('xs'), 'tabular-nums text-on-surface-variant')}>
          {period.end}
        </span>
      </div>

      {DAYS.map((_d, i) => {
        const block = grid.get(`${period.id}:${i}`)
        if (!block) {
          return (
            <div
              key={`${period.id}:${i}`}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.textSize('xs'),
                'rounded-xl bg-surface/60 text-on-surface-variant border border-dashed border-outline-variant/40',
              )}
            >
              {t('schedule.empty', {}, { defaultValue: 'Free' })}
            </div>
          )
        }
        return (
          <div
            key={`${period.id}:${i}`}
            className={cm.cn(
              cm.sp('p', 3),
              'rounded-xl shadow-sm transition-shadow hover:shadow-md',
              SUBJECT_BG[block.subject] ?? '',
              activeDay === i ? 'ring-2 ring-primary/30' : '',
            )}
          >
            <p className={cm.cn(cm.textSize('sm'), 'font-bold text-on-surface')}>
              {block.className}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {block.teacher} · {block.room}
            </p>
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest mt-2',
                SUBJECT_LABEL[block.subject] ?? '',
              )}
            >
              {block.subject}
            </p>
          </div>
        )
      })}
    </>
  )
}

export default Schedule
export { Schedule as SchedulePage }
