import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface AdminProductsTableHeaderProps {
  allSelected?: boolean
  onSelectAll?: (checked: boolean) => void
}

function AdminProductsTableHeader({
  allSelected = false,
  onSelectAll,
}: AdminProductsTableHeaderProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <thead>
      <tr className={cm.cn('bg-surface-secondary border-b border-border')}>
        <th className={cm.cn(cm.sp('py', 4), cm.sp('px', 6), cm.w(12))}>
          <input
            className={cm.cn('rounded border-border-secondary text-success focus:ring-green-500')}
            type="checkbox"
            checked={allSelected}
            onChange={(e) => onSelectAll?.(e.target.checked)}
          />
        </th>
        <th
          className={cm.cn(
            cm.sp('py', 4),
            cm.sp('px', 4),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'text-foreground-secondary uppercase tracking-wider',
          )}
        >
          {t('nav.product', {}, { defaultValue: 'Product' })}
        </th>
        <th
          className={cm.cn(
            cm.sp('py', 4),
            cm.sp('px', 4),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'text-foreground-secondary uppercase tracking-wider',
          )}
        >
          {t('form.category', {}, { defaultValue: 'Category' })}
        </th>
        <th
          className={cm.cn(
            cm.sp('py', 4),
            cm.sp('px', 4),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'text-foreground-secondary uppercase tracking-wider',
          )}
        >
          {t('form.price', {}, { defaultValue: 'Price' })}
        </th>
        <th
          className={cm.cn(
            cm.sp('py', 4),
            cm.sp('px', 4),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'text-foreground-secondary uppercase tracking-wider',
          )}
        >
          {t('adminProductsTableHeader.stock', {}, { defaultValue: 'Stock' })}
        </th>
        <th
          className={cm.cn(
            cm.sp('py', 4),
            cm.sp('px', 4),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'text-foreground-secondary uppercase tracking-wider',
          )}
        >
          {t('nav.status', {}, { defaultValue: 'Status' })}
        </th>
        <th
          className={cm.cn(
            cm.sp('py', 4),
            cm.sp('px', 4),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.textRight,
            'text-foreground-secondary uppercase tracking-wider',
          )}
        >
          {t('nav.actions', {}, { defaultValue: 'Actions' })}
        </th>
      </tr>
    </thead>
  )
}

export default AdminProductsTableHeader
export { AdminProductsTableHeader }
