import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Authenticated app shell — vertical sidebar layout with the Pylon
 * brand, primary nav, and user menu. Wraps every signed-in route via
 * react-router's nested-route pattern.
 *
 * Translated from ci-cd-dashboard's ConduitLayout, restyled with the
 * Pylon nav vocabulary (Workspace, Collections, History, etc.).
 */

const NAV_KEYS = [
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
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`pylonShell.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
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
