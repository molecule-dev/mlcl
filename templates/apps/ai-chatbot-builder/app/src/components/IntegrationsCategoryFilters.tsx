import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
type Category = 'all' | 'messaging' | 'crm' | 'analytics' | 'developer'
interface Props {
  activeCategory: Category
  onCategoryChange: (c: Category) => void
}
export default function IntegrationsCategoryFilters({ activeCategory, onCategoryChange }: Props) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const active = cm.cn(
    cm.sp('px', 6),
    cm.sp('py', 2),
    cm.roundedFull,
    cm.textSize('sm'),
    cm.fontWeight('semibold'),
    'bg-primary text-white whitespace-nowrap',
  )
  const inactive = cm.cn(
    cm.sp('px', 6),
    cm.sp('py', 2),
    cm.roundedFull,
    cm.textSize('sm'),
    cm.fontWeight('medium'),
    'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high transition-colors whitespace-nowrap',
  )
  return (
    <nav
      className={cm.cn(cm.flex({}), cm.sp('pb', 2), 'gap-2 overflow-x-auto scrollbar-hide')}
      data-mol-id="category-filters"
    >
      <button
        aria-pressed={activeCategory === 'all'}
        className={activeCategory === 'all' ? active : inactive}
        onClick={() => onCategoryChange('all')}
      >
        {t('integrationsCategoryFilters.all', {}, { defaultValue: 'All Platforms' })}
      </button>
      <button
        aria-pressed={activeCategory === 'messaging'}
        className={activeCategory === 'messaging' ? active : inactive}
        onClick={() => onCategoryChange('messaging')}
      >
        {t('integrationsCategoryFilters.messaging', {}, { defaultValue: 'Messaging' })}
      </button>
      <button
        aria-pressed={activeCategory === 'crm'}
        className={activeCategory === 'crm' ? active : inactive}
        onClick={() => onCategoryChange('crm')}
      >
        {t('integrationsCategoryFilters.crm', {}, { defaultValue: 'CRM & Marketing' })}
      </button>
      <button
        aria-pressed={activeCategory === 'analytics'}
        className={activeCategory === 'analytics' ? active : inactive}
        onClick={() => onCategoryChange('analytics')}
      >
        {t('nav.analytics', {}, { defaultValue: 'Analytics' })}
      </button>
      <button
        aria-pressed={activeCategory === 'developer'}
        className={activeCategory === 'developer' ? active : inactive}
        onClick={() => onCategoryChange('developer')}
      >
        {t('integrationsCategoryFilters.developerTools', {}, { defaultValue: 'Custom & Webhooks' })}
      </button>
    </nav>
  )
}
export { IntegrationsCategoryFilters }
