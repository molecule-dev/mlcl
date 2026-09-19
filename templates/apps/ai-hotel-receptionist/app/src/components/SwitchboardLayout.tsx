import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Switchboard sidebar shell — left vertical nav + outlet for authed routes.
 * The nav is the staff workflow: dashboard → reservations → rooms & rates →
 * guests → the voice side (agents, calls, simulator).
 */
const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  {
    to: '/reservations',
    key: 'reservations',
    defaultLabel: 'Reservations',
    icon: 'event_available',
  },
  { to: '/rooms', key: 'rooms', defaultLabel: 'Rooms & Rates', icon: 'meeting_room' },
  { to: '/guests', key: 'guests', defaultLabel: 'Guests', icon: 'badge' },
  { to: '/voice-agents', key: 'voiceAgents', defaultLabel: 'Voice Agents', icon: 'graphic_eq' },
  { to: '/calls', key: 'calls', defaultLabel: 'Calls', icon: 'call' },
  { to: '/simulator', key: 'simulator', defaultLabel: 'Call Simulator', icon: 'support_agent' },
] as const

export function SwitchboardLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`switchboardLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          <UserMenu />
          <div className={cm.cn(cm.flex({ justify: 'end' }))}>
            <ThemeToggle />
          </div>
        </div>
      }
      navAriaLabel={t(
        'switchboardLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
    />
  )
}
