import { Link, NavLink, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { NowPlayingBar } from './NowPlayingBar.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/discover', key: 'discover', defaultLabel: 'Discover', icon: 'explore' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  { to: '/library', key: 'library', defaultLabel: 'Library', icon: 'library_music' },
  { to: '/queue', key: 'queue', defaultLabel: 'Queue', icon: 'queue_music' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Wavelength shell — the shared `ResponsiveAppShell` composed to this app's
 * shape: a mobile-only top bar (brand + compact user menu; the shell renders
 * the drawer menu trigger itself), a ≥768px sidebar with the brand row and
 * the full user card in its footer, a <768px dialog drawer over the same
 * nav, and one `<Outlet />` so pages mount exactly once at any width. The
 * shell owns the breakpoint, the root direction, the drawer open state,
 * focus/Escape/backdrop handling, and the auto-close-on-navigation; this
 * component only supplies nav + brand. The NowPlayingBar is page chrome, not
 * the nav shell, so it stays app-local below the shell — the wrapper's
 * bottom padding keeps the last page content clear of the fixed bar.
 */
export function WavelengthLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`wavelengthLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))

  // Single-active-item resolution: longest prefix-match wins (the fleet's
  // active-nav rule — keeps a detail route like /shows/<id> lit under its
  // parent section).
  const activeKey = navItems.reduce<string | null>((best, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return best
    if (best === null) return item.key
    const current = navItems.find((i) => i.key === best)
    return current && item.to.length > current.to.length ? item.key : best
  }, null)

  const navLabel = t('wavelengthLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })

  // ONE nav element for both breakpoints — the Sidebar and the Drawer receive
  // the same element, and only the mounted breakpoint instantiates it. The
  // drawer closes itself on navigation (shell-owned), so links carry no
  // onClick close.
  const nav = navItems.map((item) => {
    const isActive = item.key === activeKey
    return (
      <NavLink
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
          'min-h-[44px] rounded-full transition-colors',
          isActive
            ? // The container pair, NOT bgPrimarySubtle + textPrimary — the
              // brand colour on a 10% tint of itself fails AA.
              cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
            : cm.cn(cm.textMuted, cm.link),
        )}
      >
        <span className="material-symbols-outlined text-base" aria-hidden="true">
          {item.icon}
        </span>
        <span>{item.label}</span>
      </NavLink>
    )
  })

  return (
    <div style={{ paddingBottom: '88px' }}>
      <ResponsiveAppShell sidebarWidth="md">
        {/*
          Mobile top bar (<768px): brand + compact user card, per the old
          mobile shell's sticky header. The drawer menu trigger is the shell's.
        */}
        <ResponsiveAppShell.TopBar
          mobileOnly
          brand={
            <Link
              to="/discover"
              className={cm.cn(cm.flex({ align: 'center' }), 'min-w-0 truncate')}
            >
              <BrandWordmark as="span" size="sm" />
            </Link>
          }
          actions={<UserMenu dataMolId="mobile-user-card" compact />}
        />

        {/*
          Desktop sidebar (>=768px): the brand row leads the nav column — the
          shared Sidebar has no header slot, so it rides inside children. The
          full user card rides in the footer slot (its only desktop home now
          that the TopBar is mobile-only).
        */}
        <ResponsiveAppShell.Sidebar
          navLabel={navLabel}
          className={cm.sp('p', 4)}
          // inline-flex keeps the menu button hugging its content instead of
          // stretching across the footer row (the footer is a flex-col).
          footer={
            <span className="inline-flex">
              <UserMenu />
            </span>
          }
        >
          <Link to="/discover" className={cm.cn(cm.sp('mb', 6), 'block')}>
            <BrandWordmark as="span" />
          </Link>
          {nav}
        </ResponsiveAppShell.Sidebar>

        {/*
          Mobile drawer (<768px): a full dialog panel (focus trap, Escape,
          backdrop click, body-scroll lock) over the same nav.
        */}
        <ResponsiveAppShell.Drawer
          navLabel={navLabel}
          className="h-full"
          header={<BrandWordmark as="span" size="sm" />}
        >
          {nav}
        </ResponsiveAppShell.Drawer>

        <ResponsiveAppShell.Content className="w-full overflow-y-auto">
          <Outlet />
        </ResponsiveAppShell.Content>
      </ResponsiveAppShell>
      <NowPlayingBar />
    </div>
  )
}
