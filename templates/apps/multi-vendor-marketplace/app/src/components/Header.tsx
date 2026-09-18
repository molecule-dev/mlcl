import { Link } from 'react-router'

import { AppHeader } from '@molecule/app-header-react'
import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Icon } from '@molecule/app-ui-react'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Primary marketplace navigation: Shop is always available; the shopper
 * (Cart, Orders) and vendor (Sell) links appear once signed in.
 */
function HeaderNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  const linkClass = cm.cn(
    cm.textSize('sm'),
    cm.fontWeight('semibold'),
    'hidden md:inline text-on-surface-variant hover:text-primary transition-colors',
  )

  return (
    <nav
      className={cm.flex({ align: 'center', gap: 'md' })}
      aria-label={t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })}
    >
      <Link to="/catalog" data-mol-id="nav-shop" className={linkClass}>
        {t('landing.nav.shop', {}, { defaultValue: 'Shop' })}
      </Link>
      {isAuthenticated && (
        <>
          <Link to="/cart" data-mol-id="nav-cart" className={linkClass}>
            {t('nav.cart', {}, { defaultValue: 'Cart' })}
          </Link>
          <Link to="/orders" data-mol-id="nav-orders" className={linkClass}>
            {t('nav.orders', {}, { defaultValue: 'Orders' })}
          </Link>
          <Link to="/vendor/dashboard" data-mol-id="nav-sell" className={linkClass}>
            {t('nav.sell', {}, { defaultValue: 'Sell' })}
          </Link>
          <Link
            to="/notifications"
            data-mol-id="nav-notifications"
            aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
            className={cm.cn(
              cm.flex({ align: 'center' }),
              'text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            <Icon name="bell" size={20} />
          </Link>
        </>
      )}
    </nav>
  )
}

export function Header() {
  return (
    <AppHeader
      appName={APP_NAME}
      logoSize={LOGO_SIZE}
      fixed={false}
      themeToggle={<ThemeToggle />}
      extraActions={<HeaderNav />}
      userMenu={<UserMenu />}
    />
  )
}
