import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import CategoryCard from './CategoryCard.js'

interface Category {
  id: string
  name: string
  color: string
  icon: string
  type?: 'income' | 'expense'
  monthly_spending: number
  budget_limit: number
  transaction_count: number
}

function ExpenseCategoriesSection({
  categories,
  onDelete,
}: {
  categories: Category[]
  onDelete: (id: string) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  if (categories.length === 0) return null
  return (
    <section
      className={cm.cn(cm.sp('p', 8), 'rounded-3xl', 'bg-surface-container-lowest ambient-shadow')}
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}>
        <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-success')}>
          {t('expenseCategoriesSection.title', {}, { defaultValue: 'Expense Categories' })}
        </h3>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'font-label uppercase tracking-widest text-foreground-tertiary',
          )}
        >
          {t(
            'expenseCategoriesSection.activeCount',
            { count: categories.length },
            { defaultValue: '{{count}} Active' },
          )}
        </span>
      </div>
      <div
        className={cm.cn(
          cm.grid({ gap: 'lg' }),
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        )}
      >
        {categories.map((category) => (
          <Link
            key={category.id}
            to={`/transactions?category=${category.id}`}
            className={cm.cn('contents')}
          >
            <CategoryCard
              category={category}
              onDelete={(e) => {
                e.preventDefault()
                onDelete(category.id)
              }}
            />
          </Link>
        ))}
      </div>
    </section>
  )
}

export default ExpenseCategoriesSection
export { ExpenseCategoriesSection }
