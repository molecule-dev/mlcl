import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Today', icon: 'today' },
  { to: '/books', key: 'books', defaultLabel: 'Books', icon: 'auto_stories' },
  {
    to: '/challenge',
    key: 'challenge',
    defaultLabel: 'Challenge',
    icon: 'emoji_events',
  },
  { to: '/reviews', key: 'reviews', defaultLabel: 'Reviews', icon: 'rate_review' },
  { to: '/stats', key: 'stats', defaultLabel: 'Stats', icon: 'insights' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function BookshelfLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`bookshelfLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t(
        'bookshelfLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
    />
  )
}
