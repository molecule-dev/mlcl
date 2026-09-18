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
  overdue: 'border-l-error bg-error-container/40 text-on-error-container',
  upcoming: 'border-l-primary bg-primary-container/40 text-on-primary-container',
  submitted: 'border-l-tertiary bg-tertiary-container/40 text-on-tertiary-container',
  graded: 'border-l-secondary bg-secondary-container/40 text-on-secondary-container',
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
          'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10 border-l-4 border-l-outline-variant/30',
        )}
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
        'group bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10 border-l-4',
        tone,
      )}
      data-mol-id="assignment-card"
    >
      <div>
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
          <span
            className={cm.cn(
              cm.sp('py', 1),
              cm.sp('px', 2),
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-wider rounded',
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
