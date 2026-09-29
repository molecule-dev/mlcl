import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function OrderDetailBreadcrumb({ orderId }: { orderId?: string }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <nav
      className={cm.cn(
        cm.flex({ align: 'center', gap: 2 }),
        cm.textSize('sm'),
        cm.sp('mb', 8),
        'text-foreground-secondary',
      )}
    >
      <Link className={cm.cn('hover:text-success transition-colors')} to="/">
        {t('common.home', {}, { defaultValue: 'Home' })}
      </Link>
      <span className={cm.cn(cm.textSize('xs'), 'material-symbols-outlined')}>chevron_right</span>
      <Link className={cm.cn('hover:text-success transition-colors')} to="/orders">
        {t('common.orders', {}, { defaultValue: 'Orders' })}
      </Link>
      <span className={cm.cn(cm.textSize('xs'), 'material-symbols-outlined')}>chevron_right</span>
      <span className={cm.cn(cm.fontWeight('medium'), 'text-foreground')}>
        {t(
          'orderDetailBreadcrumb.orderTitle',
          { id: orderId?.slice(0, 8) ?? '...' },
          { defaultValue: 'Order #{{id}}' },
        )}
      </span>
    </nav>
  )
}

export default OrderDetailBreadcrumb
export { OrderDetailBreadcrumb }
