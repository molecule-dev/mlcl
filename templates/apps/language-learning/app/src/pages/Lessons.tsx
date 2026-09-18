import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  type LessonRecommendation,
  LessonRecommendationCard,
} from '../components/LessonRecommendationCard.js'

interface BackendLesson {
  id: string
  title: string
  language: string | null
  flag: string | null
  level: string | null
  duration_min: number | string
  lessons_remaining: number | string
  progress_percent: number | string
  icon: string | null
  tone?: string | null
}

const LEVELS = ['All', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

function adaptLesson(row: BackendLesson): LessonRecommendation {
  const allowedLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
  const lvl = (allowedLevels as readonly string[]).includes(String(row.level))
    ? (row.level as LessonRecommendation['level'])
    : 'A1'
  const allowedTones = ['primary', 'secondary', 'tertiary', 'info'] as const
  const tone = (allowedTones as readonly string[]).includes(String(row.tone))
    ? (row.tone as LessonRecommendation['tone'])
    : 'primary'
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    language: String(row.language ?? ''),
    flag: String(row.flag ?? ''),
    level: lvl,
    durationMin: Number(row.duration_min ?? 5),
    lessonsRemaining: Number(row.lessons_remaining ?? 0),
    progressPercent: Number(row.progress_percent ?? 0),
    icon: String(row.icon ?? 'school'),
    tone,
  }
}

export function Lessons() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [activeLevel, setActiveLevel] = useState<(typeof LEVELS)[number]>('All')
  const [lessons, setLessons] = useState<LessonRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get<BackendLesson[] | { data: BackendLesson[] }>('/api/lessons')
      .then((res: unknown) => {
        if (cancelled) return
        const body =
          res && typeof res === 'object' && 'data' in res
            ? (res as { data: BackendLesson[] | { data: BackendLesson[] } }).data
            : (res as BackendLesson[])
        const list = Array.isArray(body)
          ? body
          : Array.isArray((body as { data?: unknown })?.data)
            ? (body as { data: BackendLesson[] }).data
            : []
        setLessons(list.map(adaptLesson))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('lessons.loadError', {}, { defaultValue: 'Could not load lessons.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const filtered = useMemo(
    () => (activeLevel === 'All' ? lessons : lessons.filter((l) => l.level === activeLevel)),
    [activeLevel, lessons],
  )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p className={cm.cn('font-bold uppercase tracking-widest text-xs text-primary')}>
          {t('lessons.eyebrow', {}, { defaultValue: 'Lesson library' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.sp('mt', 1), 'font-extrabold tracking-tight')}>
          {t('lessons.heading', {}, { defaultValue: 'Browse every lesson' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant max-w-xl')}>
          {t(
            'lessons.subheading',
            {},
            {
              defaultValue:
                'Filter by level. Each lesson takes 5 — 10 minutes and is reusable as many times as you like.',
            },
          )}
        </p>
      </header>

      {error && (
        <p
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('xs'),
            cm.textCenter,
            'rounded-xl bg-error-container/40 text-on-error-container',
          )}
        >
          {error}
        </p>
      )}

      {/* Level pills */}
      <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }))}>
        {LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setActiveLevel(level)}
            aria-pressed={activeLevel === level}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.roundedFull,
              'transition-all',
              activeLevel === level
                ? 'bg-gradient-to-r from-primary to-primary-dark text-on-primary shadow-md shadow-primary/30'
                : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container border border-outline-variant/30',
            )}
          >
            {t(`lessons.level.${level}`, {}, { defaultValue: level })}
          </button>
        ))}
      </div>

      {loading && lessons.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('lessons.loading', {}, { defaultValue: 'Loading lessons…' })}
        </p>
      ) : filtered.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t(
            'lessons.empty',
            { level: activeLevel },
            { defaultValue: 'No lessons at level {{level}} yet — try another tier.' },
          )}
        </p>
      ) : (
        <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}>
          {filtered.map((lesson) => (
            <LessonRecommendationCard key={lesson.id} lesson={lesson} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Lessons
