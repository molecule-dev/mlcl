import { useCallback, useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { AssignmentStatus } from '../components/AssignmentRow.js'
import { AssignmentRow } from '../components/AssignmentRow.js'
import { type ApiAssignment, dueLabel, letterFor, statusFor, subjectFor } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

const FILTERS: readonly { id: 'all' | AssignmentStatus; label: string; tone: string }[] = [
  { id: 'all', label: 'All', tone: 'bg-primary text-on-primary' },
  { id: 'due', label: 'Due', tone: 'bg-warning-light text-warning' },
  { id: 'submitted', label: 'Submitted', tone: 'bg-success-light text-success' },
  { id: 'graded', label: 'Graded', tone: 'bg-violet-100 text-violet-700' },
  { id: 'missing', label: 'Missing', tone: 'bg-rose-100 text-error' },
] as const

export function Assignments() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [assignments, setAssignments] = useState<ApiAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState<'all' | AssignmentStatus>('all')

  const load = useCallback(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    http
      .get('/api/assignments')
      .then((res) => {
        if (cancelled) return
        setAssignments(unwrapList<ApiAssignment>(res))
      })
      .catch(() => {
        // A failed fetch must never render as a silent blank — the error
        // state below offers a retry.
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

  const visible = useMemo(() => {
    if (filter === 'all') return assignments
    return assignments.filter((a) => statusFor(a.status) === filter)
  }, [assignments, filter])

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xl' }))} data-mol-id="page-assignments">
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <p className={cm.cn(cm.textSize('sm'), 'font-bold uppercase tracking-widest text-primary')}>
          {t('assignments.eyebrow', {}, { defaultValue: 'All courses · This term' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('assignments.title', {}, { defaultValue: 'Assignments' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'assignments.subtitle',
            {},
            { defaultValue: 'Filter by status to see what’s due, submitted, graded, or missing.' },
          )}
        </p>
      </header>

      <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }))}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            data-mol-id={`assignments-filter-${f.id}`}
            onClick={() => setFilter(f.id)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.roundedFull,
              'font-black uppercase tracking-widest transition-colors',
              filter === f.id
                ? f.tone
                : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface',
            )}
          >
            {t(`assignments.filter.${f.id}`, {}, { defaultValue: f.label })}
          </button>
        ))}
      </div>

      <section
        className={cm.cn(cm.sp('p', 4), 'rounded-2xl bg-surface-container-lowest shadow-sm')}
      >
        {loading ? (
          <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
            {t('assignments.loading', {}, { defaultValue: 'Loading assignments…' })}
          </p>
        ) : error ? (
          <div
            role="alert"
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
              cm.sp('py', 12),
              'text-on-surface-variant',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-5xl text-error opacity-70')}
              aria-hidden="true"
            >
              wifi_off
            </span>
            <p className={cm.textSize('lg')}>
              {t('assignments.loadError', {}, { defaultValue: 'Couldn’t load assignments.' })}
            </p>
            <button
              type="button"
              data-mol-id="assignments-retry"
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
        ) : visible.length === 0 ? (
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
              cm.sp('py', 12),
              'text-on-surface-variant',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-5xl opacity-50')}
              aria-hidden="true"
            >
              task_alt
            </span>
            <p className={cm.textSize('lg')}>
              {t('assignments.empty', {}, { defaultValue: 'Nothing here' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'), cm.textCenter, 'max-w-xs')}>
              {t(
                'assignments.emptyBody',
                {},
                { defaultValue: 'Switch filters above to see assignments in a different state.' },
              )}
            </p>
          </div>
        ) : (
          <div className={cm.cn(cm.flex({ direction: 'col' }))}>
            {visible.map((a) => {
              const status = statusFor(a.status)
              const grade =
                status === 'graded' && a.points != null ? letterFor(Number(a.points)) : undefined
              return (
                <AssignmentRow
                  key={a.id}
                  id={a.id}
                  title={a.title}
                  course={a.course_name ?? ''}
                  subject={subjectFor(a.course_name)}
                  dueLabel={dueLabel(a.due_date)}
                  status={status}
                  grade={grade}
                  gradePercentage={
                    status === 'graded' && a.points != null ? Number(a.points) : undefined
                  }
                  overdue={a.status === 'overdue'}
                  href={`/assignments/${a.id}`}
                />
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

export default Assignments
export { Assignments as AssignmentsPage }
