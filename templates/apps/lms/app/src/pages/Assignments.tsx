import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AssignmentCard, { type AssignmentCardData } from '../components/AssignmentCard.js'
import AssignmentFilterBar from '../components/AssignmentFilterBar.js'
import AssignmentsPageHeader from '../components/AssignmentsPageHeader.js'
import AssignmentsSideNavBar from '../components/AssignmentsSideNavBar.js'
import AssignmentsTopNavBar from '../components/AssignmentsTopNavBar.js'

type FilterType = 'all' | 'upcoming' | 'overdue' | 'submitted' | 'graded'

interface AssignmentRow {
  id: string
  course_id: string
  title: string
  description?: string | null
  due_date?: string | null
  type?: string | null
}

interface CourseRow {
  id: string
  name: string
}

interface GradeRow {
  id: string
  assignment_id: string
  student_id: string
  score: number
  max_score: number
}

function classifyStatus(
  assignment: AssignmentRow,
  grade?: GradeRow,
): NonNullable<AssignmentCardData['status']> {
  if (grade) return 'graded'
  if (assignment.due_date) {
    const due = new Date(assignment.due_date).getTime()
    if (!Number.isNaN(due) && due < Date.now()) return 'overdue'
  }
  return 'upcoming'
}

function Assignments() {
  const cm = getClassMap()
  const http = useHttpClient()
  const { t } = useTranslation()
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [courses, setCourses] = useState<CourseRow[]>([])
  const [grades, setGrades] = useState<GradeRow[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const [aRes, cRes, gRes] = await Promise.all([
          http.get<AssignmentRow[]>('/api/assignments').catch(() => null),
          http.get<CourseRow[]>('/api/courses').catch(() => null),
          http.get<GradeRow[]>('/api/grades').catch(() => null),
        ])
        if (cancelled) return
        const unwrap = <T,>(x: unknown): T[] =>
          Array.isArray(x)
            ? (x as T[])
            : Array.isArray((x as { data?: unknown })?.data)
              ? (x as { data: T[] }).data
              : []
        setAssignments(unwrap<AssignmentRow>(aRes))
        setCourses(unwrap<CourseRow>(cRes))
        setGrades(unwrap<GradeRow>(gRes))
      } catch (err) {
        if (!cancelled)
          setError(
            (err as Error)?.message ||
              t('assignments.loadError', {}, { defaultValue: 'Failed to load assignments' }),
          )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, t])

  const courseById = useMemo(() => {
    const m = new Map<string, CourseRow>()
    for (const c of courses) m.set(c.id, c)
    return m
  }, [courses])

  const gradeByAssignment = useMemo(() => {
    const m = new Map<string, GradeRow>()
    for (const g of grades) m.set(g.assignment_id, g)
    return m
  }, [grades])

  const cards: AssignmentCardData[] = useMemo(() => {
    return assignments.map((a) => {
      const grade = gradeByAssignment.get(a.id)
      const status = classifyStatus(a, grade)
      const course = courseById.get(a.course_id)
      return {
        id: a.id,
        course_id: a.course_id,
        title: a.title,
        description: a.description ?? null,
        due_date: a.due_date ?? null,
        type: a.type ?? null,
        courseName: course?.name ?? null,
        status,
        score: grade?.score ?? null,
        maxScore: grade?.max_score ?? null,
      }
    })
  }, [assignments, courseById, gradeByAssignment])

  const query = search.trim().toLowerCase()
  const filtered = cards
    .filter((c) => filter === 'all' || c.status === filter)
    .filter(
      (c) =>
        !query ||
        c.title.toLowerCase().includes(query) ||
        (c.courseName ?? '').toLowerCase().includes(query),
    )

  if (loading) {
    return (
      <div
        className={cm.cn(cm.flex(), cm.minH('screen'), 'bg-background text-on-surface antialiased')}
      >
        <AssignmentsSideNavBar />
        <main className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0')}>
          <AssignmentsTopNavBar search={search} onSearchChange={setSearch} />
          <section
            className={cm.cn(
              cm.sp('p', 8),
              cm.maxW('7xl'),
              cm.w('full'),
              cm.mxAuto,
              cm.flex({ align: 'center', justify: 'center' }),
            )}
            style={{ minHeight: 400 }}
          >
            <div className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 4 }))}>
              <div
                className={cm.cn(
                  cm.w(10),
                  cm.h(10),
                  cm.roundedFull,
                  'border-4 border-primary border-t-transparent animate-spin',
                )}
              />
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('assignments.loading', {}, { defaultValue: 'Loading assignments...' })}
              </p>
            </div>
          </section>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={cm.cn(cm.flex(), cm.minH('screen'), 'bg-background text-on-surface antialiased')}
      >
        <AssignmentsSideNavBar />
        <main className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0')}>
          <AssignmentsTopNavBar search={search} onSearchChange={setSearch} />
          <section
            className={cm.cn(
              cm.sp('p', 8),
              cm.maxW('7xl'),
              cm.w('full'),
              cm.mxAuto,
              cm.flex({ align: 'center', justify: 'center' }),
            )}
            style={{ minHeight: 400 }}
          >
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center', gap: 4 }),
                cm.textCenter,
              )}
            >
              <span className={cm.cn(cm.textSize('4xl'), 'material-symbols-outlined text-error')}>
                error
              </span>
              <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                {t('assignments.loadError', {}, { defaultValue: 'Failed to load assignments' })}
              </p>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{error}</p>
              <button
                onClick={() => window.location.reload()}
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.fontWeight('semibold'),
                  'py-2.5 bg-primary text-on-primary rounded-xl active:scale-95 transition-all',
                )}
              >
                {t('common.retry', {}, { defaultValue: 'Retry' })}
              </button>
            </div>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div
      className={cm.cn(cm.flex(), cm.minH('screen'), 'bg-background text-on-surface antialiased')}
    >
      <AssignmentsSideNavBar />
      <main className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0')}>
        <AssignmentsTopNavBar search={search} onSearchChange={setSearch} />
        <section
          className={cm.cn(cm.sp('p', 8), cm.maxW('7xl'), cm.w('full'), cm.mxAuto, cm.stack(10))}
        >
          <div className={cm.stack(8)}>
            <AssignmentsPageHeader />
            <AssignmentFilterBar activeFilter={filter} onFilterChange={setFilter} />
          </div>
          {filtered.length === 0 ? (
            <div
              className={cm.cn(
                cm.sp('p', 8),
                cm.flex({ direction: 'col', align: 'center', gap: 3 }),
                'rounded-2xl border border-outline-variant/20 bg-surface-container-lowest text-center',
              )}
              data-mol-id="assignments-empty"
            >
              <span
                className={cm.cn('material-symbols-outlined text-outline text-[48px]')}
                data-icon="assignment"
              >
                assignment
              </span>
              <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                {filter === 'all' && !query
                  ? t('assignments.empty', {}, { defaultValue: 'No assignments yet' })
                  : t(
                      'assignments.emptyFiltered',
                      {},
                      { defaultValue: 'No assignments match this filter' },
                    )}
              </p>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-md')}>
                {t(
                  'assignments.emptyHint',
                  {},
                  {
                    defaultValue:
                      'Once you enroll in a course or your instructor publishes assignments, they will appear here.',
                  },
                )}
              </p>
            </div>
          ) : (
            <div
              className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}
              data-mol-id="assignments-grid"
            >
              {filtered.map((a) => (
                <AssignmentCard key={a.id} assignment={a} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default Assignments
export { Assignments, Assignments as AssignmentsPage }
