import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/conversation', key: 'conversation', defaultLabel: 'Talk', icon: 'graphic_eq' },
  { to: '/history', key: 'history', defaultLabel: 'History', icon: 'history' },
  { to: '/agents', key: 'agents', defaultLabel: 'Agents', icon: 'psychology' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
  { to: '/settings/billing', key: 'billing', defaultLabel: 'Billing', icon: 'credit_card' },
] as const

/**
 * ParlanceLayout — sidebar shell for all authed routes.
 *
 * Wraps `@molecule/app-sidebar-layout-react`'s `SidebarLayout` with the
 * Vox nav set (Talk / History / Agents / Search / Profile / Settings
 * / Billing). Brand link points back to `/conversation` so the active
 * surface is always one tap away.
 */
export function ParlanceLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`parlanceLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/conversation"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('parlanceLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
