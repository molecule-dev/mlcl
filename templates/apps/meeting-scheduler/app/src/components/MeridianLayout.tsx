import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

/**
 * Meridian app shell — left rail of nav links + scrollable main column.
 *
 * Translated from banking-dashboard's MeridianLayout.tsx pattern; nav
 * items reflect the meeting-scheduler screen-map (Calendar, EventTypes,
 * Bookings, Availability, Integrations, Notifications, Settings).
 */
const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/calendar', key: 'calendar', defaultLabel: 'Calendar', icon: 'calendar_month' },
  { to: '/bookings', key: 'bookings', defaultLabel: 'Bookings', icon: 'event_available' },
  { to: '/event-types', key: 'eventTypes', defaultLabel: 'Event types', icon: 'badge' },
  { to: '/availability', key: 'availability', defaultLabel: 'Availability', icon: 'schedule' },
  { to: '/integrations', key: 'integrations', defaultLabel: 'Integrations', icon: 'sync' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function MeridianLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`meridianLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('meridianLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}

export default MeridianLayout
