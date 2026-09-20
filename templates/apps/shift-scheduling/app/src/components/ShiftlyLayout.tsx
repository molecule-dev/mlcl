/**
 * App shell — sidebar layout for the auth'd Shiftly surface. Delegates to the
 * registered `@molecule/app-sidebar-layout-react` package and supplies the
 * scheduling nav targets.
 *
 * Translated from hr-management's ArborLayout.tsx — same chrome package +
 * nav pattern, with the scheduling nav set + brand colour.
 */
import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/schedule', key: 'schedule', defaultLabel: 'Schedule', icon: 'calendar_month' },
  { to: '/open-shifts', key: 'openShifts', defaultLabel: 'Open shifts', icon: 'bolt' },
  { to: '/swap-requests', key: 'swapRequests', defaultLabel: 'Swap requests', icon: 'swap_horiz' },
  {
    to: '/availability',
    key: 'availability',
    defaultLabel: 'Availability',
    icon: 'event_available',
  },
  { to: '/staff', key: 'staff', defaultLabel: 'Staff', icon: 'group' },
  { to: '/timesheets', key: 'timesheets', defaultLabel: 'Timesheets', icon: 'receipt_long' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function ShiftlyLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`shiftlyLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('shiftlyLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
