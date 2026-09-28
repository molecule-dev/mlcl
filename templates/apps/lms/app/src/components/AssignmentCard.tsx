import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface AssignmentCardData {
  id: string
  course_id: string
  title: string
  description?: string | null
  due_date?: string | null
  type?: string | null
  courseName?: string | null
  status?: 'overdue' | 'upcoming' | 'submitted' | 'graded'
  score?: number | null
  maxScore?: number | null
}

const STATUS_LABELS: Record<NonNullable<AssignmentCardData['status']>, string> = {
  overdue: 'Overdue',
  upcoming: 'Upcoming',
  submitted: 'Submitted',
  graded: 'Graded',
}

const STATUS_TONE: Record<NonNullable<AssignmentCardData['status']>, string> = {
  overdue: 'bg-error-container/40 text-on-error-container',
  upcoming: 'bg-primary-container/40 text-on-primary-container',
  submitted: 'bg-tertiary-container/40 text-on-tertiary-container',
  graded: 'bg-secondary-container/40 text-on-secondary-container',
}

/** The status color the card's accent bar and status label take (`--mol-accent`). */
const STATUS_ACCENT: Record<NonNullable<AssignmentCardData['status']>, string> = {
  overdue: 'var(--color-error)',
  upcoming: 'var(--color-primary)',
  submitted: 'var(--color-tertiary)',
  graded: 'var(--color-secondary)',
}

function formatDue(due?: string | null): string {
  if (!due) return ''
  try {
    const d = new Date(due)
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    })
  } catch (_error) {
    // Invalid date string — return the raw value as a fallback
    return due
  }
}

export function AssignmentCard({ assignment }: { assignment?: AssignmentCardData } = {}) {
  const cm = getClassMap()
  const navigate = useNavigate()
  const { t } = useTranslation()

  if (!assignment) {
    return (
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', justify: 'between' }),
          cm.sp('p', 6),
          cm.accentCard({ tone: 'custom' }),
          'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10',
        )}
        style={{ ['--mol-accent' as string]: 'var(--color-outline-variant)' }}
        data-mol-id="assignment-card-empty"
      >
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('assignmentCard.placeholder', {}, { defaultValue: 'No assignment data' })}
        </p>
      </div>
    )
  }

  const status = assignment.status ?? 'upcoming'
  const tone = STATUS_TONE[status]
  const dueText = formatDue(assignment.due_date)
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 6),
        cm.accentCard({ tone: 'custom' }),
        'group bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10',
        tone,
      )}
      style={{ ['--mol-accent' as string]: STATUS_ACCENT[status] }}
      data-mol-id="assignment-card"
    >
      <div>
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
          <span
            className={cm.cn(
              cm.accentCardLabel({ tone: 'custom' }),
              cm.sp('py', 1),
              cm.sp('px', 2),
              'rounded',
            )}
          >
            {t(`assignmentCard.status.${status}`, {}, { defaultValue: STATUS_LABELS[status] })}
          </span>
          {status === 'graded' && assignment.maxScore && assignment.score != null ? (
            <span
              className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-on-surface')}
              data-mol-id="assignment-card-score"
            >
              {Math.round((assignment.score / assignment.maxScore) * 100)}%
            </span>
          ) : null}
        </div>
        <h3
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('bold'),
            cm.sp('mb', 1),
            'font-headline leading-tight group-hover:text-primary transition-colors',
          )}
        >
          {assignment.title}
        </h3>
        {assignment.courseName ? (
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 6), 'text-on-surface-variant')}>
            {assignment.courseName}
          </p>
        ) : null}
      </div>
      <div className={cm.stack(4)}>
        {dueText ? (
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 3 }),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              status === 'overdue' ? 'text-error' : 'text-on-surface-variant',
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>schedule</span>
            {t('assignmentCard.dueDate', { date: dueText }, { defaultValue: 'Due: {{date}}' })}
          </div>
        ) : null}
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('pt', 4),
            'border-t border-outline-variant/10',
          )}
        >
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {assignment.type ?? ''}
          </span>
          <button
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.textPrimary,
              'hover:underline',
            )}
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/course/${assignment.course_id}`)
            }}
          >
            {t('assignmentCard.viewDetails', {}, { defaultValue: 'View Details' })}
          </button>
        </div>
      </div>
    </div>
  )
}
export default AssignmentCard
