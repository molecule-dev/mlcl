import type { ReactElement } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

/**
 * Driftboard's authed shell — vertical sidebar with the boards nav
 * (Dashboard / Boards / Backlog / Team / Notifications / Settings) + a
 * bottom UserMenu slot.
 *
 * Desktop (>=768px) delegates to the shared
 * `@molecule/app-sidebar-layout-react` package; Driftboard-specific only
 * in nav items + brand label. Below that breakpoint the fixed sidebar
 * would crush a phone's content column to ~150px, so the shell renders
 * a sticky top bar + hamburger drawer instead (backdrop click / Escape /
 * navigation all close it). The two chrome modes are conditionally
 * RENDERED, not CSS-hidden, so nav `data-mol-id`s are never duplicated
 * in the DOM.
 *
 * Mobile drawer follows the fleet QA pattern proven in error-tracker's
 * FaultlineLayout / ci-cd-dashboard's ConduitLayout.
 */

/** Below this breakpoint the sidebar becomes a top bar + overlay drawer. */
const DESKTOP_QUERY = '(min-width: 768px)'

export function DriftboardLayout(): ReactElement {
  const { t } = useTranslation()
  const cm = getClassMap()
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window === 'undefined' || window.matchMedia(DESKTOP_QUERY).matches,
  )

  // Follow the breakpoint live: leaving desktop force-closes the drawer so a
  // resize never strands the overlay over the sidebar.
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY)
    const onChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches)
      if (e.matches) setDrawerOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Any navigation closes the drawer; while it is open, Escape closes it and
  // background scroll is locked.
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [drawerOpen])

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const navItems = [
    {
      to: '/dashboard',
      key: 'dashboard',
      icon: 'dashboard',
      label: t('nav.dashboard', {}, { defaultValue: 'Dashboard' }),
    },
    {
      to: '/boards',
      key: 'boards',
      icon: 'view_kanban',
      label: t('driftboardLayout.nav.boards', {}, { defaultValue: 'Boards' }),
    },
    {
      to: '/backlog',
      key: 'backlog',
      icon: 'inventory',
      label: t('driftboardLayout.nav.backlog', {}, { defaultValue: 'Backlog' }),
    },
    { to: '/team', key: 'team', icon: 'group', label: t('nav.team', {}, { defaultValue: 'Team' }) },
    {
      to: '/notifications',
      key: 'notifications',
      icon: 'notifications',
      label: t('settings.notifications', {}, { defaultValue: 'Notifications' }),
    },
    {
      to: '/settings',
      key: 'settings',
      icon: 'settings',
      label: t('nav.settings', {}, { defaultValue: 'Settings' }),
    },
  ]

  // Single-active-item resolution: highlight the nav item whose `to` is the
  // longest prefix-match of the current pathname (same rule the shared
  // sidebar uses — never highlight every ancestor).
  const activeKey = navItems.reduce<string | null>((bestKey, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return bestKey
    if (bestKey === null) return item.key
    const best = navItems.find((i) => i.key === bestKey)
    return best && item.to.length > best.to.length ? item.key : bestKey
  }, null)

  // Same-route clicks append `#top` so the URL still changes (no dead links) —
  // mirrors the shared sidebar's safeTarget behaviour.
  const safeTarget = (to: string): string => {
    const samePath = pathname === to || pathname + '/' === to
    return samePath ? `${to.replace(/\/$/, '')}#top` : to
  }

  const renderNavLinks = (onNavigate?: () => void): ReactElement[] =>
    navItems.map((item) => {
      const isActive = item.key === activeKey
      return (
        <Link
          key={item.key}
          to={safeTarget(item.to)}
          onClick={onNavigate}
          data-mol-id={`nav-${item.key}`}
          aria-current={isActive ? 'page' : undefined}
          className={cm.cn(
            'flex min-h-[44px] items-center gap-2 rounded-full px-3 py-2 text-sm font-medium',
            isActive
              ? // The container pair, NOT bgPrimarySubtle + textPrimary — brand
                // on a 10% tint of itself fails the 4.5:1 AA floor.
                cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
              : cm.cn('text-on-surface-variant hover:bg-surface-variant', cm.link),
          )}
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
            {item.icon}
          </span>
          <span>{item.label}</span>
        </Link>
      )
    })

  const brand = (onClick?: () => void): ReactElement => (
    <Link
      to={safeTarget('/dashboard')}
      onClick={onClick}
      data-mol-id="nav-brand"
      className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'block text-on-surface')}
    >
      {APP_NAME}
    </Link>
  )

  const navAriaLabel = t(
    'driftboardLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )
  const openNavLabel = t('driftboardLayout.openNav', {}, { defaultValue: 'Open navigation menu' })
  const closeNavLabel = t(
    'driftboardLayout.closeNav',
    {},
    { defaultValue: 'Close navigation menu' },
  )
  const focusRing =
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

  if (!isDesktop) {
    return (
      <div className="min-h-screen bg-background">
        {/* Mobile top bar: hamburger + brand + user menu. */}
        <header
          data-mol-id="mobile-topbar"
          className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-outline-variant/60 bg-surface px-4 py-2"
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0 flex-1')}>
            <button
              type="button"
              data-mol-id="nav-toggle"
              aria-label={openNavLabel}
              aria-expanded={drawerOpen}
              aria-controls="driftboard-nav-drawer"
              onClick={() => setDrawerOpen(true)}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.roundedFull,
                'h-11 w-11 shrink-0 text-on-surface-variant hover:bg-surface-variant',
                focusRing,
              )}
            >
              <span className="material-symbols-outlined text-2xl" aria-hidden="true">
                menu
              </span>
            </button>
            {brand()}
          </div>
          {/* Cap the user card so the email truncates instead of squeezing
              the brand off a phone-width top bar. */}
          <div className="max-w-[46vw] shrink-0">
            <UserMenu />
          </div>
        </header>

        {drawerOpen ? (
          <div className="fixed inset-0 z-40">
            {/* Backdrop: click to dismiss (not tab-reachable — Escape and the
                × button are the keyboard paths). */}
            <button
              type="button"
              tabIndex={-1}
              aria-label={closeNavLabel}
              onClick={closeDrawer}
              className="absolute inset-0 w-full cursor-default bg-black/40"
            />
            <div
              id="driftboard-nav-drawer"
              role="dialog"
              aria-modal="true"
              aria-label={navAriaLabel}
              className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-outline-variant bg-surface p-4 shadow-xl"
            >
              <div
                className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}
              >
                {brand(closeDrawer)}
                <button
                  type="button"
                  aria-label={closeNavLabel}
                  onClick={closeDrawer}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.roundedFull,
                    'h-11 w-11 text-on-surface-variant hover:bg-surface-variant',
                    focusRing,
                  )}
                >
                  <span className="material-symbols-outlined text-2xl" aria-hidden="true">
                    close
                  </span>
                </button>
              </div>
              <nav
                className={cm.cn(cm.flex1, cm.flex({ direction: 'col', gap: 'sm' }))}
                aria-label={navAriaLabel}
              >
                {renderNavLinks(closeDrawer)}
              </nav>
              <div
                className={cm.cn(
                  cm.sp('mt', 4),
                  cm.flex({ align: 'center' }),
                  cm.borderT,
                  cm.sp('pt', 4),
                )}
              >
                <UserMenu />
              </div>
            </div>
          </div>
        ) : null}

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    )
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

export default DriftboardLayout
