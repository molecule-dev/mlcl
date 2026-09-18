import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

/**
 * Sidebar shell for Versal's authenticated routes.
 *
 * Translated from note-taking's VersoLayout (which wraps
 * `@molecule/app-sidebar-layout-react`). Verso/Versal share the same
 * editorial cluster — quiet vertical nav, brand mark in the top-left
 * (Charter/Georgia serif), and a bottom user-menu slot that picks up
 * the violet brand on hover.
 */
export function VersalLayout() {
  const { t } = useTranslation()
  const navItems = [
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
