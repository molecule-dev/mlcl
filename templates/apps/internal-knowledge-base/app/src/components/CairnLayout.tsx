import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
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

export function CairnLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`cairnLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
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
