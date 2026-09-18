import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { NowPlayingBar } from './NowPlayingBar.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/discover', key: 'discover', defaultLabel: 'Discover', icon: 'explore' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  { to: '/library', key: 'library', defaultLabel: 'Library', icon: 'library_music' },
  { to: '/queue', key: 'queue', defaultLabel: 'Queue', icon: 'queue_music' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function WavelengthLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`wavelengthLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <div style={{ paddingBottom: '88px' }}>
      <SidebarLayout
        appName={APP_NAME}
        logoTo="/discover"
        navItems={navItems}
        userMenu={<UserMenu />}
        navAriaLabel={t(
          'wavelengthLayout.primaryNavLabel',
          {},
          { defaultValue: 'Primary navigation' },
        )}
      />
      <NowPlayingBar />
    </div>
  )
}
