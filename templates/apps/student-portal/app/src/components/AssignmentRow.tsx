import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { GradeBadge, type GradeLetter } from './GradeBadge.js'

/**
 * Single assignment row — subject dot, title + due date, status pill,
 * optional grade badge. Hover lifts background to surface-container-low
 * for the editorial-list feel.
 *
 * Translated from personal-finance/ActivityRow.tsx (subject pill +
 * caption + right-aligned amount) with assignment-specific status
 * vocabulary from DESIGN.md (Due / Submitted / Graded / Missing).
 */
export type AssignmentStatus = 'due' | 'submitted' | 'graded' | 'missing'
export type AssignmentSubject =
  'math' | 'science' | 'english' | 'history' | 'art' | 'pe' | 'language' | 'other'

export interface AssignmentRowProps {
  id: string
  title: string
  course: string
  subject: AssignmentSubject
  dueLabel: string
  status: AssignmentStatus
  grade?: GradeLetter
  gradePercentage?: number
  href?: string
  overdue?: boolean
}

const SUBJECT_DOT: Record<AssignmentSubject, string> = {
  math: 'bg-blue-500',
  science: 'bg-green-600',
  english: 'bg-violet-500',
  history: 'bg-amber-500',
  art: 'bg-pink-500',
  pe: 'bg-teal-500',
  language: 'bg-orange-500',
  other: 'bg-slate-400',
}

const STATUS_TONE: Record<AssignmentStatus, string> = {
  due: 'bg-warning-light text-warning',
  submitted: 'bg-success-light text-success',
  graded: 'bg-violet-100 text-violet-700',
  missing: 'bg-rose-100 text-error',
}

export function AssignmentRow(props: AssignmentRowProps) {
  const { id, href } = props
  const cm = getClassMap()
  const rowClass = cm.cn(
    cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
    cm.sp('px', 4),
    cm.sp('py', 3),
    'rounded-xl border-b border-outline-variant/40 hover:bg-surface-container-low transition-colors',
  )
  const dataMolId = `assignment-row-${id}`

  if (href) {
    return (
      <Link to={href} data-mol-id={dataMolId} className={rowClass}>
        <RowBody {...props} />
      </Link>
    )
  }
  return (
    <div data-mol-id={dataMolId} className={rowClass}>
      <RowBody {...props} />
    </div>
  )
}

function RowBody({
  title,
  course,
  subject,
  dueLabel,
  status,
  grade,
  gradePercentage,
  overdue,
}: AssignmentRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}>
        <span
          aria-hidden="true"
          className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'shrink-0', SUBJECT_DOT[subject])}
        />
        <div className={cm.cn('min-w-0')}>
          <p className={cm.cn(cm.textSize('sm'), 'font-semibold text-on-surface truncate')}>
            {title}
          </p>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
            {t(
              'assignmentRow.courseDue',
              { course, due: dueLabel },
              { defaultValue: '{{course}} · Due {{due}}' },
            )}
          </p>
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'shrink-0')}>
        {grade ? (
          <GradeBadge letter={grade} percentage={gradePercentage} size="sm" />
        ) : (
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              'text-[10px] font-black uppercase tracking-widest',
              STATUS_TONE[status],
            )}
          >
            {overdue && status === 'due'
              ? t('status.overdue', {}, { defaultValue: 'Overdue' })
              : t(
                  `assignmentRow.status.${status}`,
                  {},
                  {
                    defaultValue:
                      status === 'due'
                        ? 'Due'
                        : status === 'submitted'
                          ? 'Submitted'
                          : status === 'graded'
                            ? 'Graded'
                            : 'Missing',
                  },
                )}
          </span>
        )}
      </div>
    </>
  )
}

export default AssignmentRow
