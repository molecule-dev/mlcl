import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const FILTER_TABS = ['Industry', 'Size', 'Location', 'Status'] as const

interface CompaniesFilterBarProps {
  activeFilters: Set<string>
  onToggle: (tab: string) => void
  onClear: () => void
}

function CompaniesFilterBar({ activeFilters, onToggle, onClear }: CompaniesFilterBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center' }),
        cm.sp('pb', 2),
        'gap-2 overflow-x-auto hide-scrollbar',
      )}
    >
      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          cm.sp('mr', 2),
          'text-[10px] text-outline tracking-wider uppercase',
        )}
      >
        {t('companiesFilterBar.filtersLabel', {}, { defaultValue: 'Filters:' })}
      </span>
      {FILTER_TABS.map((tab) => {
        const isActive = activeFilters.has(tab)
        return (
          <button
            key={tab}
            onClick={() => onToggle(tab)}
            aria-pressed={isActive}
            className={
              isActive
                ? 'flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-full border border-primary/20'
                : 'flex items-center gap-2 px-4 py-1.5 bg-surface-container-low text-on-surface-variant text-xs font-semibold rounded-full hover:bg-surface-container-high transition-colors'
            }
          >
            {t(`companiesFilterBar.${tab.toLowerCase()}`, {}, { defaultValue: tab })}
            <span className={cm.cn(cm.textSize('xs'), 'material-symbols-outlined')}>
              expand_more
            </span>
          </button>
        )
      })}
      <div className={cm.cn(cm.h(6), cm.sp('mx', 1), 'w-[1px] bg-outline-variant/20')}></div>
      <button
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('medium'),
          cm.textPrimary,
          'hover:underline',
        )}
        onClick={onClear}
      >
        {t('common.clearAll', {}, { defaultValue: 'Clear all' })}
      </button>
    </div>
  )
}

export default CompaniesFilterBar
export { CompaniesFilterBar }
