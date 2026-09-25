/**
 * Authenticated shell — the shared `ResponsiveAppShell`
 * (`@molecule/app-ui-react`), mounted ONCE as a layout route so pages stop
 * mounting chrome individually.
 *
 * The shell owns the breakpoint split: the Sidebar mounts only ≥768px, the
 * mobile Drawer (same nav element, full APG dialog contract — focus trap,
 * Escape/backdrop close, scroll lock, auto-close on navigation) only below
 * it, and the mobile-only TopBar renders the 44px menu trigger itself — the
 * former per-page `SideNavBar`/`DashboardSideBar` rails, the
 * `MobileBottomNav` tab bar and every per-page fixed top bar are deleted
 * with it. Per-page breadcrumb/action bars (DashboardTopBar, EmbedTopBar,
 * …) ride at the top of `.Content` as md+-only non-duplicating chrome.
 */
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

/**
 * The consolidated nav — the superset of the former SideNavBar /
 * DashboardSideBar / MobileBottomNav links. Active marking is the
 * consumer's job: `aria-current="page"` from the prefix match.
 */
const NAV_ITEMS: ReadonlyArray<{
  to: string
  /** Path whose prefix marks the item active. */
  matchPrefix: string
  icon: string
  labelKey: string
  fallback: string
  /** Pin to the bottom of the rail (the Settings slot). */
  bottom?: boolean
}> = [
  {
    to: '/dashboard',
    matchPrefix: '/dashboard',
    icon: 'dashboard',
    labelKey: 'nav.dashboard',
    fallback: 'Dashboard',
  },
  {
    to: '/models',
    matchPrefix: '/models',
    icon: 'view_in_ar',
    labelKey: 'nav.models',
    fallback: 'Models',
  },
  {
    to: '/upload',
    matchPrefix: '/upload',
    icon: 'cloud_upload',
    labelKey: 'common.upload',
    fallback: 'Upload',
  },
  // Embed is a per-model feature — the real route is /models/:id/embed.
  // Send clicks to /models (the Library) so users can pick a model first;
  // the active-state check uses '/embed' (never matches today) to avoid
  // false-highlighting on every /models* page alongside the Library link.
  {
    to: '/models',
    matchPrefix: '/embed',
    icon: 'code',
    labelKey: 'sideNavBar.embed',
    fallback: 'Embed',
  },
  {
    to: '/notifications',
    matchPrefix: '/notifications',
    icon: 'notifications',
    labelKey: 'settings.notifications',
    fallback: 'Notifications',
  },
  {
    to: '/settings',
    matchPrefix: '/settings',
    icon: 'settings',
    labelKey: 'nav.settings',
    fallback: 'Settings',
    bottom: true,
  },
]

/** Brand block — logo tile + app name + tagline, leading the desktop rail. */
function ShellBrand() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <Link to="/dashboard" className={cm.cn(cm.flex({ align: 'center', gap: 4 }), 'px-6 pt-8 pb-8')}>
      <div
        className={cm.cn(
          cm.w(10),
          cm.h(10),
          cm.flex({ align: 'center', justify: 'center' }),
          cm.shrink0,
          'rounded-xl bg-gradient-to-br from-primary to-primary-container',
        )}
      >
        <span
          className="material-symbols-outlined text-on-primary"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          view_in_ar
        </span>
      </div>
      <div>
        <h1 className={cm.cn(cm.textSize('2xl'), 'font-black tracking-tighter text-on-surface')}>
          {t('sideNavBar.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mt', 1),
            'text-foreground-tertiary uppercase tracking-widest',
          )}
        >
          {t('sideNavBar.appSubtitle', {}, { defaultValue: '3D Design Studio' })}
        </p>
      </div>
    </Link>
  )
}

/** Compact brand for the mobile TopBar / drawer header. */
function ShellBrandCompact() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <Link to="/dashboard" className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.w(8),
          cm.h(8),
          cm.shrink0,
          'rounded-lg bg-gradient-to-br from-primary to-primary-container',
        )}
      >
        <span
          className="material-symbols-outlined text-[18px] text-on-primary"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          view_in_ar
        </span>
      </div>
      <span
        className={cm.cn(cm.textSize('lg'), 'font-black tracking-tighter text-on-surface truncate')}
      >
        {t('sideNavBar.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
      </span>
    </Link>
  )
}

/**
 * Nav links shared by the desktop Sidebar and the mobile Drawer — the shell
 * mounts only the breakpoint's copy, so the element is never instantiated
 * twice. Active state uses the same prefix rule the former rails used.
 */
function ShellNavLinks() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const activeClass = cm.cn(
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.flex({ align: 'center', gap: 3 }),
    'rounded-lg border-l-[3px] border-primary text-on-surface font-bold bg-primary/10 scale-98 transition-transform duration-150',
  )
  const inactiveClass = cm.cn(
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.flex({ align: 'center', gap: 3 }),
    'rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface/5 transition-colors duration-200',
  )

  return (
    // No <nav> here — the shell's Sidebar/Drawer already wrap children in the
    // nav landmark; a second one would duplicate it in the a11y tree.
    <div
      className={cm.cn(
        cm.flex1,
        cm.fontWeight('medium'),
        cm.textSize('sm'),
        cm.flex({ direction: 'col', gap: 1 }),
        "font-['Inter'] tracking-tight",
        'px-2',
      )}
    >
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.matchPrefix || pathname.startsWith(item.matchPrefix + '/')
        return (
          <Link
            key={item.labelKey}
            to={item.to}
            aria-current={active ? 'page' : undefined}
            className={cm.cn(active ? activeClass : inactiveClass, item.bottom && 'mt-auto mb-4')}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            {t(item.labelKey, {}, { defaultValue: item.fallback })}
          </Link>
        )
      })}
    </div>
  )
}

/**
 * The layout route element every authed shell page renders under — see the
 * module doc. Wraps `<Outlet />` in the shared shell.
 */
export default function AppShell() {
  const nav = <ShellNavLinks />
  return (
    <ResponsiveAppShell sidebarWidth="md">
      {/*
        Mobile top bar (<768px): the drawer menu trigger (rendered by the
        shell when a Drawer is composed) + compact brand + user menu.
        Desktop returns null — the Sidebar carries the shell there.
      */}
      <ResponsiveAppShell.TopBar mobileOnly brand={<ShellBrandCompact />} actions={<UserMenu />} />

      {/*
        Desktop sidebar (>=768px): brand row + the consolidated nav.
      */}
      <ResponsiveAppShell.Sidebar>
        <ShellBrand />
        {nav}
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (<768px): the shell's full APG dialog over the SAME
        nav element. `h-full` restores the documented full-height
        left-panel geometry (the shared panel ships no height token).
      */}
      <ResponsiveAppShell.Drawer className="h-full" header={<ShellBrandCompact />}>
        {nav}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
