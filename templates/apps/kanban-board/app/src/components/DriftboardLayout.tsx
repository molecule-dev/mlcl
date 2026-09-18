import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

/**
 * Sidebar dashboard shell for the authenticated Driftboard routes.
 * Wraps `<SidebarLayout>` from `@molecule/app-sidebar-layout-react` with
 * Driftboard-specific nav items and a brand link to the Dashboard.
 */
export function DriftboardLayout() {
  const { t } = useTranslation()
  const navItems = [
    {
      to: '/dashboard',
      key: 'dashboard',
      icon: 'dashboard',
      label: t('nav.dashboard', {}, { defaultValue: 'Dashboard' }),
    },
    {
      to: '/boards',
      key: 'boards',
      icon: 'view_kanban',
      label: t('driftboardLayout.nav.boards', {}, { defaultValue: 'Boards' }),
    },
    {
      to: '/backlog',
      key: 'backlog',
      icon: 'inventory',
      label: t('driftboardLayout.nav.backlog', {}, { defaultValue: 'Backlog' }),
    },
    { to: '/team', key: 'team', icon: 'group', label: t('nav.team', {}, { defaultValue: 'Team' }) },
    {
      to: '/notifications',
      key: 'notifications',
      icon: 'notifications',
      label: t('settings.notifications', {}, { defaultValue: 'Notifications' }),
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
      logoTo="/dashboard"
      navItems={navItems}
      userMenu={<UserMenu />}
    />
  )
}

export default DriftboardLayout
