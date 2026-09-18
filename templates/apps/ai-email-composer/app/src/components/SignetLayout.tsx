import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/inbox', key: 'inbox', defaultLabel: 'Inbox', icon: 'inbox' },
  { to: '/compose', key: 'compose', defaultLabel: 'Compose', icon: 'edit_note' },
  { to: '/templates', key: 'templates', defaultLabel: 'Templates', icon: 'dashboard_customize' },
  { to: '/analytics', key: 'analytics', defaultLabel: 'Analytics', icon: 'insights' },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { to: '/billing', key: 'billing', defaultLabel: 'Billing', icon: 'credit_card' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Signet's authenticated shell — vertical sidebar with the brand wordmark
 * at the top, every primary route in the middle, and the user menu pinned
 * to the bottom. Wraps the molecule SidebarLayout for chrome conformance.
 */
export function SignetLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`signetLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('signetLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
