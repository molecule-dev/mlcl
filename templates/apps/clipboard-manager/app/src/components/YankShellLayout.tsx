import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/clips', key: 'clips', defaultLabel: 'Clips', icon: 'content_copy' },
  {
    to: '/command-palette',
    key: 'commandPalette',
    defaultLabel: 'Command palette',
    icon: 'keyboard_command_key',
  },
  { to: '/categories', key: 'categories', defaultLabel: 'Categories', icon: 'category' },
  { to: '/devices', key: 'devices', defaultLabel: 'Devices', icon: 'devices' },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { to: '/billing', key: 'billing', defaultLabel: 'Billing', icon: 'credit_card' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Signed-in shell for Yank — periwinkle wordmark, vertical nav, UserMenu
 * pinned to the bottom — built on the shared `ResponsiveAppShell`.
 *
 * The shell owns the breakpoint split: the Sidebar mounts only ≥768px (the
 * brand row leads the nav column, UserMenu in the footer, the same geometry
 * `SidebarLayout` rendered), while the mobile-only TopBar and the dialog
 * Drawer take over below it — the TopBar renders the menu trigger itself and
 * the Drawer carries the full APG contract (focus trap, Escape, backdrop,
 * scroll lock, auto-close on navigation). The former template-local
 * MobileNavShell (hamburger, drawer open state, escape/backdrop handlers)
 * and the `useIsMobile` shell gate are deleted.
 */
export function YankShellLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const navLabel = t('yankShellLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })

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
            key={item.to}
            to={item.to}
            data-mol-id={`nav-${item.key}`}
            aria-current={isActive ? 'page' : undefined}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.roundedFull,
              isActive
                ? // The container pair, NOT bgPrimarySubtle + textPrimary —
                  // the brand colour on a 10% tint of itself measures under
                  // the 4.5 AA floor on light brands (see SidebarLayout).
                  cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
                : cm.cn(cm.textMuted, cm.link),
            )}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {item.icon}
            </span>
            <span>
              {t(`yankShellLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
            </span>
          </Link>
        )
      })}
    </>
  )

  return (
    <ResponsiveAppShell sidebarWidth="md">
      {/* Mobile top bar (<768px) — wordmark + UserMenu + the shell's own
          menu trigger. Renders nothing on desktop. */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={<BrandWordmark to="/clips" size="sm" />}
        actions={<UserMenu />}
      />

      {/*
        Desktop sidebar (≥768px). The brand row leads the nav column and the
        UserMenu is pinned to the footer — the same shape `SidebarLayout`
        rendered, so pages keep their padding and scroll behaviour.
      */}
      <ResponsiveAppShell.Sidebar
        navLabel={navLabel}
        className={cm.sp('p', 4)}
        footer={<UserMenu />}
      >
        <div className={cm.cn(cm.sp('mb', 6), cm.displayBlock)}>
          <BrandWordmark to="/clips" />
        </div>
        {nav}
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (<768px): a full dialog panel (focus trap, Escape,
        backdrop click, body-scroll lock) over the SAME nav element, with the
        wordmark in the header and the UserMenu in the footer.
      */}
      <ResponsiveAppShell.Drawer
        navLabel={navLabel}
        header={<BrandWordmark as="span" size="lg" />}
        footer={<UserMenu />}
      >
        {nav}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

export default YankShellLayout
