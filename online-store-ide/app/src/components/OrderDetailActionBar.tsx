import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function OrderDetailActionBar({ orderId: _orderId }: { orderId?: string }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', gap: 4 }),
        cm.sp('pt', 4),
        'sm:flex-row sm:justify-end',
      )}
    >
      <Link
        className={cm.cn(
          'text-primary font-medium hover:text-primary-dark transition-colors flex items-center gap-1',
        )}
        to="/help"
      >
        {t('orderDetailActionBar.needHelp', {}, { defaultValue: 'Need Help?' })}
        <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>help_outline</span>
      </Link>
    </div>
  )
}

export default OrderDetailActionBar
export { OrderDetailActionBar }
