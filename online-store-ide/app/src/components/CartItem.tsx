import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface CartItemProps {
  item: {
    id: string
    quantity: number
    product: {
      name: string
      price: number
      thumbnails: string[]
      sale_price?: number
      variant?: string
    }
  }
  onUpdateQuantity: (itemId: string, quantity: number) => void
  onRemove: (itemId: string) => void
}

function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [qty, setQty] = useState(item.quantity)

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100)

  const handleMinus = () => {
    if (qty <= 1) return
    const next = qty - 1
    setQty(next)
    onUpdateQuantity(item.id, next)
  }

  const handlePlus = () => {
    const next = qty + 1
    setQty(next)
    onUpdateQuantity(item.id, next)
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', gap: 6 }),
        cm.sp('p', 6),
        'bg-surface rounded-lg shadow-sm border border-border',
      )}
    >
      <div
        className={cm.cn(
          cm.w(32),
          cm.h(32),
          cm.shrink0,
          'bg-surface-secondary rounded-md overflow-hidden border border-border',
        )}
      >
        <img
          className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
          alt={item.product.name}
          src={item.product.thumbnails?.[0] || 'https://picsum.photos/seed/CartItem-1/1200/800'}
        />
      </div>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', justify: 'between' }),
          cm.flex1,
          'md:flex-row md:items-center',
        )}
      >
        <div>
          <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-foreground')}>
            {item.product.name}
          </h3>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-text-secondary')}>
            {item.product.variant || ''}
          </p>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center' }),
                'border border-border rounded-md bg-surface-secondary',
              )}
            >
              <button
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  'hover:text-primary transition-colors',
                )}
                data-mol-id="qty-minus-1"
                onClick={handleMinus}
              >
                <span className={cm.cn('material-symbols-outlined')}>remove</span>
              </button>
              <span className={cm.cn(cm.w(8), cm.textCenter, cm.fontWeight('semibold'))}>
                {qty}
              </span>
              <button
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  'hover:text-primary transition-colors',
                )}
                data-mol-id="qty-plus-1"
                onClick={handlePlus}
              >
                <span className={cm.cn('material-symbols-outlined')}>add</span>
              </button>
            </div>
            <button
              className={cm.cn(
                cm.flex({ align: 'center', gap: 1 }),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-foreground-tertiary hover:text-error transition-colors',
              )}
              data-mol-id="delete-1"
              onClick={() => onRemove(item.id)}
            >
              <span className={cm.cn('material-symbols-outlined')}>delete</span>
              {t('common.remove', {}, { defaultValue: 'Remove' })}
            </button>
          </div>
        </div>
        <div className={cm.cn(cm.textRight, cm.sp('mt', 4), 'md:mt-0')}>
          <p
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'price-tabular text-foreground',
            )}
          >
            {formatPrice((item.product.sale_price ?? item.product.price) * qty)}
          </p>
        </div>
      </div>
    </div>
  )
}
export default CartItem
export { CartItem }
