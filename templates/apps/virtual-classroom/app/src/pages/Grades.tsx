import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StatPill } from '../components/StatPill.js'
import type { CourseRow, GradeRow } from '../lib/api.js'

const GRADE_TONE: Record<string, string> = {
  A: 'bg-success/15 text-success',
  'A−': 'bg-success/15 text-success',
  'A-': 'bg-success/15 text-success',
  'B+': 'bg-primary-container text-on-primary-container',
  B: 'bg-primary-container text-on-primary-container',
  'B-': 'bg-secondary/15 text-secondary-dark',
  C: 'bg-secondary/15 text-secondary-dark',
  D: 'bg-error/15 text-error',
  F: 'bg-error/15 text-error',
}

function letterFromPct(pct: number, fallback: string | null): string {
  if (fallback) return fallback
  if (pct >= 93) return 'A'
  if (pct >= 90) return 'A-'
  if (pct >= 87) return 'B+'
  if (pct >= 83) return 'B'
  if (pct >= 80) return 'B-'
  if (pct >= 77) return 'C+'
  if (pct >= 70) return 'C'
  if (pct >= 60) return 'D'
  return 'F'
}

export function Grades() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [grades, setGrades] = useState<GradeRow[]>([])
  const [courseById, setCourseById] = useState<Map<string, CourseRow>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([http.get<GradeRow[]>('/api/grades'), http.get<CourseRow[]>('/api/courses')])
      .then(([gs, cs]) => {
        if (cancelled) return
        setGrades(gs.data)
        const map = new Map<string, CourseRow>()
        for (const c of cs.data) map.set(c.id, c)
        setCourseById(map)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load grades')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  // Group grades by course → running average + max grade.
  const courseSummaries = useMemo(() => {
    const byCourse = new Map<
      string,
      { course: CourseRow | undefined; rows: GradeRow[]; pct: number; letter: string }
    >()
    for (const g of grades) {
      const key = g.course_id
      const entry = byCourse.get(key) ?? {
        course: courseById.get(key),
        rows: [],
        pct: 0,
        letter: '',
      }
      entry.rows.push(g)
      byCourse.set(key, entry)
    }
    for (const entry of byCourse.values()) {
      const sumScore = entry.rows.reduce((s, r) => s + Number(r.score), 0)
      const sumMax = entry.rows.reduce((s, r) => s + Number(r.max_score), 0)
      entry.pct = sumMax > 0 ? Math.round((sumScore / sumMax) * 100) : 0
      const letterRow = entry.rows.find((r) => r.letter_grade)
      entry.letter = letterFromPct(entry.pct, letterRow?.letter_grade ?? null)
    }
    return Array.from(byCourse.values())
  }, [grades, courseById])

  // Term GPA: simple unweighted A=4.0 average across course summaries.
  const gpa = useMemo(() => {
    if (courseSummaries.length === 0) return null
    const points: number[] = courseSummaries.map((c) => {
      const p = c.pct
      if (p >= 93) return 4.0
      if (p >= 90) return 3.7
      if (p >= 87) return 3.3
      if (p >= 83) return 3.0
      if (p >= 80) return 2.7
      if (p >= 77) return 2.3
      if (p >= 70) return 2.0
      if (p >= 60) return 1.0
      return 0
    })
    return (points.reduce<number>((s, p) => s + p, 0) / points.length).toFixed(2)
  }, [courseSummaries])

  const watch = courseSummaries.filter((c) => c.pct < 70).length

  return (
    <div className={cm.stack(8)} data-testid="grades-root">
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-4')}
      >
        <div className={cm.stack(1)}>
          <span className={cm.cn('text-[11px] font-black uppercase tracking-widest text-success')}>
            {t('grades.eyebrow', {}, { defaultValue: 'Gradebook' })}
          </span>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t('grades.title', {}, { defaultValue: 'Grades & feedback' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xl')}>
            {t(
              'grades.body',
              {},
              {
                defaultValue:
                  'A calm view of every course — running grade, recent feedback, and where to focus next week.',
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
          icon="grade"
          tone="success"
          label={t('grades.statGpaLabel', {}, { defaultValue: 'Term GPA' })}
          value={gpa ?? '—'}
        />
        <StatPill
          icon="trending_up"
          tone="primary"
          label={t('grades.statTrendLabel', {}, { defaultValue: 'Courses with grades' })}
          value={String(courseSummaries.length)}
          unit={t('grades.statTrendUnit', {}, { defaultValue: 'courses' })}
        />
        <StatPill
          icon="warning"
          tone="error"
          label={t('grades.statWatchLabel', {}, { defaultValue: 'Needs attention' })}
          value={String(watch)}
        />
      </section>

      {loading ? (
        <div className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('grades.loading', {}, { defaultValue: 'Loading grades…' })}
        </div>
      ) : courseSummaries.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('p', 8),
            cm.textCenter,
            'rounded-2xl bg-surface-container-lowest text-on-surface-variant',
          )}
        >
          {t(
            'grades.empty',
            {},
            {
              defaultValue:
                'No grades yet — submitted assignments graded by your instructors will land here.',
            },
          )}
        </div>
      ) : (
        <div
          className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'lg:grid-cols-2')}
          data-testid="grades-list"
        >
          {courseSummaries.map(({ course, rows, pct, letter }) => {
            const latest = rows[0]
            return (
              <article
                key={course?.id ?? rows[0].id}
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.stack(4),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/10 hover:shadow-md transition-shadow',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
                    <span
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest rounded-full bg-primary-container text-on-primary-container',
                      )}
                    >
                      {course?.code ?? '—'}
                    </span>
                    <h2
                      className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}
                    >
                      {course?.title ?? t('nav.course', {}, { defaultValue: 'Course' })}
                    </h2>
                  </div>
                  <span
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.fontWeight('bold'),
                      cm.textSize('lg'),
                      'rounded-2xl tracking-tight',
                      GRADE_TONE[letter] ?? 'bg-primary-container text-on-primary-container',
                    )}
                  >
                    {letter}
                  </span>
                </div>
                <div className={cm.stack(2)}>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.textSize('xs'),
                    )}
                  >
                    <span className={cm.fontWeight('semibold')}>
                      {t(
                        'grades.percent',
                        { value: pct },
                        { defaultValue: '{{value}}% running average' },
                      )}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        'grades.assignmentsCount',
                        { n: rows.length },
                        { defaultValue: '{{n}} grades' },
                      )}
                    </span>
                  </div>
                  <div
                    className={cm.cn(
                      cm.w('full'),
                      'h-2 rounded-full bg-surface-container-high overflow-hidden',
                    )}
                  >
                    <div
                      className={cm.cn(
                        cm.h('full'),
                        'bg-gradient-to-r from-primary via-tertiary to-secondary',
                      )}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
                {latest?.feedback ? (
                  <blockquote
                    className={cm.cn(
                      cm.sp('p', 4),
                      cm.textSize('sm'),
                      'rounded-xl bg-surface-container-low text-on-surface italic leading-relaxed border-l-4 border-primary',
                    )}
                  >
                    {latest.feedback}
                  </blockquote>
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Grades
