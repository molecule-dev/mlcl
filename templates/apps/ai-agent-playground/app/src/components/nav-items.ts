// Single source of truth for the authenticated nav targets. Shared by the
// desktop SideNavBar and the mobile drawer (MobileNavShell) so the two shells
// can never drift — only one renders at a time (matchMedia-conditioned), so
// their data-mol-ids stay unique in the DOM.
import type { useTranslation } from '@molecule/app-react'

export interface NavItem {
  path: string
  label: string
  icon: string
  matcher?: (pathname: string) => boolean
}

type T = ReturnType<typeof useTranslation>['t']

export function buildNavItems(t: T): NavItem[] {
  return [
    {
      path: '/dashboard',
      label: t('nav.dashboard', {}, { defaultValue: 'Dashboard' }),
      icon: 'dashboard',
    },
    {
      path: '/agents',
      label: t('sideNav.agents', {}, { defaultValue: 'Agents' }),
      icon: 'smart_toy',
      matcher: (p) => p.startsWith('/agents'),
    },
    {
      path: '/tools',
      label: t('sideNav.tools', {}, { defaultValue: 'Tools' }),
      icon: 'build',
    },
    {
      path: '/runs',
      label: t('sideNav.runs', {}, { defaultValue: 'Runs' }),
      icon: 'memory',
      matcher: (p) => p.startsWith('/runs'),
    },
    {
      path: '/datasets',
      label: t('sideNav.datasets', {}, { defaultValue: 'Datasets' }),
      icon: 'dataset',
    },
    {
      path: '/knowledge-bases',
      label: t('sideNav.knowledgeBases', {}, { defaultValue: 'Knowledge' }),
      icon: 'storage',
    },
    {
      path: '/models',
      label: t('nav.models', {}, { defaultValue: 'Models' }),
      icon: 'hub',
    },
    {
      path: '/profile',
      label: t('nav.profile', {}, { defaultValue: 'Profile' }),
      icon: 'person',
    },
    {
      path: '/notifications',
      label: t('settings.notifications', {}, { defaultValue: 'Notifications' }),
      icon: 'notifications',
    },
    {
      path: '/settings',
      label: t('nav.settings', {}, { defaultValue: 'Settings' }),
      icon: 'settings',
    },
  ]
}
