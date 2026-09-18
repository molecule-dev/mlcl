import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

/**
 * Authenticated shell — left sidebar nav + UserMenu in the chrome slot.
 *
 * Translated from music-streaming's ReverbLayout.tsx, recoloured by
 * Obscura's warm-gold palette via `theme.css`. Six primary nav entries
 * map to the six visually-prominent screens in screen-map.json; the
 * remaining auth'd routes (PhotoDetail, AlbumDetail, Profile) are
 * deep-linked from inside their parent index pages.
 */

const NAV_KEYS = [
  { to: '/explore', key: 'explore', defaultLabel: 'Explore', icon: 'photo_library' },
  { to: '/galleries', key: 'galleries', defaultLabel: 'Galleries', icon: 'collections_bookmark' },
  { to: '/albums', key: 'albums', defaultLabel: 'Albums', icon: 'photo_album' },
  { to: '/my-photos', key: 'myPhotos', defaultLabel: 'My photos', icon: 'image' },
  { to: '/favorites', key: 'favorites', defaultLabel: 'Favorites', icon: 'favorite' },
  { to: '/upload', key: 'upload', defaultLabel: 'Upload', icon: 'cloud_upload' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function PhotoSharingLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`photoSharingLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/explore"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t(
        'photoSharingLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
    />
  )
}
