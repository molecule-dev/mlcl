import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

/**
 * Sidebar shell for Verso's authenticated routes.
 *
 * Translated from kanban-board's DriftboardLayout (which wraps
 * `@molecule/app-sidebar-layout-react`). Holds Verso's quiet, structured
 * nav — Home, Notes, Search, Graph, Tags, Settings — over the brand
 * indigo so the inside of the app reads as the same sober editorial
 * surface the marketing hero promises.
 */
export function VersoLayout() {
  const { t } = useTranslation()
  const navItems = [
    {
      to: '/home',
      key: 'home',
      icon: 'home',
      label: t('versoLayout.nav.home', {}, { defaultValue: 'Home' }),
    },
    {
      to: '/notes',
      key: 'notes',
      icon: 'description',
      label: t('form.notes', {}, { defaultValue: 'Notes' }),
    },
    {
      to: '/search',
      key: 'search',
      icon: 'search',
      label: t('common.search', {}, { defaultValue: 'Search' }),
    },
    {
      to: '/graph',
      key: 'graph',
      icon: 'hub',
      label: t('versoLayout.nav.graph', {}, { defaultValue: 'Graph' }),
    },
    { to: '/tags', key: 'tags', icon: 'sell', label: t('form.tags', {}, { defaultValue: 'Tags' }) },
    {
      to: '/settings',
      key: 'settings',
      icon: 'settings',
      label: t('nav.settings', {}, { defaultValue: 'Settings' }),
    },
  ]
  return (
    <SidebarLayout appName={APP_NAME} logoTo="/home" navItems={navItems} userMenu={<UserMenu />} />
  )
}

export default VersoLayout
