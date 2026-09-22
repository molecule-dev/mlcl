import { useEffect } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { useIsMobile } from '../lib/use-is-mobile.js'
import { MobileNavShell } from './MobileNavShell.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/home', key: 'home', defaultLabel: 'Today', icon: 'newspaper' },
  { to: '/topics', key: 'topics', defaultLabel: 'Topics', icon: 'category' },
  { to: '/sources', key: 'sources', defaultLabel: 'Sources', icon: 'rss_feed' },
  { to: '/saved', key: 'saved', defaultLabel: 'Saved', icon: 'bookmark' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Vantage app shell — left sidebar with editorial nav links, scrollable main
 * pane on the right (rendered by SidebarLayout's internal <Outlet />).
 *
 * On mount it hydrates the server-side preference slice
 * (GET /api/preferences) into the local auth user so live readers of
 * `useShowBiasMeters()` reflect the persisted value on first paint of any
 * authed page, not just after visiting Settings.
 *
 * Mobile: below the `md` breakpoint (768px) the fixed-width sidebar rail is
 * replaced by a template-local MobileNavShell (sticky top bar + drawer) —
 * the shared SidebarLayout has no collapse and crushes a 390px viewport.
 *
 * Translated from banking-dashboard's MeridianLayout pattern.
 */
export function NewsAggregatorLayout() {
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user, setUser } = useAuth<UserProfile & { oauthData?: Record<string, unknown> }>()
  const isMobile = useIsMobile()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`newsAggregatorLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))

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

  if (isMobile) {
    return <MobileNavShell logoTo="/home" navItems={navItems} />
  }

  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/home"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t(
        'newsAggregatorLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
    />
  )
}
