import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
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
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`prismLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
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
