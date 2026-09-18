import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

/**
 * Faultline's authed shell — vertical sidebar with the SRE nav per
 * DESIGN.md screen list (Dashboard / Issues / Discover / Performance /
 * Alerts / Releases / Projects / Notifications / Team / Settings) + a
 * bottom UserMenu slot.
 *
 * Uses the shared SidebarLayout package; Faultline-specific only in nav
 * items + brand label. Kept thin so the polished Sweep 1 chrome stays
 * the source of truth.
 */

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'monitor_heart' },
  { to: '/issues', key: 'issues', defaultLabel: 'Issues', icon: 'bug_report' },
  { to: '/discover', key: 'discover', defaultLabel: 'Discover', icon: 'travel_explore' },
  { to: '/performance', key: 'performance', defaultLabel: 'Performance', icon: 'speed' },
  { to: '/alerts', key: 'alerts', defaultLabel: 'Alerts', icon: 'notifications_active' },
  { to: '/releases', key: 'releases', defaultLabel: 'Releases', icon: 'rocket_launch' },
  { to: '/projects', key: 'projects', defaultLabel: 'Projects', icon: 'inventory_2' },
  { to: '/notifications', key: 'notifications', defaultLabel: 'Notifications', icon: 'inbox' },
  { to: '/team', key: 'team', defaultLabel: 'Team', icon: 'group' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function FaultlineLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`faultlineLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t(
        'faultlineLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
    />
  )
}
