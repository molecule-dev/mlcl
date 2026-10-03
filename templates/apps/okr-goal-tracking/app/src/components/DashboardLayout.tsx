import type { FormEvent, ReactElement } from 'react'
import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell, useIsDesktop } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { NAV_SECTIONS } from './navSections.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Dashboard shell for the auth'd Ascent surface — the SHARED
 * `ResponsiveAppShell` compound from `@molecule/app-ui-react`.
 *
 * The shell owns the breakpoint split (768px, one chrome mounted per
 * breakpoint): the desktop sidebar and the mobile drawer (full APG dialog —
 * focus trap, Escape/backdrop close, scroll lock, auto-close on navigation)
 * render the SAME sectioned nav element, and the mobile-only top bar renders
 * the 44px menu trigger itself. The former hand-rolled MobileNav drawer
 * state machine, AscentSideNav rail and the local useIsMobile hook are
 * deleted with it.
 *
 * Nav targets/labels (i18n), longest-prefix active highlighting,
 * `aria-current="page"`, the dark indigo Ascent palette and the New
 * Objective CTA (sidebar/drawer footer) are preserved. The topbar search
 * routes to /objectives?q=… on desktop (the Objectives page reads ?q); the
 * notifications shortcut stays mobile-only, as before.
 */

/** Flattened nav items, for longest-prefix active resolution. */
const NAV_ITEMS = NAV_SECTIONS.flatMap((section) => section.items)

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400'

