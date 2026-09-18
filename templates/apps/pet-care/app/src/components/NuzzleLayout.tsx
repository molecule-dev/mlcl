import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'pets' },
  { to: '/pets', key: 'pets', defaultLabel: 'Pets', icon: 'cruelty_free' },
  { to: '/sitters', key: 'sitters', defaultLabel: 'Sitters', icon: 'volunteer_activism' },
  { to: '/bookings', key: 'bookings', defaultLabel: 'Bookings', icon: 'event_available' },
  {
    to: '/vet-records',
    key: 'vetRecords',
    defaultLabel: 'Vet Records',
    icon: 'medical_information',
  },
  { to: '/medications', key: 'medications', defaultLabel: 'Medications', icon: 'medication' },
  { to: '/messages', key: 'messages', defaultLabel: 'Messages', icon: 'chat' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function NuzzleLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`nuzzleLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('nuzzleLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
      sidebarWidthClass="w-64"
    />
  )
}
