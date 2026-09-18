import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

/**
 * Vigil's authed shell — vertical sidebar with the SRE nav (Dashboard,
 * Incidents, Components, Maintenance, Subscribers, Notifications, Team,
 * Audit log, Settings) + a bottom UserMenu slot.
 *
 * Uses the shared SidebarLayout package; Vigil-specific only in nav
 * items + brand label. Kept thin so the polished Sweep 1 chrome stays
 * the source of truth.
 */

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'monitor_heart' },
  { to: '/incidents', key: 'incidents', defaultLabel: 'Incidents', icon: 'warning' },
  { to: '/components', key: 'components', defaultLabel: 'Components', icon: 'lan' },
  { to: '/maintenance', key: 'maintenance', defaultLabel: 'Maintenance', icon: 'build_circle' },
  { to: '/subscribers', key: 'subscribers', defaultLabel: 'Subscribers', icon: 'mail' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/team', key: 'team', defaultLabel: 'Team', icon: 'group' },
  { to: '/audit', key: 'auditLog', defaultLabel: 'Audit log', icon: 'history' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function StatusPageLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`statusPageLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t(
        'statusPageLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
    />
  )
}
