import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function TopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <header
      className={cm.cn(
        cm.w('full'),
        'bg-surface border-b border-border shadow-sm fixed top-0 z-50 antialiased',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          cm.h(16),
          cm.mxAuto,
          'max-w-[1280px]',
        )}
      >
        <Link
          className={cm.cn('text-2xl font-black text-foreground')}
          data-mol-id="brand-logo"
          to="/"
        >
          {t('topNavBar.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </Link>
        <nav
          className={cm.cn(
            cm.flex({ align: 'center', gap: 6 }),
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'hidden md:flex font-sans',
          )}
        >
          <Link
            className={cm.cn(
              'text-foreground-secondary hover:text-success dark:hover:text-green-300 transition-colors',
            )}
            data-mol-id="nav-shop"
            to="/"
          >
            {t('topNavBar.shop', {}, { defaultValue: 'Shop' })}
          </Link>
          <Link
            className={cm.cn(
              'text-foreground-secondary hover:text-success dark:hover:text-green-300 transition-colors',
            )}
            data-mol-id="nav-categories"
            to="/search?q=all"
          >
            {t('topNavBar.categories', {}, { defaultValue: 'Categories' })}
          </Link>
          <Link
            className={cm.cn(
              'text-foreground-secondary hover:text-success dark:hover:text-green-300 transition-colors',
            )}
            data-mol-id="nav-deals"
            to="/search?q=sale"
          >
            {t('topNavBar.deals', {}, { defaultValue: 'Deals' })}
          </Link>
          <Link
            className={cm.cn(
              'text-foreground-secondary hover:text-success dark:hover:text-green-300 transition-colors',
            )}
            data-mol-id="nav-new"
            to="/search?q=new"
          >
            {t('topNavBar.newArrivals', {}, { defaultValue: 'New Arrivals' })}
          </Link>
        </nav>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
          <Link
            className={cm.cn('text-foreground-secondary hover:text-success p-2 transition-colors')}
            data-mol-id="nav-cart"
            to="/cart"
          >
            <span className={cm.cn('material-symbols-outlined')}>shopping_cart</span>
          </Link>
          <Link
            className={cm.cn('text-foreground-secondary hover:text-success p-2 transition-colors')}
            data-mol-id="nav-profile"
            to="/settings"
          >
            <span className={cm.cn('material-symbols-outlined')}>account_circle</span>
          </Link>
        </div>
      </div>
    </header>
  )
}

export default TopNavBar
export { TopNavBar }
