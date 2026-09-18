import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

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

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export default function CategoryCard({
  category,
  onEdit,
  onDelete,
}: {
  category: Category
  onEdit?: (e: React.MouseEvent) => void
  onDelete?: (e: React.MouseEvent) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isIncome = category.type === 'income'
  const budgetPercent =
    category.budget_limit > 0
      ? Math.min(100, Math.round(((category.monthly_spending ?? 0) / category.budget_limit) * 100))
      : 0
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl group transition-all hover:shadow-2xl hover:shadow-on-surface/5',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 6))}>
        <div
          className={cm.cn(cm.sp('p', 3), 'rounded-xl')}
          style={{
            backgroundColor: `${category.color || 'var(--mol-color-primary)'}1a`,
            color: category.color || 'var(--mol-color-primary)',
          }}
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {category.icon || 'category'}
          </span>
        </div>
        <div
          className={cm.cn(
            cm.flex({ gap: 'xs' }),
            'opacity-0 group-hover:opacity-100 transition-opacity',
          )}
        >
          <button
            className={cm.cn(
              cm.sp('p', 2),
              'hover:bg-surface-container rounded-lg text-foreground-tertiary hover:text-primary transition-colors',
            )}
            onClick={onEdit}
          >
            <span
              className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
              data-icon="edit"
            >
              edit
            </span>
          </button>
          {onDelete && (
            <button
              className={cm.cn(
                cm.sp('p', 2),
                'hover:bg-surface-container rounded-lg text-foreground-tertiary hover:text-tertiary transition-colors',
              )}
              onClick={onDelete}
            >
              <span
                className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
                data-icon="delete"
              >
                delete
              </span>
            </button>
          )}
        </div>
      </div>
      <h3
        className={cm.cn(
          cm.fontWeight('bold'),
          cm.textSize('lg'),
          'font-headline text-on-surface-variant group-hover:text-primary transition-colors',
        )}
      >
        {category.name}
      </h3>
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'baseline' }), cm.sp('mb', 4))}>
        <span
          className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), 'text-foreground-tertiary')}
        >
          {t(
            'categoryCard.transactions',
            { count: category.transaction_count ?? 0 },
            { defaultValue: '{{count}} Transactions' },
          )}
        </span>
        <span
          className={cm.cn(
            cm.textSize('3xl'),
            'font-headline font-extrabold tracking-tight',
            isIncome && 'text-primary',
          )}
        >
          {isIncome ? '+' : ''}
          {fmt(category.monthly_spending ?? 0)}
        </span>
      </div>
      {category.budget_limit > 0 && (
        <div
          className={cm.cn(
            cm.w('full'),
            cm.h(1),
            cm.roundedFull,
            'bg-surface-container-highest overflow-hidden',
          )}
        >
          <div
            className={cm.cn(cm.h('full'), cm.roundedFull, 'bg-primary')}
            style={{ width: `${budgetPercent}%` }}
          />
        </div>
      )}
    </div>
  )
}
export { CategoryCard }
