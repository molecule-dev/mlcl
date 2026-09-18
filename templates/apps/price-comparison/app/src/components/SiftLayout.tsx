import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  { to: '/categories', key: 'categories', defaultLabel: 'Categories', icon: 'category' },
  { to: '/deals', key: 'deals', defaultLabel: 'Deals', icon: 'local_fire_department' },
  { to: '/watchlist', key: 'watchlist', defaultLabel: 'Watchlist', icon: 'visibility' },
  { to: '/alerts', key: 'alerts', defaultLabel: 'Alerts', icon: 'notifications' },
  { to: '/notifications', key: 'notifications', defaultLabel: 'Activity', icon: 'inbox' },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'account_circle' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function SiftLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`siftLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('siftLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
