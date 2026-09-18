import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/shipments', key: 'shipments', defaultLabel: 'Shipments', icon: 'local_shipping' },
  { to: '/alerts', key: 'alerts', defaultLabel: 'Alerts', icon: 'warning' },
  { to: '/carriers', key: 'carriers', defaultLabel: 'Carriers', icon: 'business' },
  { to: '/analytics', key: 'analytics', defaultLabel: 'Analytics', icon: 'insights' },
  { to: '/webhooks', key: 'webhooks', defaultLabel: 'Webhooks', icon: 'webhook' },
  { to: '/team', key: 'team', defaultLabel: 'Team', icon: 'group' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function WaypointLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`waypointLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('waypointLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
