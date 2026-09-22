/**
 * Auth'd app shell — TEMPLATE-LOCAL because the shared TopNavLayout squeezes
 * brand + nav + user menu into one flex row, which overflows a 390px phone
 * (the user menu ended up off-canvas). Fleet mobile pattern:
 *
 *   ≥ md (768px): brand + labeled inline nav + user menu (same as TopNavLayout).
 *   < md:         sticky top bar (brand + user menu) with a horizontally
 *                 scrollable CHIP NAV row underneath — every item keeps its
 *                 icon AND label, so nothing is icon-only on touch.
 */

import { NavLink, Outlet } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'travel_explore' },
  { to: '/trips', key: 'trips', defaultLabel: 'Trips', icon: 'luggage' },
  { to: '/alerts', key: 'alerts', defaultLabel: 'Alerts', icon: 'notifications_active' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function FlightSearchLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    ...item,
    label: t(`flightSearchLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  const navAriaLabel = t(
    'flightSearchLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )
  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <header className="sticky top-0 z-40 bg-surface shadow-sm">
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            'flex items-center justify-between gap-3 px-4 py-2 sm:px-6 sm:py-3',
          )}
        >
          <NavLink
            to="/"
            className={cm.cn(cm.textSize('xl'), 'sm:text-2xl shrink-0 font-bold tracking-tight')}
          >
            {APP_NAME}
          </NavLink>

          {/* Desktop nav — labeled items. */}
          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label={navAriaLabel}
            data-mol-id="primary-nav"
          >
            {navItems.map((item) => (
              <NavLink
                key={item.key}
                to={item.to}
                className={({ isActive }) =>
                  cm.cn(
                    'flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-container text-primary'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                  )
                }
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="flex min-w-0 shrink-0 items-center">
            <UserMenu />
          </div>
        </div>

        {/* Mobile chip nav — scrollable row, icon + label always visible. */}
        <nav
          className="flex gap-2 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden"
          aria-label={navAriaLabel}
          data-mol-id="primary-nav-mobile"
        >
          {navItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              className={({ isActive }) =>
                cm.cn(
                  'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
                )
              }
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
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
