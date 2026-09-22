import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { useIsMobile } from '../lib/use-is-mobile.js'
import { CairnMobileNav } from './CairnMobileNav.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/home', key: 'home', defaultLabel: 'Home', icon: 'home' },
  { to: '/spaces', key: 'spaces', defaultLabel: 'Spaces', icon: 'folder_special' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  { to: '/drafts', key: 'drafts', defaultLabel: 'Drafts', icon: 'edit_note' },
  { to: '/bookmarks', key: 'bookmarks', defaultLabel: 'Bookmarks', icon: 'bookmark' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
  { to: '/pricing', key: 'pricing', defaultLabel: 'Plans', icon: 'workspace_premium' },
] as const

/**
 * Signed-in shell for Cairn. Wraps the shared `SidebarLayout` on md+
 * screens; below md (768px) the shared rail would crush a phone's content
 * column, so a template-local `CairnMobileNav` (sticky top bar + slide-in
 * drawer) takes over — conditionally rendered, never CSS-hidden, so nav
 * `data-mol-id`s stay unique in the DOM.
 */
export function CairnLayout() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`cairnLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  if (isMobile) {
    return <CairnMobileNav logoTo="/home" navItems={navItems} />
  }
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/home"
      navItems={navItems}
      userMenu={<UserMenu />}
      themeToggle={<ThemeToggle />}
      navAriaLabel={t('cairnLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
