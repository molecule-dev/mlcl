import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { useIsMobile } from '../lib/use-is-mobile.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/courses', key: 'courses', defaultLabel: 'Courses', icon: 'school' },
  { to: '/flashcards', key: 'flashcards', defaultLabel: 'Flashcards', icon: 'style' },
  { to: '/progress', key: 'progress', defaultLabel: 'Progress', icon: 'insights' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/billing', key: 'billing', defaultLabel: 'Billing', icon: 'workspace_premium' },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Vertical sidebar shell for every signed-in Koan page. Brand wordmark +
 * mastery-themed nav + UserMenu.
 *
 * Desktop (≥768px): wraps `@molecule/app-sidebar-layout-react` — left
 * vertical nav + bottom theme row + UserMenu slot.
 *
 * Mobile (<768px): the shared rail has no collapse (a known fleet gap),
 * and at 390px its fixed 240px width squeezes content to ~150px. This
 * template-local mobile shell replaces it with a sticky top bar (brand +
 * theme toggle + hamburger) and a slide-in drawer carrying the same nav
 * items plus the account card — the fleet mobile-shell pattern. The two
 * shells are conditionally RENDERED off `useIsMobile()` (never
 * CSS-hidden), so no duplicate nav `data-mol-id`s or double page mounts
 * exist in the DOM.
 */

/** Longest-prefix active key, shared by both shells. */
function activeNavKey(pathname: string): string | null {
  return NAV_KEYS.reduce<string | null>((best, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return best
    if (best === null) return item.key
    const bestItem = NAV_KEYS.find((i) => i.key === best)
    return bestItem && item.to.length > bestItem.to.length ? item.key : best
  }, null)
}

/** Slide-in drawer nav for phones — 44px+ tap targets, closes on navigate. */
function MobileDrawerNav({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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

  const activeKey = activeNavKey(pathname)

  return (
    <div
      className={cm.cn('fixed inset-0 z-50')}
      data-mol-id="mobile-drawer"
      role="dialog"
      aria-modal="true"
      aria-label={t('koanLayout.navLabel', {}, { defaultValue: 'Primary navigation' })}
    >
      {/* Scrim */}
      <button
        type="button"
        aria-label={t('koanLayout.closeMenu', {}, { defaultValue: 'Close menu' })}
        className={cm.cn('absolute inset-0 h-full w-full cursor-default bg-black/50')}
        onClick={onClose}
      />
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'absolute top-0 bottom-0 left-0 w-72 max-w-[85vw] overflow-y-auto border-r border-outline-variant bg-surface shadow-xl',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('p', 4))}>
          <BrandWordmark as="span" size="sm" />
          <button
            type="button"
            onClick={onClose}
            aria-label={t('koanLayout.closeMenu', {}, { defaultValue: 'Close menu' })}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-11 w-11 rounded-full transition-colors hover:bg-surface-container',
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
          aria-label={t('koanLayout.navLabel', {}, { defaultValue: 'Primary navigation' })}
        >
          {NAV_KEYS.map((item, i) => {
            const isActive = item.key === activeKey
            return (
              <Link
                key={item.key}
                to={item.to}
                ref={i === 0 ? firstLinkRef : undefined}
                onClick={onClose}
                data-mol-id={`mobile-nav-${item.key}`}
                aria-current={isActive ? 'page' : undefined}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 3),
                  'min-h-[44px] rounded-xl text-sm transition-colors',
                  isActive
                    ? 'bg-primary-container font-semibold text-on-primary-container'
                    : 'text-on-surface-variant hover:bg-surface-container',
                )}
              >
                {item.icon ? (
                  <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                    {item.icon}
                  </span>
                ) : null}
                <span>
                  {t(`koanLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
                </span>
              </Link>
            )
          })}
        </nav>
        {/* Account card mirrors the desktop sidebar's bottom slot. */}
        <div className={cm.cn(cm.sp('p', 4), cm.borderT)}>
          <UserMenu />
        </div>
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
        'sticky top-0 z-40 h-14 border-b border-outline-variant bg-surface/95 backdrop-blur',
      )}
      data-mol-id="mobile-topbar"
    >
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label={t('koanLayout.openMenu', {}, { defaultValue: 'Open menu' })}
        aria-expanded={false}
        aria-haspopup="dialog"
        data-mol-id="mobile-menu-btn"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          '-ml-2 h-11 w-11 shrink-0 rounded-full transition-colors hover:bg-surface-container',
        )}
      >
        <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
          menu
        </span>
      </button>
      <Link
        to="/dashboard"
        className={cm.cn(
          cm.textSize('lg'),
          cm.fontWeight('bold'),
          'min-w-0 shrink-0 truncate tracking-tight',
        )}
      >
        <BrandWordmark as="span" size="sm" />
      </Link>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'shrink-0 gap-1')}>
        <ThemeToggle />
      </div>
    </header>
  )
}

export function KoanLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { pathname } = useLocation()

  // Close the drawer whenever the route changes (drawer links do this via
  // onClick; this also covers in-page navigations).
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
    label: t(`koanLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))

  if (isMobile) {
    return (
      <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-h-screen bg-background')}>
        <MobileTopBar onOpenMenu={() => setDrawerOpen(true)} />
        {drawerOpen ? <MobileDrawerNav isOpen onClose={() => setDrawerOpen(false)} /> : null}
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
      dataMolId="koan-layout"
      userMenu={
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-wider text-on-surface-variant',
              )}
            >
              {t('koanLayout.theme', {}, { defaultValue: 'Theme' })}
            </span>
            <ThemeToggle />
          </div>
          <UserMenu />
        </div>
      }
      navAriaLabel={t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })}
    />
  )
}
