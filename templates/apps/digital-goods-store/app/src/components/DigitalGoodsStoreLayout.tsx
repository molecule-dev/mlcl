import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Authenticated creator dashboard shell — the shared `ResponsiveAppShell`
 * (`@molecule/app-ui-react`): a mobile-only top bar (<768px; brand + the
 * shell's own 44px menu trigger), a ≥768px sidebar (brand + nav + user menu
 * in the footer row), and a <768px slide-in dialog drawer carrying the SAME
 * nav element (focus trap, Escape/backdrop close, body scroll lock,
 * auto-close on navigation). The former hand-rolled fixed sidebar, top bar
 * and the `TroveMobileNav` bottom tab bar are deleted with it — one chrome
 * per breakpoint, and the fleet-standard 768px breakpoint replaces the old
 * 1024px fencepost (768px tablets get the full sidebar instead of a
 * crushed rail).
 *
 * data-mol-id discipline: the `dgs-nav-*` ids and `nav.*` i18n keys are
 * preserved. The sidebar and the drawer receive the same `nav` element, and
 * only the mounted breakpoint instantiates it, so ids are never duplicated;
 * the shell's `shell-drawer-open` / `shell-drawer` ids replace the former
 * `trove-mobile-nav` / `mobile-nav-*` tab-bar ids.
 */
export function DigitalGoodsStoreLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const NAV_KEYS = [
    { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'space_dashboard' },
    { to: '/products', key: 'products', defaultLabel: 'Products', icon: 'inventory_2' },
    { to: '/sales', key: 'sales', defaultLabel: 'Sales', icon: 'point_of_sale' },
    { to: '/library', key: 'library', defaultLabel: 'Library', icon: 'folder_special' },
    { to: '/orders', key: 'orders', defaultLabel: 'Orders', icon: 'receipt_long' },
    { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'tune' },
  ] as const

  // Single-active-item resolution: highlight the nav item whose `to` is the
  // longest prefix-match of the current pathname (never every ancestor).
  const activeTo = NAV_KEYS.reduce<string | null>((best, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return best
    if (best === null || item.to.length > best.length) return item.to
    return best
  }, null)

  // Same-route clicks append `#top` so the URL still changes (no dead links).
  const safeTarget = (to: string): string => {
    const samePath = pathname === to || pathname + '/' === to
    return samePath ? `${to.replace(/\/$/, '')}#top` : to
  }

  const navAriaLabel = t('nav.creatorAria', {}, { defaultValue: 'Creator dashboard' })

  // ONE nav element for both breakpoints — the Sidebar and the Drawer receive
  // the same element, and only the mounted breakpoint instantiates it. The
  // drawer closes itself on navigation (shell-owned), so links carry no
  // onClick close. No <nav> wrapper here — the shell's Sidebar/Drawer already
  // wrap children in the nav landmark; a second one would duplicate it in
  // the a11y tree.
  const nav = (
    <div className={cm.cn(cm.flex1, cm.sp('px', 4), cm.stack(1), 'overflow-y-auto')}>
      {NAV_KEYS.map((item) => {
        const isActive = item.to === activeTo
        return (
          <Link
            key={item.to}
            to={safeTarget(item.to)}
            data-mol-id={`dgs-nav-${item.key}`}
            aria-current={isActive ? 'page' : undefined}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.roundedFull,
              'min-h-[44px] transition-colors',
              isActive
                ? 'bg-primary-light text-primary-dark font-semibold'
                : 'text-on-surface-variant hover:bg-bg-secondary hover:text-on-surface',
            )}
          >
            <span
              className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
              aria-hidden="true"
            >
              {item.icon}
            </span>
            <span>{t(`nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}</span>
          </Link>
        )
      })}
    </div>
  )

  // Shell chrome actions — the user menu opens from the LEFT, adjacent to
  // the sidebar/drawer edge it sits on, and the theme toggle rides beside
  // it (styled so neither reads as a bare browser control bolted onto the
  // chrome). Mounted in the sidebar footer (desktop) and drawer footer
  // (mobile).
  const footer = (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
        'w-full border-t border-border pt-3',
      )}
    >
      <div className="text-on-surface-variant hover:text-on-surface transition-colors">
        <UserMenu side="left" />
      </div>
      <div className="text-on-surface-variant hover:text-on-surface transition-colors rounded-lg hover:bg-surface-container">
        <ThemeToggle />
      </div>
    </div>
  )

  // BrandWordmark renders its own router link — wrapping it in another
  // <Link> nests an <a> inside an <a>, which the console (and the e2e
  // console-error gate) rejects.
  const brand = (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('p', 6), cm.sp('pb', 0))}>
      <BrandWordmark to="/dashboard" size="sm" />
    </div>
  )

  return (
    <ResponsiveAppShell sidebarWidth="lg" dataMolId="dgs-layout">
      {/*
        Mobile top bar (<768px): the shell's menu trigger + brand. Desktop
        is brandless up top — the sidebar carries the brand row.
      */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={
          <div className="min-w-0 truncate">
            <BrandWordmark to="/dashboard" size="sm" />
          </div>
        }
      />

      {/* Desktop sidebar (≥768px): brand + nav + the styled footer row. */}
      <ResponsiveAppShell.Sidebar navLabel={navAriaLabel}>
        {brand}
        {nav}
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (<768px): the shell's APG dialog over the SAME nav,
        with the brand in the header row and the actions in the footer.
        `h-full` restores the full-height left-panel geometry.
      */}
      <ResponsiveAppShell.Drawer
        navLabel={navAriaLabel}
        className="h-full"
        header={
          <div className="min-w-0 truncate">
            <BrandWordmark to="/dashboard" size="sm" />
          </div>
        }
        footer={footer}
      >
        {nav}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

export default DigitalGoodsStoreLayout
