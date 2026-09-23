import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { useIsMobile } from '../lib/use-is-mobile.js'
import { SpoolMobileShell } from './SpoolMobileShell.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/home', key: 'home', defaultLabel: 'Home', icon: 'home' },
  { to: '/trending', key: 'trending', defaultLabel: 'Trending', icon: 'trending_up' },
  {
    to: '/subscriptions',
    key: 'subscriptions',
    defaultLabel: 'Subscriptions',
    icon: 'subscriptions',
  },
  { to: '/library', key: 'library', defaultLabel: 'Library', icon: 'video_library' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  { to: '/upload', key: 'upload', defaultLabel: 'Upload', icon: 'upload' },
  { to: '/studio', key: 'studio', defaultLabel: 'Creator studio', icon: 'analytics' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Sidebar shell for all authenticated Spool screens.
 *
 * Desktop (>= 768px): wraps `@molecule/app-sidebar-layout-react` with the
 * Spool nav (Home / Trending / Subscriptions / Library / Search / Upload /
 * Studio / Notifications / Settings).
 *
 * Mobile (< 768px): the shared sidebar has no collapse, so its fixed 240px
 * rail would crush a phone's content column to ~150px. A template-local
 * SpoolMobileShell (sticky top bar + slide-in drawer) takes over instead —
 * conditionally RENDERED via matchMedia, never CSS-hidden, so nav
 * `data-mol-id`s are never duplicated in the DOM.
 *
 * Translated from music-streaming's ReverbLayout.tsx, using
 * video-domain icons (`subscriptions`, `video_library`, etc.) and the
 * Spool nav vocabulary.
 */
export function SpoolLayout() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`spoolLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))

  if (isMobile) {
    return <SpoolMobileShell navItems={navItems} />
  }

  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/home"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t('spoolLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
