import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/dispatch', key: 'dispatch', defaultLabel: 'Dispatch', icon: 'calendar_month' },
  { to: '/jobs', key: 'jobs', defaultLabel: 'Jobs', icon: 'home_repair_service' },
  { to: '/quotes', key: 'quotes', defaultLabel: 'Quotes', icon: 'request_quote' },
  { to: '/invoices', key: 'invoices', defaultLabel: 'Invoices', icon: 'receipt_long' },
  { to: '/customers', key: 'customers', defaultLabel: 'Customers', icon: 'group' },
  { to: '/technicians', key: 'technicians', defaultLabel: 'Technicians', icon: 'engineering' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function ToolbeltLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`toolbeltLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('toolbeltLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
