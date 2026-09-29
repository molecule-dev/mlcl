import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Category {
  name: string
  count: number
}
interface Props {
  totalProducts: number
  categories: Category[]
  categoryFilter: string
  statusFilter: string
  onCategoryChange: (v: string) => void
  onStatusChange: (v: string) => void
  onAddProduct?: () => void
}
function AdminProductsActionBar({
  totalProducts,
  categories,
  categoryFilter,
  statusFilter,
  onCategoryChange,
  onStatusChange,
  onAddProduct,
}: Props) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between', gap: 4 }),
        cm.sp('mb', 8),
        'md:flex-row md:items-center',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
        <span className={cm.cn(cm.fontWeight('medium'), 'text-foreground-secondary')}>
          {t(
            'adminProductsActionBar.productCount',
            { count: totalProducts },
            { defaultValue: '{{count}} products' },
          )}
        </span>
        <div className={cm.cn(cm.h(6), cm.w('[1px]'), 'bg-border-secondary')}></div>
        <div className={cm.cn(cm.flex({ gap: 2 }))}>
          <select
            aria-label={t(
              'adminProductsActionBar.filterByCategory',
              {},
              { defaultValue: 'Filter by category' },
            )}
            value={categoryFilter}
            onChange={(e) => onCategoryChange(e.target.value)}
            className={cm.cn(
              cm.input(),
              cm.textSize('sm'),
              cm.sp('py', 2),
              cm.sp('pl', 3),
              cm.sp('pr', 10),
              cm.cursorPointer,
              'bg-surface border-border rounded-md focus:ring-green-500 focus:border-green-500',
            )}
            id="filter-category"
          >
            <option value="">
              {t('adminProductsActionBar.allCategories', {}, { defaultValue: 'All Categories' })}
            </option>
            {categories.map((cat) => (
              <option key={cat.name} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
          <select
            aria-label={t(
              'adminProductsActionBar.filterByStatus',
              {},
              { defaultValue: 'Filter by status' },
            )}
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className={cm.cn(
              cm.input(),
              cm.textSize('sm'),
              cm.sp('py', 2),
              cm.sp('pl', 3),
              cm.sp('pr', 10),
              cm.cursorPointer,
              'bg-surface border-border rounded-md focus:ring-green-500 focus:border-green-500',
            )}
          >
            <option value="">
              {t('adminProductsActionBar.allStatus', {}, { defaultValue: 'All Status' })}
            </option>
            <option value="active">
              {t('adminProductsActionBar.inStock', {}, { defaultValue: 'In Stock' })}
            </option>
            <option value="low">
              {t('adminProductsActionBar.lowStock', {}, { defaultValue: 'Low Stock' })}
            </option>
            <option value="out">
              {t('adminProductsActionBar.outOfStock', {}, { defaultValue: 'Out of Stock' })}
            </option>
          </select>
        </div>
      </div>
      <button
        type="button"
        onClick={onAddProduct}
        className={cm.cn(
          cm.button(),
          cm.flex({ align: 'center', gap: 2 }),
          cm.sp('px', 6),
          cm.h(12),
          cm.fontWeight('semibold'),
          cm.cursorPointer,
          'bg-primary hover:opacity-90 text-on-primary rounded-md shadow-sm transition-all active:scale-95',
        )}
        id="btn-add-product"
        data-mol-id="admin-products-add-button"
      >
        <span className={cm.cn('material-symbols-outlined')} data-icon="add">
          add
        </span>
        {t('adminProductsActionBar.addProduct', {}, { defaultValue: 'Add Product' })}
      </button>
    </div>
  )
}
export default AdminProductsActionBar
export { AdminProductsActionBar }
