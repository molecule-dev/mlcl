import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function ProductQuantitySelector({
  quantity = 1,
  onQuantityChange,
}: {
  quantity?: number
  onQuantityChange?: (q: number) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div>
      <h3
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          cm.sp('mb', 3),
          'text-foreground',
        )}
      >
        {t('productQuantitySelector.label', {}, { defaultValue: 'Quantity' })}
      </h3>
      <div
        className={cm.cn(cm.flex({ align: 'center' }), cm.w(32), 'border border-border rounded-lg')}
      >
        <button
          className={cm.cn(
            cm.flex1,
            cm.h(10),
            cm.flex({ align: 'center', justify: 'center' }),
            'hover:bg-surface-secondary',
          )}
          data-mol-id="qty-minus"
          onClick={() => onQuantityChange?.(Math.max(1, quantity - 1))}
        >
          <span className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}>remove</span>
        </button>
        <span className={cm.cn(cm.flex1, cm.textCenter, cm.fontWeight('bold'))}>{quantity}</span>
        <button
          className={cm.cn(
            cm.flex1,
            cm.h(10),
            cm.flex({ align: 'center', justify: 'center' }),
            'hover:bg-surface-secondary',
          )}
          data-mol-id="qty-plus"
          onClick={() => onQuantityChange?.(quantity + 1)}
        >
          <span className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}>add</span>
        </button>
      </div>
    </div>
  )
}
export { ProductQuantitySelector }
