import { useTranslation } from '@molecule/app-react'
import { SidebarLayout, type SidebarNavItem } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { useIsMobile } from '../lib/use-is-mobile.js'
import { UserMenu } from './UserMenu.js'
import { VersalMobileShell } from './VersalMobileShell.js'

/**
 * Sidebar shell for Versal's authenticated routes.
 *
 * Desktop (>= 768px): wraps `@molecule/app-sidebar-layout-react` — quiet
 * vertical nav, brand mark top-left (Charter/Georgia serif), bottom
 * user-menu slot that picks up the violet brand on hover.
 *
 * Mobile (< 768px): the shared sidebar has no collapse, so its fixed rail
 * would crush a phone's content column to ~150px. A template-local
 * VersalMobileShell (sticky top bar + slide-in drawer) takes over instead —
 * conditionally RENDERED via matchMedia, never CSS-hidden, so nav
 * `data-mol-id`s are never duplicated in the DOM.
 *
 * Translated from ai-writing-studio's PlumeSidebarLayout (same editorial
 * cluster as note-taking's VersoLayout).
 */
export function VersalLayout() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const navItems: ReadonlyArray<SidebarNavItem> = [
    {
      to: '/library',
      key: 'library',
      icon: 'auto_stories',
      label: t('nav.library', {}, { defaultValue: 'Library' }),
    },
    {
      to: '/stats',
      key: 'stats',
      icon: 'show_chart',
      label: t('versalLayout.nav.stats', {}, { defaultValue: 'Stats' }),
    },
    {
      to: '/billing',
      key: 'billing',
      icon: 'card_membership',
      label: t('settings.billing', {}, { defaultValue: 'Billing' }),
    },
    {
      to: '/settings',
      key: 'settings',
      icon: 'settings',
      label: t('nav.settings', {}, { defaultValue: 'Settings' }),
    },
  ]

  if (isMobile) {
    return <VersalMobileShell navItems={navItems} />
  }

  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/library"
      navItems={navItems}
      userMenu={<UserMenu />}
    />
  )
}

export default VersalLayout
