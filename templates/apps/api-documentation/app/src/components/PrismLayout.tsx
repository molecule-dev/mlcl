import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { useIsMobile } from '../lib/use-is-mobile.js'
import { PrismMobileShell } from './PrismMobileShell.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/docs', key: 'docs', defaultLabel: 'Docs', icon: 'menu_book' },
  { to: '/docs/endpoints', key: 'endpoints', defaultLabel: 'Endpoints', icon: 'api' },
  { to: '/playground', key: 'playground', defaultLabel: 'Playground', icon: 'play_arrow' },
  { to: '/docs/sdks', key: 'sdks', defaultLabel: 'SDKs', icon: 'inventory_2' },
  { to: '/docs/changelog', key: 'changelog', defaultLabel: 'Changelog', icon: 'history' },
  { to: '/docs/errors', key: 'errors', defaultLabel: 'Errors', icon: 'report' },
  { to: '/status', key: 'status', defaultLabel: 'Status', icon: 'monitor_heart' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function PrismLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`prismLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))

  // Below md (768px) the fixed 240px sidebar rail would crush a phone's
  // content column, so the template-local mobile shell (sticky top bar +
  // slide-in drawer) renders INSTEAD of the shared sidebar — conditionally
  // rendered via matchMedia, never CSS-hidden (no duplicated data-mol-ids).
  // min-w-0 on the popover root lets the account card truncate inside the
  // narrow top bar instead of clipping past the viewport edge.
  if (isMobile) {
    return (
      <PrismMobileShell
        navItems={navItems}
        userMenu={
          <div className={cm.cn(cm.flex({ align: 'center', gap: 1 }), 'min-w-0')}>
            <ThemeToggle />
            <UserMenu className="min-w-0 max-w-full" />
          </div>
        }
      />
    )
  }

  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/docs"
      navItems={navItems}
      userMenu={
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'end' }))}>
            <ThemeToggle />
          </div>
          <UserMenu />
        </div>
      }
      navAriaLabel={t('prismLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
