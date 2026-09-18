import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function DiscussionFilters({
  activeFilter,
  onFilterChange,
}: {
  activeFilter: string
  onFilterChange: (f: string) => void
}) {
  const { t } = useTranslation()
  const cm = getClassMap()
  const filters = [
    { key: 'all', label: t('status.all', {}, { defaultValue: 'All' }) },
    { key: 'general', label: t('discussionFilters.general', {}, { defaultValue: 'General' }) },
    { key: 'qa', label: t('discussionFilters.qa', {}, { defaultValue: 'Q&A' }) },
    {
      key: 'project-help',
      label: t('discussionFilters.projectHelp', {}, { defaultValue: 'Project Help' }),
    },
    { key: 'off-topic', label: t('discussionFilters.offTopic', {}, { defaultValue: 'Off-topic' }) },
  ]
  return (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'overflow-x-auto scrollbar-hide')}>
      {filters.map((f) => (
        <button
          key={f.key}
          onClick={() => onFilterChange(f.key)}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.roundedFull,
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'whitespace-nowrap transition-colors',
            activeFilter === f.key
              ? 'bg-primary text-on-primary shadow-md shadow-primary/10'
              : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant',
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
export { DiscussionFilters }
