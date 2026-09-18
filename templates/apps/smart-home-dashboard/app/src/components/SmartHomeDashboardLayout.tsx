import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/overview', key: 'overview', defaultLabel: 'Overview', icon: 'dashboard' },
  { to: '/rooms', key: 'rooms', defaultLabel: 'Rooms', icon: 'home' },
  { to: '/scenes', key: 'scenes', defaultLabel: 'Scenes', icon: 'auto_awesome' },
  { to: '/automations', key: 'automations', defaultLabel: 'Automations', icon: 'bolt' },
  { to: '/energy', key: 'energy', defaultLabel: 'Energy', icon: 'eco' },
  { to: '/security', key: 'security', defaultLabel: 'Security', icon: 'shield' },
  { to: '/activity', key: 'activity', defaultLabel: 'Activity', icon: 'history' },
  { to: '/floorplan', key: 'floorplan', defaultLabel: 'Floorplan', icon: 'map' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Ember dashboard shell — vertical SidebarLayout (from
 * @molecule/app-sidebar-layout-react) wrapped around the outlet so each
 * authed page renders inside the room/automation/scene navigation.
 *
 * Pattern source: banking-dashboard's MeridianLayout.
 */
export function SmartHomeDashboardLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`smartHomeDashboardLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/overview"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t(
        'smartHomeDashboardLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
    />
  )
}
