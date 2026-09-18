import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { GlobalShortcuts } from './GlobalShortcuts.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/today', key: 'today', defaultLabel: 'Today', icon: 'today' },
  { to: '/inbox', key: 'inbox', defaultLabel: 'Inbox', icon: 'inbox' },
  { to: '/upcoming', key: 'upcoming', defaultLabel: 'Upcoming', icon: 'calendar_month' },
  { to: '/projects', key: 'projects', defaultLabel: 'Projects', icon: 'folder' },
  { to: '/labels', key: 'labels', defaultLabel: 'Labels', icon: 'label' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function CadenceLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`cadenceLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <>
      <GlobalShortcuts />
      <SidebarLayout
        appName={APP_NAME}
        logoTo="/today"
        navItems={navItems}
        userMenu={<UserMenu />}
        navAriaLabel={t(
          'cadenceLayout.primaryNavLabel',
          {},
          { defaultValue: 'Primary navigation' },
        )}
      />
    </>
  )
}
