import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/meetings', key: 'meetings', defaultLabel: 'Meetings', icon: 'event_note' },
  { to: '/record', key: 'record', defaultLabel: 'Record', icon: 'mic' },
  { to: '/calendar', key: 'calendar', defaultLabel: 'Calendar', icon: 'calendar_month' },
  { to: '/actions', key: 'actions', defaultLabel: 'Action items', icon: 'task_alt' },
  { to: '/team', key: 'team', defaultLabel: 'Team', icon: 'group' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  { to: '/integrations', key: 'integrations', defaultLabel: 'Integrations', icon: 'extension' },
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

/** Tailwind's `md` breakpoint — the sidebar/drawer swap point. */
const DESKTOP_QUERY = '(min-width: 768px)'

/**
 * Tracks the desktop/mobile breakpoint via matchMedia so only ONE shell is
 * ever mounted — a CSS hidden/block pair would mount two <Outlet />s and
 * double-fetch every page's data.
 */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(DESKTOP_QUERY).matches
      : true,
  )
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(DESKTOP_QUERY)
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    setIsDesktop(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

/** Same longest-prefix active-item rule the shared SidebarLayout applies. */
function resolveActiveKey(navItems: NavItem[], pathname: string): string | null {
  return navItems.reduce<string | null>((bestKey, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return bestKey
    if (bestKey === null) return item.key
    const best = navItems.find((i) => i.key === bestKey)
    return best && item.to.length > best.to.length ? item.key : bestKey
  }, null)
}

/**
 * Authed app shell. Desktop (≥768px) keeps the shared SidebarLayout; below
 * that it swaps to a template-local mobile shell — sticky top bar with a
 * hamburger that opens a slide-in drawer nav — because the shared sidebar
 * has a fixed 240px column that starves a 390px viewport.
 */
export function MurmurLayout() {
  const { t } = useTranslation()
  const isDesktop = useIsDesktop()
  const navItems: NavItem[] = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`murmurLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  const navAriaLabel = t('murmurLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })

  if (!isDesktop) {
    return <MobileNavShell navItems={navItems} navAriaLabel={navAriaLabel} />
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

function MobileNavShell({ navItems, navAriaLabel }: { navItems: NavItem[]; navAriaLabel: string }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Close the drawer on navigation so the next page is never hidden behind it.
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // Escape closes the drawer while it is open.
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const activeKey = resolveActiveKey(navItems, pathname)

  return (
    <div className={cm.cn(cm.page, 'flex h-screen flex-col overflow-hidden')}>
      <header
        className={cm.cn(
          'sticky top-0 z-40 flex h-14 shrink-0 items-center gap-1 border-b border-outline-variant bg-surface px-1',
        )}
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label={t('murmurLayout.openMenu', {}, { defaultValue: 'Open navigation menu' })}
          aria-expanded={drawerOpen}
          aria-controls="mobile-nav-drawer"
          data-mol-id="mobile-nav-toggle"
          className={cm.cn(
            'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-on-surface hover:bg-surface-container transition-colors',
          )}
        >
          <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
            menu
          </span>
        </button>
        <Link
          to="/dashboard"
          className={cm.cn('min-w-0 flex-1 truncate font-bold', cm.textSize('lg'))}
        >
          {APP_NAME}
        </Link>
        <div className={cm.cn('w-40 max-w-[45vw] shrink-0', cm.sp('pr', 1))}>
          <UserMenu />
        </div>
      </header>

      <main className={cm.cn('min-h-0 flex-1 overflow-y-auto')}>
        <Outlet />
      </main>

      {drawerOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={navAriaLabel}
          id="mobile-nav-drawer"
          className={cm.cn('fixed inset-0 z-50 flex')}
        >
          <div
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
            className={cm.cn('absolute inset-0 bg-black/40')}
          />
          <nav
            aria-label={navAriaLabel}
            className={cm.cn(
              'relative flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto bg-surface shadow-xl',
              cm.sp('p', 4),
            )}
          >
            <div className={cm.cn('flex items-center justify-between', cm.sp('pb', 3))}>
              <span className={cm.cn('truncate font-bold', cm.textSize('base'))}>{APP_NAME}</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={t(
                  'murmurLayout.closeMenu',
                  {},
                  { defaultValue: 'Close navigation menu' },
                )}
                className={cm.cn(
                  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-on-surface hover:bg-surface-container transition-colors',
                )}
              >
                <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                  close
                </span>
              </button>
            </div>
            <div className={cm.cn(cm.stack(1))}>
              {navItems.map((item) => {
                const isActive = item.key === activeKey
                return (
                  <Link
                    key={item.key}
                    to={item.to}
                    data-mol-id={`nav-${item.key}`}
                    aria-current={isActive ? 'page' : undefined}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      'min-h-11',
                      cm.sp('px', 3),
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      cm.roundedFull,
                      isActive
                        ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
                        : cm.cn(cm.textMuted, cm.link),
                    )}
                  >
                    <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </nav>
        </div>
      ) : null}
    </div>
  )
}
