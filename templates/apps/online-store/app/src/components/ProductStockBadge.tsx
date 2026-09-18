import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function ProductStockBadge({ inStock = true }: { inStock?: boolean }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', gap: 2 }),
        cm.sp('mb', 8),
        cm.fontWeight('semibold'),
        inStock ? 'text-success' : 'text-error',
      )}
    >
      <span className={cm.cn('material-symbols-outlined', cm.textSize('lg'))}>
        {inStock ? 'check_circle' : 'cancel'}
      </span>
      <span>
        {inStock
          ? t('productStockBadge.inStock', {}, { defaultValue: 'In Stock — Ready to ship' })
          : t('productStockBadge.outOfStock', {}, { defaultValue: 'Out of Stock' })}
      </span>
    </div>
  )
}

export default ProductStockBadge
export { ProductStockBadge }
