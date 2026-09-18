import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

/**
 * Hearthstone authed-shell — vertical sidebar nav over property
 * portfolio routes. Mirrors the SidebarLayout pattern used by
 * banking-dashboard's MeridianLayout, but with a property-management
 * nav stack (Dashboard → Properties → Tenants → Maintenance → Leases
 * → Finances → Reports → Notifications → Settings).
 *
 * Translated from banking-dashboard/MeridianLayout.tsx.
 */
const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/properties', key: 'properties', defaultLabel: 'Properties', icon: 'apartment' },
  { to: '/tenants', key: 'tenants', defaultLabel: 'Tenants', icon: 'group' },
  { to: '/maintenance', key: 'maintenance', defaultLabel: 'Maintenance', icon: 'handyman' },
  { to: '/leases', key: 'leases', defaultLabel: 'Leases', icon: 'description' },
  { to: '/finances', key: 'finances', defaultLabel: 'Finances', icon: 'payments' },
  { to: '/reports', key: 'reports', defaultLabel: 'Reports', icon: 'analytics' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function PropertyManagementLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`propertyManagementLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))

  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t(
        'propertyManagementLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
    />
  )
}
