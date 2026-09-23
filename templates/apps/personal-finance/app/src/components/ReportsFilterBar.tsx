import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ReportsFilterBarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const RANGES: Array<{ key: string; defaultLabel: string; i18nKey: string }> = [
  { key: '1m', defaultLabel: 'This Month', i18nKey: 'reportsFilterBar.thisMonth' },
  { key: '3m', defaultLabel: 'Last 3 Months', i18nKey: 'reportsFilterBar.lastThreeMonths' },
  { key: '6m', defaultLabel: 'Last 6 Months', i18nKey: 'reportsFilterBar.lastSixMonths' },
  { key: '1y', defaultLabel: 'Last Year', i18nKey: 'reportsFilterBar.lastYear' },
  { key: 'ytd', defaultLabel: 'Year to Date', i18nKey: 'reportsFilterBar.yearToDate' },
]

function ReportsFilterBar({ activeTab, onTabChange }: ReportsFilterBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section
      className={cm.cn(cm.flex({ align: 'center', wrap: 'wrap', gap: 'md' }))}
      data-mol-id="filter-section"
    >
      <div
        className={cm.cn(
          cm.sp('p', 1),
          'inline-flex bg-surface-container-low rounded-xl max-w-full overflow-x-auto',
        )}
        data-mol-id="date-tabs"
      >
        {RANGES.map((range) => (
          <button
            key={range.key}
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'rounded-lg transition-all whitespace-nowrap shrink-0',
              activeTab === range.key
                ? cm.cn(cm.fontWeight('bold'), cm.textPrimary, 'bg-surface shadow-sm')
                : cm.cn(cm.fontWeight('semibold'), 'hover:bg-surface-container-high'),
            )}
            data-mol-id={`tab-${range.key}`}
            aria-pressed={activeTab === range.key}
            onClick={() => onTabChange(range.key)}
          >
            {t(range.i18nKey, {}, { defaultValue: range.defaultLabel })}
          </button>
        ))}
      </div>
    </section>
  )
}

export default ReportsFilterBar
export { ReportsFilterBar }
