import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface CategoryFilterBarProps {
  categories: ReadonlyArray<string>
  active?: string
  onChange?: (category: string) => void
  includeAllOption?: boolean
}

/**
 * Horizontally scrolling pill chip filter bar — primary chip when active,
 * outlined chip otherwise. Per DESIGN.md "Category Filter Bar" spec.
 */
export function CategoryFilterBar({
  categories,
  active,
  onChange,
  includeAllOption = true,
}: CategoryFilterBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const all = t('status.all', {}, { defaultValue: 'All' })
  const items = includeAllOption ? [all, ...categories] : [...categories]
  const current = active ?? all

  return (
    <div
      className={cm.cn(cm.flex({ gap: 'sm' }), 'overflow-x-auto pb-2 no-scrollbar scroll-smooth')}
      role="tablist"
      aria-label={t('categoryFilterBar.label', {}, { defaultValue: 'Filter by category' })}
    >
      {items.map((cat) => {
        const isActive = cat.toLowerCase() === current.toLowerCase()
        return (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange?.(cat)}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.roundedFull,
              'whitespace-nowrap transition-colors',
              isActive
                ? 'bg-primary text-white shadow-sm'
                : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant hover:border-primary hover:text-primary',
            )}
            data-mol-id={`category-${cat.toLowerCase()}`}
          >
            {cat}
          </button>
        )
      })}
    </div>
  )
}

export default CategoryFilterBar
