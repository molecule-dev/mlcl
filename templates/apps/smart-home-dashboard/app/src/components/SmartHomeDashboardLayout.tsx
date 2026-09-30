/**
 * Ember dashboard shell — the shared `ResponsiveAppShell` composed to this
 * app's nav, brand and user menu.
 *
 * Formerly a template-local shell that owned BOTH breakpoints by hand
 * (hamburger button, drawer open state, escape/backdrop handlers, CSS-hidden
 * desktop sidebar). The shared shell owns the breakpoint split now: the
 * Sidebar mounts only ≥768px, the mobile Drawer (same nav element, full
 * APG dialog contract — focus trap, Escape/backdrop close, scroll lock,
 * auto-close on navigation) only below it, and the TopBar renders the menu
 * trigger itself.
 */
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/overview', key: 'overview', defaultLabel: 'Overview', icon: 'dashboard' },
  { to: '/rooms', key: 'rooms', defaultLabel: 'Rooms', icon: 'home' },
  { to: '/scenes', key: 'scenes', defaultLabel: 'Scenes', icon: 'auto_awesome' },
  { to: '/automations', key: 'automations', defaultLabel: 'Automations', icon: 'bolt' },
  { to: '/energy', key: 'energy', defaultLabel: 'Energy', icon: 'eco' },
  { to: '/security', key: 'security', defaultLabel: 'Security', icon: 'shield' },
  { to: '/activity', key: 'activity', defaultLabel: 'Activity', icon: 'history' },
  { to: '/floorplan', key: 'floorplan', defaultLabel: 'Floorplan', icon: 'map' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function SmartHomeDashboardLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()

  const navLabel = (key: string, defaultLabel: string) =>
    t(`smartHomeDashboardLayout.nav.${key}`, {}, { defaultValue: defaultLabel })

  // Longest-prefix active item: /rooms/:id keeps Rooms highlighted without
  // also highlighting shorter prefixes.
  const activeTo = NAV_KEYS.reduce<string | null>((best, item) => {
    const isMatch = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
    if (!isMatch) return best
    return best === null || item.to.length > best.length ? item.to : best
  }, null)

  const navAria = t(
    'smartHomeDashboardLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )

  // ONE nav element for both breakpoints — the Sidebar and the Drawer receive
  // the same node, and only the mounted breakpoint instantiates it. The
  // drawer closes itself on navigation (shell-owned), so links carry no
  // onClick close.
  const navLinks = NAV_KEYS.map((item) => {
    const isActive = item.to === activeTo
    return (
      <Link
        key={item.key}
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
          'min-h-[40px]',
          isActive
            ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
            : cm.cn(cm.textMuted, cm.link),
        )}
      >
        {item.icon ? (
          <span className="material-symbols-outlined" aria-hidden="true">
            {item.icon}
          </span>
        ) : null}
        <span>{navLabel(item.key, item.defaultLabel)}</span>
      </Link>
    )
  })

  const brandLink = (
    <Link to="/overview" className={cm.cn(cm.sp('mb', 6), cm.sp('px', 4), cm.displayBlock)}>
      <BrandWordmark as="span" size="md" />
    </Link>
  )

  return (
    <ResponsiveAppShell sidebarWidth="md">
      {/*
        Mobile top bar (<768px only — desktop has no bar; the brand row leads
        the sidebar). The shell renders the menu trigger itself.
      */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={
          <Link to="/overview" className={cm.cn('min-w-0 truncate')}>
            <BrandWordmark as="span" size="sm" />
          </Link>
        }
        actions={<UserMenu />}
      />

      {/*
        Desktop sidebar (≥768px). The brand row leads the nav column — the
        shared Sidebar has no header slot, so it rides inside `children`; the
        user menu rides in the bordered `footer` slot.
      */}
      <ResponsiveAppShell.Sidebar
        navLabel={navAria}
        className={cm.sp('p', 4)}
        footer={
          /* Hover-styled chrome wrapper — the menu trigger must not sit
             bare on the shell's bordered footer row. */
          <div className="text-on-surface-variant hover:text-on-surface transition-colors">
            <UserMenu dataMolId="user-menu-drawer" />
          </div>
        }
      >
        {brandLink}
        {navLinks}
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (<768px): a full dialog panel over the same nav, with
        the brand in the header row (next to the shell's close button) and
        the same user menu in the footer.
      */}
      <ResponsiveAppShell.Drawer
        navLabel={navAria}
        // The shared panel ships no height token (its content would size it);
        // `h-full` restores the documented full-height left-panel geometry.
        className="h-full"
        header={brandLink}
        footer={
          <div className="text-on-surface-variant hover:text-on-surface transition-colors">
            <UserMenu dataMolId="user-menu-drawer" />
          </div>
        }
      >
        {navLinks}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
