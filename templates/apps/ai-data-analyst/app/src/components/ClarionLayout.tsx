import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { useIsMobile } from '../lib/use-is-mobile.js'
import { ClarionMobileShell } from './ClarionMobileShell.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/query', key: 'query', defaultLabel: 'Query', icon: 'query_stats' },
  { to: '/datasets', key: 'datasets', defaultLabel: 'Datasets', icon: 'database' },
  { to: '/reports', key: 'reports', defaultLabel: 'Reports', icon: 'bar_chart' },
  { to: '/upload', key: 'upload', defaultLabel: 'Upload', icon: 'upload_file' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function ClarionLayout() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`clarionLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))

  // Below md (768px) the fixed 240px sidebar rail would crush a phone's
  // content column, so the template-local mobile shell (sticky top bar +
  // slide-in drawer) renders INSTEAD of the shared sidebar — conditionally
  // rendered via matchMedia, never CSS-hidden (no duplicated data-mol-ids).
  // min-w-0 on the popover root lets the account card truncate inside the
  // narrow top bar instead of clipping past the viewport edge.
  if (isMobile) {
    return (
      <ClarionMobileShell
        navItems={navItems}
        userMenu={<UserMenu className="min-w-0 max-w-full" />}
      />
    )
  }

  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('clarionLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
