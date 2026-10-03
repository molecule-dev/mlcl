import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell, useIsDesktop } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { deriveInitials } from '../lib/api.js'
import { MeridianMailSidebar } from './MeridianMailSidebar.js'
import { UserMenu } from './UserMenu.js'

interface MeridianAppShellProps {
  children: ReactElement | ReactElement[]
  /** Hide the left mail sidebar (used on full-screen pages like Compose). */
  hideSidebar?: boolean
  /** Bumped by callers after mutations so the sidebar refetches counts. */
  refreshKey?: number
}

interface AuthUser {
  id?: string
  name?: string | null
  email?: string | null
}

/**
 * Outer chrome for every signed-in Meridian page — the SHARED
 * `ResponsiveAppShell` compound from `@molecule/app-ui-react` around the
 * app's mail sidebar.
 *
 * The shell owns the breakpoint split (768px, one chrome mounted per
 * breakpoint) and the whole mobile drawer contract: the drawer (full APG
 * dialog — focus trap, Escape/backdrop close, scroll lock, auto-close on
 * navigation) renders the SAME `MeridianMailSidebar` element as the desktop
 * sidebar, and the mobile-only top bar renders the 44px menu trigger
 * itself. The former translate-hidden drawer, its overlay/Escape effects
 * and the MeridianTopBar hamburger are deleted with it.
 *
 * The top bar (brand + centered search pill + user actions, formerly
 * MeridianTopBar) renders on BOTH breakpoints — on desktop it heads the
 * content column, below 768px it is the shell's mobile top bar. The search
 * pill is wired via `?search=<query>` on `/inbox`; the Inbox page reads the
 * param and asks the API to filter.
 *
 * `hideSidebar` (Compose) removes only the mail sidebar — the top bar (and
 * its search) stay. The content column keeps the app's fixed-viewport
 * geometry (`calc(100vh - 3.5rem)` under the 56px top bar, overflow hidden)
 * because every page composes its own two-pane layout from `h-full` +
 * internal scroll containers.
 */
