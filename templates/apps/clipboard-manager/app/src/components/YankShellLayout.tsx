import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { useIsMobile } from '../lib/use-is-mobile.js'
import { MobileNavShell } from './MobileNavShell.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/clips', key: 'clips', defaultLabel: 'Clips', icon: 'content_copy' },
  {
    to: '/command-palette',
    key: 'commandPalette',
    defaultLabel: 'Command palette',
    icon: 'keyboard_command_key',
  },
  { to: '/categories', key: 'categories', defaultLabel: 'Categories', icon: 'category' },
  { to: '/devices', key: 'devices', defaultLabel: 'Devices', icon: 'devices' },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { to: '/billing', key: 'billing', defaultLabel: 'Billing', icon: 'credit_card' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Signed-in shell for Yank — periwinkle wordmark up top, vertical nav,
 * UserMenu pinned to the bottom. Wraps `@molecule/app-sidebar-layout-react`
 * on md+ screens; below md (768px) the shared rail would crush a phone's
 * content column, so a template-local MobileNavShell (sticky top bar +
 * slide-in drawer) takes over — conditionally rendered, never CSS-hidden,
 * so nav `data-mol-id`s stay unique in the DOM.
 */
export function YankShellLayout() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`yankShellLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  if (isMobile) {
    return <MobileNavShell logoTo="/clips" navItems={navItems} />
  }
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/clips"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t(
        'yankShellLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
    />
  )
}

export default YankShellLayout
