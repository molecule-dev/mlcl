import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type DeadlineTone = 'error' | 'warning' | 'success' | 'neutral'

export type DeadlineItemProps = {
  tone?: DeadlineTone
  title?: string
  courseName?: string
  dueLine?: string
  statusLine?: string
  icon?: 'error' | 'schedule' | 'event' | 'check_circle'
}

const toneIconWrap: Record<DeadlineTone, string> = {
  error: 'bg-error-container text-error',
  warning: 'bg-warning-light text-warning',
  success: 'bg-success-light text-success',
  neutral: 'bg-surface-container-high text-on-surface-variant',
}

const toneDueText: Record<DeadlineTone, string> = {
  error: 'text-error',
  warning: 'text-warning',
  success: 'text-success',
  neutral: 'text-on-surface-variant',
}

function DeadlineItem({
  tone = 'error',
  title,
  courseName,
  dueLine,
  statusLine,
  icon = 'error',
}: DeadlineItemProps) {
  const { t } = useTranslation()
  const cm = getClassMap()
  const resolvedTitle =
    title ??
    t(
      'deadlineItem.title',
      {
        type: t('deadlineItem.assignmentType', {}, { defaultValue: 'Final Project' }),
        name: t('deadlineItem.assignmentName', {}, { defaultValue: 'Hook Implementation' }),
      },
      { defaultValue: '{{type}}: {{name}}' },
    )
  const resolvedCourse =
    courseName ?? t('deadlineItem.courseName', {}, { defaultValue: 'Advanced React Patterns' })
  const resolvedDue =
    dueLine ??
    t(
      'deadlineItem.due',
      { date: t('common.yesterday', {}, { defaultValue: 'Yesterday' }) },
      { defaultValue: '{{date}}' },
    )
  const resolvedStatus =
    statusLine ??
    t(
      'status.overdue',
      { status: t('common.overdue', {}, { defaultValue: 'Overdue' }) },
      { defaultValue: '{{status}}' },
    )
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center' }),
        cm.sp('p', 5),
        'bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm transition-all hover:translate-x-1',
      )}
    >
      <div
        className={cm.cn(
          cm.shrink0,
          cm.w(12),
          cm.h(12),
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('mr', 6),
          'rounded-xl',
          toneIconWrap[tone],
        )}
      >
        <span className={cm.cn('material-symbols-outlined')} data-icon={icon}>
          {icon}
        </span>
      </div>
      <div className={cm.flex1}>
        <h4 className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>{resolvedTitle}</h4>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t('deadlineItem.course', { name: resolvedCourse }, { defaultValue: '{{name}}' })}
        </p>
      </div>
      <div className={cm.textRight}>
        <p className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), toneDueText[tone])}>
          {resolvedDue}
        </p>
        <p
          className={cm.cn(
            'text-[10px] uppercase font-label tracking-widest text-on-surface-variant',
          )}
        >
          {resolvedStatus}
        </p>
      </div>
    </div>
  )
}

export default DeadlineItem
export { DeadlineItem }
