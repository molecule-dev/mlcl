import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/inbox', key: 'inbox', defaultLabel: 'Inbox', icon: 'inbox' },
  { to: '/contacts', key: 'contacts', defaultLabel: 'Contacts', icon: 'group' },
  { to: '/groups', key: 'groups', defaultLabel: 'Groups', icon: 'forum' },
  { to: '/archive', key: 'archive', defaultLabel: 'Archive', icon: 'archive' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function HushLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`hushLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/inbox"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('hushLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
