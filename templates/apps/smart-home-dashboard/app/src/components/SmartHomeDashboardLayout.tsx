/**
 * Ember dashboard shell — vertical sidebar with primary nav + main content.
 *
 * Translated from the shared SidebarLayout (banking-dashboard's Meridian
 * pattern) into a template-local shell so BOTH breakpoints are owned here:
 * the shared component renders a fixed-width sidebar at every viewport,
 * which consumed ~240px of a 390px phone and crushed every page.
 *
 * Mobile (<768px): a sticky top bar (menu toggle + brand) with the same
 * nav in a slide-in drawer. The drawer closes on navigation, on backdrop
 * tap and on Escape; every control keeps a >=40px tap target and carries
 * aria-expanded/aria-controls.
 */
import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/overview', key: 'overview', defaultLabel: 'Overview', icon: 'dashboard' },
  { to: '/rooms', key: 'rooms', defaultLabel: 'Rooms', icon: 'home' },
  { to: '/scenes', key: 'scenes', defaultLabel: 'Scenes', icon: 'auto_awesome' },
  { to: '/automations', key: 'automations', defaultLabel: 'Automations', icon: 'bolt' },
  { to: '/energy', key: 'energy', defaultLabel: 'Energy', icon: 'eco' },
  { to: '/security', key: 'security', defaultLabel: 'Security', icon: 'shield' },
  { to: '/activity', key: 'activity', defaultLabel: 'Activity', icon: 'history' },
  { to: '/floorplan', key: 'floorplan', defaultLabel: 'Floorplan', icon: 'map' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/** Mobile drawer width — leaves the page visible behind the backdrop. */
const DRAWER_WIDTH = 'w-[264px] max-w-[85vw]'
/** Content offset by the fixed desktop sidebar (md+ only). */
const CONTENT_OFFSET = 'md:pl-[240px]'

export function SmartHomeDashboardLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const navLabel = (key: string, defaultLabel: string) =>
    t(`smartHomeDashboardLayout.nav.${key}`, {}, { defaultValue: defaultLabel })

  // Longest-prefix active item: /rooms/:id keeps Rooms highlighted without
  // also highlighting shorter prefixes.
  const activeTo = NAV_KEYS.reduce<string | null>((best, item) => {
    const isMatch = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
    if (!isMatch) return best
    return best === null || item.to.length > best.length ? item.to : best
  }, null)

  // Any navigation closes the mobile drawer.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Escape closes the mobile drawer.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const navLinks = (onNavigate?: () => void) =>
    NAV_KEYS.map((item) => {
      const isActive = item.to === activeTo
      return (
        <Link
          key={item.key}
          to={item.to}
          onClick={onNavigate}
          data-mol-id={`nav-${item.key}`}
          aria-current={isActive ? 'page' : undefined}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            cm.roundedFull,
            'min-h-[40px]',
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
          <span>{navLabel(item.key, item.defaultLabel)}</span>
        </Link>
      )
    })

  const navAria = t(
    'smartHomeDashboardLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )

  const sidebarBody = (onNavigate?: () => void) => (
    <>
      <Link
        to="/overview"
        onClick={onNavigate}
        className={cm.cn(
          cm.textSize('xl'),
          cm.fontWeight('bold'),
          cm.sp('mb', 6),
          cm.sp('px', 4),
          cm.displayBlock,
        )}
      >
        {APP_NAME}
      </Link>

      <nav
        className={cm.cn(cm.flex1, cm.stack(1), cm.sp('px', 4), 'overflow-y-auto')}
        aria-label={navAria}
      >
        {navLinks(onNavigate)}
      </nav>

      <div
        className={cm.cn(
          cm.sp('pt', 4),
          cm.sp('px', 4),
          cm.sp('pb', 2),
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          cm.borderT,
        )}
      >
        {/* Distinct data-mol-id: the top bar mounts another UserMenu, and a
            page can briefly carry both — locators must stay unambiguous. */}
        <UserMenu dataMolId="user-menu-drawer" />
      </div>
    </>
  )

  return (
    <div className={cm.cn(cm.page, 'min-h-screen w-full')} data-mol-id="app-shell">
      {/* Mobile top bar — sticky; the drawer below carries the same nav. */}
      <header
        data-mol-id="mobile-top-bar"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          'md:hidden sticky top-0 z-40 h-14 border-b border-outline-variant bg-surface-container-lowest/95 backdrop-blur px-2',
        )}
      >
        <button
          type="button"
          data-mol-id="mobile-nav-toggle"
          onClick={() => setMenuOpen(true)}
          aria-label={t(
            'smartHomeDashboardLayout.openMenu',
            {},
            {
              defaultValue: 'Open navigation menu',
            },
          )}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-drawer"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'min-h-[40px] min-w-[40px] rounded-lg text-on-surface hover:bg-surface-container transition-colors',
          )}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            menu
          </span>
        </button>
        <Link
          to="/overview"
          className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'min-w-0 truncate')}
        >
          {APP_NAME}
        </Link>
        <UserMenu />
      </header>

      {/* Mobile drawer + backdrop. */}
      {menuOpen ? (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            data-mol-id="mobile-nav-backdrop"
            aria-hidden="true"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
          />
          <aside
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={navAria}
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              cm.surface,
              cm.borderR,
              'absolute left-0 top-0 h-full shadow-2xl',
              DRAWER_WIDTH,
            )}
          >
            {sidebarBody(() => setMenuOpen(false))}
          </aside>
        </div>
      ) : null}

      {/* Desktop sidebar. */}
      <aside
        className={cm.cn(
          cm.sp('p', 4),
          cm.shrink0,
          cm.flex({ direction: 'col' }),
          cm.surface,
          cm.borderR,
          'hidden md:flex fixed left-0 top-0 z-40 h-screen w-[240px]',
        )}
      >
        {sidebarBody()}
      </aside>

      <div className={CONTENT_OFFSET}>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
