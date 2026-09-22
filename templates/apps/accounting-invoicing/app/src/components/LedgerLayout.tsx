import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/invoices', key: 'invoices', defaultLabel: 'Invoices', icon: 'description' },
  { to: '/expenses', key: 'expenses', defaultLabel: 'Expenses', icon: 'receipt_long' },
  { to: '/payments', key: 'payments', defaultLabel: 'Payments', icon: 'paid' },
  { to: '/customers', key: 'customers', defaultLabel: 'Customers', icon: 'group' },
  { to: '/accounts', key: 'accounts', defaultLabel: 'Accounts', icon: 'account_balance' },
  { to: '/taxes', key: 'taxes', defaultLabel: 'Taxes', icon: 'percent' },
  { to: '/reports', key: 'reports', defaultLabel: 'Reports', icon: 'bar_chart' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Append `#top` to a Link target when it matches the current pathname so
 * clicking a same-route link still produces an observable URL change.
 */
function safeTarget(to: string, pathname: string): string {
  const samePath = pathname === to || pathname + '/' === to
  return samePath ? `${to.replace(/\/$/, '')}#top` : to
}

/**
 * Ledger shell.
 *
 * Desktop (>= md): the original fixed-width sidebar + scrollable main column.
 *
 * Mobile (< md): a 240px sidebar has nowhere to go at 390px, so the shell swaps
 * in a sticky top bar + hamburger drawer instead (scrim, Escape-to-close,
 * auto-close on navigation, 44px tap targets, theme toggle + UserMenu in the
 * drawer). Both shells render ONE <Outlet /> so pages mount exactly at any
 * width.
 *
 * Pattern source: the fleet QA mobile-shell pattern (inventory-management's
 * InventoryManagementLayout / energy-monitoring's EnergyMonitoringLayout).
 */
export function LedgerLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Single-active-item resolution: highlight the nav item whose `to` is the
  // longest prefix-match of the current pathname.
  const activeKey = NAV_KEYS.reduce<string | null>((bestKey, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return bestKey
    if (bestKey === null) return item.key
    const best = NAV_KEYS.find((i) => i.key === bestKey)
    return best && item.to.length > best.to.length ? item.key : bestKey
  }, null)

  // Any navigation closes the mobile drawer.
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // Escape closes the drawer.
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const menuLabel = t('ledgerLayout.menu', {}, { defaultValue: 'Menu' })
  const navLabel = t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })

  const renderNavItems = (onNavigate?: () => void) =>
    NAV_KEYS.map((item) => {
      const isActive = item.key === activeKey
      const target = safeTarget(item.to, pathname)
      return (
        <Link
          key={item.key}
          to={target}
          onClick={onNavigate}
          aria-current={isActive ? 'page' : undefined}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'min-h-[44px] rounded-md transition-colors',
            isActive
              ? 'bg-primary-container text-on-primary-container'
              : cm.cn(
                  'text-on-surface-variant',
                  'hover:bg-surface-container hover:text-on-surface',
                ),
          )}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {item.icon}
          </span>
          <span>{t(`ledgerLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}</span>
        </Link>
      )
    })

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        'flex flex-col md:flex-row',
        'bg-background text-on-surface antialiased',
      )}
    >
      {/*
        Mobile top bar (< md). The desktop sidebar is hidden below md, so the
        brand + theme toggle + nav need a home that does not eat the viewport.
      */}
      <header
        data-testid="ledger-topbar"
        className={cm.cn(
          'sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-outline-variant bg-surface px-2 md:hidden',
        )}
      >
        <button
          type="button"
          onClick={() => setDrawerOpen((open) => !open)}
          aria-label={menuLabel}
          aria-expanded={drawerOpen}
          aria-controls="ledger-mobile-nav"
          data-testid="ledger-drawer-toggle"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'h-11 w-11 shrink-0 rounded-full text-on-surface-variant transition-colors',
            'hover:bg-surface-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
          )}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {drawerOpen ? 'close' : 'menu'}
          </span>
        </button>
        <Link
          to={safeTarget('/dashboard', pathname)}
          className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'tracking-tight')}
        >
          {APP_NAME}
        </Link>
        <span
          className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), 'h-11 w-11 shrink-0')}
        >
          <ThemeToggle />
        </span>
      </header>

      {/*
        Mobile drawer (< md): scrim + panel. Conditional render keeps the
        focus/AT tree clean when closed (the top-bar button flips to a close
        glyph and carries aria-expanded for state).
      */}
      {drawerOpen ? (
        <div className={cm.cn('md:hidden')} data-testid="ledger-drawer">
          <div
            className={cm.cn('fixed inset-x-0 bottom-0 top-14 z-30 bg-black/50')}
            aria-hidden="true"
            data-testid="ledger-drawer-scrim"
            onClick={() => setDrawerOpen(false)}
          />
          <nav
            id="ledger-mobile-nav"
            aria-label={navLabel}
            className={cm.cn(
              'fixed inset-x-0 bottom-0 top-14 z-40 overflow-y-auto border-r border-outline-variant bg-surface shadow-xl',
              cm.sp('px', 3),
              'pb-6 pt-3',
            )}
          >
            <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              {renderNavItems(() => setDrawerOpen(false))}
            </ul>
            <div
              className={cm.cn(
                cm.sp('mt', 4),
                cm.sp('pt', 4),
                cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                'border-t border-outline-variant',
              )}
            >
              <span
                className={cm.cn('inline-flex [&_button]:min-h-[44px] [&_button]:min-w-[44px]')}
              >
                <UserMenu />
              </span>
            </div>
          </nav>
        </div>
      ) : null}

      {/*
        Desktop sidebar (>= md). Hidden on mobile — the drawer above replaces it.
      */}
      <aside
        className={cm.cn(
          cm.sp('p', 4),
          cm.shrink0,
          cm.flex({ direction: 'col' }),
          'hidden w-60 flex-col border-r border-outline-variant bg-surface md:flex',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            cm.sp('mb', 6),
          )}
        >
          <Link
            to={safeTarget('/dashboard', pathname)}
            className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'block')}
          >
            {APP_NAME}
          </Link>
          <ThemeToggle />
        </div>

        <nav className={cm.cn(cm.flex1, 'space-y-1')} aria-label={navLabel}>
          {renderNavItems()}
        </nav>

        <div className={cm.cn(cm.sp('pt', 4), 'border-t border-outline-variant')}>
          <UserMenu />
        </div>
      </aside>

      <main className={cm.cn(cm.flex1, 'min-w-0 w-full overflow-y-auto')}>
        <Outlet />
      </main>
    </div>
  )
}
