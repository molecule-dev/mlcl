import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  {
    to: '/dashboard',
    key: 'dashboard',
    defaultLabel: 'Dashboard',
    icon: 'dashboard',
    molId: 'nav-dashboard',
  },
  {
    to: '/pipeline',
    key: 'pipeline',
    defaultLabel: 'Pipeline',
    icon: 'view_kanban',
    molId: 'nav-pipeline',
  },
  { to: '/jobs', key: 'jobs', defaultLabel: 'Jobs', icon: 'work', molId: 'nav-jobs' },
  {
    to: '/candidates',
    key: 'candidates',
    defaultLabel: 'Candidates',
    icon: 'group',
    molId: 'nav-candidates',
  },
  {
    to: '/interviews',
    key: 'interviews',
    defaultLabel: 'Interviews',
    icon: 'event',
    molId: 'nav-interviews',
  },
  {
    to: '/reports',
    key: 'reports',
    defaultLabel: 'Reports',
    icon: 'bar_chart',
    molId: 'nav-reports',
  },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
    molId: 'nav-notifications',
  },
  {
    to: '/settings',
    key: 'settings',
    defaultLabel: 'Settings',
    icon: 'settings',
    molId: 'nav-settings',
  },
] as const

/**
 * Authenticated app shell. Desktop (≥768px): fixed sidebar. Below 768px the
 * sidebar is hidden and a sticky top bar + slide-in drawer take over —
 * the fleet mobile-shell pattern (tap targets ≥40px, drawer closes on
 * navigation so the user never lands on a page with the menu still open).
 */
export function ShortlistLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Close the drawer whenever the route changes (nav link was followed).
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // Close on Escape so keyboard users are never trapped in the overlay.
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const safeTarget = (to: string): string => {
    const samePath = pathname === to || pathname + '/' === to
    return samePath ? `${to.replace(/\/$/, '')}#top` : to
  }

  const navLinkClass = (isActive: boolean): string =>
    cm.cn(
      cm.flex({ align: 'center', gap: 'sm' }),
      cm.sp('px', 3),
      cm.sp('py', 2),
      cm.textSize('sm'),
      cm.fontWeight('medium'),
      'rounded-md transition-colors min-h-[40px]',
      isActive
        ? 'bg-primary-container text-on-primary-container'
        : cm.cn(cm.textMuted, 'hover:bg-surface-container hover:text-on-surface'),
    )

  const renderNav = (idPrefix: string): React.ReactNode[] =>
    NAV_KEYS.map((item) => {
      const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`)
      return (
        <Link
          key={item.key}
          to={safeTarget(item.to)}
          data-mol-id={idPrefix + item.molId}
          aria-current={isActive ? 'page' : undefined}
          className={navLinkClass(isActive)}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {item.icon}
          </span>
          <span>
            {t(`shortlistLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
          </span>
        </Link>
      )
    })

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ direction: 'col' }),
        'bg-background text-on-surface antialiased',
      )}
      data-mol-id="shortlist-layout"
    >
      {/* Mobile top bar (below md) */}
      <header
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm', justify: 'between' }),
          cm.sp('px', 4),
          'md:hidden sticky top-0 z-30 h-14 shrink-0 bg-surface border-b border-outline-variant',
        )}
        data-mol-id="mobile-top-bar"
      >
        <button
          type="button"
          data-mol-id="nav-mobile-toggle"
          aria-label={t('nav.openMenu', {}, { defaultValue: 'Open menu' })}
          aria-expanded={drawerOpen}
          aria-controls="mobile-drawer"
          onClick={() => setDrawerOpen(true)}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'h-10 w-10 -ml-2 rounded-md text-on-surface hover:bg-surface-container',
          )}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            menu
          </span>
        </button>
        <Link
          to={safeTarget('/dashboard')}
          data-mol-id="nav-app-home-mobile"
          className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}
        >
          {APP_NAME}
        </Link>
        <div className="h-10 w-10" aria-hidden="true" />
      </header>

      <div className={cm.cn(cm.flex({ direction: 'row' }), cm.flex1, 'min-w-0')}>
        {/* Desktop sidebar (≥ md) */}
        <aside
          className={cm.cn(
            cm.sp('p', 4),
            cm.shrink0,
            cm.flex({ direction: 'col' }),
            'hidden md:flex w-60 bg-surface border-r border-outline-variant',
          )}
          data-mol-id="side-nav"
        >
          <Link
            to={safeTarget('/dashboard')}
            data-mol-id="nav-app-home"
            className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 6), 'block')}
          >
            {APP_NAME}
          </Link>

          <nav
            className={cm.cn(cm.flex1, 'space-y-1')}
            aria-label={t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })}
          >
            {renderNav('')}
          </nav>

          <div
            className={cm.cn(
              cm.sp('pt', 4),
              cm.flex({ align: 'center', gap: 'sm', justify: 'end' }),
              'border-t border-outline-variant',
            )}
          >
            <ThemeToggle />
          </div>

          <div className={cm.sp('pt', 3)}>
            <UserMenu />
          </div>
        </aside>

        <main className={cm.cn(cm.flex1, 'min-w-0 overflow-y-auto')}>
          <Outlet />
        </main>
      </div>

      {/* Mobile drawer (below md) */}
      {drawerOpen ? (
        <div className="md:hidden fixed inset-0 z-40" data-mol-id="mobile-drawer-root">
          <button
            type="button"
            aria-label={t('nav.closeMenu', {}, { defaultValue: 'Close menu' })}
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-on-surface/40"
            data-mol-id="mobile-drawer-backdrop"
          />
          <div
            id="mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })}
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              cm.sp('p', 4),
              'absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-surface border-r border-outline-variant overflow-y-auto',
            )}
            data-mol-id="mobile-drawer"
          >
            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}
            >
              <span className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>{APP_NAME}</span>
              <button
                type="button"
                data-mol-id="nav-mobile-close"
                aria-label={t('nav.closeMenu', {}, { defaultValue: 'Close menu' })}
                onClick={() => setDrawerOpen(false)}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'h-10 w-10 rounded-md text-on-surface hover:bg-surface-container',
                )}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  close
                </span>
              </button>
            </div>
            <nav className={cm.cn('space-y-1 flex-1')}>{renderNav('mobile-')}</nav>
            <div
              className={cm.cn(
                cm.sp('pt', 4),
                cm.flex({ align: 'center', gap: 'sm', justify: 'between' }),
                'border-t border-outline-variant',
              )}
            >
              <ThemeToggle />
              <UserMenu dataMolId="user-menu-mobile" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
