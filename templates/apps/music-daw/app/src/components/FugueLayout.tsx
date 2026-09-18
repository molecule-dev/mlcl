import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { TransportBar } from './TransportBar.js'
import { UserMenu } from './UserMenu.js'

/**
 * Vertical-sidebar studio shell. Reserves space at the bottom for the
 * sticky <TransportBar /> (DAW play/stop/record + BPM + timecode) so
 * page content never disappears under the transport.
 *
 * Translated from music-streaming's ReverbLayout.tsx (sidebar +
 * NowPlayingBar dock pattern), with DAW-specific nav (Studio, Projects,
 * Samples, Mixer) and the transport-bar slot.
 */

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Studio', icon: 'home' },
  { to: '/projects', key: 'projects', defaultLabel: 'Projects', icon: 'folder' },
  { to: '/samples', key: 'samples', defaultLabel: 'Samples', icon: 'library_music' },
  { to: '/profile/me', key: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function FugueLayout() {
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`fugueLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  return (
    <div style={{ paddingBottom: '72px' }}>
      <SidebarLayout
        appName={APP_NAME}
        logoTo="/dashboard"
        navItems={navItems}
        userMenu={<UserMenu />}
        navAriaLabel={t('fugueLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
      />
      <TransportBar />
    </div>
  )
}
