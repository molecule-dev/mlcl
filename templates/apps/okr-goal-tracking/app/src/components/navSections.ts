/**
 * Single source of truth for the app's primary navigation, shared by the
 * desktop AscentSideNav rail and the mobile MobileNav drawer so the two
 * chrome variants can never drift apart.
 */
export interface NavItem {
  to: string
  icon: string
  labelKey: string
  defaultLabel: string
}

export const NAV_SECTIONS: Array<{ key: string; defaultLabel: string; items: NavItem[] }> = [
  {
    key: 'overview',
    defaultLabel: 'Overview',
    items: [
      { to: '/dashboard', icon: 'dashboard', labelKey: 'dashboard', defaultLabel: 'Dashboard' },
      { to: '/objectives', icon: 'flag', labelKey: 'objectives', defaultLabel: 'Objectives' },
      { to: '/check-in', icon: 'fact_check', labelKey: 'checkIn', defaultLabel: 'Weekly check-in' },
    ],
  },
  {
    key: 'team',
    defaultLabel: 'Team',
    items: [
      { to: '/team', icon: 'groups', labelKey: 'team', defaultLabel: 'Team' },
      { to: '/reviews', icon: 'rate_review', labelKey: 'reviews', defaultLabel: 'Reviews' },
      {
        to: '/notifications',
        icon: 'notifications',
        labelKey: 'notifications',
        defaultLabel: 'Notifications',
      },
    ],
  },
  {
    key: 'account',
    defaultLabel: 'Account',
    items: [
      { to: '/profile', icon: 'person', labelKey: 'profile', defaultLabel: 'Profile' },
      { to: '/settings', icon: 'settings', labelKey: 'settings', defaultLabel: 'Settings' },
      {
        to: '/settings/billing',
        icon: 'credit_card',
        labelKey: 'billing',
        defaultLabel: 'Billing',
      },
    ],
  },
]
