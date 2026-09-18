import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AssignmentRow, type AssignmentStatus } from '../components/AssignmentRow.js'
import { StatPill } from '../components/StatPill.js'
import type { AssignmentRow as ApiAssignment, CourseRow } from '../lib/api.js'

const TABS: { key: 'all' | AssignmentStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'in-progress', label: 'In progress' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'graded', label: 'Graded' },
  { key: 'overdue', label: 'Overdue' },
]

const ASSIGNMENT_STATUS = (due: string | null, hasSubmission?: boolean): AssignmentStatus => {
  if (hasSubmission) return 'submitted'
  if (!due) return 'upcoming'
  const dueMs = new Date(due).getTime()
  const now = Date.now()
  if (Number.isNaN(dueMs)) return 'upcoming'
  if (dueMs < now) return 'overdue'
  if (dueMs - now < 36 * 60 * 60 * 1000) return 'in-progress'
  return 'upcoming'
}

const formatDueLabel = (due: string | null): string => {
  if (!due) return 'No due date'
  const date = new Date(due)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000))
  if (Math.abs(diffDays) <= 1) {
    if (diffMs < 0)
      return 'Overdue · ' + date.toLocaleString(undefined, { month: 'short', day: 'numeric' })
    return (
      'Due ' +
      date.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
    )
  }
  return 'Due ' + date.toLocaleString(undefined, { month: 'short', day: 'numeric' })
}

export function Assignments() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('all')
  const [items, setItems] = useState<ApiAssignment[]>([])
  const [courseById, setCourseById] = useState<Map<string, CourseRow>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get<ApiAssignment[]>('/api/assignments'),
      http.get<CourseRow[]>('/api/courses'),
    ])
      .then(([as, cs]) => {
        if (cancelled) return
        setItems(as.data)
        const map = new Map<string, CourseRow>()
        for (const c of cs.data) map.set(c.id, c)
        setCourseById(map)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load assignments')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const enriched = useMemo(
    () =>
      items.map((a) => {
        const course = courseById.get(a.course_id)
        return {
          row: a,
          course,
          status: ASSIGNMENT_STATUS(a.due_date),
          dueLabel: formatDueLabel(a.due_date),
        }
      }),
    [items, courseById],
  )

  const filtered = tab === 'all' ? enriched : enriched.filter((e) => e.status === tab)

  const stats = {
    total: items.length,
    dueWeek: enriched.filter((e) => {
      if (!e.row.due_date) return false
      const ms = new Date(e.row.due_date).getTime() - Date.now()
      return ms >= 0 && ms < 7 * 24 * 60 * 60 * 1000
    }).length,
    overdue: enriched.filter((e) => e.status === 'overdue').length,
    upcoming: enriched.filter((e) => e.status === 'upcoming').length,
  }

  return (
    <div className={cm.stack(8)} data-testid="assignments-root">
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-4')}
      >
        <div className={cm.stack(1)}>
          <span
            className={cm.cn(
              'text-[11px] font-black uppercase tracking-widest text-secondary-dark',
            )}
          >
            {t('assignments.eyebrow', {}, { defaultValue: 'Coursework' })}
          </span>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t('assignments.title', {}, { defaultValue: 'Assignments' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xl')}>
            {t(
              'assignments.body',
              {},
              {
                defaultValue: 'Track every paper, problem set, and project across your courses.',
              },
            )}
          </p>
        </div>
      </header>

      <section className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2 lg:grid-cols-4')}>
        <StatPill
          icon="assignment"
          tone="primary"
          label={t('assignments.statTotal', {}, { defaultValue: 'Active assignments' })}
          value={stats.total.toString()}
        />
        <StatPill
          icon="schedule"
          tone="secondary"
          label={t('assignments.statDueWeek', {}, { defaultValue: 'Due this week' })}
          value={stats.dueWeek.toString()}
        />
        <StatPill
          icon="task_alt"
          tone="success"
          label={t('status.upcoming', {}, { defaultValue: 'Upcoming' })}
          value={stats.upcoming.toString()}
        />
        <StatPill
          icon="warning"
          tone="error"
          label={t('assignments.statOverdue', {}, { defaultValue: 'Needs attention' })}
          value={stats.overdue.toString()}
        />
      </section>

      <nav className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'flex-wrap')}>
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setTab(entry.key)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full transition-colors',
              tab === entry.key
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
            )}
          >
            {t(`assignments.tab_${entry.key}`, {}, { defaultValue: entry.label })}
          </button>
        ))}
      </nav>

      {error ? (
        <div
          role="alert"
          className={cm.cn(cm.sp('p', 4), 'rounded-xl bg-error-container text-on-error-container')}
        >
          {error}
        </div>
      ) : null}

      <div
        data-testid="assignments-list"
        className={cm.cn(
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/10 divide-y divide-outline-variant/15 overflow-hidden',
        )}
      >
        {loading ? (
          <div className={cm.cn(cm.sp('p', 10), cm.textCenter, 'text-on-surface-variant')}>
            {t('assignments.loading', {}, { defaultValue: 'Loading assignments…' })}
          </div>
        ) : filtered.length === 0 ? (
          <div className={cm.cn(cm.sp('p', 10), cm.textCenter, 'text-on-surface-variant')}>
            {t(
              'assignments.empty',
              {},
              { defaultValue: 'Nothing in this lane right now — enjoy the calm.' },
            )}
          </div>
        ) : (
          filtered.map(({ row, course, status, dueLabel }) => (
            <AssignmentRow
              key={row.id}
              id={row.id}
              title={row.title}
              course={course?.title ?? 'Course'}
              courseCode={course?.code ?? ''}
              dueLabel={dueLabel}
              status={status}
              weight={row.points}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default Assignments
