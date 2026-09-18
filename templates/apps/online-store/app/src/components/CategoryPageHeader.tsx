import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Props {
  /** Category name shown in the heading + breadcrumb (falls back to a generic label). */
  name?: string
  count?: number
}

export default function CategoryPageHeader({ name, count = 0 }: Props) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const displayName = name || t('categoryPage.allHeading', {}, { defaultValue: 'All Products' })
  return (
    <section
      className={cm.cn(cm.sp('p', 8), cm.sp('mb', 8), 'glass-header rounded-2xl')}
      data-mol-id="category-title-01"
    >
      <nav
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('medium'),
          cm.sp('mb', 2),
          'text-foreground-secondary uppercase tracking-wider',
        )}
      >
        {t('categoryPageHeader.breadcrumb', {}, { defaultValue: 'Home / Categories /' })}
        <span className={cm.textPrimary}> {displayName}</span>
      </nav>
      <div>
        <h1
          className={cm.cn(cm.textSize('4xl'), 'font-black text-foreground tracking-tight')}
          data-mol-id="category-title"
        >
          {displayName}
        </h1>
        <p className={cm.cn(cm.sp('mt', 1), 'text-foreground-secondary')}>
          {t(
            'categoryPageHeader.productCount',
            { count },
            { defaultValue: '{{count}} products found in this category' },
          )}
        </p>
      </div>
    </section>
  )
}
export { CategoryPageHeader }
