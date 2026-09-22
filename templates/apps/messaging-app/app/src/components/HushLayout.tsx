import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { useIsMobile } from '../lib/useIsMobile.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/inbox', key: 'inbox', defaultLabel: 'Inbox', icon: 'inbox' },
  { to: '/contacts', key: 'contacts', defaultLabel: 'Contacts', icon: 'group' },
  { to: '/groups', key: 'groups', defaultLabel: 'Groups', icon: 'forum' },
  { to: '/archive', key: 'archive', defaultLabel: 'Archive', icon: 'archive' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

function useNavItems() {
  const { t } = useTranslation()
  return NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`hushLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
}

/**
 * Authenticated app chrome. Desktop (≥768px) renders the shared vertical
 * SidebarLayout. Below 768px the sidebar cannot fit, so the shell switches
 * to a sticky top bar (hamburger + brand + new-message shortcut) with the
 * nav in a slide-in drawer — overlay click, Escape, and any navigation
 * close it. Same nav data, same UserMenu, two presentations.
 */
export function HushLayout() {
  const isMobile = useIsMobile()
  const navItems = useNavItems()
  const { t } = useTranslation()

  if (!isMobile) {
    return (
      <SidebarLayout
        appName={APP_NAME}
        logoTo="/inbox"
        navItems={navItems}
        userMenu={<UserMenu />}
        navAriaLabel={t('hushLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
      />
    )
  }
  return <MobileShell navItems={navItems} />
}

interface MobileShellProps {
  navItems: ReturnType<typeof useNavItems>
}

const TOPBAR_H = 'h-14'

function MobileShell({ navItems }: MobileShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()
  const [navOpen, setNavOpen] = useState(false)

  // Any navigation closes the drawer.
  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname, location.search])

  // Escape closes the drawer.
  useEffect(() => {
    if (!navOpen) return
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setNavOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [navOpen])

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        'h-screen bg-surface text-on-surface antialiased overflow-hidden',
      )}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          TOPBAR_H,
          'sticky top-0 z-40 shrink-0 bg-surface/95 backdrop-blur-md border-b border-outline-variant/40',
        )}
      >
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          data-mol-id="topbar-menu"
          aria-label={t('hushLayout.openMenu', {}, { defaultValue: 'Open navigation menu' })}
          aria-expanded={navOpen}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'w-11 h-11 rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors shrink-0',
          )}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            menu
          </span>
        </button>

        <Link
          to="/inbox"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.fontWeight('bold'),
            cm.textSize('lg'),
            'tracking-tight min-w-0',
          )}
        >
          <span
            className={cm.cn(
              cm.w(8),
              cm.h(8),
              cm.flex({ align: 'center', justify: 'center' }),
              'rounded-xl bg-gradient-to-br from-primary to-secondary text-white shrink-0',
            )}
          >
            <span
              className="material-symbols-outlined text-base"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              lock
            </span>
          </span>
          <span className="truncate">{APP_NAME}</span>
        </Link>

        <Link
          to="/conversations/new"
          aria-label={t('inbox.newLabel', {}, { defaultValue: 'New message' })}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'w-11 h-11 rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors shrink-0',
          )}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            edit_square
          </span>
        </Link>
      </header>

      <main className={cm.cn(cm.flex1, 'min-w-0 overflow-y-auto')} data-mol-id="hush-main">
        <Outlet />
      </main>

      {navOpen && (
        <div
          role="presentation"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 top-14 z-40 bg-black/40 backdrop-blur-[2px]"
          aria-hidden="true"
        />
      )}
      <div
        data-mol-id="sidebar-drawer"
        className={cm.cn(
          'fixed bottom-0 left-0 top-14 z-50 w-72 max-w-[85vw] flex flex-col bg-surface border-r border-outline-variant shadow-xl transition-transform duration-200 ease-out',
          navOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-hidden={!navOpen}
        inert={!navOpen}
      >
        <nav
          className={cm.cn(cm.flex1, 'overflow-y-auto space-y-1', cm.sp('p', 4))}
          aria-label={t('hushLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
        >
          {navItems.map((item) => {
            const active =
              location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
            return (
              <NavLink
                key={item.key}
                to={item.to}
                data-mol-id={`nav-${item.key}`}
                aria-current={active ? 'page' : undefined}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 3),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  cm.roundedFull,
                  active
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
              </NavLink>
            )
          })}
        </nav>
        <div className={cm.cn(cm.sp('p', 4), cm.borderT, 'shrink-0')}>
          <UserMenu />
        </div>
      </div>
    </div>
  )
}
