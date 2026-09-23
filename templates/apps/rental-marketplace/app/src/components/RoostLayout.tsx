/**
 * Roost app shell consumed by every authed route — Search / Wishlist /
 * Bookings / Messages / Notifications / Settings / Host (with /host
 * sub-routes nested underneath).
 *
 * Template-local responsive shell (fleet pattern): one sticky header that
 * renders the brand + user menu at every breakpoint, the primary nav INLINE
 * at md+ (the shared TopNavLayout rhythm), and below md as a horizontally
 * scrollable chip row under the bar. The chip row scrolls WITHIN itself, so
 * the page never overflows at 390px — the shared top-nav layout crammed all
 * six items next to the brand and pushed the document to ~530px wide.
 */

import { Link, NavLink, Outlet } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'travel_explore' },
  { to: '/bookings', key: 'bookings', defaultLabel: 'Bookings', icon: 'luggage' },
  { to: '/wishlist', key: 'wishlist', defaultLabel: 'Wishlist', icon: 'favorite' },
  { to: '/messages', key: 'messages', defaultLabel: 'Messages', icon: 'forum' },
  { to: '/host', key: 'host', defaultLabel: 'Host', icon: 'cottage' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
] as const

export function RoostLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`roostLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  const navAriaLabel = t('roostLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <header className={cm.cn('sticky top-0 z-40 bg-surface shadow-sm')}>
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            'px-4 md:px-6',
            cm.sp('py', 3),
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          )}
        >
          <Link
            to="/"
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              'shrink-0 whitespace-nowrap',
            )}
          >
            {APP_NAME}
          </Link>

          {/* Desktop: inline nav, same rhythm as the shared top-nav layout.
              Raw `hidden md:flex` — cm.flex would emit an unconditional
              `flex` that twMerge resolves against `hidden` (last wins),
              un-hiding the row on mobile. Labels join at lg; below that the
              six items stay icon-only so 768px tablets fit. */}
          <nav className={cm.cn('hidden md:flex items-center gap-2')} aria-label={navAriaLabel}>
            {navItems.map((item) => (
              <NavLink
                key={item.key}
                to={item.to}
                className={({ isActive }) =>
                  cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'rounded-md transition-colors whitespace-nowrap',
                    isActive
                      ? cm.cn('bg-primary-container', cm.textPrimary)
                      : cm.cn(cm.textMuted, 'hover:bg-surface-container hover:text-on-surface'),
                  )
                }
              >
                {item.icon ? (
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {item.icon}
                  </span>
                ) : null}
                <span className="hidden lg:inline">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <UserMenu />
        </div>

        {/* Mobile: horizontally scrollable chip nav — scrolls within itself
            so six destinations never push the document past the viewport. */}
        <nav className={cm.cn('md:hidden overflow-x-auto')} aria-label={navAriaLabel}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              'flex-nowrap gap-1 px-3 pb-2 w-max min-w-full',
            )}
          >
            {navItems.map((item) => (
              <NavLink
                key={item.key}
                to={item.to}
                className={({ isActive }) =>
                  cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 3),
                    'py-2',
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'shrink-0 rounded-full transition-colors whitespace-nowrap',
                    isActive
                      ? cm.cn('bg-primary-container', cm.textPrimary)
                      : cm.cn(cm.textMuted, 'bg-surface-container hover:text-on-surface'),
                  )
                }
              >
                {item.icon ? (
                  <span className="material-symbols-outlined text-base" aria-hidden="true">
                    {item.icon}
                  </span>
                ) : null}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
