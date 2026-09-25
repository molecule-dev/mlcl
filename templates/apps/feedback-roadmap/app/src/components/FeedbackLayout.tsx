/**
 * FeedbackLayout — the app shell for every non-auth page, composed from the
 * shared `ResponsiveAppShell` (@molecule/app-ui-react).
 *
 * Desktop (≥768px): a brand row + Boards / Roadmap / Changelog sidebar (plus
 * Dashboard / Manage posts for admins) with the auth actions in the sidebar
 * footer. Mobile (<768px): a top bar (brand + auth actions) whose menu
 * trigger opens the shared nav drawer — full APG dialog contract (focus
 * trap, Escape/backdrop close, scroll lock, auto-close on navigation).
 *
 * The SAME nav element feeds `.Sidebar` and `.Drawer`, so only the mounted
 * breakpoint instantiates it and the links never duplicate in the DOM or
 * the a11y tree. `aria-current="page"` marks the current route; page
 * padding lives on the content column, not in the pages.
 *
 * The public feedback face (boards, roadmap, changelog) and the signed-in
 * surfaces share this shell: a feedback portal is one product, not a
 * marketing site plus a hidden app.
 *
 * Admin nav (Dashboard / Posts) appears only when the signed-in user's
 * role is admin, read from /api/users/me on mount.
 */
import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { Footer } from './Footer.js'

interface NavItem {
  to: string
  labelKey: string
  defaultLabel: string
  matchPrefix?: string
}

const PUBLIC_NAV: NavItem[] = [
  { to: '/boards', labelKey: 'layout.boards', defaultLabel: 'Boards' },
  { to: '/roadmap', labelKey: 'layout.roadmap', defaultLabel: 'Roadmap' },
  { to: '/changelog', labelKey: 'layout.changelog', defaultLabel: 'Changelog' },
]

const ADMIN_NAV: NavItem[] = [
  { to: '/admin', labelKey: 'layout.adminDashboard', defaultLabel: 'Dashboard' },
  { to: '/admin/posts', labelKey: 'layout.adminPosts', defaultLabel: 'Manage posts' },
]

export function FeedbackLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { isAuthenticated, user } = useAuth<{ id?: string; name?: string; email?: string }>()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setIsAdmin(false)
      return
    }
    let cancelled = false
    const http = getHttpClient()
    void http
      .get<{ props?: { role?: string }; role?: string }>('/api/users/me')
      .then((res) => {
        if (cancelled) return
        const role = res?.data?.props?.role ?? res?.data?.role
        setIsAdmin(role === 'admin')
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false)
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.id])

  const isActive = (item: NavItem): boolean =>
    pathname === item.to ||
    (item.matchPrefix !== undefined && pathname.startsWith(item.matchPrefix))

  // One nav element for both breakpoints — the shell wraps it in its
  // `<nav aria-label>` landmark and mounts only the breakpoint's copy, so
  // the `nav-…` data-mol-ids are never duplicated in the DOM.
  const renderNavItem = (item: NavItem) => (
    <Link
      key={item.to}
      to={item.to}
      data-mol-id={`nav-${item.to.replaceAll('/', '-')}`}
      aria-current={isActive(item) ? 'page' : undefined}
      className={cm.cn(
        cm.flex({ align: 'center' }),
        cm.sp('px', 3),
        cm.sp('py', 2),
        cm.fontWeight('semibold'),
        cm.textSize('sm'),
        // Rows are their own tap surface — pad them so the links clear the
        // ~44px minimum target on every breakpoint.
        'min-h-[44px] rounded-md whitespace-nowrap transition-colors',
        isActive(item)
          ? 'text-primary'
          : 'text-on-surface-variant hover:text-primary transition-colors',
      )}
    >
      {t(item.labelKey, {}, { defaultValue: item.defaultLabel })}
    </Link>
  )

  const navItems = (
    <>
      {PUBLIC_NAV.map((item) => renderNavItem(item))}
      {isAdmin && ADMIN_NAV.map((item) => renderNavItem(item))}
    </>
  )

  // Brand row — the mobile TopBar's brand and the desktop sidebar lead ride
  // on the same element; only the mounted breakpoint instantiates it.
  const brand = (
    <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
      <img src="/logo.svg" alt="" className={cm.cn(cm.w(8), cm.h(8))} aria-hidden="true" />
      <span
        className={cm.cn(cm.fontWeight('bold'), 'text-xl tracking-tight')}
        style={{ color: 'var(--color-primary)' }}
      >
        SignalLoop
      </span>
    </Link>
  )

  // Auth actions — the mobile TopBar and the desktop sidebar footer share
  // one element (mutually exclusive mounts, so ids never duplicate).
  const authActions = (
    <>
      {isAuthenticated ? (
        <Link
          to="/submit"
          data-mol-id="nav-submit"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            cm.sp('px', 4),
            cm.sp('py', 2),
            'rounded-full bg-primary text-on-primary hover:bg-primary-active transition-colors',
          )}
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            add
          </span>
          {t('layout.submit', {}, { defaultValue: 'Submit feedback' })}
        </Link>
      ) : (
        <>
          <Link
            to="/login"
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
          <Link
            to="/signup"
            data-mol-id="nav-signup"
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              cm.sp('px', 4),
              cm.sp('py', 2),
              'rounded-full bg-primary text-on-primary hover:bg-primary-active transition-colors',
            )}
          >
            {t('layout.signUp', {}, { defaultValue: 'Sign up' })}
          </Link>
        </>
      )}
    </>
  )

  const navLabel = t('layout.primaryNav', {}, { defaultValue: 'Primary' })

  return (
    <ResponsiveAppShell sidebarWidth="md">
      {/* Mobile top bar (<768px): the shell renders the menu trigger itself
          next to the brand; the desktop shell carries no top bar. */}
      <ResponsiveAppShell.TopBar mobileOnly brand={brand} actions={authActions} />
      {/* Desktop sidebar (≥768px): brand leads the nav column; auth actions
          sit in the bordered footer row, outside the nav landmark. */}
      <ResponsiveAppShell.Sidebar
        navLabel={navLabel}
        footer={authActions}
        className={cm.sp('p', 4)}
      >
        <div className={cm.cn(cm.sp('mb', 4))}>{brand}</div>
        {navItems}
      </ResponsiveAppShell.Sidebar>
      {/* Mobile drawer (<768px): the same nav element behind the full dialog
          contract; it auto-closes on navigation and on desktop-crossing. */}
      <ResponsiveAppShell.Drawer navLabel={navLabel} className={cm.sp('p', 4)}>
        {navItems}
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content className={cm.cn(cm.sp('px', 6), cm.sp('py', 8))}>
        <div className="mx-auto max-w-[1040px]">
          <Outlet />
        </div>
        <Footer />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

export default FeedbackLayout
