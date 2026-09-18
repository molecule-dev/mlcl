import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface CategoryFilterBarProps {
  categories: string[]
  activeCategory: string
  onSelect: (category: string) => void
}

export default function CategoryFilterBar({
  categories,
  activeCategory,
  onSelect,
}: CategoryFilterBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <nav
      className={cm.cn(cm.flex(), cm.sp('mb', 10))}
      style={{
        gap: 'calc(2 * 0.25rem)',
        overflowX: 'auto',
        paddingBottom: 'calc(2 * 0.25rem)',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
      data-mol-id="category-filters"
    >
      {categories.map((category) => {
        const isActive = category === activeCategory
        const slug = category
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-')
          .slice(0, 33)
        return (
          <button
            key={category}
            className={
              isActive
                ? 'px-6 py-2 rounded-full bg-primary text-white text-sm font-semibold whitespace-nowrap'
                : 'px-6 py-2 rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high transition-colors text-sm font-medium whitespace-nowrap'
            }
            onClick={() => onSelect(category)}
            data-mol-id={`category-filter-${slug}`}
          >
            {t(`category-filter-bar.${slug}`, {}, { defaultValue: category })}
          </button>
        )
      })}
    </nav>
  )
}

export { CategoryFilterBar }
