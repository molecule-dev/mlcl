import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { useIsMobile } from '../lib/use-is-mobile.js'
import { BrandWordmark } from './BrandWordmark.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Refract app shell.
 *
 * Desktop (≥768px): the shared `SidebarLayout` — left vertical nav +
 * bottom user-menu slot, recoloured per Refract's violet/cyan dev-tools
 * palette via the design tokens in theme.css.
 *
 * Mobile (<768px): the shared rail has no collapse (a known fleet gap),
 * and at 390px its fixed 240px width squeezes content to ~150px. This
 * template-local mobile shell replaces it with a sticky top bar (brand +
 * theme + user menu + hamburger) and a slide-in drawer carrying the same
 * nav items — the fleet mobile-shell pattern. The two shells are
 * conditionally RENDERED off `useIsMobile()` (never CSS-hidden), so no
 * duplicate nav `data-mol-id`s or double page mounts exist in the DOM.
 */
const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/repos', key: 'repositories', defaultLabel: 'Repositories', icon: 'storage' },
  { to: '/history', key: 'history', defaultLabel: 'Review History', icon: 'rate_review' },
  { to: '/rules', key: 'rules', defaultLabel: 'Rules', icon: 'gavel' },
  { to: '/reports', key: 'reports', defaultLabel: 'Reports', icon: 'analytics' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/** Slide-in drawer nav for phones — 44px+ tap targets, closes on navigate. */
function MobileDrawerNav({
  onNavigate,
  isOpen,
  onClose,
}: {
  onNavigate: () => void
  isOpen: boolean
  onClose: () => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const firstLinkRef = useRef<HTMLAnchorElement>(null)

  // Move focus into the drawer when it opens so keyboard/SR users land in it.
  useEffect(() => {
    if (isOpen) firstLinkRef.current?.focus()
  }, [isOpen])

  // Close on Escape while the drawer is open.
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const activeKey =
    NAV_KEYS.reduce<string | null>((best, item) => {
      const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
      if (!isMatch) return best
      if (best === null) return item.key
      const bestItem = NAV_KEYS.find((i) => i.key === best)
      return bestItem && item.to.length > bestItem.to.length ? item.key : best
    }, null) ?? null

  return (
    <div
      className={cm.cn('fixed inset-0 z-50 md:hidden')}
      data-mol-id="mobile-drawer"
      role="dialog"
      aria-modal="true"
      aria-label={t('refractLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    >
      {/* Scrim */}
      <button
        type="button"
        aria-label={t('refractLayout.closeMenu', {}, { defaultValue: 'Close menu' })}
        className={cm.cn('absolute inset-0 w-full h-full bg-black/50 cursor-default')}
        onClick={onClose}
      />
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-surface border-r border-outline-variant shadow-xl overflow-y-auto',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('p', 4))}>
          <BrandWordmark as="span" size="sm" />
          <button
            type="button"
            onClick={onClose}
            aria-label={t('refractLayout.closeMenu', {}, { defaultValue: 'Close menu' })}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'w-11 h-11 rounded-full hover:bg-surface-container transition-colors',
            )}
            data-mol-id="mobile-drawer-close"
          >
            <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
              close
            </span>
          </button>
        </div>
        <nav
          className={cm.cn(cm.flex1, cm.flex({ direction: 'col' }), cm.sp('px', 2), cm.sp('pb', 4))}
          aria-label={t(
            'refractLayout.primaryNavLabel',
            {},
            { defaultValue: 'Primary navigation' },
          )}
        >
          {NAV_KEYS.map((item, i) => {
            const isActive = item.key === activeKey
            return (
              <Link
                key={item.key}
                to={item.to}
                ref={i === 0 ? firstLinkRef : undefined}
                onClick={onNavigate}
                data-mol-id={`mobile-nav-${item.key}`}
                aria-current={isActive ? 'page' : undefined}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 3),
                  'min-h-[44px] rounded-xl text-sm transition-colors',
                  isActive
                    ? 'bg-primary-container text-on-primary-container font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container',
                )}
              >
                {item.icon ? (
                  <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                    {item.icon}
                  </span>
                ) : null}
                <span>
                  {t(`refractLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

/** Sticky top bar + hamburger — the only chrome on phones. */
function MobileTopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <header
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 3),
        'sticky top-0 z-40 h-14 bg-surface/95 backdrop-blur border-b border-outline-variant',
      )}
      data-mol-id="mobile-topbar"
    >
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label={t('refractLayout.openMenu', {}, { defaultValue: 'Open menu' })}
        aria-expanded={false}
        aria-haspopup="dialog"
        data-mol-id="mobile-menu-btn"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          '-ml-2 w-11 h-11 shrink-0 rounded-full hover:bg-surface-container transition-colors',
        )}
      >
        <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
          menu
        </span>
      </button>
      <Link
        to="/dashboard"
        className={cm.cn('shrink-0 min-w-0 truncate')}
        aria-label={APP_NAME}
      >
        <BrandWordmark as="span" size="sm" />
      </Link>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-1 shrink-0')}>
        <ThemeToggle className="w-11 h-11 shrink-0" />
        <UserMenu compact />
      </div>
    </header>
  )
}

export function RefractLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { pathname } = useLocation()

  // Close the drawer whenever the route changes (drawer links do this via
  // onNavigate; this also covers in-page navigations).
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!drawerOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [drawerOpen])

  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`refractLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))

  if (isMobile) {
    return (
      <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-h-screen bg-background')}>
        <MobileTopBar onOpenMenu={() => setDrawerOpen(true)} />
        {drawerOpen ? (
          <MobileDrawerNav
            isOpen={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            onNavigate={() => setDrawerOpen(false)}
          />
        ) : null}
        <main className={cm.flex1}>
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
      userMenu={
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          <UserMenu />
          <div className={cm.cn(cm.flex({ justify: 'end' }))}>
            <ThemeToggle />
          </div>
        </div>
      }
      navAriaLabel={t('refractLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
