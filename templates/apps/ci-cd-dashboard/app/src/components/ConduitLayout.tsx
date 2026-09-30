/**
 * App shell for the auth'd Conduit surface — the shared `ResponsiveAppShell`
 * from `@molecule/app-ui-react`.
 *
 * `.TopBar` is mobile-only and carries the brand; the shell renders the menu
 * trigger itself. `.Sidebar` (≥768px) leads with the brand row and closes
 * with the user card; `.Drawer` (<768px, full APG dialog contract) receives
 * the SAME nav element, so only the mounted breakpoint instantiates it and
 * nav `data-mol-id`s are never duplicated in the DOM. The shell owns the
 * breakpoint split, the drawer open state, focus/Escape/backdrop handling,
 * and auto-close-on-navigation.
 */
import type { ReactElement } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/pipelines', key: 'pipelines', defaultLabel: 'Pipelines', icon: 'play_circle' },
  { to: '/repositories', key: 'repositories', defaultLabel: 'Repositories', icon: 'inventory_2' },
  { to: '/environments', key: 'environments', defaultLabel: 'Environments', icon: 'cloud' },
  { to: '/artifacts', key: 'artifacts', defaultLabel: 'Artifacts', icon: 'package_2' },
  { to: '/insights', key: 'insights', defaultLabel: 'Insights', icon: 'bar_chart' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function ConduitLayout(): ReactElement {
  const { t } = useTranslation()
  const cm = getClassMap()
  const { pathname } = useLocation()

  // Single-active-item resolution: highlight the nav item whose `to` is the
  // longest prefix-match of the current pathname (same rule the shared
  // sidebar uses — never highlight every ancestor).
  const activeKey = NAV_KEYS.reduce<string | null>((bestKey, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return bestKey
    if (bestKey === null) return item.key
    const best = NAV_KEYS.find((i) => i.key === bestKey)
    return best && item.to.length > best.to.length ? item.key : bestKey
  }, null)

  // Same-route clicks append `#top` so the URL still changes (no dead links) —
  // mirrors the shared sidebar's safeTarget behaviour.
  const safeTarget = (to: string): string => {
    const samePath = pathname === to || pathname + '/' === to
    return samePath ? `${to.replace(/\/$/, '')}#top` : to
  }

  const label = (item: (typeof NAV_KEYS)[number]): string =>
    t(`conduitLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })

  // ONE nav element for both breakpoints — the Sidebar and the Drawer receive
  // the same element and only the mounted breakpoint instantiates it; the
  // shell closes the drawer on navigation, so links carry no onClick close.
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
            <span>{label(item)}</span>
          </Link>
        )
      })}
    </>
  )

  const brand = (
    <Link to={safeTarget('/pipelines')} data-mol-id="nav-brand" className={cm.cn('block shrink-0')}>
      <BrandWordmark as="span" size="md" />
    </Link>
  )

  const navAriaLabel = t(
    'conduitLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )

  return (
    <ResponsiveAppShell sidebarWidth="md">
      {/* Mobile top bar (<768px) — the shell renders the menu trigger itself;
          the user card lives in the drawer footer (it never fits a 390px
          top bar beside the brand). */}
      <ResponsiveAppShell.TopBar mobileOnly brand={brand} />

      {/* Desktop sidebar (≥768px) — brand row rides inside the nav children
          (the shared Sidebar has no header slot). */}
      <ResponsiveAppShell.Sidebar
        navLabel={navAriaLabel}
        className={cm.sp('p', 4)}
        footer={
          /* Footer bar — styled to match the sidebar. Without this, UserMenu
             renders as a bare browser control bolted onto a styled sidebar. */
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              'w-full border-t border-outline-variant/40 pt-3',
            )}
          >
            <div className="text-on-surface-variant hover:text-on-surface transition-colors">
              <UserMenu />
            </div>
          </div>
        }
      >
        <div className={cm.cn(cm.flex({ direction: 'col' }), cm.sp('mb', 6))}>{brand}</div>
        {nav}
      </ResponsiveAppShell.Sidebar>

      {/* Mobile drawer (<768px) — same nav element, full dialog contract
          (focus trap, Escape/backdrop close, body-scroll lock). */}
      <ResponsiveAppShell.Drawer
        navLabel={navAriaLabel}
        className={cm.sp('p', 4)}
        header={brand}
        footer={
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              'w-full border-t border-outline-variant/40 pt-3',
            )}
          >
            <div className="text-on-surface-variant hover:text-on-surface transition-colors">
              <UserMenu />
            </div>
          </div>
        }
      >
        {nav}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
