import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { GpaHeroCard } from '../components/GpaHeroCard.js'
import { GradeBadge, type GradeLetter } from '../components/GradeBadge.js'
import {
  type ApiGrade,
  type ApiScheduleEntry,
  letterFor,
  subjectFor,
  weightedAverage,
} from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

interface CourseGrade {
  id: string
  course: string
  teacher: string
  letter: GradeLetter
  percentage: number
  trend: 'up' | 'flat' | 'down'
  delta?: string
  category: string
}

const TREND_ICON = { up: 'trending_up', flat: 'trending_flat', down: 'trending_down' } as const
const TREND_TONE = {
  up: 'text-success',
  flat: 'text-on-surface-variant',
  down: 'text-error',
} as const

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function Grades() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [grades, setGrades] = useState<ApiGrade[]>([])
  const [schedule, setSchedule] = useState<ApiScheduleEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    Promise.all([
      http.get('/api/grades').then((r) => unwrapList<ApiGrade>(r)),
      http.get('/api/schedule').then((r) => unwrapList<ApiScheduleEntry>(r)),
    ])
      .then(([gs, sc]) => {
        if (cancelled) return
        setGrades(gs)
        setSchedule(sc)
      })
      .catch(() => {
        // Surface the failure — never a silent blank.
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  useEffect(load, [load])

  const courses: CourseGrade[] = useMemo(() => {
    const groups = new Map<string, ApiGrade[]>()
    for (const g of grades) {
      const courseName = g.course_name ?? ''
      if (!courseName) continue
      const arr = groups.get(courseName) ?? []
      arr.push(g)
      groups.set(courseName, arr)
    }
    const result: CourseGrade[] = []
    for (const [courseName, list] of groups) {
      const sorted = [...list].sort(
        (a, b) => new Date(b.graded_at).getTime() - new Date(a.graded_at).getTime(),
      )
      const avg = weightedAverage(sorted)

      const recent = sorted.slice(0, Math.max(1, Math.floor(sorted.length / 2)))
      const older = sorted.slice(Math.max(1, Math.floor(sorted.length / 2)))
      const recentAvg =
        recent.length > 0
          ? recent.reduce((acc, g) => acc + Number(g.score ?? 0), 0) / recent.length
          : avg
      const olderAvg =
        older.length > 0
          ? older.reduce((acc, g) => acc + Number(g.score ?? 0), 0) / older.length
          : avg
      const diff = recentAvg - olderAvg
      let trend: 'up' | 'flat' | 'down' = 'flat'
      let delta: string | undefined
      if (diff > 0.5) {
        trend = 'up'
        delta = `+${diff.toFixed(1)}`
      } else if (diff < -0.5) {
        trend = 'down'
        delta = `${diff.toFixed(1)}`
      }

      const teacher = schedule.find((s) => s.course_name === courseName)?.teacher ?? ''
      const subject = subjectFor(courseName, sorted[0]?.subject)

      result.push({
        id: slugify(courseName),
        course: courseName,
        teacher,
        letter: letterFor(avg) as GradeLetter,
        percentage: Math.round(avg),
        trend,
        delta,
        category: subject.charAt(0).toUpperCase() + subject.slice(1),
      })
    }
    return result.sort((a, b) => a.course.localeCompare(b.course))
  }, [grades, schedule])

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xl' }))} data-mol-id="page-grades">
      <header
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }))}
      >
        <div>
          <p
            className={cm.cn(cm.textSize('sm'), 'font-bold uppercase tracking-widest text-primary')}
          >
            {t('grades.eyebrow', {}, { defaultValue: 'Grade book' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('grades.title', {}, { defaultValue: 'Your grades, course by course' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1')}>
            {t(
              'grades.subtitle',
              {},
              {
                defaultValue:
                  'Live letter and percentage grades. Trend arrows show whether you’re moving up, level, or slipping.',
              },
            )}
          </p>
        </div>
        <Link
          to="/grades/report-card"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'inline-flex items-center gap-2 rounded-full bg-primary text-on-primary font-semibold hover:bg-primary/90 transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            description
          </span>
          {t('grades.viewReportCard', {}, { defaultValue: 'View formal report card' })}
        </Link>
      </header>

      <GpaHeroCard />

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest shadow-sm overflow-x-auto',
        )}
      >
        {loading ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('grades.loading', {}, { defaultValue: 'Loading grades…' })}
          </p>
        ) : error ? (
          <div
            role="alert"
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
              cm.sp('py', 10),
              'text-on-surface-variant',
            )}
          >
            <p className={cm.textSize('sm')}>
              {t('grades.loadError', {}, { defaultValue: 'Couldn’t load your grades.' })}
            </p>
            <button
              type="button"
              data-mol-id="grades-retry"
              onClick={load}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.roundedFull,
                'bg-primary text-on-primary font-semibold hover:bg-primary/90 transition-colors',
              )}
            >
              {t('common.retry', {}, { defaultValue: 'Try again' })}
            </button>
          </div>
        ) : courses.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('grades.empty', {}, { defaultValue: 'No grades posted yet.' })}
          </p>
        ) : (
          <table className={cm.cn('w-full text-left')}>
            <thead>
              <tr
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                <th className={cm.sp('py', 3)}>
                  {t('nav.course', {}, { defaultValue: 'Course' })}
                </th>
                <th className={cm.sp('py', 3)}>
                  {t('grades.col.teacher', {}, { defaultValue: 'Teacher' })}
                </th>
                <th className={cm.sp('py', 3)}>
                  {t('grades.col.grade', {}, { defaultValue: 'Grade' })}
                </th>
                <th className={cm.cn(cm.sp('py', 3), cm.textRight)}>
                  {t('grades.col.trend', {}, { defaultValue: 'Trend' })}
                </th>
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-outline-variant/40')}>
              {courses.map((c) => (
                <tr
                  key={c.id}
                  className={cm.cn('hover:bg-surface-container-low transition-colors')}
                >
                  <td className={cm.sp('py', 4)}>
                    <Link
                      to={`/courses/${c.id}`}
                      className={cm.cn(cm.flex({ direction: 'col' }), 'hover:text-primary')}
                    >
                      <span className={cm.cn('font-semibold text-on-surface')}>{c.course}</span>
                      <span
                        className={cm.cn(
                          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {c.category}
                      </span>
                    </Link>
                  </td>
                  <td
                    className={cm.cn(cm.sp('py', 4), cm.textSize('sm'), 'text-on-surface-variant')}
                  >
                    {c.teacher || '—'}
                  </td>
                  <td className={cm.sp('py', 4)}>
                    <GradeBadge letter={c.letter} percentage={c.percentage} />
                  </td>
                  <td className={cm.cn(cm.sp('py', 4), cm.textRight)}>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'end', gap: 'xs' }),
                        cm.textSize('sm'),
                        'font-bold',
                        TREND_TONE[c.trend],
                      )}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-base')}
                        aria-hidden="true"
                      >
                        {TREND_ICON[c.trend]}
                      </span>
                      {c.delta ?? t('grades.trendStable', {}, { defaultValue: 'Stable' })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

export default Grades
export { Grades as GradesPage }
