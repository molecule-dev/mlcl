import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface FilterTabsProps {
  activeFilter: string
  onFilterChange: (filter: string) => void
}

export default function ActivitiesFilterTabs({ activeFilter, onFilterChange }: FilterTabsProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const TABS = [
    { key: '', label: t('status.all', {}, { defaultValue: 'All' }) },
    { key: 'call', label: t('activitiesFilterTabs.calls', {}, { defaultValue: 'Calls' }) },
    { key: 'email', label: t('activitiesFilterTabs.emails', {}, { defaultValue: 'Emails' }) },
    { key: 'meeting', label: t('activitiesFilterTabs.meetings', {}, { defaultValue: 'Meetings' }) },
    { key: 'note', label: t('form.notes', {}, { defaultValue: 'Notes' }) },
  ]
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center' }),
        cm.sp('p', 1),
        cm.sp('mb', 8),
        'gap-1 bg-surface-container-low rounded-2xl w-fit',
      )}
    >
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onFilterChange(tab.key)}
          className={
            activeFilter === tab.key
              ? 'px-6 py-2 bg-surface rounded-xl text-sm font-bold text-primary shadow-sm'
              : 'px-6 py-2 hover:bg-surface/50 rounded-xl text-sm font-medium text-on-surface-variant transition-colors'
          }
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
export { ActivitiesFilterTabs }
