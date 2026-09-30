import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { useIsMobile } from '../lib/use-is-mobile.js'
import { MobileNavShell } from './MobileNavShell.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/documents', key: 'documents', defaultLabel: 'Documents', icon: 'description' },
  { to: '/upload', key: 'upload', defaultLabel: 'Upload', icon: 'upload_file' },
  { to: '/rules', key: 'rules', defaultLabel: 'Filing rules', icon: 'rule' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Shell for every signed-in Parcela page.
 *
 * Desktop (>= 768px): the shared `SidebarLayout` primitive with the
 * brand-specific nav set and teal active state rendered by the ClassMap.
 *
 * Mobile (< 768px): the shared sidebar has no collapse, so a fixed rail
 * would crush a phone's content column to ~250px. A template-local
 * MobileNavShell (sticky top bar + slide-in drawer) takes over instead —
 * conditionally RENDERED via matchMedia, never CSS-hidden, so nav
 * `data-mol-id`s are never duplicated in the DOM.
 */
export function ParcelaLayout() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()

  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`parcelaLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))

  if (isMobile) {
    return <MobileNavShell />
  }

  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={navItems}
      // Styled host for the shared control — bare, it reads as an unstyled
      // browser widget in the shared shell's bordered footer row.
      userMenu={
        <div className="w-full text-on-surface-variant hover:text-on-surface transition-colors">
          <UserMenu />
        </div>
      }
      navAriaLabel={t('parcelaLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
