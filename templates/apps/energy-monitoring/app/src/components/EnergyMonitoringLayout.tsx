import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/devices', key: 'devices', defaultLabel: 'Devices', icon: 'sensors' },
  { to: '/reports', key: 'reports', defaultLabel: 'Reports', icon: 'analytics' },
  { to: '/alerts', key: 'alerts', defaultLabel: 'Alerts', icon: 'notifications_active' },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { to: '/billing', key: 'billing', defaultLabel: 'Billing', icon: 'credit_card' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Voltrace app shell.
 *
 * Desktop (>= md) keeps the vertical sidebar; below the md breakpoint the
 * shared SidebarLayout has nowhere to go (it is a fixed-width flex row that
 * eats half a 390px viewport), so this template-local shell swaps in a
 * sticky top bar + hamburger drawer instead (scrim, Escape-to-close,
 * auto-close on nav, 44px targets, UserMenu + ThemeToggle in the drawer).
 * Both shells render ONE <Outlet /> so pages mount exactly at any width.
 *
 * Pattern source: document-collaboration's QuillonLayout (fleet QA
 * mobile-shell pattern).
 */
export function EnergyMonitoringLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Any navigation closes the drawer (including same-route clicks).
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // Escape closes the drawer.
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`energyMonitoringLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))

  // Single-active-item resolution: the nav item whose `to` is the longest
  // prefix of the current pathname (mirrors the shared SidebarLayout).
  const activeKey = navItems.reduce<string | null>((bestKey, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return bestKey
    if (bestKey === null) return item.key
    const best = navItems.find((i) => i.key === bestKey)
    return best && item.to.length > best.to.length ? item.key : bestKey
  }, null)

  const navLinkClass = (isActive: boolean): string =>
    cm.cn(
      cm.flex({ align: 'center', gap: 'sm' }),
      cm.sp('px', 3),
      cm.sp('py', 2),
      cm.textSize('sm'),
      cm.fontWeight('medium'),
      cm.roundedFull,
      'min-h-[44px]',
      isActive
        ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
        : cm.cn(cm.textMuted, cm.link),
    )

  return (
    <div className={cm.cn(cm.page, 'flex flex-col md:flex-row')}>
      {/* ——— Mobile top bar (< md) ——— */}
      <header
        data-testid="layout-topbar"
        className={cm.cn(
          'sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-outline-variant bg-surface/95 backdrop-blur md:hidden',
        )}
      >
        <button
          type="button"
          onClick={() => setDrawerOpen((o) => !o)}
          aria-label={t('energyMonitoringLayout.menu', {}, { defaultValue: 'Menu' })}
          aria-expanded={drawerOpen}
          aria-controls="mobile-nav-drawer"
          data-testid="layout-drawer-toggle"
          className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface hover:bg-surface-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {drawerOpen ? 'close' : 'menu'}
          </span>
        </button>
        <Link
          to="/dashboard"
          className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'tracking-tight')}
        >
          {APP_NAME}
        </Link>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center">
          <ThemeToggle />
        </span>
      </header>

      {/* ——— Mobile drawer (< md) ——— */}
      {drawerOpen ? (
        <div className="md:hidden" data-testid="layout-drawer">
          <div
            className="fixed inset-x-0 bottom-0 top-14 z-30 bg-black/40"
            aria-hidden="true"
            data-testid="layout-drawer-scrim"
            onClick={() => setDrawerOpen(false)}
          />
          <nav
            id="mobile-nav-drawer"
            aria-label={t(
              'energyMonitoringLayout.mobileNavLabel',
              {},
              { defaultValue: 'Mobile navigation' },
            )}
            className="fixed inset-x-0 bottom-0 top-14 z-40 overflow-y-auto bg-surface px-4 pb-6 pt-3 shadow-xl"
          >
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = item.key === activeKey
                return (
                  <li key={item.key}>
                    <Link
                      to={item.to}
                      data-mol-id={`mnav-${item.key}`}
                      aria-current={isActive ? 'page' : undefined}
                      className={navLinkClass(isActive)}
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
            <div className={cm.cn('mt-4 border-t border-outline-variant pt-4')}>
              {/* Nudge the shared UserMenu trigger to a 36px+ tap target. */}
              <span className="inline-flex [&_button]:min-h-[36px] [&_button]:min-w-[36px]">
                <UserMenu />
              </span>
            </div>
          </nav>
        </div>
      ) : null}

      {/* ——— Desktop sidebar (>= md) ——— */}
      <aside
        className={cm.cn(
          'hidden md:flex md:w-60 md:shrink-0 md:flex-col',
          cm.sp('p', 4),
          cm.surface,
          'border-r border-outline-variant',
        )}
      >
        <Link
          to="/dashboard"
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 6),
            cm.displayBlock,
          )}
        >
          {APP_NAME}
        </Link>
        <nav
          className={cm.cn(cm.flex1, cm.stack(1))}
          aria-label={t(
            'energyMonitoringLayout.primaryNavLabel',
            {},
            { defaultValue: 'Primary navigation' },
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
                className={navLinkClass(isActive)}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div
          className={cm.cn(
            cm.sp('pt', 4),
            cm.borderT,
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          )}
        >
          {/* Nudge the shared UserMenu trigger to a 36px+ tap target. */}
          <span className="inline-flex [&_button]:min-h-[36px] [&_button]:min-w-[36px]">
            <UserMenu />
          </span>
          <ThemeToggle />
        </div>
      </aside>

      {/* ——— Shared content area ——— */}
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
