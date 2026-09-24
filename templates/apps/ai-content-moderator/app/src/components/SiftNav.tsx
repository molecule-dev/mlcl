import { useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SafeLink } from './SafeLink.js'
import { useSiftNavBadges } from './useSiftNavBadges.js'

interface SiftNavLink {
  to: string
  icon: string
  labelKey: string
  defaultLabel: string
  match?: (pathname: string) => boolean
  badgeKey?: 'queue' | 'notifications'
}

const LINKS: SiftNavLink[] = [
  { to: '/dashboard', icon: 'dashboard', labelKey: 'sidebar.dashboard', defaultLabel: 'Dashboard' },
  {
    to: '/queue',
    icon: 'inventory_2',
    labelKey: 'sidebar.queue',
    defaultLabel: 'Queue',
    match: (p) => p.startsWith('/queue'),
    badgeKey: 'queue',
  },
  { to: '/rules', icon: 'rule', labelKey: 'sidebar.rules', defaultLabel: 'Rules' },
  {
    to: '/analytics',
    icon: 'analytics',
    labelKey: 'sidebar.analytics',
    defaultLabel: 'Analytics',
  },
  {
    to: '/notifications',
    icon: 'notifications_active',
    labelKey: 'sidebar.notifications',
    defaultLabel: 'Notifications',
    badgeKey: 'notifications',
  },
  { to: '/settings', icon: 'settings', labelKey: 'sidebar.settings', defaultLabel: 'Settings' },
]

/**
 * The console nav links — the ONE nav element handed to BOTH shell surfaces
 * (`ResponsiveAppShell.Sidebar` ≥768px and `.Drawer` <768px). Only the
 * mounted breakpoint instantiates it, so the badge fetch in
 * `useSiftNavBadges` runs exactly once on whichever surface is live.
 */
export function SiftNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { queued, unread } = useSiftNavBadges(pathname)

  const badgeFor = (key: SiftNavLink['badgeKey']): string | null => {
    if (key === 'queue' && queued && queued > 0) return String(queued)
    if (key === 'notifications' && unread && unread > 0) return String(unread)
    return null
  }

  const itemBase =
    'flex items-center gap-3 px-4 py-3 rounded-md font-inter tracking-tight text-base transition-colors duration-150'
  const inactive = `${itemBase} text-secondary-fixed-dim font-medium hover:bg-primary/10 hover:text-white`
  const active = `${itemBase} text-white font-bold bg-primary/15 border-l-2 border-primary`

  return (
    <ul className={cm.cn(cm.flex1, cm.stack(1))}>
      {LINKS.map((link) => {
        const isActive = link.match
          ? link.match(pathname)
          : pathname === link.to || pathname.startsWith(`${link.to}/`)
        const badge = link.badgeKey ? badgeFor(link.badgeKey) : null
        return (
          <li key={link.to}>
            <SafeLink
              to={link.to}
              data-mol-id={`sidebar-${link.icon}`}
              aria-current={isActive ? 'page' : undefined}
              className={isActive ? active : inactive}
            >
              <span
                aria-hidden="true"
                className={cm.cn('material-symbols-outlined text-[20px]')}
                data-icon={link.icon}
              >
                {link.icon}
              </span>
              <span className={cm.cn(cm.flex1, 'truncate')}>
                {t(link.labelKey, {}, { defaultValue: link.defaultLabel })}
              </span>
              {badge && (
                <span
                  data-mol-id={`sidebar-badge-${link.badgeKey}`}
                  className={cm.cn(
                    'ml-auto inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-primary text-on-primary text-[10px] font-bold tracking-wide',
                  )}
                >
                  {badge}
                </span>
              )}
            </SafeLink>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Profile link rendered below the nav — passed as the `footer` slot of both
 * shell surfaces (the shell keeps it OUTSIDE the `<nav>` landmark).
 */
export function SiftNavFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const itemBase =
    'flex items-center gap-3 px-4 py-3 rounded-md font-inter tracking-tight text-base transition-colors duration-150'
  const inactive = `${itemBase} text-secondary-fixed-dim font-medium hover:bg-primary/10 hover:text-white`
  const active = `${itemBase} text-white font-bold bg-primary/15 border-l-2 border-primary`

  return (
    <SafeLink
      to="/profile"
      data-mol-id="sidebar-profile"
      aria-current={pathname === '/profile' ? 'page' : undefined}
      className={pathname === '/profile' ? active : inactive}
    >
      <span
        aria-hidden="true"
        className={cm.cn('material-symbols-outlined text-[20px]')}
        data-icon="account_circle"
      >
        account_circle
      </span>
      <span>{t('nav.profile', {}, { defaultValue: 'Profile' })}</span>
    </SafeLink>
  )
}
