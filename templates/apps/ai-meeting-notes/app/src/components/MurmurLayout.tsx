import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/meetings', key: 'meetings', defaultLabel: 'Meetings', icon: 'event_note' },
  { to: '/record', key: 'record', defaultLabel: 'Record', icon: 'mic' },
  { to: '/calendar', key: 'calendar', defaultLabel: 'Calendar', icon: 'calendar_month' },
  { to: '/actions', key: 'actions', defaultLabel: 'Action items', icon: 'task_alt' },
  { to: '/team', key: 'team', defaultLabel: 'Team', icon: 'group' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  { to: '/integrations', key: 'integrations', defaultLabel: 'Integrations', icon: 'extension' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function MurmurLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`murmurLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('murmurLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
