import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'space_dashboard' },
  { to: '/projects', key: 'projects', defaultLabel: 'Projects', icon: 'domain' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function GroundworkLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`groundworkLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t(
        'groundworkLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
    />
  )
}
