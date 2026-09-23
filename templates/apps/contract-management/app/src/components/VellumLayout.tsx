import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { useIsMobile } from '../lib/use-is-mobile.js'
import { UserMenu } from './UserMenu.js'
import { VellumMobileShell } from './VellumMobileShell.js'

export const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/contracts', key: 'contracts', defaultLabel: 'Contracts', icon: 'description' },
  { to: '/templates', key: 'templates', defaultLabel: 'Templates', icon: 'article' },
  { to: '/counterparties', key: 'counterparties', defaultLabel: 'Counterparties', icon: 'group' },
  { to: '/reports', key: 'reports', defaultLabel: 'Reports', icon: 'bar_chart' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Signed-in app chrome. The shared SidebarLayout serves >=768px; below `md`
 * its fixed rail would crush a phone's content column, so a template-local
 * mobile shell (sticky top bar + slide-in drawer, same nav items) takes
 * over — conditionally rendered via matchMedia, never CSS-hidden.
 */
export function VellumLayout() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()

  if (isMobile) return <VellumMobileShell />

  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`vellumLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('vellumLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
