import { Link } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { avatarUrl } from '../utils/avatar.js'

function OrdersNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth() as { user?: { name?: string; email?: string } }
  return (
    <nav className={cm.cn(cm.surface, 'border-b border-border shadow-sm sticky top-0 z-50')}>
      <div
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('px', 4),
          cm.h(16),
          cm.w('full'),
          cm.maxW('[1280px]'),
          cm.mxAuto,
          'md:px-8 font-sans antialiased',
        )}
      >
        <Link to="/" className={cm.cn(cm.textSize('2xl'), 'font-black text-success')}>
          {t('ordersNavBar.brand', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </Link>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 8 }), 'hidden md:flex')}>
          <Link
            className={cm.cn(
              'text-foreground-secondary hover:text-success dark:hover:text-green-400 transition-colors',
            )}
            to="/"
          >
            {t('ordersNavBar.shop', {}, { defaultValue: 'Shop' })}
          </Link>
          <Link
            className={cm.cn(
              'text-foreground-secondary hover:text-success dark:hover:text-green-400 transition-colors',
            )}
            to="/search?q=all"
          >
            {t('ordersNavBar.categories', {}, { defaultValue: 'Categories' })}
          </Link>
          <Link
            className={cm.cn(
              'text-foreground-secondary hover:text-success dark:hover:text-green-400 transition-colors',
            )}
            to="/search?q=sale"
          >
            {t('ordersNavBar.deals', {}, { defaultValue: 'Deals' })}
          </Link>
          <Link
            className={cm.cn('text-success font-bold border-b-2 border-green-600 pb-1')}
            to="/orders"
          >
            {t('ordersNavBar.orders', {}, { defaultValue: 'Orders' })}
          </Link>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
          <Link
            className={cm.cn(
              'p-2 text-foreground-secondary hover:bg-surface-secondary rounded-full transition-all duration-200 active:opacity-80',
            )}
            to="/cart"
          >
            <span className={cm.cn('material-symbols-outlined')}>shopping_cart</span>
          </Link>
          <Link to="/settings">
            <img
              alt={t('ordersNavBar.profileAlt', {}, { defaultValue: 'User profile' })}
              className={cm.cn(cm.w(8), cm.h(8), cm.roundedFull, 'border border-border')}
              src={avatarUrl(user?.name || user?.email)}
            />
          </Link>
        </div>
      </div>
    </nav>
  )
}

export default OrdersNavBar
export { OrdersNavBar }
