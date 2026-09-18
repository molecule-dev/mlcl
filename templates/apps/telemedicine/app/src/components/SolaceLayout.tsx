import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'monitor_heart' },
  {
    to: '/appointments',
    key: 'appointments',
    defaultLabel: 'Appointments',
    icon: 'calendar_month',
  },
  { to: '/patients', key: 'patients', defaultLabel: 'Patients', icon: 'group' },
  { to: '/records', key: 'records', defaultLabel: 'Records', icon: 'folder_shared' },
  { to: '/prescriptions', key: 'prescriptions', defaultLabel: 'Prescriptions', icon: 'medication' },
  { to: '/messages', key: 'messages', defaultLabel: 'Messages', icon: 'chat' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function SolaceLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`solaceLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('solaceLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
