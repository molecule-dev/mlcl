import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'monitor_heart' },
  {
    to: '/appointments',
    key: 'appointments',
    defaultLabel: 'Appointments',
    icon: 'calendar_month',
  },
  { to: '/patients', key: 'patients', defaultLabel: 'Patients', icon: 'group' },
  { to: '/records', key: 'records', defaultLabel: 'Records', icon: 'folder_shared' },
  { to: '/prescriptions', key: 'prescriptions', defaultLabel: 'Prescriptions', icon: 'medication' },
  { to: '/messages', key: 'messages', defaultLabel: 'Messages', icon: 'chat' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/** Below this width the fixed 240px sidebar cannot fit — the mobile shell takes over. */
const MOBILE_BREAKPOINT = '(max-width: 767px)'

function useIsMobile(): boolean {
  // Lazy initializer: the client-only app can read matchMedia on first render,
  // so the correct shell paints immediately (no desktop-sidebar flash on phones).
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(MOBILE_BREAKPOINT).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_BREAKPOINT)
    const onChange = (e: MediaQueryListEvent): void => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isMobile
}

/**
 * Solace's authenticated shell.
 *
 * Desktop (≥768px): vertical sidebar with the brand wordmark at the top, every
 * primary route in the middle, and the user menu pinned to the bottom — the
 * shared molecule SidebarLayout for chrome conformance.
 *
 * Mobile (<768px): a fixed sidebar would crush the content column, so a
 * template-local shell takes over — sticky top bar (hamburger + brand + user
 * menu) and the same nav in an off-canvas drawer. The shared SidebarLayout has
 * no mobile collapse by design; this is the fleet-pattern template-local
 * replacement.
 */
export function SolaceLayout() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const location = useLocation()
  const isMobile = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`solaceLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))

  // Any navigation closes the drawer.
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // Escape closes the drawer while it is open.
  useEffect(() => {
    if (!drawerOpen) return
    const onKeyDown = (e: KeyboardEvent): void => {
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
        navAriaLabel={t('solaceLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
      />
    )
  }

  return (
    <div
      data-mol-id="solace-layout"
      className={cm.cn(cm.flex({ direction: 'col' }), cm.page, cm.pageShell)}
    >
      {/* Drawer overlay */}
      {drawerOpen && (
        <div
          role="presentation"
          data-mol-id="solace-drawer-overlay"
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 40,
          }}
        />
      )}

      {/* Off-canvas drawer with the primary nav */}
      <aside
        data-mol-id="solace-mobile-drawer"
        aria-label={t('solaceLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
        aria-hidden={!drawerOpen}
        className={cm.cn(
          cm.sp('p', 4),
          cm.flex({ direction: 'col', gap: 'sm' }),
          cm.surface,
          cm.borderR,
        )}
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: drawerOpen ? 0 : '-17rem',
          width: '16rem',
          maxWidth: '85vw',
          zIndex: 50,
          transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          visibility: drawerOpen ? 'visible' : 'hidden',
          overflowY: 'auto',
        }}
      >
        <Link
          to="/dashboard"
          className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}
        >
          {APP_NAME}
        </Link>
        <nav className={cm.cn(cm.flex({ direction: 'col' }), 'gap-1')}>
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
            return (
              <Link
                key={item.key}
                to={item.to}
                data-mol-id={`nav-${item.key}`}
                aria-current={isActive ? 'page' : undefined}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 3),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  cm.roundedFull,
                  isActive
                    ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
                    : cm.cn(cm.textMuted, cm.link),
                )}
              >
                {item.icon ? (
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {item.icon}
                  </span>
                ) : null}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Sticky top bar: hamburger + brand + user menu */}
      <header
        data-mol-id="solace-topbar"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          cm.sp('px', 4),
          'h-14 shrink-0 border-b border-outline-variant/50 bg-surface/95 backdrop-blur',
        )}
        style={{ position: 'sticky', top: 0, zIndex: 30 }}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}>
          <button
            type="button"
            data-mol-id="btn-menu-toggle"
            aria-label={t('solaceLayout.toggleMenu', {}, { defaultValue: 'Toggle menu' })}
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen((v) => !v)}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.sp('p', 2),
              'rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors',
            )}
          >
            <span className="material-symbols-outlined text-2xl" aria-hidden="true">
              {drawerOpen ? 'close' : 'menu'}
            </span>
          </button>
          <Link
            to="/dashboard"
            className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('py', 2), 'shrink-0')}
          >
            {APP_NAME}
          </Link>
        </div>
        <div className={cm.cn(cm.shrink0, 'min-w-0 max-w-[10rem]')}>
          <UserMenu />
        </div>
      </header>

      <main className={cm.cn(cm.pageShellContent, 'min-w-0 flex-1')}>
        <Outlet />
      </main>
    </div>
  )
}
