import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BrandWordmark } from './BrandWordmark.js'
import { ThemeToggle } from './ThemeToggle.js'
import { useIsMobile } from './useIsMobile.js'
import { UserMenu } from './UserMenu.js'

/**
 * Persistent dashboard shell — dark teal sidebar (#0a5c5f) + sticky topbar +
 * "New Invoice" coral CTA in the sidebar header. Money-focused layout from
 * DESIGN.md: 240px sidebar, 56px topbar, max-1360px content well.
 *
 * Mobile (≤768px): the fixed sidebar becomes a slide-in drawer — hamburger in
 * the sticky top bar, dimmed overlay, Escape + route-change close — following
 * the fleet mobile-shell pattern (expense-report/EmployeeOnboardingLayout).
 *
 * Translated from personal-finance/FinanceLayout.tsx; brand-tinted to teal.
 */
export function RemitLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const navItems: Array<{
    to: string
    icon: string
    key: string
    defaultValue: string
    end?: boolean
  }> = [
    {
      to: '/dashboard',
      icon: 'dashboard',
      key: 'remitLayout.nav.dashboard',
      defaultValue: 'Dashboard',
      end: true,
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

  // Any route change closes the mobile drawer.
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // Escape closes the drawer.
  useEffect(() => {
    if (!drawerOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [drawerOpen])

  const closeDrawer = () => setDrawerOpen(false)

  return (
    <div
      data-mol-id="remit-shell"
      className={cm.cn(cm.flex({ direction: 'row' }), cm.minH('screen'))}
      style={{ backgroundColor: 'var(--mol-color-primary-light)' }}
    >
      {/* Mobile drawer overlay */}
      {isMobile && drawerOpen ? (
        <div
          role="presentation"
          data-mol-id="remit-drawer-overlay"
          onClick={closeDrawer}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            zIndex: 40,
            backdropFilter: 'blur(2px)',
          }}
        />
      ) : null}

      <aside
        data-mol-id="remit-sidebar"
        className={cm.cn(cm.flex({ direction: 'col' }))}
        style={{
          width: '240px',
          flexShrink: 0,
          backgroundColor: 'var(--color-primary-dark)',
          color: 'var(--color-sidebar-text)',
          padding: '20px 14px',
          ...(isMobile
            ? {
                position: 'fixed',
                top: 0,
                bottom: 0,
                left: drawerOpen ? 0 : '-260px',
                height: '100vh',
                overflowY: 'auto',
                zIndex: 50,
                transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: drawerOpen ? '8px 0 24px rgba(15, 23, 42, 0.25)' : 'none',
              }
            : {
                position: 'fixed',
                top: 0,
                left: 0,
                height: '100vh',
                zIndex: 50,
              }),
        }}
      >
        <div style={{ padding: '4px 10px 22px 10px' }}>
          <Link
            to="/dashboard"
            onClick={closeDrawer}
            style={{ color: 'var(--color-sidebar-text-active)', textDecoration: 'none' }}
          >
            <BrandWordmark as="span" size="sm" invert />
          </Link>
        </div>

        <NavLink
          to="/invoices/new"
          onClick={closeDrawer}
          data-mol-id="sidebar-cta-new-invoice"
          className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'xs' }))}
          style={{
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-sidebar-text-active)',
            borderRadius: '10px',
            padding: '10px 14px',
            fontWeight: 700,
            fontSize: '14px',
            textDecoration: 'none',
            boxShadow: '0 2px 6px var(--color-accent-shadow)',
            margin: '0 4px 16px 4px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            add
          </span>
          {t('remitLayout.newInvoice', {}, { defaultValue: 'New Invoice' })}
        </NavLink>

        <nav className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.flex1)}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeDrawer}
              data-mol-id={`sidebar-nav-${item.to.slice(1).replace(/\//g, '-')}`}
              className={({ isActive }) =>
                cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  isActive ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
                )
              }
              style={({ isActive }) => ({
                color: isActive ? 'var(--color-sidebar-text-active)' : 'var(--color-sidebar-text)',
                backgroundColor: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--color-accent)' : '3px solid transparent',
                padding: '10px 14px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
                transition: 'background-color 0.15s, color 0.15s',
              })}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                {item.icon}
              </span>
              {t(item.key, {}, { defaultValue: item.defaultValue })}
            </NavLink>
          ))}
        </nav>

        <div
          style={{
            marginTop: '12px',
            padding: '12px 14px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            // white@0.55 was 3.53:1 on the #0a5c5f sidebar (axe serious); 0.75 = 5.1:1
            color: 'rgba(255,255,255,0.75)',
            fontSize: '11px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {t('remitLayout.tagline', {}, { defaultValue: 'Get paid, faster' })}
        </div>
      </aside>

      <div
        className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1)}
        style={{ minWidth: 0, marginLeft: isMobile ? 0 : '240px' }}
      >
        <header
          data-mol-id="remit-topbar"
          className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}
          style={{
            height: '56px',
            padding: isMobile ? '0 12px' : '0 28px',
            position: 'sticky',
            top: 0,
            zIndex: 40,
            backgroundColor: 'color-mix(in srgb, var(--mol-color-surface) 85%, transparent)',
            borderBottom: '1px solid var(--mol-color-border)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div
            className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}
            style={{ flex: 1, maxWidth: isMobile ? 'none' : '420px', minWidth: 0 }}
          >
            {isMobile ? (
              <button
                type="button"
                data-mol-id="remit-menu-toggle"
                aria-label={t('remitLayout.openMenu', {}, { defaultValue: 'Open navigation menu' })}
                aria-expanded={drawerOpen}
                onClick={() => setDrawerOpen(true)}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'border-0 bg-transparent cursor-pointer',
                )}
                style={{
                  width: '40px',
                  height: '40px',
                  flexShrink: 0,
                  marginLeft: '-8px',
                  color: 'var(--mol-color-text-secondary)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                  menu
                </span>
              </button>
            ) : null}
            <div
              className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}
              style={{
                width: '100%',
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
              >
                search
              </span>
              <input
                type="search"
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
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  const q = e.currentTarget.value.trim()
                  navigate(q ? `/invoices?q=${encodeURIComponent(q)}` : '/invoices')
                }}
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
            </div>
          </div>

          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))} style={{ flexShrink: 0 }}>
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
          </div>
        </header>

        <main
          data-mol-id="remit-main"
          className={cm.flex1}
          style={{ overflow: 'auto', padding: isMobile ? '16px 12px' : '28px' }}
        >
          <div style={{ maxWidth: '1360px', margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default RemitLayout
