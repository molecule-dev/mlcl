import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/home', key: 'home', defaultLabel: 'Today', icon: 'newspaper' },
  { to: '/topics', key: 'topics', defaultLabel: 'Topics', icon: 'category' },
  { to: '/sources', key: 'sources', defaultLabel: 'Sources', icon: 'rss_feed' },
  { to: '/saved', key: 'saved', defaultLabel: 'Saved', icon: 'bookmark' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

/**
 * Vantage app shell — the shared `ResponsiveAppShell` composed to this app's
 * shape: a mobile-only top bar (the desktop brand row lives in the sidebar),
 * a ≥md sidebar, a <md dialog drawer, and one `<Outlet />` so pages mount
 * exactly once at any width. The shell owns the breakpoint, the drawer open
 * state, the menu trigger, focus/Escape/backdrop handling, and the
 * auto-close-on-navigation; this component only supplies nav + brand.
 *
 * On mount it hydrates the server-side preference slice
 * (GET /api/preferences) into the local auth user so live readers of
 * `useShowBiasMeters()` reflect the persisted value on first paint of any
 * authed page, not just after visiting Settings.
 */
export function NewsAggregatorLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { pathname } = useLocation()
  const { user, setUser } = useAuth<UserProfile & { oauthData?: Record<string, unknown> }>()

  const navLabel = t(
    'newsAggregatorLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )

  // ONE nav element for both breakpoints — the Sidebar and the Drawer receive
  // the same array, and only the mounted breakpoint instantiates it. The
  // drawer closes itself on navigation (shell-owned), so links carry no
  // onClick close.
  const navItems = NAV_KEYS.map((item) => {
    const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`)
    return (
      <Link
        key={item.key}
        to={item.to}
        data-mol-id={`nav-${item.key}`}
        aria-current={isActive ? 'page' : undefined}
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.sp('px', 3),
          'min-h-[44px] gap-3 py-2.5 rounded-lg text-sm font-medium',
          isActive
            ? 'bg-primary-container/40 text-primary'
            : 'text-on-surface-variant hover:bg-surface-container',
          FOCUS_RING,
        )}
      >
        <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')} aria-hidden="true">
          {item.icon}
        </span>
        <span>
          {t(`newsAggregatorLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
        </span>
      </Link>
    )
  })

  useEffect(() => {
    let cancelled = false
    http
      .get<{ showBiasMeters?: boolean }>('/api/preferences')
      .then((resp) => {
        const meters = resp.data?.showBiasMeters
        if (cancelled || !user || typeof meters !== 'boolean') return
        const existingOauth = (user.oauthData as Record<string, unknown> | undefined) ?? {}
        const existingPrefs = (existingOauth.preferences as Record<string, unknown>) ?? {}
        setUser({
          ...(user as unknown as Record<string, unknown>),
          oauthData: {
            ...existingOauth,
            preferences: { ...existingPrefs, showBiasMeters: meters },
          },
        } as unknown as UserProfile & { oauthData?: Record<string, unknown> })
      })
      .catch(() => {
        // Hydration is best-effort — pages fall back to the default (shown).
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once per layout mount
  }, [])

  return (
    <ResponsiveAppShell sidebarWidth="md" dataMolId="vantage-shell">
      {/*
        Mobile top bar (< md). The desktop sidebar is hidden below md, so the
        brand + user menu need a home that does not eat the viewport; the
        shell renders the menu trigger itself.
      */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={
          <Link to="/home" className="truncate">
            <BrandWordmark as="span" size="sm" />
          </Link>
        }
        actions={<UserMenu />}
      />

      {/*
        Desktop sidebar (>= md). The brand row leads the nav column — the
        shared Sidebar has no header slot, so it rides inside `children`.
      */}
      <ResponsiveAppShell.Sidebar
        navLabel={navLabel}
        className={cm.sp('p', 4)}
        footer={<UserMenu />}
      >
        <Link to="/home" className={cm.cn(cm.sp('mb', 6), 'block')}>
          <BrandWordmark as="span" />
        </Link>
        {navItems}
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (< md): a full dialog panel (focus trap, Escape,
        backdrop click, body-scroll lock) over the same nav, with the user
        menu in the footer.
      */}
      <ResponsiveAppShell.Drawer
        navLabel={navLabel}
        // The shared panel ships no height token (its content would size it);
        // `h-full` restores the documented full-height left-panel geometry.
        className="h-full"
        header={
          <Link to="/home">
            <BrandWordmark as="span" />
          </Link>
        }
        footer={<UserMenu />}
      >
        {navItems}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
