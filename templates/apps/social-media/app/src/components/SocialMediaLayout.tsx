import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

/**
 * Authenticated shell — left sidebar nav + UserMenu in the chrome slot.
 *
 * Translated from photo-sharing's PhotoSharingLayout.tsx, recoloured by
 * Vivid's pink/violet palette via `theme.css`. Eight primary nav entries
 * map to the eight visually-prominent screens in screen-map.json; the
 * remaining auth'd routes (PostDetail, Profile detail) are deep-linked
 * from inside their parent index pages.
 */

const NAV_KEYS = [
  { to: '/feed', key: 'feed', defaultLabel: 'Feed', icon: 'home' },
  { to: '/explore', key: 'explore', defaultLabel: 'Explore', icon: 'explore' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  { to: '/messages', key: 'messages', defaultLabel: 'Messages', icon: 'send' },
  { to: '/notifications', key: 'notifications', defaultLabel: 'Notifications', icon: 'favorite' },
  { to: '/profile/me', key: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function SocialMediaLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`socialMediaLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/feed"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t(
        'socialMediaLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
    />
  )
}
