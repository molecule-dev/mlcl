/**
 * App shell for the auth'd Klaxon surface — the shared `ResponsiveAppShell`.
 *
 * Below 768px a `mobileOnly` TopBar carries the brand and the shell-rendered
 * menu trigger; the nav lives in the Drawer (full APG dialog contract — focus
 * moves in and is restored, Tab trapped, Escape/backdrop close, body scroll
 * locked) with the user menu in its footer. At ≥768px the Sidebar mounts
 * instead: brand + nav + user-menu footer. `.Sidebar` and `.Drawer` receive
 * the SAME nav element, so only the mounted breakpoint instantiates it and
 * nav `data-mol-id`s never duplicate in the DOM. The shell owns the drawer
 * open state, Escape/backdrop handling and nav auto-close that this layout
 * used to hand-roll.
 */
import type { ReactElement } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'monitor_heart' },
  { to: '/incidents', key: 'incidents', defaultLabel: 'Incidents', icon: 'notifications_active' },
  { to: '/schedules', key: 'schedules', defaultLabel: 'Schedules', icon: 'event_repeat' },
  {
    to: '/escalation-policies',
    key: 'escalationPolicies',
    defaultLabel: 'Escalation Policies',
    icon: 'moving',
  },
  { to: '/postmortems', key: 'postmortems', defaultLabel: 'Postmortems', icon: 'history_edu' },
  { to: '/team', key: 'team', defaultLabel: 'Team', icon: 'group' },
  { to: '/notifications', key: 'notifications', defaultLabel: 'Notifications', icon: 'inbox' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function OncallLayout(): ReactElement {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  // Single-active-item resolution: highlight the nav item whose `to` is the
  // longest prefix-match of the current pathname (never highlight every
  // ancestor).
  const activeKey = NAV_KEYS.reduce<string | null>((bestKey, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return bestKey
    if (bestKey === null) return item.key
    const best = NAV_KEYS.find((i) => i.key === bestKey)
    return best && item.to.length > best.to.length ? item.key : bestKey
  }, null)

  // Same-route clicks append `#top` so the URL still changes (no dead links).
  const safeTarget = (to: string): string => {
    const samePath = pathname === to || pathname + '/' === to
    return samePath ? `${to.replace(/\/$/, '')}#top` : to
  }

  const navAriaLabel = t('oncallLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })

  // The SAME nav element for both surfaces — only the mounted breakpoint
  // instantiates it.
  const nav = (
    <>
      {NAV_KEYS.map((item) => {
        const isActive = item.key === activeKey
        return (
          <Link
            key={item.key}
            to={safeTarget(item.to)}
            data-mol-id={`nav-${item.key}`}
            aria-current={isActive ? 'page' : undefined}
            className={cm.cn(
              'flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium min-h-[44px]',
              isActive
                ? // The container pair, NOT bgPrimarySubtle + textPrimary — brand
                  // on a 10% tint of itself fails the 4.5:1 AA floor.
                  cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
                : cm.cn('text-on-surface-variant hover:bg-surface-variant', cm.link),
            )}
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              {item.icon}
            </span>
            <span>
              {t(`oncallLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
            </span>
          </Link>
        )
      })}
    </>
  )

  const brand = (
    <Link
      to={safeTarget('/dashboard')}
      data-mol-id="nav-brand"
      className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'block truncate text-on-surface')}
    >
      {APP_NAME}
    </Link>
  )

  return (
    <ResponsiveAppShell sidebarWidth="md">
      <ResponsiveAppShell.TopBar mobileOnly brand={brand} />
      <ResponsiveAppShell.Sidebar navLabel={navAriaLabel} footer={<UserMenu />}>
        {/* The Sidebar has no brand slot — the brand leads its children with
            the aside padding the old SidebarLayout applied. */}
        <div className={cm.cn(cm.sp('px', 4), cm.sp('pt', 4), cm.sp('pb', 2))}>{brand}</div>
        {nav}
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer navLabel={navAriaLabel} header={brand} footer={<UserMenu />}>
        {nav}
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
