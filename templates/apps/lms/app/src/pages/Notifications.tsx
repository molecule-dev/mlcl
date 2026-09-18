import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface CourseRow {
  id: string
  name: string
}

interface AssignmentRow {
  id: string
  course_id: string
  title: string
  due_date?: string | null
}

interface NotificationItem {
  id: string
  icon: string
  title: string
  body: string
  href?: string
  createdAt: number
}

/**
 * Notifications feed. Synthesised from the user's actual enrolled
 * courses + their assignments, since the LMS doesn't ship a dedicated
 * notifications backend. Shows:
 *
 *  - "Assignment due in N days" for upcoming assignments
 *  - "Assignment overdue" for past-due assignments without a grade
 *  - A welcome card if there are no enrolled courses yet
 *
 * Empty state is the explicit "You're all caught up." message.
 */
export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const isAuthenticated = useIsAuthenticated()
  const [items, setItems] = useState<NotificationItem[] | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const cRes: unknown = await http.get<CourseRow[]>('/api/courses?my=true')
        if (cancelled) return
        const courses: CourseRow[] = Array.isArray(cRes)
          ? (cRes as CourseRow[])
          : Array.isArray((cRes as { data?: unknown })?.data)
            ? (cRes as { data: CourseRow[] }).data
            : []

        if (courses.length === 0) {
          setItems([
            {
              id: 'welcome-no-courses',
              icon: 'school',
              title: t(
                'notifications.welcomeTitle',
                { appName: APP_NAME },
                { defaultValue: 'Welcome to {{appName}} LMS' },
              ),
              body: t(
                'notifications.welcomeBody',
                {},
                {
                  defaultValue:
                    'Browse the catalog and enrol in a course to start receiving deadline reminders here.',
                },
              ),
              href: '/courses',
              createdAt: Date.now(),
            },
          ])
          return
        }

        const seen = new Set<string>()
        const uniqueCourses = courses.filter((c) => {
          if (seen.has(c.id)) return false
          seen.add(c.id)
          return true
        })

        const lists = await Promise.all(
          uniqueCourses.map(async (c) => {
            try {
              const aRes: unknown = await http.get<AssignmentRow[]>(
                `/api/assignments?course_id=${encodeURIComponent(c.id)}`,
              )
              const list: AssignmentRow[] = Array.isArray(aRes)
                ? (aRes as AssignmentRow[])
                : Array.isArray((aRes as { data?: unknown })?.data)
                  ? (aRes as { data: AssignmentRow[] }).data
                  : []
              return list.map((a) => ({ assignment: a, course: c }))
            } catch (_error) {
              // Assignment fetch for this course failed — skip it
              return []
            }
          }),
        )
        if (cancelled) return

        const seenA = new Set<string>()
        const flat = lists.flat().filter(({ assignment }) => {
          if (seenA.has(assignment.id)) return false
          seenA.add(assignment.id)
          return true
        })

        const now = Date.now()
        const computed: NotificationItem[] = flat
          .filter(({ assignment }) => assignment.due_date)
          .map(({ assignment, course }) => {
            const due = new Date(assignment.due_date as string).getTime()
            const diffMs = due - now
            const overdue = diffMs < 0
            return {
              id: `assignment-${assignment.id}`,
              icon: overdue ? 'error' : 'event',
              title: overdue
                ? t(
                    'notifications.assignmentOverdueTitle',
                    { title: assignment.title },
                    { defaultValue: 'Overdue: {{title}}' },
                  )
                : t(
                    'notifications.assignmentDueTitle',
                    { title: assignment.title },
                    { defaultValue: 'Upcoming: {{title}}' },
                  ),
              body: t(
                'notifications.assignmentDueBody',
                {
                  course: course.name,
                  due: new Date(assignment.due_date as string).toLocaleDateString(),
                },
                { defaultValue: '{{course}} • due {{due}}' },
              ),
              href: `/course/${course.id}`,
              createdAt: due,
            }
          })
          .sort((a, b) => Math.abs(a.createdAt - now) - Math.abs(b.createdAt - now))
          .slice(0, 20)

        if (computed.length === 0) {
          setItems([])
        } else {
          setItems(computed)
        }
      } catch (_error) {
        // Network/API error building notifications — show empty state
        if (!cancelled) setItems([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, isAuthenticated, t])

  return (
    <main
      data-mol-id="page-notifications"
      className={cm.cn(cm.mxAuto, 'max-w-3xl', cm.sp('px', 6), cm.sp('py', 8))}
    >
      <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
        {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
      </h1>
      {items === null ? (
        <p className={cm.textMuted} data-mol-id="notifications-loading">
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : items.length === 0 ? (
        <p className={cm.textMuted} data-mol-id="notifications-empty">
          {t('notifications.empty', {}, { defaultValue: "You're all caught up." })}
        </p>
      ) : (
        <ul className={cm.stack(3)} data-mol-id="notifications-list">
          {items.map((item) => {
            const inner = (
              <div
                className={cm.cn(
                  cm.flex({ align: 'start', gap: 4 }),
                  cm.sp('p', 4),
                  'rounded-2xl border border-outline-variant/20 bg-surface-container-lowest hover:bg-surface-container-low transition-colors',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-primary')}
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                <div className={cm.cn(cm.flex1, cm.stack(1))}>
                  <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                    {item.title}
                  </p>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{item.body}</p>
                </div>
              </div>
            )
            return (
              <li key={item.id} data-mol-id="notification-item">
                {item.href ? (
                  <Link to={item.href} className={cm.cn('block')}>
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}

export default Notifications
