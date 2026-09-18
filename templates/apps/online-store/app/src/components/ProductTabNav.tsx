import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function ProductTabNav({
  activeTab = 'description',
  onTabChange,
}: {
  activeTab?: 'description' | 'specifications' | 'reviews'
  onTabChange?: (t: 'description' | 'specifications' | 'reviews') => void
}) {
  const { t } = useTranslation()
  const cm = getClassMap()
  const TABS: Array<{
    key: 'description' | 'specifications' | 'reviews'
    label: string
    molId: string
  }> = [
    {
      key: 'description',
      label: t('form.description', {}, { defaultValue: 'Description' }),
      molId: 'tab-desc',
    },
    {
      key: 'reviews',
      label: t('nav.reviews', {}, { defaultValue: 'Reviews' }),
      molId: 'tab-reviews',
    },
  ]
  return (
    <div className={cm.cn(cm.sp('mb', 12), 'border-b border-border')}>
      <div className={cm.flex({ gap: 12 })}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={
              activeTab === tab.key
                ? cm.cn(
                    cm.sp('pb', 4),
                    cm.fontWeight('bold'),
                    'text-success border-b-2 border-green-600',
                  )
                : cm.cn(
                    cm.sp('pb', 4),
                    cm.fontWeight('medium'),
                    'text-foreground-tertiary hover:text-foreground-secondary border-b-2 border-transparent transition-colors',
                  )
            }
            data-mol-id={tab.molId}
            onClick={() => onTabChange?.(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default ProductTabNav
export { ProductTabNav }
