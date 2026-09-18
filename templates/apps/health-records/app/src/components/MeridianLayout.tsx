import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'monitor_heart' },
  { to: '/records', key: 'records', defaultLabel: 'Records', icon: 'folder_shared' },
  { to: '/medications', key: 'medications', defaultLabel: 'Medications', icon: 'medication' },
  { to: '/labs', key: 'labs', defaultLabel: 'Lab Results', icon: 'science' },
  { to: '/immunizations', key: 'immunizations', defaultLabel: 'Immunizations', icon: 'vaccines' },
  { to: '/visits', key: 'visits', defaultLabel: 'Visits', icon: 'event_available' },
  { to: '/documents', key: 'documents', defaultLabel: 'Documents', icon: 'description' },
  { to: '/sharing', key: 'sharing', defaultLabel: 'Sharing', icon: 'shield_person' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'account_circle' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function MeridianLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`meridianLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('meridianLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
      sidebarWidthClass="w-64"
    />
  )
}
