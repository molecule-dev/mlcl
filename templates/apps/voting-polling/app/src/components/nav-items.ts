/**
 * Single source of truth for the authenticated nav targets. Shared by the
 * desktop SidebarLayout (VotingPollingLayout) and the mobile drawer so the
 * two shells can never drift — only one renders at a time
 * (matchMedia-conditioned), so their data-mol-ids stay unique in the DOM.
 *
 * Shape matches the shared SidebarLayout's `SidebarNavItem` (`to` + a stable
 * `key` used for React keys and active-item resolution) plus a `matcher` the
 * mobile shell uses for detail routes (e.g. /polls/:id while /polls/new is
 * the only poll entry in the nav).
 */
import type { useTranslation } from '@molecule/app-react'
import type { SidebarNavItem } from '@molecule/app-sidebar-layout-react'

export interface NavItem extends SidebarNavItem {
  matcher?: (pathname: string) => boolean
}

type T = ReturnType<typeof useTranslation>['t']

export function buildNavItems(t: T): NavItem[] {
  return [
    {
      key: 'dashboard',
      to: '/dashboard',
      label: t('votingPollingLayout.nav.dashboard', {}, { defaultValue: 'Dashboard' }),
      icon: 'dashboard',
    },
    {
      key: 'createPoll',
      to: '/polls/new',
      label: t('votingPollingLayout.nav.createPoll', {}, { defaultValue: 'New poll' }),
      icon: 'add_box',
    },
    {
      key: 'voters',
      to: '/voters',
      label: t('votingPollingLayout.nav.voters', {}, { defaultValue: 'Voters' }),
      icon: 'group',
    },
    {
      key: 'analytics',
      to: '/analytics',
      label: t('votingPollingLayout.nav.analytics', {}, { defaultValue: 'Analytics' }),
      icon: 'bar_chart',
    },
    {
      key: 'notifications',
      to: '/notifications',
      label: t('votingPollingLayout.nav.notifications', {}, { defaultValue: 'Notifications' }),
      icon: 'notifications',
    },
    {
      key: 'team',
      to: '/team',
      label: t('votingPollingLayout.nav.team', {}, { defaultValue: 'Team' }),
      icon: 'shield_person',
    },
    {
      key: 'billing',
      to: '/billing',
      label: t('votingPollingLayout.nav.billing', {}, { defaultValue: 'Billing' }),
      icon: 'credit_card',
    },
    {
      key: 'settings',
      to: '/settings',
      label: t('votingPollingLayout.nav.settings', {}, { defaultValue: 'Settings' }),
      icon: 'settings',
    },
  ]
}
