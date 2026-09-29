import type { ReactElement } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'space_dashboard' },
  { to: '/guests', key: 'guests', defaultLabel: 'Guests', icon: 'group' },
  { to: '/budget', key: 'budget', defaultLabel: 'Budget', icon: 'savings' },
  { to: '/vendors', key: 'vendors', defaultLabel: 'Vendors', icon: 'storefront' },
  { to: '/tasks', key: 'tasks', defaultLabel: 'Tasks', icon: 'checklist' },
  { to: '/seating', key: 'seating', defaultLabel: 'Seating', icon: 'table_restaurant' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/** Below this breakpoint the sidebar becomes a top bar + overlay drawer. */
const DESKTOP_QUERY = '(min-width: 768px)'

/**
 * Responsive app shell. Desktop (>=768px) renders the classic fixed sidebar;
 * smaller viewports collapse it into a sticky top bar with a hamburger that
 * opens an overlay drawer (backdrop click / Escape / navigation all close it).
 * The two chrome modes are conditionally RENDERED, not CSS-hidden, so nav
 * `data-mol-id`s are never duplicated in the DOM.
 */
export function WeddingLayout(): ReactElement {
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

  // Single-active-item resolution: highlight the nav item whose `to` is the
  // longest prefix-match of the current pathname (same rule the shared
  // sidebar uses — never highlight every ancestor).
  const activeKey = NAV_KEYS.reduce<string | null>((bestKey, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return bestKey
    if (bestKey === null) return item.key
    const best = NAV_KEYS.find((i) => i.key === bestKey)
    return best && item.to.length > best.to.length ? item.key : bestKey
  }, null)

  // Same-route clicks append `#top` so the URL still changes (no dead links).
  const safeTarget = (to: string): string => {
    const samePath = pathname === to || pathname + '/' === to
    return samePath ? `${to.replace(/\/$/, '')}#top` : to
  }

  const renderNavLinks = (onNavigate?: () => void): ReactElement[] =>
    NAV_KEYS.map((item) => {
      const isActive = item.key === activeKey
      return (
        <Link
          key={item.key}
          to={safeTarget(item.to)}
          onClick={onNavigate}
          data-mol-id={`nav-${item.key}`}
          aria-current={isActive ? 'page' : undefined}
          className={cm.cn(
            'flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium min-h-[40px]',
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
          <span>{t(`weddingLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}</span>
        </Link>
      )
    })

  const brand = (onClick?: () => void): ReactElement => (
    <Link to={safeTarget('/dashboard')} onClick={onClick} className="block">
      <BrandWordmark as="span" size="sm" />
    </Link>
  )

  if (!isDesktop) {
    return (
      <div className="min-h-screen bg-background">
        {/* Mobile top bar: brand + hamburger + user menu. */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-outline-variant/60 bg-surface px-4 py-2">
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              data-mol-id="nav-toggle"
              aria-label={t('weddingLayout.openNav', {}, { defaultValue: 'Open navigation menu' })}
              aria-expanded={drawerOpen}
              aria-controls="wedding-nav-drawer"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="material-symbols-outlined text-2xl" aria-hidden="true">
                menu
              </span>
            </button>
            {brand()}
          </div>
          <UserMenu />
        </header>

        {drawerOpen ? (
          <div className="fixed inset-0 z-40 md:hidden">
            {/* Backdrop: click to dismiss (not tab-reachable — Escape and the
                × button are the keyboard paths). */}
            <button
              type="button"
              tabIndex={-1}
              aria-label={t(
                'weddingLayout.closeNav',
                {},
                { defaultValue: 'Close navigation menu' },
              )}
              onClick={closeDrawer}
              className="absolute inset-0 w-full cursor-default bg-black/40"
            />
            <div
              id="wedding-nav-drawer"
              role="dialog"
              aria-modal="true"
              aria-label={t(
                'weddingLayout.primaryNavLabel',
                {},
                { defaultValue: 'Primary navigation' },
              )}
              className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-outline-variant bg-surface p-4 shadow-xl"
            >
              <div className="mb-6 flex items-center justify-between">
                {brand(closeDrawer)}
                <button
                  type="button"
                  aria-label={t(
                    'weddingLayout.closeNav',
                    {},
                    { defaultValue: 'Close navigation menu' },
                  )}
                  onClick={closeDrawer}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span className="material-symbols-outlined text-2xl" aria-hidden="true">
                    close
                  </span>
                </button>
              </div>
              <nav className="flex flex-1 flex-col gap-1" aria-label="Primary navigation">
                {renderNavLinks(closeDrawer)}
              </nav>
              <div className="mt-4 flex items-center border-t border-outline-variant pt-4">
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
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-60 shrink-0 flex-col border-r border-outline-variant bg-surface p-4">
        {brand()}
        <nav className="mt-6 flex flex-1 flex-col gap-1" aria-label="Primary navigation">
          {renderNavLinks()}
        </nav>
        <div className="mt-4 flex items-center border-t border-outline-variant pt-4">
          <UserMenu />
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
