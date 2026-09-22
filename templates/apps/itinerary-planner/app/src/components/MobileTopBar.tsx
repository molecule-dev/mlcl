/**
 * Mobile app chrome (rendered ONLY below the `md` breakpoint — 768px).
 *
 * Desktop renders the shared `<SidebarLayout>` (264px rail), which would
 * crush a phone's content column. Below `md` the rail is not rendered at
 * all and this component takes over: a sticky top bar (hamburger + page
 * title + user menu) and a slide-in nav drawer. Follows the fleet QA
 * mobile-shell pattern (blog's MobileTopBar / shift-scheduling's
 * ShiftlyLayout) — conditionally RENDERED via matchMedia, not CSS-hidden,
 * so nav `data-mol-id`s are never duplicated in the DOM.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const DESKTOP_QUERY = '(min-width: 768px)'

/** Same inventory as WaypointLayout's desktop rail — single source in WaypointLayout. */
export interface MobileNavItem {
  to: string
  key: string
  icon: string
  label: string
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && !window.matchMedia(DESKTOP_QUERY).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(!e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isMobile
}

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

function pageTitle(path: string, items: MobileNavItem[]): string {
  const match = items
    .filter((item) => path === item.to || path.startsWith(`${item.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0]
  return match?.label ?? items[0]?.label ?? APP_NAME
}

export function MobileTopBar({ navItems }: { navItems: MobileNavItem[] }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  // Any navigation closes the drawer.
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // While open: Escape closes, background scroll locks.
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

  const drawerLabel = t(
    'waypointLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )
  const openLabel = t('waypointLayout.mobileNavOpen', {}, { defaultValue: 'Open navigation menu' })
  const closeLabel = t(
    'waypointLayout.mobileNavClose',
    {},
    { defaultValue: 'Close navigation menu' },
  )

  return (
    <div className={cm.cn('min-h-dvh flex flex-col bg-background text-on-background')}>
      <header
        data-mol-id="mobile-topbar"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          'sticky top-0 z-40 h-16 px-3 bg-surface/95 backdrop-blur-md border-b border-outline-variant/40',
        )}
      >
        <button
          type="button"
          data-mol-id="nav-toggle"
          aria-label={openLabel}
          aria-expanded={drawerOpen}
          aria-controls="waypoint-nav-drawer"
          onClick={() => setDrawerOpen(true)}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.roundedFull,
            'h-11 w-11 shrink-0 text-on-surface-variant hover:bg-surface-container',
            FOCUS_RING,
          )}
        >
          <span
            className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined')}
            aria-hidden="true"
          >
            menu
          </span>
        </button>
        <div className={cm.cn('min-w-0 flex-1')}>
          <p
            className={cm.cn(
              'text-[0.65rem] font-bold uppercase tracking-[0.25em] text-primary truncate',
            )}
          >
            {APP_NAME}
          </p>
          <h1
            className={cm.cn(cm.textSize('lg'), 'font-bold tracking-tight truncate leading-tight')}
          >
            {pageTitle(pathname, navItems)}
          </h1>
        </div>
        <div className="shrink-0">
          <UserMenu />
        </div>
      </header>

      <main className={cm.cn('flex-1 min-w-0')}>
        <Outlet />
      </main>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50">
          {/* Backdrop: click to dismiss (not tab-reachable — Escape and the
              × button are the keyboard paths). */}
          <button
            type="button"
            tabIndex={-1}
            aria-label={closeLabel}
            onClick={closeDrawer}
            className="absolute inset-0 h-full w-full cursor-default bg-black/40"
          />
          <div
            id="waypoint-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={drawerLabel}
            data-mol-id="mobile-nav-drawer"
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-surface-container-low shadow-xl p-4',
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'mb-6')}>
              <span className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight')}>
                {APP_NAME}
              </span>
              <button
                type="button"
                aria-label={closeLabel}
                onClick={closeDrawer}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.roundedFull,
                  'h-11 w-11 text-on-surface-variant hover:bg-surface-container',
                  FOCUS_RING,
                )}
              >
                <span
                  className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined')}
                  aria-hidden="true"
                >
                  close
                </span>
              </button>
            </div>
            <nav aria-label={drawerLabel} className={cm.cn(cm.flex1, cm.stack(1))}>
              {navItems.map((item) => {
                const isActive =
                  pathname === item.to ||
                  pathname.startsWith(`${item.to}/`) ||
                  (item.to === '/trips' && pathname === '/trips/new')
                return (
                  <Link
                    key={item.key}
                    to={item.to}
                    onClick={closeDrawer}
                    data-mol-id={`nav-${item.key}`}
                    aria-current={isActive ? 'page' : undefined}
                    className={cm.cn(
                      cm.flex({ align: 'center' }),
                      'min-h-[44px] px-3 py-2.5 rounded-lg gap-3 text-sm font-medium',
                      isActive
                        ? 'border-l-4 border-primary bg-surface-container-lowest font-bold text-primary shadow-sm'
                        : 'border-l-4 border-transparent text-on-surface-variant hover:bg-surface-container',
                      FOCUS_RING,
                    )}
                  >
                    <span
                      className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  )
}
