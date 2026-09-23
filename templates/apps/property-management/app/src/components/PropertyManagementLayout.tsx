import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/properties', key: 'properties', defaultLabel: 'Properties', icon: 'apartment' },
  { to: '/tenants', key: 'tenants', defaultLabel: 'Tenants', icon: 'group' },
  { to: '/maintenance', key: 'maintenance', defaultLabel: 'Maintenance', icon: 'handyman' },
  { to: '/leases', key: 'leases', defaultLabel: 'Leases', icon: 'description' },
  { to: '/finances', key: 'finances', defaultLabel: 'Finances', icon: 'payments' },
  { to: '/reports', key: 'reports', defaultLabel: 'Reports', icon: 'analytics' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Hearthstone authed shell — vertical sidebar nav over property portfolio
 * routes (Dashboard → Properties → Tenants → Maintenance → Leases →
 * Finances → Reports → Notifications → Settings).
 *
 * Desktop (≥768px): fixed 240px sidebar, template-local copy of the shared
 * SidebarLayout pattern. Below 768px the sidebar is hidden and a sticky top
 * bar + slide-in drawer take over — the fleet mobile-shell pattern (tap
 * targets ≥40px, drawer closes on navigation so the user never lands on a
 * page with the menu still open, Escape closes so keyboard users are never
 * trapped). The shared SidebarLayout has no mobile collapse, so this shell
 * is template-local by design.
 */
export function PropertyManagementLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Close the drawer whenever the route changes (nav link was followed).
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // Close on Escape so keyboard users are never trapped in the overlay.
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const navItems = NAV_KEYS.map((item) => ({
    ...item,
    label: t(`propertyManagementLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))

  // Single-active-item resolution: highlight the nav item whose `to` is the
  // longest prefix-match of the current pathname.
  const activeKey =
    navItems.reduce<string | null>((bestKey, item) => {
      const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
      if (!isMatch) return bestKey
      if (bestKey === null) return item.key
      const best = navItems.find((i) => i.key === bestKey)
      return best && item.to.length > best.to.length ? item.key : bestKey
    }, null) ?? ''

  // safeTarget: when a Link's destination matches the current path, append
  // a `#top` fragment so clicking still produces an observable URL change.
  const safeTarget = (to: string): string => {
    const samePath = pathname === to || pathname + '/' === to
    return samePath ? `${to.replace(/\/$/, '')}#top` : to
  }

  const navLinkClass = (isActive: boolean): string =>
    cm.cn(
      cm.flex({ align: 'center', gap: 'sm' }),
      cm.sp('px', 3),
      cm.sp('py', 2),
      cm.textSize('sm'),
      cm.fontWeight('medium'),
      'rounded-md transition-colors min-h-[40px]',
      isActive
        ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
        : cm.cn(cm.textMuted, 'hover:bg-surface-container hover:text-on-surface'),
    )

  const renderNav = (idPrefix: string): React.ReactNode[] =>
    navItems.map((item) => {
      const isActive = item.key === activeKey
      return (
        <Link
          key={item.key}
          to={safeTarget(item.to)}
          data-mol-id={idPrefix + `nav-${item.key}`}
          aria-current={isActive ? 'page' : undefined}
          className={navLinkClass(isActive)}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {item.icon}
          </span>
          <span>{item.label}</span>
        </Link>
      )
    })

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ direction: 'col' }),
        'bg-background text-on-surface antialiased',
      )}
      data-mol-id="property-management-layout"
    >
      <div className={cm.cn(cm.flex({ direction: 'row' }), cm.flex1, 'min-w-0')}>
        {/* Desktop sidebar (≥ md) */}
        <aside
          className={cm.cn(
            cm.sp('p', 4),
            cm.shrink0,
            cm.flex({ direction: 'col' }),
            'hidden md:flex w-60 bg-surface border-r border-outline-variant',
          )}
          data-mol-id="side-nav"
        >
          <Link
            to={safeTarget('/dashboard')}
            data-mol-id="nav-app-home"
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              cm.sp('mb', 6),
              'inline-flex min-h-[40px] items-center',
            )}
          >
            {APP_NAME}
          </Link>

          <nav
            className={cm.cn(cm.flex1, 'space-y-1')}
            aria-label={t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })}
          >
            {renderNav('')}
          </nav>

          <div
            className={cm.cn(
              cm.sp('pt', 4),
              cm.flex({ align: 'center', gap: 'sm', justify: 'end' }),
              'border-t border-outline-variant',
            )}
          >
            <ThemeToggle />
          </div>

          <div className={cm.sp('pt', 3)}>
            <UserMenu />
          </div>
        </aside>

        {/* pt-14 clears the fixed mobile top bar (rendered after this row so
            the first heading/button in DOM order is page content, never the
            hidden-at-desktop bar chrome — the generated e2e smoke locators
            resolve `.first()` in DOM order). */}
        <main className={cm.cn(cm.flex1, 'min-w-0 overflow-y-auto', 'pt-14 md:pt-0')}>
          <Outlet />
        </main>
      </div>

      {/* Mobile top bar (below md). FIXED, not sticky, and deliberately placed
          AFTER the sidebar/main row: at desktop it is display:none, and any
          `.first()` DOM-order locator (generated smoke specs) must resolve to
          page content rather than hidden chrome. */}
      <header
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm', justify: 'between' }),
          cm.sp('px', 4),
          'md:hidden fixed top-0 inset-x-0 z-30 h-14 bg-surface border-b border-outline-variant',
        )}
        data-mol-id="mobile-top-bar"
      >
        <button
          type="button"
          data-mol-id="nav-mobile-toggle"
          aria-label={t('nav.openMenu', {}, { defaultValue: 'Open menu' })}
          aria-expanded={drawerOpen}
          aria-controls="mobile-drawer"
          onClick={() => setDrawerOpen(true)}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'h-10 w-10 -ml-2 rounded-md text-on-surface hover:bg-surface-container',
          )}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            menu
          </span>
        </button>
        <Link
          to={safeTarget('/dashboard')}
          data-mol-id="nav-app-home-mobile"
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('bold'),
            'inline-flex min-h-[40px] items-center',
          )}
        >
          {APP_NAME}
        </Link>
        <div className="h-10 w-10" aria-hidden="true" />
      </header>

      {/* Mobile drawer (below md) */}
      {drawerOpen ? (
        <div className="md:hidden fixed inset-0 z-40" data-mol-id="mobile-drawer-root">
          <button
            type="button"
            aria-label={t('nav.closeMenu', {}, { defaultValue: 'Close menu' })}
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-on-surface/40"
            data-mol-id="mobile-drawer-backdrop"
          />
          <div
            id="mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })}
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              cm.sp('p', 4),
              'absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-surface border-r border-outline-variant overflow-y-auto',
            )}
            data-mol-id="mobile-drawer"
          >
            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}
            >
              <span className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>{APP_NAME}</span>
              <button
                type="button"
                data-mol-id="nav-mobile-close"
                aria-label={t('nav.closeMenu', {}, { defaultValue: 'Close menu' })}
                onClick={() => setDrawerOpen(false)}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'h-10 w-10 rounded-md text-on-surface hover:bg-surface-container',
                )}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  close
                </span>
              </button>
            </div>
            <nav
              className={cm.cn('space-y-1 flex-1')}
              aria-label={t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })}
            >
              {renderNav('mobile-')}
            </nav>
            <div
              className={cm.cn(
                cm.sp('pt', 4),
                cm.flex({ align: 'center', gap: 'sm', justify: 'between' }),
                'border-t border-outline-variant',
              )}
            >
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
