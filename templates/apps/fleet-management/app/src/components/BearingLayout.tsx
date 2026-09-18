import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/vehicles', key: 'vehicles', defaultLabel: 'Vehicles', icon: 'local_shipping' },
  { to: '/drivers', key: 'drivers', defaultLabel: 'Drivers', icon: 'badge' },
  { to: '/routes', key: 'routes', defaultLabel: 'Routes', icon: 'route' },
  { to: '/trips', key: 'trips', defaultLabel: 'Trips', icon: 'history' },
  { to: '/maintenance', key: 'maintenance', defaultLabel: 'Maintenance', icon: 'build' },
  { to: '/alerts', key: 'alerts', defaultLabel: 'Alerts', icon: 'warning' },
  { to: '/geofences', key: 'geofences', defaultLabel: 'Geofences', icon: 'fence' },
  { to: '/reports', key: 'reports', defaultLabel: 'Reports', icon: 'monitoring' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function BearingLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`bearingLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('bearingLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
