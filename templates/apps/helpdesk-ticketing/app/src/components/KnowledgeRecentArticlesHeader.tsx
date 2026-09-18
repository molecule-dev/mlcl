import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function KnowledgeRecentArticlesHeader({
  activeFilter,
  onFilterChange,
}: {
  activeFilter: 'all' | 'updated'
  onFilterChange: (f: 'all' | 'updated') => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(cm.flex({ align: 'end', justify: 'between' }))}
      data-mol-id="recent-header"
    >
      <h3
        className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'text-on-surface')}
        data-mol-id="recent-title"
      >
        {t('knowledgeRecentArticlesHeader.title', {}, { defaultValue: 'Recent Articles' })}
      </h3>
      <div className={cm.flex({ gap: 2 })} data-mol-id="recent-filters">
        <button
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('medium'),
            cm.textSize('sm'),
            'rounded-lg',
            activeFilter === 'all'
              ? 'bg-surface-container-high text-on-surface'
              : 'text-on-surface-variant hover:bg-surface-container-low transition-colors',
          )}
          data-mol-id="filter-all"
          onClick={() => onFilterChange('all')}
        >
          {t('status.all', {}, { defaultValue: 'All' })}
        </button>
        <button
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('medium'),
            cm.textSize('sm'),
            'rounded-lg',
            activeFilter === 'updated'
              ? 'bg-surface-container-high text-on-surface'
              : 'text-on-surface-variant hover:bg-surface-container-low transition-colors',
          )}
          data-mol-id="filter-updated"
          onClick={() => onFilterChange('updated')}
        >
          {t(
            'knowledgeRecentArticlesHeader.updatedFilter',
            {},
            { defaultValue: 'Recently Updated' },
          )}
        </button>
      </div>
    </div>
  )
}

export default KnowledgeRecentArticlesHeader
export { KnowledgeRecentArticlesHeader }
