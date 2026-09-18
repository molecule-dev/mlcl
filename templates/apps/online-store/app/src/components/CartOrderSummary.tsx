import { useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface CartOrderSummaryProps {
  subtotal: number
}

function CartOrderSummary({ subtotal }: CartOrderSummaryProps) {
  const { t } = useTranslation()
  const cm = getClassMap()
  const [promoCode, setPromoCode] = useState('')
  const http = useHttpClient()
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoMessage, setPromoMessage] = useState('')
  const applyPromo = async () => {
    if (!promoCode) return
    setPromoLoading(true)
    setPromoMessage('')
    try {
      await http.post('/api/cart/promo', { code: promoCode })
      setPromoMessage(t('promo.applied', {}, { defaultValue: 'Code applied.' }))
    } catch (_error) {
      // No matching promo — surface a clear inline message instead of failing silently
      setPromoMessage(t('promo.invalid', {}, { defaultValue: 'Invalid or expired code.' }))
    } finally {
      setPromoLoading(false)
    }
  }

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100)

  const discount = 0
  const tax = Math.round((subtotal - discount) * 0.076)
  const total = subtotal - discount + tax
  return (
    <div className={cm.w('full')}>
      <div
        className={cm.cn(
          cm.sp('p', 8),
          cm.stack(6),
          'sticky top-28 bg-surface rounded-lg shadow-md border border-border',
        )}
      >
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-foreground')}>
          {t('cartOrderSummary.title', {}, { defaultValue: 'Order Summary' })}
        </h2>
        <div className={cm.cn(cm.stack(4), cm.textSize('sm'))}>
          <div className={cm.flex({ justify: 'between' })}>
            <span className={cm.cn('text-text-secondary')}>
              {t('nav.subtotal', {}, { defaultValue: 'Subtotal' })}
            </span>
            <span className={cm.cn(cm.fontWeight('bold'), 'price-tabular text-foreground')}>
              {formatPrice(subtotal)}
            </span>
          </div>
          {discount > 0 && (
            <div className={cm.flex({ justify: 'between' })}>
              <span className={cm.cn('text-text-secondary')}>
                {t('cartOrderSummary.discount', {}, { defaultValue: 'Discount' })}
              </span>
              <span className={cm.cn(cm.fontWeight('bold'), 'price-tabular text-sale')}>
                -{formatPrice(discount)}
              </span>
            </div>
          )}
          <div className={cm.flex({ justify: 'between' })}>
            <span className={cm.cn('text-text-secondary')}>
              {t('cartOrderSummary.shipping', {}, { defaultValue: 'Shipping' })}
            </span>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                cm.textPrimary,
                'uppercase tracking-wider',
              )}
            >
              {t('nav.free', {}, { defaultValue: 'Free' })}
            </span>
          </div>
          <div className={cm.flex({ justify: 'between' })}>
            <span className={cm.cn('text-text-secondary')}>
              {t('cartOrderSummary.estimatedTax', {}, { defaultValue: 'Estimated Tax' })}
            </span>
            <span className={cm.cn(cm.fontWeight('bold'), 'price-tabular text-foreground')}>
              {formatPrice(tax)}
            </span>
          </div>
          <div
            className={cm.cn(
              cm.sp('pt', 4),
              cm.flex({ justify: 'between', align: 'end' }),
              'border-t border-border',
            )}
          >
            <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-foreground')}>
              {t('nav.total', {}, { defaultValue: 'Total' })}
            </span>
            <span className={cm.cn(cm.textSize('2xl'), 'font-black price-tabular text-foreground')}>
              {formatPrice(total)}
            </span>
          </div>
        </div>
        {/* Promo Code */}
        <div className={cm.stack(2)}>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'block uppercase text-text-secondary',
            )}
          >
            {t('cartOrderSummary.promoCode', {}, { defaultValue: 'Promo Code' })}
          </label>
          <div className={cm.flex({ gap: 2 })}>
            <input
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.flex1,
                'border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none',
              )}
              placeholder={t(
                'cartOrderSummary.promoPlaceholder',
                {},
                { defaultValue: 'Enter code' },
              )}
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
            />
            <button
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'bg-foreground text-white rounded-md hover:bg-foreground transition-colors',
              )}
              data-mol-id="apply-promo"
              onClick={applyPromo}
              disabled={promoLoading}
            >
              {promoLoading
                ? t('common.loading', {}, { defaultValue: '…' })
                : t('common.apply', {}, { defaultValue: 'Apply' })}
            </button>
          </div>
          {promoMessage && (
            <p
              className={cm.cn(cm.textSize('xs'), 'text-text-secondary')}
              data-mol-id="promo-message"
            >
              {promoMessage}
            </p>
          )}
        </div>
        {/* Checkout Buttons */}
        <div className={cm.stack(3)}>
          <Link
            className={cm.cn(
              cm.w('full'),
              cm.fontWeight('semibold'),
              cm.flex({ align: 'center', justify: 'center', gap: 2 }),
              'bg-primary hover:bg-primary-hover text-white h-[48px] rounded-md transition-all active:scale-[0.98]',
            )}
            data-mol-id="checkout-main"
            to="/checkout"
          >
            <span className={cm.cn('material-symbols-outlined text-white')}>lock</span>

            {t('cartOrderSummary.proceedToCheckout', {}, { defaultValue: 'Proceed to Checkout' })}
          </Link>
          <Link
            className={cm.cn(
              cm.w('full'),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', justify: 'center' }),
              'bg-[#ffc439] hover:bg-[#ffb700] text-[#003087] h-[48px] rounded-md transition-all active:scale-[0.98]',
            )}
            data-mol-id="checkout-paypal"
            to="/checkout?method=paypal"
          >
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('lg'),
                'text-[#003087] italic tracking-tight',
              )}
            >
              {t('cartOrderSummary.payPal', {}, { defaultValue: 'PayPal' })}
            </span>
          </Link>
        </div>
        <div
          className={cm.cn(
            cm.textSize('xs'),
            cm.flex({ align: 'center', justify: 'center', gap: 4 }),
            'text-foreground-tertiary',
          )}
        >
          <div className={cm.flex({ align: 'center', gap: 1 })}>
            <span className={cm.cn('material-symbols-outlined !text-sm')}>verified_user</span>
            {t('cartOrderSummary.secureSSL', {}, { defaultValue: 'Secure SSL' })}
          </div>
          <div className={cm.flex({ align: 'center', gap: 1 })}>
            <span className={cm.cn('material-symbols-outlined !text-sm')}>local_shipping</span>
            {t(
              'cartOrderSummary.returnsPolicy',
              { days: 30 },
              { defaultValue: '{{days}}-Day Returns' },
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
export default CartOrderSummary
export { CartOrderSummary }
