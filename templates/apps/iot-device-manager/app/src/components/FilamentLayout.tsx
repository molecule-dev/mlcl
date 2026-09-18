import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'monitoring' },
  { to: '/devices', key: 'devices', defaultLabel: 'Devices', icon: 'sensors' },
  { to: '/fleets', key: 'fleets', defaultLabel: 'Fleets', icon: 'hub' },
  { to: '/firmware', key: 'firmware', defaultLabel: 'Firmware', icon: 'system_update' },
  { to: '/alerts', key: 'alerts', defaultLabel: 'Alerts', icon: 'notifications_active' },
  { to: '/console', key: 'console', defaultLabel: 'Console', icon: 'terminal' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Sidebar shell for the auth'd Filament app — translated from
 * fleet-management's BearingLayout.tsx (same SidebarLayout package, same
 * material-symbols icon convention).
 */
export function FilamentLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`filamentLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('filamentLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
