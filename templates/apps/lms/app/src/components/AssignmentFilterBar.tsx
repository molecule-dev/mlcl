import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

type FilterType = 'all' | 'upcoming' | 'overdue' | 'submitted' | 'graded'

function AssignmentFilterBar({
  activeFilter = 'all',
  onFilterChange,
}: {
  activeFilter?: FilterType
  onFilterChange?: (f: FilterType) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const active = cm.cn(
    cm.sp('px', 5),
    cm.sp('py', 2),
    cm.textSize('sm'),
    cm.fontWeight('semibold'),
    cm.textPrimary,
    'rounded-xl transition-all bg-surface-container-lowest shadow-sm',
  )
  const inactive = cm.cn(
    cm.sp('px', 5),
    cm.sp('py', 2),
    cm.textSize('sm'),
    cm.fontWeight('medium'),
    'text-on-surface-variant hover:text-on-surface transition-all rounded-xl',
  )
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center' }),
        cm.w('fit'),
        'gap-1 bg-surface-container-low p-1.5 rounded-2xl max-w-full overflow-x-auto',
      )}
    >
      <button
        className={activeFilter === 'all' ? active : inactive}
        onClick={() => onFilterChange?.('all')}
      >
        {t('status.all', {}, { defaultValue: 'All' })}
      </button>
      <button
        className={activeFilter === 'upcoming' ? active : inactive}
        onClick={() => onFilterChange?.('upcoming')}
      >
        {t('status.upcoming', {}, { defaultValue: 'Upcoming' })}
      </button>
      <button
        className={activeFilter === 'overdue' ? active : inactive}
        onClick={() => onFilterChange?.('overdue')}
      >
        {t('status.overdue', {}, { defaultValue: 'Overdue' })}
      </button>
      <button
        className={activeFilter === 'submitted' ? active : inactive}
        onClick={() => onFilterChange?.('submitted')}
      >
        {t('assignmentFilterBar.submitted', {}, { defaultValue: 'Submitted' })}
      </button>
      <button
        className={activeFilter === 'graded' ? active : inactive}
        onClick={() => onFilterChange?.('graded')}
      >
        {t('assignmentFilterBar.graded', {}, { defaultValue: 'Graded' })}
      </button>
    </div>
  )
}
export default AssignmentFilterBar
export { AssignmentFilterBar }
