import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/menu', key: 'menu', defaultLabel: 'Menu', icon: 'restaurant_menu' },
  { to: '/orders/history', key: 'orders', defaultLabel: 'Orders', icon: 'receipt_long' },
  { to: '/tables', key: 'tables', defaultLabel: 'Tables', icon: 'table_restaurant' },
  { to: '/reservations', key: 'reservations', defaultLabel: 'Reservations', icon: 'event_seat' },
  { to: '/customers', key: 'customers', defaultLabel: 'Guests', icon: 'group' },
  { to: '/analytics', key: 'analytics', defaultLabel: 'Analytics', icon: 'insights' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Manager/kitchen sidebar shell — vertical nav with restaurant-domain
 * icons (restaurant_menu, table_restaurant, event_seat). Built on the
 * shared SidebarLayout package; renders <Outlet /> in the main panel.
 *
 * Pattern source: banking-dashboard's MeridianLayout.
 */
export function RestaurantOrderingLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`restaurantOrderingLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      themeToggle={<ThemeToggle />}
      navAriaLabel={t(
        'restaurantOrderingLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
    />
  )
}
