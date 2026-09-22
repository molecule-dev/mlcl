import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { useIsMobile } from '../lib/use-is-mobile.js'
import { MobileNavShell } from './MobileNavShell.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/projects', key: 'projects', defaultLabel: 'Projects', icon: 'folder_copy' },
  { to: '/glossary', key: 'glossary', defaultLabel: 'Glossary', icon: 'menu_book' },
  { to: '/memory', key: 'memory', defaultLabel: 'Translation memory', icon: 'storage' },
  { to: '/review', key: 'review', defaultLabel: 'Review queue', icon: 'rule' },
  { to: '/team', key: 'team', defaultLabel: 'Team', icon: 'group' },
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
 * Rendition app shell.
 *
 * Desktop (≥768px): the shared SidebarLayout — brand + vertical nav + bottom
 * theme-toggle/user-menu slot (rendered by its internal <Outlet />).
 *
 * Mobile (<768px): a template-local MobileNavShell (sticky top bar + drawer).
 * The shared SidebarLayout has no collapse and crushes a 390px viewport's
 * content column to ~150px. The shell is conditionally RENDERED via matchMedia
 * (not CSS-hidden) so nav `data-mol-id`s are never duplicated in the DOM.
 */
export function RenditionLayout() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`renditionLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  const navAriaLabel = t(
    'renditionLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )

  if (isMobile) {
    return <MobileNavShell logoTo="/dashboard" navItems={navItems} navAriaLabel={navAriaLabel} />
  }

  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={
        <>
          <div style={{ marginBottom: '0.5rem' }}>
            <ThemeToggle />
          </div>
          <UserMenu />
        </>
      }
      navAriaLabel={navAriaLabel}
    />
  )
}
