import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'space_dashboard' },
  { to: '/guests', key: 'guests', defaultLabel: 'Guests', icon: 'group' },
  { to: '/budget', key: 'budget', defaultLabel: 'Budget', icon: 'savings' },
  { to: '/vendors', key: 'vendors', defaultLabel: 'Vendors', icon: 'storefront' },
  { to: '/tasks', key: 'tasks', defaultLabel: 'Tasks', icon: 'checklist' },
  { to: '/seating', key: 'seating', defaultLabel: 'Seating', icon: 'table_restaurant' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function WeddingLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`weddingLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('weddingLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