export function MeridianAppShell({
  children,
  hideSidebar = false,
  refreshKey,
}: MeridianAppShellProps): ReactElement {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const { user } = useAuth<AuthUser>()
  const initials = deriveInitials(user?.name?.trim() || user?.email || 'M C')
  const isDesktop = useIsDesktop()

  const initialQuery = params.get('search') ?? ''
  const [query, setQuery] = useState(initialQuery)
  useEffect(() => {
    setQuery(params.get('search') ?? '')
  }, [params])

  const submitSearch = (value: string): void => {
    const trimmed = value.trim()
    const target = trimmed
      ? `/inbox?search=${encodeURIComponent(trimmed)}`
      : location.pathname.startsWith('/inbox')
        ? '/inbox'
        : location.pathname + location.search
    navigate(target)
  }

  const showSidebar = !hideSidebar

  const brand = (
    <Link
      to="/inbox"
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        // 44px — the fleet's minimum tap target; below sm only the 32px
        // mail tile renders, so the link itself carries the height.
        'min-h-[44px] shrink-0',
      )}
    >
      <span
        className={cm.cn(
          cm.w(8),
          cm.h(8),
          cm.flex({ align: 'center', justify: 'center' }),
          'rounded-xl bg-gradient-to-br from-primary to-secondary text-white',
        )}
      >
        <span
          className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          mail
        </span>
      </span>
      <span
        className={cm.cn(
          cm.textSize('lg'),
          cm.fontWeight('bold'),
          'text-primary tracking-tight hidden sm:inline',
        )}
      >
        {t('meridian.topBar.appName', {}, { defaultValue: APP_NAME })}
      </span>
    </Link>
  )

  const searchPill = (
    <div className={cm.cn(cm.flex({ align: 'center' }), 'min-w-0')}>
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.w('full'),
          cm.sp('px', 4),
          'h-10 bg-surface-container-low rounded-full border border-transparent focus-within:border-primary/40 focus-within:bg-surface focus-within:ring-2 focus-within:ring-primary/20 transition-all',
        )}
        style={{ width: 'clamp(10rem, 30vw, 520px)' }}
      >
        <span
          className={cm.cn(cm.sp('mr', 3), 'material-symbols-outlined text-on-surface-variant')}
          aria-hidden="true"
        >
          search
        </span>
        <input
          type="search"
          className={cm.cn(
            cm.flex1,
            cm.sp('p', 0),
            cm.textSize('sm'),
            'bg-transparent border-none outline-none placeholder:text-on-surface-variant focus:ring-0',
          )}
          placeholder={t('meridian.topBar.searchPlaceholder', {}, { defaultValue: 'Search mail' })}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submitSearch(query)
            } else if (e.key === 'Escape') {
              setQuery('')
              submitSearch('')
            }
          }}
          onBlur={() => {
            if (query !== initialQuery) submitSearch(query)
          }}
          aria-label={t('meridian.topBar.searchLabel', {}, { defaultValue: 'Search mail' })}
          data-mol-id="topbar-search"
        />
      </div>
    </div>
  )

  const topBarActions = (
    <>
      {searchPill}
      <div className="text-on-surface-variant hover:text-on-surface transition-colors">
        <UserMenu />
      </div>
      <Link
        to="/settings"
        aria-label={t('settings.account', {}, { defaultValue: 'Account' })}
        data-mol-id="topbar-avatar"
        className={cm.cn(
          cm.w(9),
          cm.h(9),
          cm.flex({ align: 'center', justify: 'center' }),
          cm.fontWeight('bold'),
          cm.textSize('xs'),
          cm.sp('ml', 2),
          cm.cursorPointer,
          'hidden md:inline-flex rounded-full bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 transition-colors',
        )}
      >
        {initials}
      </Link>
    </>
  )

  // One mail-sidebar element for BOTH mounts — the shell instantiates only
  // the breakpoint's copy, so its `sidebar*` locators are never in the DOM
  // twice (and the counts/labels hooks never double-fetch).
  const mailSidebar = showSidebar ? <MeridianMailSidebar refreshKey={refreshKey} /> : null

  return (
    <ResponsiveAppShell sidebarWidth={240}>
      {/*
        Mobile top bar (<768px): the shell's 44px menu trigger (only while
        the mail sidebar is composed) + brand + search + user actions.
      */}
      <ResponsiveAppShell.TopBar mobileOnly brand={brand} actions={topBarActions} />

      {showSidebar && (
        <ResponsiveAppShell.Sidebar
          navLabel={t('meridian.sidebar.primaryNav', {}, { defaultValue: 'Mail navigation' })}
        >
          {mailSidebar}
        </ResponsiveAppShell.Sidebar>
      )}

      {/*
        Mobile drawer (<768px): the shell's APG dialog over the SAME mail
        sidebar element. `h-full` restores the full-height left-panel
        geometry.
      */}
      {showSidebar && (
        <ResponsiveAppShell.Drawer
          dataMolId="sidebar-drawer"
          header={brand}
          navLabel={t('meridian.sidebar.primaryNav', {}, { defaultValue: 'Mail navigation' })}
          className="h-full"
        >
          {mailSidebar}
        </ResponsiveAppShell.Drawer>
      )}

      {/*
        Content column: on desktop the top bar heads the routed page; on
        mobile the wrapper passes the shell column's Content straight
        through. Fixed height + overflow hidden — the pages own their
        internal scrolling panes.
      */}
      <div
        className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0 h-[calc(100vh-3.5rem)]')}
      >
        {isDesktop && <ResponsiveAppShell.TopBar brand={brand} actions={topBarActions} />}
        <ResponsiveAppShell.Content
          className={cm.flex1}
          style={{ overflow: 'hidden', minHeight: 0 }}
        >
          {children}
        </ResponsiveAppShell.Content>
      </div>
    </ResponsiveAppShell>
  )
}