export function DashboardLayout(): ReactElement {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isDesktop = useIsDesktop()
  const [search, setSearch] = useState('')

  const handleSearchSubmit = (e: FormEvent): void => {
    e.preventDefault()
    const q = search.trim()
    navigate(q ? `/objectives?q=${encodeURIComponent(q)}` : '/objectives')
  }

  // Single-active-item resolution: highlight the nav item whose `to` is the
  // longest prefix-match of the current pathname (never highlight every
  // ancestor).
  const activeTo = NAV_ITEMS.reduce<string | null>((best, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return best
    if (best === null) return item.to
    return item.to.length > best.length ? item.to : best
  }, null)

  // Same-route clicks append `#top` so the URL still changes (no dead links).
  const safeTarget = (to: string): string => {
    const samePath = pathname === to || pathname + '/' === to
    return samePath ? `${to.replace(/\/$/, '')}#top` : to
  }

  const renderNavSections = (): ReactElement[] =>
    NAV_SECTIONS.map((section) => (
      <div key={section.key}>
        <p
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-[0.18em] text-indigo-400 px-3 mb-1',
          )}
        >
          {t(
            `ascentSideNav.section.${section.key}` as 'ascentSideNav.section.overview',
            {},
            { defaultValue: section.defaultLabel },
          )}
        </p>
        {section.items.map((item) => {
          const active = activeTo === item.to
          return (
            <Link
              key={item.to}
              to={safeTarget(item.to)}
              aria-current={active ? 'page' : undefined}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 3),
                'min-h-[44px] rounded-lg text-sm font-medium transition-colors duration-150',
                active
                  ? 'bg-indigo-500/20 text-white shadow-inner'
                  : 'text-indigo-100/80 hover:bg-surface/10 hover:text-white',
                FOCUS_RING,
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-[20px]', active && 'text-sky-300')}
                style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className="truncate">
                {t(
                  `ascentSideNav.nav.${item.labelKey}` as 'ascentSideNav.nav.dashboard',
                  {},
                  { defaultValue: item.defaultLabel },
                )}
              </span>
            </Link>
          )
        })}
      </div>
    ))

  const brand = (
    <Link
      to={safeTarget('/dashboard')}
      className={cm.cn(cm.flex({ align: 'center' }), cm.roundedFull, FOCUS_RING)}
    >
      <BrandWordmark as="span" size="sm" />
    </Link>
  )

  // The drawer sits on the dark indigo rail, so its brand uses the inverted
  // wordmark — the same treatment the old MobileNav drawer applied.
  const drawerBrand = (
    <Link
      to={safeTarget('/dashboard')}
      className={cm.cn(cm.flex({ align: 'center' }), cm.roundedFull, FOCUS_RING)}
    >
      <BrandWordmark as="span" size="sm" invert withTagline />
    </Link>
  )

  // One nav element for BOTH mounts — the shell instantiates only the
  // breakpoint's copy, so the links are never in the DOM twice.
  const nav = (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), cm.sp('p', 2))}>
      {renderNavSections()}
    </div>
  )

  const newObjectiveCta = (
    <Link
      to="/objectives/new"
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
        'min-h-[44px] w-full font-bold text-sm rounded-xl text-white bg-gradient-to-br from-indigo-500 to-sky-500 shadow-lg shadow-indigo-500/30 active:scale-[0.99] transition-transform',
        FOCUS_RING,
      )}
    >
      <span className="material-symbols-outlined text-[18px]">add</span>
      {t('ascentSideNav.newObjective', {}, { defaultValue: 'New objective' })}
    </Link>
  )

  const notificationsButton = (
    <button
      type="button"
      aria-label={t('ascentSideNav.nav.notifications', {}, { defaultValue: 'Notifications' })}
      onClick={() => navigate('/notifications')}
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.roundedFull,
        'h-11 w-11 shrink-0 text-on-surface hover:bg-surface-container',
        FOCUS_RING,
      )}
    >
      <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')} aria-hidden>
        notifications
      </span>
    </button>
  )

  const searchForm = isDesktop ? (
    <form
      role="search"
      onSubmit={handleSearchSubmit}
      className={cm.cn(cm.flex({ align: 'center' }), 'relative')}
    >
      <span
        aria-hidden
        className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-[20px]"
      >
        search
      </span>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label={t('dashboardLayout.searchAria', {}, { defaultValue: 'Search objectives' })}
        placeholder={t(
          'dashboardLayout.searchPlaceholder',
          {},
          { defaultValue: 'Search objectives, KRs, people...' },
        )}
        className={cm.cn(
          cm.sp('py', 2),
          cm.textSize('sm'),
          'w-[clamp(12rem,24vw,28rem)] pl-10 pr-4 bg-surface-container-low rounded-xl border-none focus:ring-2 focus:ring-primary/30 outline-none transition-all',
        )}
      />
    </form>
  ) : null

  return (
    <ResponsiveAppShell sidebarWidth={260}>
      {/*
        Mobile top bar (<768px): the shell's 44px menu trigger + brand +
        notifications + theme + user menu — the hand-rolled header it
        replaces, one for one. Desktop returns null (mobileOnly).
      */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={brand}
        actions={
          <>
            {notificationsButton}
            <ThemeToggle />
            <UserMenu />
          </>
        }
      />

      {/*
        Desktop sidebar (>=768px): the sectioned nav + the New Objective CTA
        in the bordered footer row — where AscentSideNav kept it. Null below
        768px — the drawer carries the same nav there.
      */}
      <ResponsiveAppShell.Sidebar footer={newObjectiveCta}>{nav}</ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (<768px): the shell's APG dialog over the SAME nav
        element. `h-full` restores the full-height left-panel geometry (the
        shared panel ships no height token).
      */}
      <ResponsiveAppShell.Drawer
        header={drawerBrand}
        footer={newObjectiveCta}
        className="h-full text-primary-light bg-[var(--color-nav-bg)]"
      >
        {nav}
      </ResponsiveAppShell.Drawer>

      {/*
        Content column: on desktop the top bar (brand + search + actions)
        sits above the routed page; on mobile the wrapper passes the shell
        column's Content straight through.
      */}
      <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0')}>
        {isDesktop && (
          <ResponsiveAppShell.TopBar
            brand={brand}
            actions={
              <>
                {searchForm}
                <ThemeToggle />
                <UserMenu />
              </>
            }
          />
        )}
        <ResponsiveAppShell.Content className="p-4 md:p-8 overflow-x-hidden">
          <div className="max-w-[1360px] mx-auto">
            <Outlet />
          </div>
        </ResponsiveAppShell.Content>
      </div>
    </ResponsiveAppShell>
  )
}
