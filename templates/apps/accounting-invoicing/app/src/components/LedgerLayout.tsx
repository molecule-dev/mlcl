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

export function LedgerLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  // Single-active-item resolution: highlight the nav item whose `to` is the
  // longest prefix-match of the current pathname.
  const activeKey = NAV_KEYS.reduce<string | null>((bestKey, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return bestKey
    if (bestKey === null) return item.key
    const best = NAV_KEYS.find((i) => i.key === bestKey)
    return best && item.to.length > best.to.length ? item.key : bestKey
  }, null)

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ direction: 'row' }),
        'bg-background text-on-surface antialiased',
      )}
    >
      <aside
        className={cm.cn(
          cm.sp('p', 4),
          cm.shrink0,
          cm.flex({ direction: 'col' }),
          'w-60 bg-surface border-r border-outline-variant',
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

        <nav
          className={cm.cn(cm.flex1, 'space-y-1')}
          aria-label={t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })}
        >
          {NAV_KEYS.map((item) => {
            const isActive = item.key === activeKey
            const target = safeTarget(item.to, pathname)
            return (
              <Link
                key={item.key}
                to={target}
                aria-current={isActive ? 'page' : undefined}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'rounded-md transition-colors',
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
                <span>
                  {t(`ledgerLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
                </span>
              </Link>
            )
          })}
        </nav>

        <div className={cm.cn(cm.sp('pt', 4), 'border-t border-outline-variant')}>
          <UserMenu />
        </div>
      </aside>

      <main className={cm.cn(cm.flex1, 'min-w-0 overflow-y-auto')}>
        <Outlet />
      </main>
    </div>
  )
}
