/**
 * Authenticated app shell for Morsel.
 *
 * Desktop (md+): sticky top-nav with the brand mark, four primary nav
 * items (Discover, Favorites, Lists, Notifications) as icon+label links,
 * and a UserMenu slot on the right — the classic TopNavLayout shape.
 *
 * Mobile (<md): the shared TopNavLayout crams brand + four icon links +
 * the UserMenu avatar into one 390px row and the avatar clips off-screen
 * (fleet QA 2026-09: scrollWidth 411 vs 390 on every authed route). So
 * below md this template-local shell splits the chrome: a sticky top bar
 * holding ONLY brand + UserMenu, and a second sticky row of four
 * icon+label nav chips — full labels, ≥44px tall, evenly spaced across
 * the width. Same destinations, nothing clipped, no drawer state needed.
 */

import type { JSX } from 'react'
import { Link, NavLink, Outlet } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/discover', key: 'discover', defaultLabel: 'Discover', icon: 'explore' },
  { to: '/favorites', key: 'favorites', defaultLabel: 'Favorites', icon: 'favorite' },
  { to: '/lists', key: 'lists', defaultLabel: 'Lists', icon: 'bookmarks' },
  { to: '/notifications', key: 'notifications', defaultLabel: 'Activity', icon: 'notifications' },
] as const

export function RestaurantReviewLayout(): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`restaurantReviewLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  const navAriaLabel = t(
    'restaurantReviewLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cm.cn(
      cm.flex({ align: 'center', gap: 'xs' }),
      cm.sp('px', 3),
      cm.sp('py', 2),
      cm.textSize('sm'),
      cm.fontWeight('medium'),
      'rounded-md transition-colors',
      isActive
        ? cm.cn('bg-primary-container', cm.textPrimary)
        : cm.cn(cm.textMuted, 'hover:bg-surface-container hover:text-on-surface'),
    )

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <header className={cm.cn('sticky top-0 z-40 bg-surface shadow-sm')}>
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.flex({ align: 'center', justify: 'between', gap: 'lg' }),
          )}
        >
          <Link
            to="/discover"
            className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'shrink-0')}
            style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
          >
            {APP_NAME}
          </Link>
          <nav
            className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'hidden md:flex')}
            aria-label={navAriaLabel}
          >
            {navItems.map((item) => (
              <NavLink key={item.key} to={item.to} className={linkClass}>
                {item.icon ? (
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {item.icon}
                  </span>
                ) : null}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'shrink-0 md:order-none order-2')}>
            <UserMenu />
          </div>
        </div>

        {/* Mobile chip nav — brand + avatar alone cannot fit four nav items
            at 390px, so they get their own row with visible labels. */}
        <nav
          className={cm.cn('md:hidden grid grid-cols-4 border-t border-outline-variant/40')}
          aria-label={navAriaLabel}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              className={({ isActive }) =>
                cm.cn(
                  cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'xs' }),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'min-h-[3rem] px-1 transition-colors',
                  isActive
                    ? cm.cn('text-primary', 'bg-primary/5')
                    : cm.cn(cm.textMuted, 'hover:bg-surface-container'),
                )
              }
            >
              <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
                {item.icon}
              </span>
              <span className="leading-none">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
