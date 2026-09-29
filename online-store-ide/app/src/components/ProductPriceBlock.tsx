import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function ProductPriceBlock({ price, originalPrice }: { price?: number; originalPrice?: number }) {
  const { t } = useTranslation()
  const cm = getClassMap()
  const fmt = (cents: number) => (cents / 100).toFixed(2)
  if (price == null) return null
  const displayPrice = price
  const displayOriginal = originalPrice ?? price
  const savings = displayOriginal - displayPrice
  return (
    <div className={cm.cn(cm.flex({ align: 'baseline', gap: 4 }), cm.sp('mb', 8))}>
      <span className={cm.cn(cm.textSize('4xl'), cm.textPrimary, 'font-black tabular-nums')}>
        {t(
          'productPriceBlock.currentPrice',
          { amount: fmt(displayPrice) },
          { defaultValue: '${{amount}}' },
        )}
      </span>
      {displayOriginal > displayPrice && (
        <>
          <span className={cm.cn(cm.textSize('xl'), cm.textMuted, 'line-through tabular-nums')}>
            {t(
              'productPriceBlock.originalPrice',
              { amount: fmt(displayOriginal) },
              { defaultValue: '${{amount}}' },
            )}
          </span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              cm.sp('px', 2),
              cm.sp('py', 1),
              'text-error bg-error-light rounded',
            )}
          >
            {t(
              'productPriceBlock.savings',
              { amount: fmt(savings) },
              { defaultValue: 'Save ${{amount}}' },
            )}
          </span>
        </>
      )}
    </div>
  )
}

export default ProductPriceBlock
export { ProductPriceBlock }
