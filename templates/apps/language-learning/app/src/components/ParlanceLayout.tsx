import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/lessons', key: 'lessons', defaultLabel: 'Lessons', icon: 'school' },
  { to: '/practice', key: 'practice', defaultLabel: 'Practice', icon: 'mic' },
  { to: '/vocabulary', key: 'vocabulary', defaultLabel: 'Vocabulary', icon: 'menu_book' },
  { to: '/leaderboard', key: 'leaderboard', defaultLabel: 'Leaderboard', icon: 'emoji_events' },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Vertical sidebar shell for the auth'd Parlance experience.
 *
 * Delegates to `@molecule/app-sidebar-layout-react`'s SidebarLayout — same
 * pattern as banking-dashboard's MeridianLayout. Nav labels go through
 * `t(...)` so the per-locale translations override the defaults.
 */
export function ParlanceLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`parlanceLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('parlanceLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}

export default ParlanceLayout
