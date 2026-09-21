import { type ReactElement, useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/deals', key: 'deals', defaultLabel: 'Deals', icon: 'local_offer' },
  { to: '/near-me', key: 'near_me', defaultLabel: 'Near me', icon: 'place' },
  { to: '/merchants', key: 'merchants', defaultLabel: 'Merchants', icon: 'storefront' },
  { to: '/my-coupons', key: 'my_coupons', defaultLabel: 'My coupons', icon: 'redeem' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

interface NavItem {
  to: string
  key: string
  icon: string
  label: string
}

/** Shared SidebarLayout has no mobile collapse (240px sidebar swallows a
 * 390px viewport), so below the md breakpoint this shell renders instead:
 * a sticky top bar (brand + user menu) over a horizontally scrollable chip
 * nav. Above it, the shared SidebarLayout renders unchanged. Only one shell
 * is mounted at a time — the Outlet must never exist twice (double fetches).
 */
const MOBILE_QUERY = '(max-width: 767px)'

function useBelowMobileBreakpoint(): boolean {
  const [below, setBelow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const onChange = (e: MediaQueryListEvent) => setBelow(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return below
}

/** Same longest-prefix active-item rule the shared SidebarLayout applies. */
function resolveActiveKey(navItems: NavItem[], pathname: string): string | null {
  return navItems.reduce<string | null>((best, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return best
    if (best === null) return item.key
    const bestItem = navItems.find((i) => i.key === best)
    return bestItem && item.to.length > bestItem.to.length ? item.key : best
  }, null)
}

function MobileShell({
  navItems,
  navAriaLabel,
}: {
  navItems: NavItem[]
  navAriaLabel: string
}): ReactElement {
  const cm = getClassMap()
  const { pathname } = useLocation()
  const activeKey = resolveActiveKey(navItems, pathname)
  return (
    <div className={cm.cn(cm.pageShell, cm.page, 'flex-col')} data-mol-id="snagr-mobile-shell">
      <header className={cm.cn(cm.headerBar, cm.position('sticky'), 'top-0 z-40 shrink-0')}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            cm.sp('px', 4),
            'h-14',
          )}
        >
          <Link
            to="/dashboard"
            className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'whitespace-nowrap')}
          >
            {APP_NAME}
          </Link>
          <UserMenu />
        </div>
        <nav
          aria-label={navAriaLabel}
          data-mol-id="snagr-mobile-nav"
          className={cm.cn(
            cm.flex({ gap: 'xs' }),
            cm.sp('px', 3),
            cm.sp('pb', 2),
            'overflow-x-auto',
          )}
        >
          {navItems.map((item) => {
            const isActive = item.key === activeKey
            return (
              <Link
                key={item.key}
                to={item.to}
                data-mol-id={`nav-${item.key}`}
                aria-current={isActive ? 'page' : undefined}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  cm.roundedFull,
                  'whitespace-nowrap',
                  isActive
                    ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
                    : cm.cn(cm.textMuted, cm.link),
                )}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </header>
      <main className={cm.cn(cm.pageShellContent)} style={{ minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  )
}

export function SnagrLayout() {
  const { t } = useTranslation()
  const belowBreakpoint = useBelowMobileBreakpoint()
  const navItems = useMemo<NavItem[]>(
    () =>
      NAV_KEYS.map((item) => ({
        to: item.to,
        key: item.key,
        icon: item.icon,
        label: t(`snagrLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
      })),
    [t],
  )
  const navAriaLabel = t(
    'snagrLayout.primaryNavLabel',
    {},
    {
      defaultValue: 'Primary navigation',
    },
  ) as string

  if (belowBreakpoint) {
    return <MobileShell navItems={navItems} navAriaLabel={navAriaLabel} />
  }
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
