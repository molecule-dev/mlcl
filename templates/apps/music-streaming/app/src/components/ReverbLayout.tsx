import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { useIsMobile } from '../lib/use-is-mobile.js'
import { MobileNavShell } from './MobileNavShell.js'
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

/**
 * Signed-in shell — the shared `SidebarLayout` on md+ screens; below md
 * (768px) the shared rail would crush a phone's content column, so a
 * template-local MobileNavShell (sticky top bar + slide-in drawer) takes
 * over — conditionally rendered, never CSS-hidden, so nav `data-mol-id`s
 * stay unique in the DOM. The fixed NowPlayingBar docks bottom on both.
 */
export function ReverbLayout() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`reverbLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  if (isMobile) {
    return (
      <>
        <MobileNavShell logoTo="/home" navItems={navItems} />
        <NowPlayingBar />
      </>
    )
  }
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
