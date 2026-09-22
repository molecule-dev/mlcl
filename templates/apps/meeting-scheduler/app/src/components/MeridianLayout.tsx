import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/calendar', key: 'calendar', defaultLabel: 'Calendar', icon: 'calendar_month' },
  { to: '/bookings', key: 'bookings', defaultLabel: 'Bookings', icon: 'event_available' },
  { to: '/event-types', key: 'eventTypes', defaultLabel: 'Event types', icon: 'badge' },
  { to: '/availability', key: 'availability', defaultLabel: 'Availability', icon: 'schedule' },
  { to: '/integrations', key: 'integrations', defaultLabel: 'Integrations', icon: 'sync' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Meridian app shell.
 *
 * Desktop (>768px): the shared `SidebarLayout` — left rail of nav links +
 * scrollable main column (nav items reflect the meeting-scheduler
 * screen-map).
 *
 * Mobile (≤768px): a template-local shell per the fleet mobile pattern — a
 * sticky top bar (hamburger + brand + user menu) with the nav in a slide-in
 * drawer (overlay + Escape + route-change close). The shared sidebar has a
 * fixed inline width and no collapse, which crushed every page into a
 * ~150px column at 390px.
 */

const MOBILE_MQ = '(max-width: 768px)'

function useIsMobile(): boolean {
  // Client-only SPA (no SSR) — initialize from the live media query so the
  // correct shell paints on the very first frame (no sidebar flash on phones).
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_MQ).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}

function BrandMark({ cm }: { cm: ReturnType<typeof getClassMap> }) {
  return (
    <Link
      to="/dashboard"
      data-mol-id="layout-brand"
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.textSize('lg'),
        'font-extrabold tracking-tighter min-w-0',
      )}
    >
      <span
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.roundedFull,
          'w-8 h-8 text-white shrink-0',
        )}
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(135deg, var(--color-primary), var(--color-primary-gradient-to))',
        }}
      >
        <span
          className={cm.cn('material-symbols-outlined text-base')}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          schedule
        </span>
      </span>
      {APP_NAME}
    </Link>
  )
}

export function MeridianLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()
  const isMobile = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`meridianLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  const navAriaLabel = t(
    'meridianLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )
  const closeDrawer = (): void => setDrawerOpen(false)

  // Any route change closes the mobile drawer.
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // Escape closes the drawer.
  useEffect(() => {
    if (!drawerOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [drawerOpen])

  if (!isMobile) {
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
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      {/* Sticky top bar */}
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          'sticky top-0 z-40 h-14 px-3 bg-surface/95 backdrop-blur-md border-b border-outline-variant/40',
        )}
        data-mol-id="layout-mobile-topbar"
      >
        <button
          type="button"
          data-mol-id="layout-menu-toggle"
          aria-label={t('meridianLayout.openMenu', {}, { defaultValue: 'Open navigation menu' })}
          aria-expanded={drawerOpen}
          aria-controls="mobile-nav-drawer"
          onClick={() => setDrawerOpen(true)}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'w-10 h-10 shrink-0 rounded-lg text-on-surface hover:bg-surface-container-low',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-2xl')} aria-hidden="true">
            menu
          </span>
        </button>
        <BrandMark cm={cm} />
        <UserMenu />
      </header>

      {/* Slide-in drawer — mounted only while open so the closed, off-screen
          geometry never leaks into overflow audits or the tab order. */}
      {drawerOpen ? (
        <>
          <div
            role="presentation"
            onClick={closeDrawer}
            data-mol-id="layout-drawer-overlay"
            className={cm.cn('fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]')}
          />
          <aside
            id="mobile-nav-drawer"
            data-mol-id="layout-sidebar"
            aria-label={navAriaLabel}
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'fixed top-0 bottom-0 left-0 z-50 w-72 max-w-[85vw] bg-surface border-r border-outline-variant overflow-y-auto shadow-2xl',
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'px-4 h-14')}>
              <BrandMark cm={cm} />
              <button
                type="button"
                data-mol-id="layout-menu-close"
                aria-label={t(
                  'meridianLayout.closeMenu',
                  {},
                  { defaultValue: 'Close navigation menu' },
                )}
                onClick={closeDrawer}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'w-10 h-10 rounded-lg text-on-surface hover:bg-surface-container-low',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-2xl')} aria-hidden="true">
                  close
                </span>
              </button>
            </div>
            <nav className={cm.cn(cm.flex1, cm.sp('p', 3))}>
              <ul className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(1))}>
                {navItems.map((item) => {
                  const isActive =
                    location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
                  return (
                    <li key={item.key}>
                      <Link
                        to={item.to}
                        data-mol-id={`nav-${item.key}`}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={closeDrawer}
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'sm' }),
                          cm.sp('px', 3),
                          cm.sp('py', 3),
                          cm.textSize('sm'),
                          'font-medium rounded-xl',
                          isActive
                            ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
                            : cm.cn(cm.textMuted, cm.link),
                        )}
                      >
                        {item.icon ? (
                          <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                            {item.icon}
                          </span>
                        ) : null}
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </aside>
        </>
      ) : null}

      <main className={cm.cn(cm.pageShellContent)}>
        <Outlet />
      </main>
    </div>
  )
}

export default MeridianLayout
