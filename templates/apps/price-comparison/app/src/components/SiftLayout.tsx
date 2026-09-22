import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { useIsMobile } from '../lib/use-is-mobile.js'
import { SiftMobileShell } from './SiftMobileShell.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  { to: '/categories', key: 'categories', defaultLabel: 'Categories', icon: 'category' },
  { to: '/deals', key: 'deals', defaultLabel: 'Deals', icon: 'local_fire_department' },
  { to: '/watchlist', key: 'watchlist', defaultLabel: 'Watchlist', icon: 'visibility' },
  { to: '/alerts', key: 'alerts', defaultLabel: 'Alerts', icon: 'notifications' },
  { to: '/notifications', key: 'notifications', defaultLabel: 'Activity', icon: 'inbox' },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'account_circle' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Signed-in shell for Bargain. Wraps the shared `SidebarLayout` on md+
 * screens; below md (768px) the fixed rail would crush a 390px phone's
 * content column to ~130px, so a template-local SiftMobileShell (sticky top
 * bar + slide-in drawer) takes over — conditionally rendered via matchMedia,
 * never CSS-hidden, so nav `data-mol-id`s stay unique in the DOM.
 */
export function SiftLayout() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`siftLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  const navAriaLabel = t('siftLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })
  if (isMobile) {
    return <SiftMobileShell logoTo="/dashboard" navItems={navItems} />
  }
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={navAriaLabel}
    />
  )
}
