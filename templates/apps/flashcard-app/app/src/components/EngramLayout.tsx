import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { useIsMobile } from '../lib/use-is-mobile.js'
import { MobileNavShell } from './MobileNavShell.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Today', icon: 'auto_stories' },
  { to: '/decks', key: 'decks', defaultLabel: 'Decks', icon: 'style' },
  { to: '/stats', key: 'stats', defaultLabel: 'Stats', icon: 'insights' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Signed-in shell. Wraps the shared `SidebarLayout` on md+ screens; below
 * md (768px) the shared rail would crush a phone's content column, so a
 * template-local MobileNavShell (sticky top bar + slide-in drawer) takes
 * over — conditionally rendered, never CSS-hidden, so nav `data-mol-id`s
 * stay unique in the DOM.
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
  if (isMobile) {
    return <MobileNavShell logoTo="/dashboard" navItems={navItems} />
  }
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('engramLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
