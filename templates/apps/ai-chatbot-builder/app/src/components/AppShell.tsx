/**
 * Authed/public app shell — the SHARED `ResponsiveAppShell` compound from
 * `@molecule/app-ui-react`, replacing the nine per-screen hand-rolled
 * sidebars, the eight top-bar clones, and the hand-rolled MobileNavMenu
 * drawer they each carried (the per-screen variants hardcoded their active
 * item, CSS-hid the sidebar below `md`, and drifted in styling).
 *
 * The shell owns the breakpoint split (768px, one chrome mounted per
 * breakpoint): the desktop Sidebar and the mobile Drawer (full APG dialog —
 * focus trap, Escape/backdrop close, scroll lock, auto-close on navigation)
 * receive the SAME nav element, and the mobile-only menu trigger is rendered
 * by the shell's TopBar itself. Active highlighting is derived from the route
 * (longest prefix) instead of being hardcoded per screen.
 *
 * `sidebar={false}` composes the public/marketing shape (top bar + drawer
 * only — no sidebar).
 */
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

export interface MobileNavItem {
  to: string
  label: string
  icon?: string
}

/** The app-level nav every page shares — one source of truth for both shells. */
export function useMainNavItems(): MobileNavItem[] {
  const { t } = useTranslation()
  return [
    { to: '/', label: t('nav.dashboard', {}, { defaultValue: 'Dashboard' }), icon: 'dashboard' },
    { to: '/bots', label: t('nav.myBots', {}, { defaultValue: 'My Bots' }), icon: 'smart_toy' },
    {
      to: '/knowledge-base',
      label: t('nav.knowledgeBase', {}, { defaultValue: 'Knowledge Base' }),
      icon: 'storage',
    },
    {
      to: '/test-chat',
      label: t('nav.testChat', {}, { defaultValue: 'Test Chat' }),
      icon: 'forum',
    },
    {
      to: '/integrations',
      label: t('nav.integrations', {}, { defaultValue: 'Integrations' }),
      icon: 'extension',
    },
    {
      to: '/settings',
      label: t('nav.settings', {}, { defaultValue: 'Settings' }),
      icon: 'settings',
    },
  ]
}

function isActivePath(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/'
  return pathname === to || pathname.startsWith(`${to}/`)
}

/** Brand block — link home, shared by the top bar, sidebar, and drawer. */
function BrandLink() {
  const { t } = useTranslation()
  return (
    <Link
      to="/"
      data-mol-id="nav-brand"
      className="text-lg font-bold text-foreground truncate tracking-tight"
    >
      {t('topNavBar.brand', { appName: APP_NAME }, { defaultValue: '{{appName}} AI' })}
    </Link>
  )
}

/** Signed-in user card — the sidebar/drawer footer row. */
function UserCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<{ name?: string; email?: string }>()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center' }),
        cm.sp('p', 3),
        'bg-surface-container-low rounded-xl gap-3 w-full',
      )}
    >
      <div
        className={cm.cn(
          cm.roundedFull,
          'w-8 h-8 flex items-center justify-center shrink-0 bg-surface-container-highest text-on-surface-variant',
        )}
        aria-hidden="true"
      >
        <span className={cm.cn('material-symbols-outlined')} data-icon="person">
          person
        </span>
      </div>
      <div className={cm.cn('overflow-hidden min-w-0')}>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface truncate')}>
          {user?.name || user?.email || t('userMenu.guestName', {}, { defaultValue: 'Account' })}
        </p>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
          {user?.name && user?.email
            ? user.email
            : t('sideNavBar.userRole', {}, { defaultValue: 'Pro Architect' })}
        </p>
      </div>
    </div>
  )
}

export interface AppShellProps {
  /**
   * Render the desktop sidebar (and the drawer with it). `false` composes the
   * public/marketing shape — top bar + drawer, no sidebar.
   */
  sidebar?: boolean
  /** Leading content after the brand in the top bar (page title, search…). */
  leading?: ReactNode
  /** Trailing actions. Defaults to the Test link + Deploy link + UserMenu. */
  actions?: ReactNode
  /** Extra classes on the shell root (page canvas, dark theme). */
  className?: string
  /** Extra classes on the content `<main>`. */
  contentClassName?: string
  children: ReactNode
}

export function AppShell({
  sidebar = true,
  leading,
  actions,
  className,
  contentClassName,
  children,
}: AppShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navItems = useMainNavItems()

  const navAriaLabel = t('mobileNav.drawerLabel', {}, { defaultValue: 'Main navigation' })

  // One nav element for BOTH mounts — the shell instantiates only the
  // breakpoint's copy, so the links are never in the DOM twice.
  const nav = (
    <nav aria-label={navAriaLabel} className={cm.cn(cm.flex1, cm.stack(1), cm.sp('px', 2))}>
      {navItems.map((item) => {
        const active = isActivePath(pathname, item.to)
        return (
          <Link
            key={item.to}
            to={item.to}
            data-mol-id={`nav-${item.to === '/' ? 'dashboard' : item.to.slice(1).replace(/\//g, '-')}`}
            aria-current={active ? 'page' : undefined}
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 3),
              cm.textSize('sm'),
              cm.fontWeight(active ? 'bold' : 'medium'),
              'min-h-[44px] gap-3 rounded-xl transition-colors',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-on-surface-variant hover:bg-surface-container-low',
            )}
          >
            {item.icon && (
              <span
                className={cm.cn('material-symbols-outlined shrink-0')}
                data-icon={item.icon}
                aria-hidden="true"
              >
                {item.icon}
              </span>
            )}
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )

  const defaultActions = (
    <>
      <Link
        className={cm.cn(
          'px-4 py-1.5 text-sm font-semibold text-primary hover:bg-primary/5 rounded-lg transition-all hidden sm:block',
        )}
        to="/test-chat"
      >
        {t('topNavBar.test', {}, { defaultValue: 'Test' })}
      </Link>
      <Link
        className={cm.cn(
          'px-5 py-1.5 text-sm font-bold bg-gradient-to-r from-primary to-primary-container text-white rounded-lg shadow-sm hover:shadow-md transition-all',
        )}
        to="/bots"
      >
        {t('topNavBar.deploy', {}, { defaultValue: 'Deploy' })}
      </Link>
      <UserMenu />
    </>
  )

  return (
    <ResponsiveAppShell sidebarWidth={240} className={className}>
      <ResponsiveAppShell.TopBar
        brand={
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4 min-w-0')}>
            <BrandLink />
            {leading}
          </div>
        }
        className="bg-surface/80 backdrop-blur-xl"
        actions={actions ?? defaultActions}
      />

      {sidebar ? (
        <ResponsiveAppShell.Sidebar
          navLabel={navAriaLabel}
          dataMolId="app-sidebar"
          className="bg-surface-secondary border-border/20 border-r"
          footer={<UserCard />}
        >
          {nav}
        </ResponsiveAppShell.Sidebar>
      ) : null}

      {/*
        Mobile drawer — the SAME nav element (shell-owned APG dialog). On
        public pages (no sidebar) it is the only nav surface on mobile.
      */}
      <ResponsiveAppShell.Drawer
        navLabel={navAriaLabel}
        header={<BrandLink />}
        footer={<UserCard />}
        className="h-full bg-surface"
      >
        {nav}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content className={contentClassName}>
        {children}
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
