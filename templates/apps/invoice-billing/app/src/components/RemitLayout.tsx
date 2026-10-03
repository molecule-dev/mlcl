import { Link, Outlet, useLocation, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Persistent dashboard shell — the shared `ResponsiveAppShell`
 * (`@molecule/app-ui-react`) composed to Remit's money-focused shape from
 * DESIGN.md: dark-teal 240px sidebar with the "New Invoice" coral CTA, and
 * the sticky 56px top bar (search + notifications + theme + user) mounted on
 * BOTH breakpoints via the shell's `md:flex-wrap` + `w-full` pattern, so it
 * sits on its own full-width row above [Sidebar, Content] on desktop.
 *
 * Mobile (<768px): the sidebar becomes the shell's slide-in dialog drawer —
 * focus trap, Escape/backdrop close, body scroll lock, auto-close on
 * navigation, and the 44px menu trigger rendered by the TopBar itself. The
 * former hand-rolled drawer state machine, matchMedia gate and off-canvas
 * fixed sidebar are deleted with it, and the `marginLeft: 240px` flow hack
 * goes with them (the shell root is a real flex row on desktop).
 *
 * data-mol-id discipline: `remit-shell`, `remit-topbar`, `remit-sidebar`,
 * `remit-main`, `sidebar-cta-new-invoice` and every `sidebar-nav-*` id are
 * preserved. The sidebar and the drawer receive the SAME `nav` element, and
 * only the mounted breakpoint instantiates it, so ids are never duplicated;
 * the shell's `shell-drawer-open` / `shell-drawer` ids replace the former
 * `remit-menu-toggle` / `remit-drawer-overlay` ids.
 */
export function RemitLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const navItems: Array<{
    to: string
    icon: string
    key: string
    defaultValue: string
  }> = [
    {
      to: '/dashboard',
      icon: 'dashboard',
      key: 'remitLayout.nav.dashboard',
      defaultValue: 'Dashboard',
    },
    {
      to: '/invoices',
      icon: 'receipt_long',
      key: 'remitLayout.nav.invoices',
      defaultValue: 'Invoices',
    },
    { to: '/clients', icon: 'group', key: 'remitLayout.nav.clients', defaultValue: 'Clients' },
    {
      to: '/payments',
      icon: 'payments',
      key: 'remitLayout.nav.payments',
      defaultValue: 'Payments',
    },
    { to: '/reports', icon: 'analytics', key: 'remitLayout.nav.reports', defaultValue: 'Reports' },
    {
      to: '/settings',
      icon: 'settings',
      key: 'remitLayout.nav.settings',
      defaultValue: 'Settings',
    },
  ]

  // Single-active-item resolution: highlight the nav item whose `to` is the
  // longest prefix-match of the current pathname (never every ancestor).
  const activeTo = navItems.reduce<string | null>((best, item) => {
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

  // ONE nav element for both breakpoints — the Sidebar and the Drawer receive
  // the same element, and only the mounted breakpoint instantiates it. The
  // drawer closes itself on navigation (shell-owned), so links carry no
  // onClick close.
  const nav = (
    <>
      <Link
        to={safeTarget('/invoices/new')}
        data-mol-id="sidebar-cta-new-invoice"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
          'min-h-[44px] rounded-[10px] px-3.5 py-2.5 text-sm font-bold',
        )}
        style={{
          backgroundColor: 'var(--color-accent)',
          color: 'var(--color-sidebar-text-active)',
          textDecoration: 'none',
          boxShadow: '0 2px 6px var(--color-accent-shadow)',
          margin: '0 4px 16px 4px',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden="true">
          add
        </span>
        {t('remitLayout.newInvoice', {}, { defaultValue: 'New Invoice' })}
      </Link>

      {navItems.map((item) => {
        const isActive = item.to === activeTo
        return (
          <Link
            key={item.to}
            to={safeTarget(item.to)}
            data-mol-id={`sidebar-nav-${item.to.slice(1).replace(/\//g, '-')}`}
            aria-current={isActive ? 'page' : undefined}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              'min-h-[44px] rounded-lg px-3.5 py-2.5 text-sm',
              isActive ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
            )}
            style={{
              color: isActive ? 'var(--color-sidebar-text-active)' : 'var(--color-sidebar-text)',
              backgroundColor: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
              borderLeft: isActive ? '3px solid var(--color-accent)' : '3px solid transparent',
              textDecoration: 'none',
              transition: 'background-color 0.15s, color 0.15s',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px' }}
              aria-hidden="true"
            >
              {item.icon}
            </span>
            {t(item.key, {}, { defaultValue: item.defaultValue })}
          </Link>
        )
      })}
    </>
  )

  const brand = (
    <Link
      to={safeTarget('/dashboard')}
      style={{ color: 'var(--color-sidebar-text-active)', textDecoration: 'none' }}
    >
      <BrandWordmark as="span" size="sm" invert />
    </Link>
  )

  // Sidebar footer — the uppercase tagline strip that closed the old rail.
  const tagline = (
    <span
      style={{
        color: 'rgba(255,255,255,0.75)',
        fontSize: '11px',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      {t('remitLayout.tagline', {}, { defaultValue: 'Get paid, faster' })}
    </span>
  )

  const navAriaLabel = t('remitLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })

  return (
    <ResponsiveAppShell sidebarWidth="md" dataMolId="remit-shell" className="md:flex-wrap">
      {/*
        Top bar (both breakpoints, full-width row on desktop): the shell's
        menu trigger renders itself below 768px; brand lives in the sidebar,
        like the old design.
      */}
      <ResponsiveAppShell.TopBar
        dataMolId="remit-topbar"
        className="w-full"
        actions={
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const q = new FormData(e.currentTarget).get('q')
                const query = typeof q === 'string' ? q.trim() : ''
                navigate(query ? `/invoices?q=${encodeURIComponent(query)}` : '/invoices')
              }}
              className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}
              style={{
                width: '100%',
                maxWidth: '240px',
                backgroundColor: 'var(--mol-color-surface-secondary)',
                borderRadius: '10px',
                padding: '8px 14px',
                border: '1px solid var(--mol-color-border)',
                minWidth: 0,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '18px', color: 'var(--mol-color-text-secondary)' }}
                aria-hidden="true"
              >
                search
              </span>
              <input
                type="search"
                name="q"
                placeholder={t(
                  'remitLayout.searchPlaceholder',
                  {},
                  { defaultValue: 'Search invoices, clients...' },
                )}
                aria-label={t(
                  'remitLayout.searchPlaceholder',
                  {},
                  { defaultValue: 'Search invoices, clients...' },
                )}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '14px',
                  color: 'var(--mol-color-text)',
                  minWidth: 0,
                }}
              />
            </form>
            <Link
              to="/notifications"
              aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '8px',
                position: 'relative',
                color: 'var(--mol-color-text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <span className="material-symbols-outlined">notifications</span>
              <span
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '8px',
                  height: '8px',
                  backgroundColor: 'var(--color-accent)',
                  borderRadius: '9999px',
                }}
              />
            </Link>
            {/* Styled cells so the toggle + menu don't render as bare browser
                controls inside the styled top bar (fleet chrome pattern). */}
            <div className="text-on-surface-variant hover:text-on-surface transition-colors rounded-lg hover:bg-surface-container">
              <ThemeToggle />
            </div>
            <div className="text-on-surface-variant hover:text-on-surface transition-colors">
              <UserMenu />
            </div>
          </>
        }
      />

      {/*
        Desktop sidebar (≥768px): the dark-teal rail — brand, New-Invoice
        CTA, nav — via the payroll-manager `bg-[var(--…)]` className pattern.
      */}
      <ResponsiveAppShell.Sidebar
        navLabel={navAriaLabel}
        dataMolId="remit-sidebar"
        className={cm.cn('bg-[var(--color-primary-dark)]', cm.sp('py', 5), cm.sp('px', 3))}
        footer={tagline}
      >
        <div style={{ padding: '4px 10px 22px 10px' }}>{brand}</div>
        {nav}
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (<768px): the same rail as a full dialog panel (focus
        trap, Escape, backdrop click, body-scroll lock) over the same nav.
      */}
      <ResponsiveAppShell.Drawer
        navLabel={navAriaLabel}
        className={cm.cn('h-full bg-[var(--color-primary-dark)]')}
        header={brand}
        footer={tagline}
      >
        {nav}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content dataMolId="remit-main" className="overflow-x-auto">
        <div style={{ maxWidth: '1360px', margin: '0 auto' }} className="px-3 py-4 md:p-7">
          <Outlet />
        </div>
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

export default RemitLayout
