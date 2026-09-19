import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

/**
 * Klaxon's authed shell — vertical sidebar with the on-call nav per
 * DESIGN.md screen list (Dashboard / Incidents / Schedules / Escalation
 * Policies / Postmortems / Team / Notifications / Settings) + a bottom
 * UserMenu slot.
 *
 * Uses the shared SidebarLayout package; Klaxon-specific only in nav
 * items + brand label. Kept thin so the shared chrome stays the source
 * of truth.
 */

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'monitor_heart' },
  { to: '/incidents', key: 'incidents', defaultLabel: 'Incidents', icon: 'notifications_active' },
  { to: '/schedules', key: 'schedules', defaultLabel: 'Schedules', icon: 'event_repeat' },
  {
    to: '/escalation-policies',
    key: 'escalationPolicies',
    defaultLabel: 'Escalation Policies',
    icon: 'moving',
  },
  { to: '/postmortems', key: 'postmortems', defaultLabel: 'Postmortems', icon: 'history_edu' },
  { to: '/team', key: 'team', defaultLabel: 'Team', icon: 'group' },
  { to: '/notifications', key: 'notifications', defaultLabel: 'Notifications', icon: 'inbox' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function OncallLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`oncallLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('oncallLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
