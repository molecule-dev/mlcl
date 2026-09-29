/**
 * Sojourn travel-booking shell — consumed by every authed route
 * (Search/Trips/Favorites/Notifications/Account).
 *
 * Two shells, one breakpoint, never both mounted (a CSS `hidden` pair would
 * mount the page's <Outlet> twice — double fetches + duplicate data-mol-ids):
 *
 * - ≥768px: delegates to the Sweep 1 `@molecule/app-top-nav-layout-react`
 *   package, supplying the brand nav items (Search, Trips, Favorites,
 *   Notifications) and the bespoke `UserMenu` slot.
 * - <768px: template-local mobile shell (fleet pattern). The shared
 *   TopNavLayout's brand + 4 icon links + UserMenu overflow a 390px header
 *   (measured scrollWidth 426 vs 390 — the UserMenu avatar was pushed half
 *   off-canvas, unreachable). Here the nav collapses into a horizontally
 *   scrollable chip row under a compact top bar; chips keep their labels
 *   (icons alone lost the labels below md) and stay ≥44px tall.
 *
 * Translated from hotel-booking's SojournLayout.tsx — same nav rhythm,
 * but `Search` is the primary call-to-action because travel-booking's
 * funnel begins with discovery rather than with a destination already
 * picked.
 */

import type { JSX } from 'react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { TopNavLayout } from '@molecule/app-top-nav-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'travel_explore' },
  { to: '/trips', key: 'trips', defaultLabel: 'Trips', icon: 'luggage' },
  { to: '/favorites', key: 'favorites', defaultLabel: 'Favorites', icon: 'favorite' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
] as const

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window === 'undefined' || window.matchMedia('(min-width: 768px)').matches,
  )
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)')
    const onChange = (e: MediaQueryListEvent): void => setIsDesktop(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

function MobileShell(): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navAriaLabel = t(
    'travelBookingLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )
  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <header className={cm.cn('sticky top-0 z-40 bg-surface shadow-sm')}>
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            'px-4 py-2',
          )}
        >
          <BrandWordmark />
          <UserMenu />
        </div>
        <nav
          aria-label={navAriaLabel}
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.flex({ align: 'center', gap: 'xs' }),
            'px-2 pb-1.5 overflow-x-auto',
          )}
        >
          {NAV_KEYS.map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              className={({ isActive }) =>
                cm.cn(
                  cm.flex({ align: 'center', gap: 'xs', wrap: 'nowrap' }),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'min-h-[44px] shrink-0 items-center rounded-full px-3 transition-colors',
                  isActive
                    ? cm.cn('bg-primary-container', cm.textPrimary)
                    : cm.cn(cm.textMuted, 'hover:bg-surface-container hover:text-on-surface'),
                )
              }
            >
              <span className="material-symbols-outlined text-xl" aria-hidden="true">
                {item.icon}
              </span>
              {t(`travelBookingLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
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

export function TravelBookingLayout() {
  const { t } = useTranslation()
  const isDesktop = useIsDesktop()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`travelBookingLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  if (!isDesktop) return <MobileShell />
  return (
    <TopNavLayout
      appName={APP_NAME}
      logoTo="/"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t(
        'travelBookingLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
    />
  )
}
