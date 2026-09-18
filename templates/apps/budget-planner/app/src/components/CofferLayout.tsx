import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { usePreferences } from '../lib/format.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/budget', key: 'budget', defaultLabel: 'Budget', icon: 'savings' },
  { to: '/accounts', key: 'accounts', defaultLabel: 'Accounts', icon: 'account_balance_wallet' },
  { to: '/transactions', key: 'transactions', defaultLabel: 'Transactions', icon: 'receipt_long' },
  { to: '/categories', key: 'categories', defaultLabel: 'Categories', icon: 'category' },
  { to: '/goals', key: 'goals', defaultLabel: 'Goals', icon: 'flag' },
  { to: '/reports', key: 'reports', defaultLabel: 'Reports', icon: 'bar_chart' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function CofferLayout() {
  const { t } = useTranslation()
  // Load the display-currency preference once for the whole authenticated
  // shell; the money formatters read it synchronously via getCurrency() and
  // re-render when it resolves.
  usePreferences()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`cofferLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('cofferLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
