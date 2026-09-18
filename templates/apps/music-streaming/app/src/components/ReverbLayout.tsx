import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { NowPlayingBar } from './NowPlayingBar.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/home', key: 'home', defaultLabel: 'Home', icon: 'home' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  { to: '/library', key: 'library', defaultLabel: 'Your library', icon: 'library_music' },
  { to: '/library/liked', key: 'liked', defaultLabel: 'Liked songs', icon: 'favorite' },
  { to: '/radio', key: 'radio', defaultLabel: 'Radio', icon: 'radio' },
  { to: '/now-playing', key: 'nowPlaying', defaultLabel: 'Now playing', icon: 'graphic_eq' },
  { to: '/queue', key: 'queue', defaultLabel: 'Queue', icon: 'queue_music' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/subscription', key: 'subscription', defaultLabel: 'Subscription', icon: 'credit_card' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function ReverbLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`reverbLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <div style={{ paddingBottom: '88px' }}>
      <SidebarLayout
        appName={APP_NAME}
        logoTo="/home"
        navItems={navItems}
        userMenu={<UserMenu />}
        navAriaLabel={t('reverbLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
      />
      <NowPlayingBar />
    </div>
  )
}
