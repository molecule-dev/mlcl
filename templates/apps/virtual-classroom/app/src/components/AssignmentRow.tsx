import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Editorial row for an assignment list/table — status pill, course code,
 * due date, action button. Drops into a `divide-y` parent.
 *
 * Translated from personal-finance/AccountRecentTransactions.tsx (table row
 * pattern) + lms/AssignmentCard.tsx (status pill colour mapping).
 */
export type AssignmentStatus = 'submitted' | 'graded' | 'in-progress' | 'upcoming' | 'overdue'

export interface AssignmentRowProps {
  id?: string
  title?: string
  course?: string
  courseCode?: string
  dueLabel?: string
  status?: AssignmentStatus
  scoreLabel?: string
  weight?: number
}

const STATUS_TONE: Record<
  AssignmentStatus,
  { bg: string; text: string; iconBg: string; icon: string }
> = {
  submitted: {
    bg: 'bg-success/15',
    text: 'text-success',
    iconBg: 'bg-success/20',
    icon: 'task_alt',
  },
  graded: {
    bg: 'bg-primary-container',
    text: 'text-on-primary-container',
    iconBg: 'bg-primary/20',
    icon: 'grading',
  },
  'in-progress': {
    bg: 'bg-secondary/15',
    text: 'text-secondary-dark',
    iconBg: 'bg-secondary/20',
    icon: 'edit_note',
  },
  upcoming: {
    bg: 'bg-surface-container-high',
    text: 'text-on-surface-variant',
    iconBg: 'bg-surface-container-highest',
    icon: 'schedule',
  },
  overdue: {
    bg: 'bg-error/15',
    text: 'text-error',
    iconBg: 'bg-error/20',
    icon: 'warning',
  },
}

export function AssignmentRow({
  id = 'demo-assignment-1',
  title,
  course,
  courseCode,
  dueLabel,
  status = 'in-progress',
  scoreLabel,
  weight = 15,
}: AssignmentRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const heading =
    title ?? t('assignmentRow.title', {}, { defaultValue: 'Lab report — Mitochondrial DNA' })
  const courseName = course ?? t('assignmentRow.course', {}, { defaultValue: 'Cell Biology I' })
  const code = courseCode ?? t('assignmentRow.courseCode', {}, { defaultValue: 'BIO 211' })
  const due = dueLabel ?? t('assignmentRow.due', {}, { defaultValue: 'Due Thu Nov 7 · 11:59 PM' })

  const tone = STATUS_TONE[status]
  const statusLabel =
    status === 'submitted'
      ? t('assignmentRow.statusSubmitted', {}, { defaultValue: 'Submitted' })
      : status === 'graded'
        ? t('assignmentRow.statusGraded', {}, { defaultValue: 'Graded' })
        : status === 'in-progress'
          ? t('assignmentRow.statusInProgress', {}, { defaultValue: 'Drafting' })
          : status === 'overdue'
            ? t('status.overdue', {}, { defaultValue: 'Overdue' })
            : t('status.upcoming', {}, { defaultValue: 'Upcoming' })

  return (
    <Link
      to={`/assignments/${id}`}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 4 }),
        cm.sp('p', 5),
        'hover:bg-surface-container-low transition-colors group',
      )}
      data-mol-id={`assignment-row-${id}`}
    >
      <div
        className={cm.cn(
          'h-12 w-12 rounded-xl flex items-center justify-center shrink-0',
          tone.iconBg,
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-[22px]', tone.text)}>
          {tone.icon}
        </span>
      </div>
      <div className={cm.cn(cm.flex1, cm.stack(1), 'min-w-0')}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
          <span
            className={cm.cn(
              cm.sp('px', 2),
              cm.sp('py', 1),
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest rounded-full bg-primary-container text-on-primary-container',
            )}
          >
            {code}
          </span>
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{courseName}</span>
        </div>
        <h3
          className={cm.cn(
            cm.textSize('base'),
            cm.fontWeight('semibold'),
            'text-on-surface group-hover:text-primary transition-colors truncate',
          )}
        >
          {heading}
        </h3>
        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{due}</span>
      </div>
      <div className={cm.cn(cm.stack(1), 'items-end shrink-0 hidden sm:flex')}>
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest rounded-full',
            tone.bg,
            tone.text,
          )}
        >
          {statusLabel}
        </span>
        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {scoreLabel ??
            t(
              'assignmentRow.weight',
              { percent: weight },
              { defaultValue: 'Worth {{percent}}% of grade' },
            )}
        </span>
      </div>
      <span
        className={cm.cn(
          'material-symbols-outlined text-on-surface-variant/60 group-hover:text-primary transition-colors',
        )}
      >
        chevron_right
      </span>
    </Link>
  )
}

export default AssignmentRow
