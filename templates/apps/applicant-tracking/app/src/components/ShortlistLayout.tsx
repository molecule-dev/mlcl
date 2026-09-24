import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

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
 * Authenticated app shell — the shared `ResponsiveAppShell` composed to this
 * app's shape: a mobile-only top bar (the desktop brand row lives in the
 * sidebar), a ≥md sidebar, a <md dialog drawer, and one `<Outlet />` so pages
 * mount exactly once at any width. The shell owns the breakpoint, the drawer
 * open state, the menu trigger, focus/Escape/backdrop handling, and the
 * auto-close-on-navigation; this component only supplies nav + brand.
 */
export function ShortlistLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

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

  // ONE nav element for both breakpoints — the Sidebar and the Drawer receive
  // the same element, and only the mounted breakpoint instantiates it, so the
  // `nav-*` data-mol-ids are never duplicated in the DOM. The drawer closes
  // itself on navigation (shell-owned), so links carry no onClick close.
  const nav = (
    <>
      {NAV_KEYS.map((item) => {
        const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`)
        return (
          <Link
            key={item.key}
            to={safeTarget(item.to)}
            data-mol-id={item.molId}
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
      })}
    </>
  )

  const navLabel = t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })

  return (
    // Root direction: the shell's flex-row base is overridden to the fleet's
    // `flex-col md:flex-row` stack via className (top bar above the content
    // column on mobile, sidebar beside it on desktop).
    <ResponsiveAppShell
      sidebarWidth="md"
      dataMolId="shortlist-layout"
      className={cm.cn('flex-col md:flex-row')}
    >
      {/* Mobile top bar (< md) — the shell renders the menu trigger itself. */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={
          <Link
            to={safeTarget('/dashboard')}
            data-mol-id="nav-app-home-mobile"
            className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}
          >
            {APP_NAME}
          </Link>
        }
      />

      {/*
        Desktop sidebar (≥ md). The brand row leads the nav column — the
        shared Sidebar has no header slot, so it rides inside `children`.
      */}
      <ResponsiveAppShell.Sidebar
        navLabel={navLabel}
        className={cm.sp('p', 4)}
        footer={
          <>
            <div className={cm.flex({ justify: 'end' })}>
              <ThemeToggle />
            </div>
            <UserMenu />
          </>
        }
      >
        <Link
          to={safeTarget('/dashboard')}
          data-mol-id="nav-app-home"
          className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 6), 'block')}
        >
          {APP_NAME}
        </Link>
        {nav}
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (< md): a full dialog panel (focus trap, Escape,
        backdrop click, body-scroll lock) over the same nav, with the theme
        toggle + user menu in the footer.
      */}
      <ResponsiveAppShell.Drawer
        navLabel={navLabel}
        header={<span className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>{APP_NAME}</span>}
        footer={
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <ThemeToggle />
            <UserMenu dataMolId="user-menu-mobile" />
          </div>
        }
      >
        {nav}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content className="w-full overflow-y-auto">
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
