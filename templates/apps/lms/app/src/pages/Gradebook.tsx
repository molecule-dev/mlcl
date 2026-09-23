// Phase 1 baseline — verbatim JSX of design-lms-gradebook.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import GradebookPageHeader from '../components/GradebookPageHeader.js'
import GradebookTopNavBar from '../components/GradebookTopNavBar.js'
import GradeBreakdownTable from '../components/GradeBreakdownTable.js'
import GradeSummaryGrid from '../components/GradeSummaryGrid.js'
import SideNavBar from '../components/SideNavBar.js'

type Grade = Record<string, unknown>
type Course = { id: string; name: string; [key: string]: unknown }
type Assignment = { id: string; title: string; [key: string]: unknown }

function Gradebook() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [grades, setGrades] = useState<Grade[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCourse, setSelectedCourse] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([
      http.get('/api/grades'),
      http.get('/api/courses'),
      http.get('/api/assignments').catch(() => null),
    ])
      .then(([gradesRes, coursesRes, assignmentsRes]) => {
        const gradesBody = (gradesRes as { data?: unknown } | null)?.data ?? gradesRes
        const coursesBody = (coursesRes as { data?: unknown } | null)?.data ?? coursesRes
        const assignmentsBody =
          (assignmentsRes as { data?: unknown } | null)?.data ?? assignmentsRes
        setGrades(Array.isArray(gradesBody) ? (gradesBody as Grade[]) : [])
        setCourses(Array.isArray(coursesBody) ? (coursesBody as Course[]) : [])
        setAssignments(Array.isArray(assignmentsBody) ? (assignmentsBody as Assignment[]) : [])
      })
      .catch(() =>
        setError(t('gradebook.errorLoadingGrades', {}, { defaultValue: 'Failed to load grades' })),
      )
      .finally(() => setLoading(false))
  }, [http, t])

  // Resolve course / assignment display names so the breakdown table shows
  // real labels instead of the "—" unknown fallbacks.
  const enrichedGrades = useMemo(() => {
    const courseById = new Map(courses.map((c) => [c.id, c]))
    const assignmentById = new Map(assignments.map((a) => [a.id, a]))
    return grades.map((g): Grade => ({
      ...g,
      course_name:
        g.course_name ?? courseById.get(String(g.course_id ?? g.courseId ?? ''))?.name ?? '',
      assignment_title:
        g.assignment_title ??
        assignmentById.get(String(g.assignment_id ?? g.assignmentId ?? ''))?.title ??
        '',
    }))
  }, [grades, courses, assignments])

  const query = search.trim().toLowerCase()
  const filteredGrades = enrichedGrades
    .filter((g) => !selectedCourse || String(g.course_id ?? g.courseId ?? '') === selectedCourse)
    .filter(
      (g) =>
        !query ||
        String(g.assignment_title ?? '')
          .toLowerCase()
          .includes(query) ||
        String(g.course_name ?? '')
          .toLowerCase()
          .includes(query),
    )

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface font-body text-on-surface')}>
      <SideNavBar />
      {/* Main Wrapper */}
      <div className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'md:ml-[260px]')}>
        {/* TopNavBar */}
        <GradebookTopNavBar search={search} onSearchChange={setSearch} />
        {/* Main Content Area */}
        <main className={cm.cn(cm.sp('p', 8), cm.stack(10))}>
          <GradebookPageHeader
            courses={courses}
            selectedCourse={selectedCourse}
            onCourseChange={setSelectedCourse}
            grades={filteredGrades}
          />
          {loading && (
            <div className={cm.cn(cm.flex({ justify: 'center' }), cm.sp('py', 12))}>
              <div
                className={cm.cn(
                  cm.w(8),
                  cm.h(8),
                  cm.roundedFull,
                  'border-4 border-primary border-t-transparent animate-spin',
                )}
                role="status"
                aria-label={t('common.loading', {}, { defaultValue: 'Loading' })}
              />
            </div>
          )}
          {error && (
            <div
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 4),
                cm.textSize('sm'),
                'bg-error-container text-on-error-container rounded-2xl',
              )}
              role="alert"
            >
              {error}
            </div>
          )}
          {!loading && (
            <>
              {/* Top Section Cards (Bento Style) */}
              <GradeSummaryGrid grades={filteredGrades} />
              <GradeBreakdownTable grades={filteredGrades} />
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default Gradebook
export { Gradebook, Gradebook as GradebookPage }
