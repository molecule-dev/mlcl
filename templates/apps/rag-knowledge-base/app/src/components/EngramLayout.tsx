import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { useIsMobile } from '../lib/use-is-mobile.js'
import { MobileNavShell } from './MobileNavShell.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/ask', key: 'ask', defaultLabel: 'Ask', icon: 'forum' },
  { to: '/documents', key: 'documents', defaultLabel: 'Documents', icon: 'description' },
  { to: '/sources', key: 'sources', defaultLabel: 'Sources', icon: 'cable' },
  { to: '/graph', key: 'graph', defaultLabel: 'Knowledge graph', icon: 'hub' },
  { to: '/history', key: 'history', defaultLabel: 'History', icon: 'history' },
  { to: '/analytics', key: 'analytics', defaultLabel: 'Analytics', icon: 'analytics' },
  { to: '/members', key: 'members', defaultLabel: 'Members', icon: 'group' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/billing', key: 'billing', defaultLabel: 'Billing', icon: 'credit_card' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Shell for every signed-in Engram page.
 *
 * Translated from ai-document-processor's ParcelaLayout — same SidebarLayout
 * primitive, brand-specific nav set covering the 11 auth'd routes from
 * screen-map.json. Active-state purple comes from the underlying ClassMap.
 *
 * Below `md` (768px) the fixed 240px rail would crush a phone's content
 * column, so a template-local MobileNavShell (sticky top bar + slide-in
 * drawer) takes over — conditionally rendered via matchMedia, never
 * CSS-hidden (duplicated nav data-mol-ids are the bug class that invites).
 */
export function EngramLayout() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`engramLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  const navAriaLabel = t('engramLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })
  if (isMobile) {
    return <MobileNavShell navItems={navItems} navAriaLabel={navAriaLabel} />
  }
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/ask"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={navAriaLabel}
    />
  )
}
