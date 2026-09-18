import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { MoodLevel } from '../components/MoodHeroCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface DayCell {
  date: string
  mood?: MoodLevel
  has_entry: boolean
  preview?: string
}

const MOOD_FILL: Record<MoodLevel, string> = {
  radiant: 'var(--color-mood-radiant-dot)',
  good: 'var(--color-mood-good-dot)',
  neutral: 'var(--color-mood-neutral-dot)',
  low: 'var(--color-mood-low-dot)',
  struggling: 'var(--color-mood-struggling-dot)',
}

const MOOD_LABEL: Record<MoodLevel, string> = {
  radiant: 'Radiant',
  good: 'Good',
  neutral: 'Neutral',
  low: 'Low',
  struggling: 'Struggling',
}

const MOODS_ORDER: MoodLevel[] = ['radiant', 'good', 'neutral', 'low', 'struggling']

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
const WEEKDAY_LABELS: Record<(typeof WEEKDAY_KEYS)[number], string> = {
  sun: 'Sun',
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
}

export function Calendar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [cells, setCells] = useState<DayCell[]>([])
  const [hovered, setHovered] = useState<DayCell | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get(`/api/journal/calendar/${cursor.year}/${cursor.month + 1}`)
      .then((res) => {
        if (cancelled) return
        setCells(unwrapList<DayCell>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('calendar.loadError', {}, { defaultValue: 'Could not load calendar.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, cursor, t])

  const openDay = (cell: DayCell) => {
    if (!cell.has_entry) return
    const ymd = cell.date.slice(0, 10)
    navigate(`/journal?date=${ymd}`)
  }

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  const grid = useMemo(() => {
    const firstDay = new Date(cursor.year, cursor.month, 1).getDay()
    const blanks: (DayCell | null)[] = Array.from({ length: firstDay }, () => null)
    return [...blanks, ...cells]
  }, [cells, cursor])

  const moodCounts = useMemo(() => {
    const counts: Record<MoodLevel, number> = {
      radiant: 0,
      good: 0,
      neutral: 0,
      low: 0,
      struggling: 0,
    }
    cells.forEach((c) => {
      if (c.mood) counts[c.mood]++
    })
    return counts
  }, [cells])

  const totalDays = cells.length
  const tracked = cells.filter((c) => c.has_entry).length

  const goPrev = () =>
    setCursor(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 },
    )
  const goNext = () =>
    setCursor(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 },
    )

  return (
    <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('calendar.eyebrow', {}, { defaultValue: 'Mood at a glance' })}
          </p>
          <h1
            className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight', cm.sp('mt', 2))}
          >
            {t('calendar.heading', {}, { defaultValue: 'Calendar' })}
          </h1>
          <p className={cm.cn(cm.textSize('base'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {t(
              'calendar.subheading',
              { tracked, total: totalDays },
              { defaultValue: 'Tracked {{tracked}} of {{total}} days this month.' },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <button
            type="button"
            onClick={goPrev}
            className={cm.cn(
              'rounded-full bg-surface-container hover:bg-surface-container-high p-2 transition-colors',
            )}
            aria-label={t('calendar.prev', {}, { defaultValue: 'Previous month' })}
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <span
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('extrabold'),
              'tracking-tight w-44 text-center',
            )}
          >
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={goNext}
            className={cm.cn(
              'rounded-full bg-surface-container hover:bg-surface-container-high p-2 transition-colors',
            )}
            aria-label={t('calendar.next', {}, { defaultValue: 'Next month' })}
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-error')} role="alert">
          {error}
        </p>
      ) : null}

      <div
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-2xl shadow-sm space-y-4',
        )}
        aria-busy={loading || undefined}
      >
        <div className={cm.cn('grid grid-cols-7 gap-2')}>
          {WEEKDAY_KEYS.map((k) => (
            <div
              key={k}
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant text-center',
              )}
            >
              {t(`calendar.weekday.${k}`, {}, { defaultValue: WEEKDAY_LABELS[k] })}
            </div>
          ))}
          {grid.map((cell, i) => {
            if (!cell) return <div key={`blank-${i}`} />
            const day = new Date(cell.date).getDate()
            const fill = cell.mood ? MOOD_FILL[cell.mood] : 'var(--color-surface-container)'
            const isToday = (() => {
              const d = new Date(cell.date)
              const now = new Date()
              return (
                d.getDate() === now.getDate() &&
                d.getMonth() === now.getMonth() &&
                d.getFullYear() === now.getFullYear()
              )
            })()
            return (
              <button
                key={cell.date}
                type="button"
                onClick={() => openDay(cell)}
                onMouseEnter={() => setHovered(cell)}
                onFocus={() => setHovered(cell)}
                onMouseLeave={() => setHovered(null)}
                onBlur={() => setHovered(null)}
                disabled={!cell.has_entry}
                className={cm.cn(
                  'aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all hover:scale-105 disabled:cursor-default disabled:hover:scale-100',
                  cell.mood ? 'text-white shadow-sm' : 'text-on-surface-variant',
                  isToday ? 'ring-2 ring-primary' : '',
                )}
                style={{ backgroundColor: fill }}
                data-has-entry={cell.has_entry || undefined}
                aria-label={
                  cell.mood
                    ? t(
                        'calendar.cellMood',
                        { day, mood: MOOD_LABEL[cell.mood] },
                        { defaultValue: 'Day {{day}} — {{mood}}' },
                      )
                    : t('calendar.cellEmpty', { day }, { defaultValue: 'Day {{day}} — no entry' })
                }
              >
                {day}
              </button>
            )
          })}
        </div>
        {hovered ? (
          <div className={cm.cn(cm.sp('p', 4), 'bg-surface-container rounded-xl text-sm')}>
            <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
              {new Date(hovered.date).toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
              {hovered.mood ? (
                <>
                  {' '}
                  —{' '}
                  <span style={{ color: MOOD_FILL[hovered.mood] }}>
                    {t(
                      `calendar.mood.${hovered.mood}`,
                      {},
                      { defaultValue: MOOD_LABEL[hovered.mood] },
                    )}
                  </span>
                </>
              ) : null}
            </p>
            {hovered.preview ? (
              <p className={cm.cn(cm.sp('mt', 1), 'text-on-surface-variant italic')}>
                {hovered.preview}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-2xl shadow-sm space-y-4',
        )}
      >
        <h3
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('calendar.distributionHeading', {}, { defaultValue: 'This month at a glance' })}
        </h3>
        <div className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-2 md:grid-cols-5')}>
          {MOODS_ORDER.map((m) => (
            <div
              key={m}
              className={cm.cn(cm.sp('p', 4), 'rounded-2xl bg-surface-container text-center')}
            >
              <div
                className={cm.cn('w-8 h-8 mx-auto rounded-full')}
                style={{ backgroundColor: MOOD_FILL[m] }}
                aria-hidden="true"
              />
              <p
                className={cm.cn(
                  cm.fontWeight('extrabold'),
                  'text-2xl tracking-tight',
                  cm.sp('mt', 2),
                )}
              >
                {moodCounts[m]}
              </p>
              <p
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t(`calendar.mood.${m}`, {}, { defaultValue: MOOD_LABEL[m] })}
              </p>
            </div>
          ))}
        </div>
      </section>

      {loading ? (
        <p className={cm.cn(cm.textCenter, cm.textSize('xs'), 'text-on-surface-variant')}>
          {t('calendar.loading', {}, { defaultValue: 'Refreshing month…' })}
        </p>
      ) : null}
    </div>
  )
}
