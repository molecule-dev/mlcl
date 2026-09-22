import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { useIsMobile } from '../lib/use-is-mobile.js'
import { MobileNavShell } from './MobileNavShell.js'
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
 * Signed-in shell for the auth'd Parlance experience. Wraps the shared
 * `SidebarLayout` on md+ screens; below md (768px) the shared rail would
 * crush a phone's content column to ~150px, so a template-local
 * MobileNavShell (sticky top bar + slide-in drawer) takes over —
 * conditionally rendered, never CSS-hidden, so nav `data-mol-id`s stay
 * unique in the DOM. Nav labels go through `t(...)` so the per-locale
 * translations override the defaults.
 */
export function ParlanceLayout() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`parlanceLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  if (isMobile) {
    return <MobileNavShell logoTo="/dashboard" navItems={navItems} />
  }
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
