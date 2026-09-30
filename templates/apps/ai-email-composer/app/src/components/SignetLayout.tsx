import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/inbox', key: 'inbox', defaultLabel: 'Inbox', icon: 'inbox' },
  { to: '/compose', key: 'compose', defaultLabel: 'Compose', icon: 'edit_note' },
  { to: '/templates', key: 'templates', defaultLabel: 'Templates', icon: 'dashboard_customize' },
  { to: '/analytics', key: 'analytics', defaultLabel: 'Analytics', icon: 'insights' },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { to: '/billing', key: 'billing', defaultLabel: 'Billing', icon: 'credit_card' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/** Below this width the shared sidebar cannot fit — the mobile shell takes over. */
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
 * Signet's authenticated shell.
 *
 * Desktop (≥768px): vertical sidebar with the brand wordmark at the top,
 * every primary route in the middle, and the user menu pinned to the bottom —
 * the shared molecule SidebarLayout for chrome conformance.
 *
 * Mobile (<768px): a fixed 240px sidebar would crush the content column to
 * ~150px, so a template-local shell takes over — sticky top bar (hamburger +
 * brand + user menu) and the same nav in an off-canvas drawer. The shared
 * SidebarLayout has no mobile collapse by design; this is the fleet-pattern
 * template-local replacement.
 */
export function SignetLayout() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const location = useLocation()
  const isMobile = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`signetLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
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
        navAriaLabel={t('signetLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
      />
    )
  }

  return (
    <div
      data-mol-id="signet-layout"
      className={cm.cn(cm.flex({ direction: 'col' }), cm.page, cm.pageShell)}
    >
      {/* Drawer overlay */}
      {drawerOpen && (
        <div
          role="presentation"
          data-mol-id="signet-drawer-overlay"
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
        data-mol-id="signet-mobile-drawer"
        aria-label={t('signetLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
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
          className={cm.cn('inline-block', cm.sp('mb', 2))}
          aria-label={APP_NAME}
        >
          <BrandWordmark as="span" size="md" />
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
        data-mol-id="signet-topbar"
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
            aria-label={t('signetLayout.toggleMenu', {}, { defaultValue: 'Toggle menu' })}
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen((v) => !v)}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.sp('p', 2),
              'rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-2xl')} aria-hidden="true">
              {drawerOpen ? 'close' : 'menu'}
            </span>
          </button>
          <Link
            to="/dashboard"
            className={cm.cn(cm.sp('py', 2), 'min-w-0 truncate')}
            aria-label={APP_NAME}
          >
            <BrandWordmark as="span" size="sm" />
          </Link>
        </div>
        {/* Compact trigger: no email line, capped width so the brand
            wordmark never truncates to a single letter. */}
        <UserMenu
          secondaryLine=""
          style={{ width: 'auto', maxWidth: '9rem' }}
          className="shrink-0 bg-transparent hover:bg-surface-container-low"
        />
      </header>

      <main className={cm.cn(cm.pageShellContent, 'min-w-0 flex-1')}>
        <Outlet />
      </main>
    </div>
  )
}
