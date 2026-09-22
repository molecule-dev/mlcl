import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Manuscripts', icon: 'description' },
  { to: '/shared', key: 'shared', defaultLabel: 'Shared with me', icon: 'group' },
  { to: '/templates', key: 'templates', defaultLabel: 'Templates', icon: 'article' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/trash', key: 'trash', defaultLabel: 'Trash', icon: 'delete' },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * App shell — desktop keeps a vertical sidebar; below the md breakpoint the
 * shared sidebar has nowhere to go (it is a fixed-width flex row), so this
 * template-local shell swaps in a sticky top bar + hamburger drawer instead.
 * Both shells share ONE <Outlet /> so pages mount exactly once at any width.
 */
export function QuillonLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Any navigation closes the drawer (including same-route clicks).
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // Escape closes the drawer.
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`quillonLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))

  // Single-active-item resolution: the nav item whose `to` is the longest
  // prefix of the current pathname (mirrors the shared SidebarLayout).
  const activeKey = navItems.reduce<string | null>((bestKey, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return bestKey
    if (bestKey === null) return item.key
    const best = navItems.find((i) => i.key === bestKey)
    return best && item.to.length > best.to.length ? item.key : bestKey
  }, null)

  const navLinkClass = (isActive: boolean): string =>
    cm.cn(
      cm.flex({ align: 'center', gap: 'sm' }),
      cm.sp('px', 3),
      cm.sp('py', 2),
      cm.textSize('sm'),
      cm.fontWeight('medium'),
      cm.roundedFull,
      isActive
        ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
        : cm.cn(cm.textMuted, cm.link),
    )

  return (
    <div className={cm.cn(cm.page, 'flex flex-col md:flex-row')}>
      {/* ——— Mobile top bar (< md) ——— */}
      <header
        className={cm.cn(
          'sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-outline-variant bg-surface/95 backdrop-blur md:hidden',
        )}
        data-testid="layout-topbar"
      >
        <button
          type="button"
          onClick={() => setDrawerOpen((o) => !o)}
          aria-label={t('quillonLayout.menu', {}, { defaultValue: 'Menu' })}
          aria-expanded={drawerOpen}
          aria-controls="mobile-nav-drawer"
          data-testid="layout-drawer-toggle"
          className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface hover:bg-surface-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {drawerOpen ? 'close' : 'menu'}
          </span>
        </button>
        <Link
          to="/dashboard"
          className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'tracking-tight')}
        >
          {APP_NAME}
        </Link>
        <span aria-hidden="true" className="h-11 w-11 shrink-0" />
      </header>

      {/* ——— Mobile drawer (< md) ——— */}
      {drawerOpen ? (
        <div className="md:hidden" data-testid="layout-drawer">
          <div
            className="fixed inset-x-0 bottom-0 top-14 z-30 bg-black/40"
            aria-hidden="true"
            data-testid="layout-drawer-scrim"
            onClick={() => setDrawerOpen(false)}
          />
          <nav
            id="mobile-nav-drawer"
            aria-label={t(
              'quillonLayout.mobileNavLabel',
              {},
              { defaultValue: 'Mobile navigation' },
            )}
            className="fixed inset-x-0 bottom-0 top-14 z-40 overflow-y-auto bg-surface px-4 pb-6 pt-3 shadow-xl"
          >
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = item.key === activeKey
                return (
                  <li key={item.key}>
                    <Link
                      to={item.to}
                      data-mol-id={`mnav-${item.key}`}
                      aria-current={isActive ? 'page' : undefined}
                      className={navLinkClass(isActive)}
                    >
                      {item.icon ? (
                        <span className="material-symbols-outlined" aria-hidden="true">
                          {item.icon}
                        </span>
                      ) : null}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
            <div className={cm.cn('mt-4 border-t border-outline-variant pt-4')}>
              <UserMenu />
            </div>
          </nav>
        </div>
      ) : null}

      {/* ——— Desktop sidebar (>= md) ——— */}
      <aside
        className={cm.cn(
          'hidden md:flex md:w-60 md:shrink-0 md:flex-col',
          cm.sp('p', 4),
          cm.surface,
          'border-r border-outline-variant',
        )}
      >
        <Link
          to="/dashboard"
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 6),
            cm.displayBlock,
          )}
        >
          {APP_NAME}
        </Link>
        <nav
          className={cm.cn(cm.flex1, cm.stack(1))}
          aria-label={t(
            'quillonLayout.primaryNavLabel',
            {},
            { defaultValue: 'Primary navigation' },
          )}
        >
          {navItems.map((item) => {
            const isActive = item.key === activeKey
            return (
              <Link
                key={item.key}
                to={item.to}
                data-mol-id={`nav-${item.key}`}
                aria-current={isActive ? 'page' : undefined}
                className={navLinkClass(isActive)}
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
        <div className={cm.cn(cm.sp('pt', 4), cm.borderT)}>
          <UserMenu />
        </div>
      </aside>

      {/* ——— Shared content area ——— */}
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
