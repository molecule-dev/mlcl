import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Today', icon: 'today' },
  { to: '/medications', key: 'medications', defaultLabel: 'Medications', icon: 'medication' },
  { to: '/schedule', key: 'schedule', defaultLabel: 'Schedule', icon: 'event' },
  { to: '/refills', key: 'refills', defaultLabel: 'Refills', icon: 'pill' },
  { to: '/reports', key: 'reports', defaultLabel: 'Adherence', icon: 'insights' },
  { to: '/caregivers', key: 'caregivers', defaultLabel: 'Caregivers', icon: 'group' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function CapsivaLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`capsivaLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('capsivaLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
