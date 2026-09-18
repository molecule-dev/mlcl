import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/documents', key: 'documents', defaultLabel: 'Documents', icon: 'description' },
  { to: '/upload', key: 'upload', defaultLabel: 'Upload', icon: 'upload_file' },
  { to: '/rules', key: 'rules', defaultLabel: 'Filing rules', icon: 'rule' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Sidebar shell for every signed-in Parcela page.
 * Translated from banking-dashboard's MeridianLayout — same SidebarLayout
 * primitive, brand-specific nav set, teal active-state rendered by the
 * underlying ClassMap.
 */
export function ParcelaLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`parcelaLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('parcelaLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
