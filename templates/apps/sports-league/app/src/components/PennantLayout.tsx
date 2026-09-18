import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'sports_score' },
  { to: '/standings', key: 'standings', defaultLabel: 'Standings', icon: 'leaderboard' },
  { to: '/matches', key: 'matches', defaultLabel: 'Matches', icon: 'stadium' },
  { to: '/schedule', key: 'schedule', defaultLabel: 'Schedule', icon: 'event' },
  { to: '/teams', key: 'teams', defaultLabel: 'Teams', icon: 'shield' },
  { to: '/players', key: 'players', defaultLabel: 'Players', icon: 'person' },
  { to: '/stats', key: 'stats', defaultLabel: 'Stats', icon: 'bar_chart' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'badge' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Pennant dashboard shell — vertical SidebarLayout wrapped around the
 * outlet so each authed page renders inside the standings/teams/stats
 * navigation.
 *
 * Translated from smart-home-dashboard's SmartHomeDashboardLayout — same
 * sidebar-layout-react chrome, sports-domain navigation icons (shield,
 * stadium, leaderboard), Pennant brand wordmark on the logo slot.
 */
export function PennantLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`pennantLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('pennantLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
