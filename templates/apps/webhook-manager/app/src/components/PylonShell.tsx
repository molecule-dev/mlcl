import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

/**
 * Authenticated app shell — vertical sidebar layout with the Pylon
 * brand wordmark, primary nav covering every authenticated route in
 * `screen-map.json`, bottom user-menu slot. Built on
 * @molecule/app-sidebar-layout-react (the always-available chrome
 * package) so we get the polished aside + main + outlet wiring for
 * free.
 *
 * Translated from api-testing-tool's PylonShell — same
 * SidebarLayout primitive, nav items repointed at webhook-manager's
 * IA: dashboard, endpoints, deliveries, events, notifications,
 * audit, settings.
 */

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'space_dashboard' },
  { to: '/endpoints', key: 'endpoints', defaultLabel: 'Endpoints', icon: 'cloud_sync' },
  { to: '/deliveries', key: 'deliveries', defaultLabel: 'Deliveries', icon: 'send' },
  { to: '/events', key: 'events', defaultLabel: 'Events', icon: 'bolt' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications_active',
  },
  { to: '/audit', key: 'audit', defaultLabel: 'Audit log', icon: 'lock_clock' },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function PylonShell() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`pylonShell.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('pylonShell.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
