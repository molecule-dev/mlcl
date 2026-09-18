/**
 * Waypoint sidebar shell — fixed-width left sidebar with brand wordmark,
 * vertical navigation, and a footer user-menu slot. Wraps every authed
 * route (Dashboard, Trips, Bookings, Calendar, Notifications, Settings).
 *
 * Delegates layout chrome to the Sweep 1 `<SidebarLayout>` from
 * `@molecule/app-sidebar-layout-react` — the bespoke part is the nav
 * inventory (curated to Waypoint's travel-journal information
 * architecture: Dashboard → Trips → Calendar → Destinations → Bookings →
 * Expenses → Notifications → Settings).
 *
 * Translated from travel-booking's TravelBookingLayout.tsx — same
 * delegation pattern, but a sidebar (per DESIGN.md "Sidebar Width: 320px")
 * rather than top-nav, because trip planning workflows benefit from a
 * persistent navigation column with longer labels.
 */

import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/trips', key: 'trips', defaultLabel: 'Trips', icon: 'luggage' },
  { to: '/calendar', key: 'calendar', defaultLabel: 'Calendar', icon: 'calendar_month' },
  { to: '/destinations', key: 'destinations', defaultLabel: 'Destinations', icon: 'explore' },
  { to: '/bookings', key: 'bookings', defaultLabel: 'Bookings', icon: 'confirmation_number' },
  { to: '/expenses', key: 'expenses', defaultLabel: 'Expenses', icon: 'payments' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function WaypointLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`waypointLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      sidebarWidthClass="w-64"
      navAriaLabel={t('waypointLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
