import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import DeadlineItem from './DeadlineItem.js'

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

type Tone = 'success' | 'warning' | 'error' | 'neutral'
type DeadlineIcon = 'error' | 'schedule' | 'event' | 'check_circle'

function pickTone(due: Date | null): { tone: Tone; icon: DeadlineIcon } {
  if (!due) return { tone: 'neutral', icon: 'event' }
  const ms = due.getTime() - Date.now()
  if (ms < 0) return { tone: 'error', icon: 'error' }
  if (ms < 24 * 60 * 60 * 1000) return { tone: 'warning', icon: 'event' }
  if (ms < 7 * 24 * 60 * 60 * 1000) return { tone: 'success', icon: 'schedule' }
  return { tone: 'neutral', icon: 'check_circle' }
}

function formatDue(due: Date | null): string {
  if (!due) return '—'
  const ms = due.getTime() - Date.now()
  if (ms < 0) return 'Overdue'
  const dayMs = 24 * 60 * 60 * 1000
  if (ms < dayMs) return 'Due today'
  if (ms < 2 * dayMs) return 'Due tomorrow'
  return due.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatStatus(due: Date | null): string {
  if (!due) return 'No due date'
  const ms = due.getTime() - Date.now()
  if (ms < 0) return 'Overdue'
  if (ms < 24 * 60 * 60 * 1000) return 'Due today'
  if (ms < 7 * 24 * 60 * 60 * 1000) return 'This week'
  return 'On track'
}

/**
 * "Upcoming Deadlines" section on the dashboard.
 *
 * Was originally four hardcoded demo deadlines. Now reads real
 * assignments from `/api/assignments` for each enrolled course and
 * sorts them by due date. Past deadlines are tagged "Overdue", same-day
 * "Due today", etc. — all derived from the actual `due_date` column,
 * not faked.
 */
function UpcomingDeadlinesSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const isAuthenticated = useIsAuthenticated()
  const [items, setItems] = useState<Array<{
    assignment: AssignmentRow
    course: CourseRow | null
    due: Date | null
  }> | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        // Scope to the user's enrolled / owned courses; fetching the
        // global catalog would mean every user sees every course's
        // assignments and inflates the list with irrelevant data.
        const cRes: unknown = await http.get<CourseRow[]>('/api/courses?my=true')
        if (cancelled) return
        const rawCourses: CourseRow[] = Array.isArray(cRes)
          ? (cRes as CourseRow[])
          : Array.isArray((cRes as { data?: unknown })?.data)
            ? (cRes as { data: CourseRow[] }).data
            : []
        const seenCourse = new Set<string>()
        const courses = rawCourses.filter((c) => {
          const id = String(c.id)
          if (seenCourse.has(id)) return false
          seenCourse.add(id)
          return true
        })
        const assignmentLists = await Promise.all(
          courses.map(async (course) => {
            try {
              const aRes: unknown = await http.get<AssignmentRow[]>(
                `/api/assignments?course_id=${encodeURIComponent(course.id)}`,
              )
              const list: AssignmentRow[] = Array.isArray(aRes)
                ? (aRes as AssignmentRow[])
                : Array.isArray((aRes as { data?: unknown })?.data)
                  ? (aRes as { data: AssignmentRow[] }).data
                  : []
              return list.map((a) => ({
                assignment: a,
                course,
                due: a.due_date ? new Date(a.due_date) : null,
              }))
            } catch (_error) {
              // Assignment fetch for one course failed — skip it silently
              return []
            }
          }),
        )
        if (cancelled) return
        const seen = new Set<string>()
        const flat = assignmentLists
          .flat()
          .filter((entry) => {
            const id = String(entry.assignment.id)
            if (seen.has(id)) return false
            seen.add(id)
            return true
          })
          .sort((a, b) => {
            const aT = a.due?.getTime() ?? Number.MAX_SAFE_INTEGER
            const bT = b.due?.getTime() ?? Number.MAX_SAFE_INTEGER
            return aT - bT
          })
          .slice(0, 6)
        setItems(flat)
      } catch (_error) {
        // Network/API error loading deadlines — show empty state
        if (!cancelled) setItems([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, isAuthenticated])

  const heading = (
    <h2
      className={cm.cn(
        cm.fontWeight('bold'),
        cm.textSize('2xl'),
        cm.sp('mb', 6),
        'text-headline-md font-headline',
      )}
    >
      {t('upcomingDeadlinesSection.title', {}, { defaultValue: 'Upcoming Deadlines' })}
    </h2>
  )

  if (items === null) {
    return (
      <section data-mol-id="upcoming-deadlines-loading">
        {heading}
        <div className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </div>
      </section>
    )
  }

  if (items.length === 0) {
    return (
      <section data-mol-id="upcoming-deadlines-empty">
        {heading}
        <div
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl border border-outline-variant/20 bg-surface-container-lowest',
          )}
        >
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
            {t(
              'upcomingDeadlinesSection.empty',
              {},
              {
                defaultValue: 'No upcoming deadlines. Enroll in a course to see assignments here.',
              },
            )}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section data-mol-id="upcoming-deadlines-section">
      {heading}
      <div className={cm.stack(4)}>
        {items.map(({ assignment, course, due }) => {
          const { tone, icon } = pickTone(due)
          return (
            <Link
              key={assignment.id}
              to={`/course/${assignment.course_id}`}
              className={cm.cn('contents')}
              onClick={(e) => e.stopPropagation()}
            >
              <DeadlineItem
                tone={tone}
                icon={icon}
                title={assignment.title}
                courseName={course?.name ?? ''}
                dueLine={formatDue(due)}
                statusLine={formatStatus(due)}
              />
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export default UpcomingDeadlinesSection
export { UpcomingDeadlinesSection }
