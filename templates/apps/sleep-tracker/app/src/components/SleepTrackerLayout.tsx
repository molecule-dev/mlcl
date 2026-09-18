import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

/**
 * Somnia sidebar layout — same shell pattern as
 * mental-health-journal/MentalHealthJournalLayout and habit-tracker/
 * StreakLayout, with nav targets matched to sleep-tracker's
 * screen-map.json (Dashboard / Trends / History / Coaching / Devices /
 * Smart Alarm / Notifications / Settings + Profile in the user menu).
 */

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Tonight', icon: 'nights_stay' },
  { to: '/trends', key: 'trends', defaultLabel: 'Trends', icon: 'trending_up' },
  { to: '/history', key: 'history', defaultLabel: 'History', icon: 'menu_book' },
  { to: '/coaching', key: 'coaching', defaultLabel: 'Coaching', icon: 'self_improvement' },
  { to: '/alarm', key: 'alarm', defaultLabel: 'Smart alarm', icon: 'alarm' },
  { to: '/devices', key: 'devices', defaultLabel: 'Devices', icon: 'watch' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'account_circle' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function SleepTrackerLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`sleepTrackerLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t(
        'sleepTrackerLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
      sidebarWidthClass="w-60"
    />
  )
}
