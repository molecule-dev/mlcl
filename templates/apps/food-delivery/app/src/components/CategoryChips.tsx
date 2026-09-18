import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Category {
  key: string
  label: string
  icon: string
}

interface CategoryChipsProps {
  categories: Category[]
  activeKey: string
  onSelect: (key: string) => void
}

/**
 * Horizontally-scrolling category pill row with material icon glyphs.
 * Translated from online-store's StorefrontCategoriesSection — recoloured
 * to Chariot's amber/cream palette and adapted to cuisine-pill usage.
 */
export function CategoryChips({ categories, activeKey, onSelect }: CategoryChipsProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <nav
      aria-label={t('categoryChips.navLabel', {}, { defaultValue: 'Filter by cuisine' })}
      className={cm.cn('flex items-center gap-3 overflow-x-auto pb-2 -mx-2 px-2')}
      style={{ scrollbarWidth: 'thin' }}
    >
      {categories.map((c) => {
        const active = activeKey === c.key
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onSelect(c.key)}
            aria-pressed={active}
            className={cm.cn(
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all shrink-0',
              active
                ? 'bg-primary text-on-primary shadow-md shadow-primary/30'
                : 'bg-surface-container-low border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
            )}
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              {c.icon}
            </span>
            {c.label}
          </button>
        )
      })}
    </nav>
  )
}
