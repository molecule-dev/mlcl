import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { useIsMobile } from '../lib/use-is-mobile.js'
import { PylonMobileShell } from './PylonMobileShell.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Authenticated app shell — vertical sidebar layout with the Pylon
 * brand, primary nav, and user menu. Wraps every signed-in route via
 * react-router's nested-route pattern.
 *
 * Below the `md` breakpoint (768px) the fixed sidebar rail would crush a
 * phone's content column, so a template-local mobile shell (sticky top bar +
 * slide-in drawer) takes over — conditionally rendered via matchMedia, never
 * CSS-hidden, so nav `data-mol-id`s are never duplicated in the DOM.
 *
 * Translated from ci-cd-dashboard's ConduitLayout, restyled with the
 * Pylon nav vocabulary (Workspace, Collections, History, etc.).
 */

export const NAV_KEYS = [
  { to: '/workspace', key: 'workspace', defaultLabel: 'Workspace', icon: 'terminal' },
  { to: '/collections', key: 'collections', defaultLabel: 'Collections', icon: 'folder' },
  { to: '/environments', key: 'environments', defaultLabel: 'Environments', icon: 'database' },
  { to: '/history', key: 'history', defaultLabel: 'History', icon: 'history' },
  { to: '/mocks', key: 'mocks', defaultLabel: 'Mocks', icon: 'dns' },
  { to: '/tests', key: 'tests', defaultLabel: 'Tests', icon: 'check_circle' },
  { to: '/monitors', key: 'monitors', defaultLabel: 'Monitors', icon: 'monitor_heart' },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function PylonShell() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`pylonShell.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  if (isMobile) {
    return <PylonMobileShell />
  }
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/workspace"
      navItems={navItems}
      userMenu={
        <div className={cm.cn('flex items-center gap-2')}>
          <ThemeToggle />
          <UserMenu />
        </div>
      }
      navAriaLabel={t('pylonShell.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
