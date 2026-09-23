import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/locations', key: 'locations', defaultLabel: 'Locations', icon: 'location_on' },
  { to: '/radar', key: 'radar', defaultLabel: 'Radar', icon: 'radar' },
  { to: '/alerts', key: 'alerts', defaultLabel: 'Alerts', icon: 'warning' },
  { to: '/trends', key: 'trends', defaultLabel: 'Trends', icon: 'trending_up' },
  { to: '/compare', key: 'compare', defaultLabel: 'Compare', icon: 'compare_arrows' },
  { to: '/billing', key: 'billing', defaultLabel: 'Billing', icon: 'payments' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

const DESKTOP_QUERY = '(min-width: 768px)'

/**
 * True when the viewport is md+ (768px). Drives which chrome is MOUNTED —
 * both shells own a `<main>` landmark (and the user menu), so rendering
 * both and hiding one with CSS would leave duplicate landmarks in the
 * accessibility tree and break every `locator('main')` query.
 */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(DESKTOP_QUERY).matches : true,
  )
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY)
    const onChange = (event: MediaQueryListEvent): void => setIsDesktop(event.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

/**
 * Tempest auth'd shell.
 *
 * - **md+ (≥768px)**: the shared vertical `SidebarLayout` (from
 *   `@molecule/app-sidebar-layout-react`) wrapped around the outlet —
 *   dashboard / locations / radar / alerts / trends / compare / billing /
 *   settings primary nav.
 * - **<768px**: a template-local mobile shell — sticky top bar (brand +
 *   user menu) above a horizontally scrollable chip nav — because the
 *   shared sidebar has no small-viewport collapse. Exactly one shell is
 *   mounted per breakpoint (see {@link useIsDesktop}).
 *
 * Pattern source: smart-home-dashboard's SmartHomeDashboardLayout.
 */
export function WeatherDashboardLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isDesktop = useIsDesktop()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`weatherDashboardLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  const navAriaLabel = t(
    'weatherDashboardLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )

  if (isDesktop) {
    // Desktop shell — the shared sidebar owns <main> + <Outlet />. Don't
    // wrap a second <main><Outlet /> around it or pages render twice.
    return (
      <SidebarLayout
        appName={APP_NAME}
        logoTo="/dashboard"
        navItems={navItems}
        userMenu={<UserMenu />}
        navAriaLabel={navAriaLabel}
      />
    )
  }

  return (
    <div className={cm.cn('flex min-h-dvh flex-col', cm.page)}>
      <div className="sticky top-0 z-20 border-b bg-surface-container-lowest/95 backdrop-blur-md border-outline-variant/40">
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
          )}
        >
          <NavLink
            to="/dashboard"
            className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}
          >
            {APP_NAME}
          </NavLink>
          <UserMenu />
        </header>
        <nav
          aria-label={navAriaLabel}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            cm.sp('pb', 2),
            'overflow-x-auto',
          )}
        >
          {navItems.map((item) => {
            return (
              <NavLink
                key={item.key}
                to={item.to}
                data-mol-id={`nav-${item.key}`}
                className={({ isActive }) =>
                  cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'whitespace-nowrap rounded-full border transition-colors',
                    isActive
                      ? 'bg-primary-container text-on-primary-container border-primary-container font-bold'
                      : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant/40 hover:bg-surface-container-low',
                  )
                }
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </div>
      {/* flex-1 + min-w-0: the content column fills the viewport and may
          shrink below its content width so page-level overflow-x-auto
          strips scroll, not the whole shell. */}
      <main className={cm.cn('flex-1 min-w-0')}>
        <Outlet />
      </main>
    </div>
  )
}
