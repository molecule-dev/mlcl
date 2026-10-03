import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { Footer } from './Footer.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Shell layout for all auth'd Recoup pages — the shared `ResponsiveAppShell`
 * (`@molecule/app-ui-react`) composed to this app's shape: a mobile-only top
 * bar (<768px; brand + the shell's own 44px menu trigger), a ≥768px sidebar
 * (brand + workspace label + nav + actions in the footer row), and a <768px
 * dialog drawer carrying the SAME nav element. The shell owns the breakpoint,
 * the drawer open state, focus/Escape/backdrop handling, the body scroll
 * lock, and auto-close-on-navigation — the former hand-rolled hamburger,
 * drawer state machine, matchMedia gate and off-canvas sidebar are deleted
 * with it, and the sidebar is never mounted on both breakpoints at once.
 *
 * data-mol-id discipline: the `nav-*` ids and the i18n `nav.*` keys are
 * preserved; the sidebar and the drawer receive the same `nav` element, and
 * only the mounted breakpoint instantiates it, so ids are never duplicated.
 * The shell's own chrome ids (`shell-topbar`, `shell-drawer-open`,
 * `shell-drawer`, `shell-drawer-close`) replace the former `recoup-topbar` /
 * `recoup-menu-toggle` / `recoup-drawer-overlay` ids.
 */
const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', fallback: 'Dashboard', icon: 'space_dashboard' },
  { to: '/expenses', key: 'expenses', fallback: 'Expenses', icon: 'receipt_long' },
  { to: '/reports', key: 'reports', fallback: 'Reports', icon: 'description' },
  { to: '/reports/list', key: 'reportsList', fallback: 'Report Library', icon: 'folder_open' },
  { to: '/approvals', key: 'approvals', fallback: 'Approvals', icon: 'approval' },
  { to: '/notifications', key: 'notifications', fallback: 'Activity', icon: 'notifications' },
] as const

export function ExpenseReportLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  // Single-active-item resolution: highlight the nav item whose `to` is the
  // longest prefix-match of the current pathname (/reports/list activates
  // Report Library, never both Reports rows).
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

  const settingsActive = pathname === '/settings' || pathname.startsWith('/settings/')

  const navLinkClass = (isActive: boolean): string =>
    cm.cn(
      cm.flex({ align: 'center', gap: 'sm' }),
      cm.sp('px', 3),
      'py-2.5',
      cm.textSize('sm'),
      cm.fontWeight('medium'),
      'min-h-[44px] rounded-xl transition-colors',
      isActive
        ? 'bg-primary-container text-on-primary-container font-bold'
        : 'text-on-surface-variant hover:bg-surface-container-low',
    )

  // ONE nav element for both breakpoints — the Sidebar and the Drawer receive
  // the same element, and only the mounted breakpoint instantiates it. The
  // drawer closes itself on navigation (shell-owned), so links carry no
  // onClick close.
  const nav = (
    <>
      <div
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          cm.sp('mb', 2),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {t('layout.workspace', {}, { defaultValue: 'Finance Workspace' })}
      </div>
      {NAV_KEYS.map((item) => {
        const isActive = item.key === activeKey
        return (
          <Link
            key={item.key}
            to={safeTarget(item.to)}
            data-mol-id={`nav-${item.to.replace(/\//g, '-').slice(1)}`}
            aria-current={isActive ? 'page' : undefined}
            className={navLinkClass(isActive)}
          >
            <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
              {item.icon}
            </span>
            <span>{t(`nav.${item.key}`, {}, { defaultValue: item.fallback })}</span>
          </Link>
        )
      })}
      <Link
        to={safeTarget('/settings')}
        data-mol-id="nav-settings"
        aria-current={settingsActive ? 'page' : undefined}
        className={cm.cn(navLinkClass(settingsActive), 'mt-auto')}
      >
        <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
          settings
        </span>
        <span>{t('nav.settings', {}, { defaultValue: 'Settings' })}</span>
      </Link>
    </>
  )

  // Shell chrome actions — styled cells so UserMenu + ThemeToggle never
  // render as bare browser controls bolted onto the chrome. Mounted in the
  // sidebar's footer row (desktop) and the drawer's footer (mobile).
  const actions = (
    <>
      <div className="text-on-surface-variant hover:text-on-surface transition-colors rounded-lg hover:bg-surface-container">
        <ThemeToggle />
      </div>
      <div className="text-on-surface-variant hover:text-on-surface transition-colors">
        <UserMenu />
      </div>
    </>
  )

  const actionsFooter = (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
        'w-full border-t border-outline-variant/40 pt-3',
      )}
    >
      {actions}
    </div>
  )

  const navAriaLabel = t('layout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })

  return (
    <ResponsiveAppShell sidebarWidth="md" dataMolId="recoup-layout">
      {/*
        Mobile top bar (<768px): brand + the shell's menu trigger. Desktop is
        brandless up top — the sidebar carries the brand row.
      */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={
          <Link to={safeTarget('/dashboard')} data-mol-id="mobile-brand" className="block">
            <BrandWordmark as="span" />
          </Link>
        }
      />

      {/*
        Desktop sidebar (≥768px). The brand row leads the nav column — the
        shared Sidebar has no header slot, so it rides inside `children`.
      */}
      <ResponsiveAppShell.Sidebar
        navLabel={navAriaLabel}
        className={cm.cn(cm.sp('px', 4), cm.sp('py', 6))}
        footer={actionsFooter}
      >
        <Link
          to={safeTarget('/dashboard')}
          data-mol-id="sidebar-brand"
          className={cm.cn(cm.sp('px', 3), cm.sp('mb', 8), 'block')}
        >
          <BrandWordmark as="span" withTagline />
        </Link>
        {nav}
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (<768px): a full dialog panel (focus trap, Escape,
        backdrop click, body-scroll lock) over the same nav, with the brand
        in the header row and the actions in the footer.
      */}
      <ResponsiveAppShell.Drawer
        navLabel={navAriaLabel}
        className="h-full"
        header={<BrandWordmark as="span" withTagline />}
        footer={actionsFooter}
      >
        {nav}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content className="overflow-x-hidden px-4 py-5 md:px-8 md:py-8">
        <Outlet />
        <Footer />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
