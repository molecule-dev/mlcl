import { Link, NavLink, Outlet } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { PayrollMobileNav } from './PayrollMobileNav.js'
import { UserMenu } from './UserMenu.js'

/**
 * Stipend shell — deep-navy brand-anchored sidebar (per DESIGN.md) +
 * full-bleed content. Mirrors the SidebarLayout pattern used by
 * banking-dashboard's MeridianLayout, but inlines the chrome so the
 * sidebar can apply the brand's `#0c1f2e` navy across both themes.
 *
 * Below 768px the sidebar is hidden and the fleet-standard mobile shell
 * takes over: a sticky top bar (brand + user menu) and a fixed bottom
 * tab bar (PayrollMobileNav) so every destination stays reachable.
 *
 * Translated from banking-dashboard's MeridianLayout treatment.
 */

interface NavItem {
  to: string
  key: string
  defaultLabel: string
  icon: string
  accent?: boolean
}

const NAV_KEYS: ReadonlyArray<NavItem> = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/employees', key: 'employees', defaultLabel: 'Employees', icon: 'group' },
  { to: '/pay-runs', key: 'payRuns', defaultLabel: 'Pay runs', icon: 'event_available' },
  {
    to: '/run-payroll',
    key: 'runPayroll',
    defaultLabel: 'Run payroll',
    icon: 'play_circle',
    accent: true,
  },
  { to: '/taxes', key: 'taxes', defaultLabel: 'Tax center', icon: 'receipt_long' },
  { to: '/reports', key: 'reports', defaultLabel: 'Reports', icon: 'insights' },
  { to: '/audit-log', key: 'auditLog', defaultLabel: 'Audit log', icon: 'shield' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
]

export function PayrollManagerLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()

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
          cm.shrink0,
          cm.flex({ direction: 'col' }),
          cm.sp('p', 4),
          'w-64 hidden md:flex',
        )}
        style={{ backgroundColor: 'var(--color-sidebar)' }}
      >
        <Link
          to="/dashboard"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 2),
            cm.sp('py', 3),
            cm.sp('mb', 4),
            'text-white',
          )}
        >
          <span
            className={cm.cn(
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              'bg-gradient-to-br from-primary to-secondary text-white shadow-lg',
            )}
            aria-hidden="true"
          >
            <span
              className={cm.cn(`material-symbols-outlined text-lg`)}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              receipt_long
            </span>
          </span>
          {/* Brand names are never translated — render APP_NAME directly.
              (The old t('nav.primaryNavigation') key resolved to the common
              locales' "Primary navigation" string, replacing the brand.) */}
          <span className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
            {APP_NAME}
          </span>
        </Link>

        <nav
          className={cm.cn(cm.flex1, cm.stack(1))}
          aria-label={t(
            'payrollManagerLayout.primaryNavLabel',
            {},
            { defaultValue: 'Primary navigation' },
          )}
        >
          {NAV_KEYS.map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) =>
                cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-lg transition-all duration-150',
                  isActive ? 'font-bold text-white' : 'font-medium text-slate-400 hover:text-white',
                )
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'var(--color-sidebar-active)' : 'transparent',
              })}
            >
              <span
                className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <span>
                {t(`payrollManagerLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
              </span>
              {item.accent ? (
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.fontWeight('bold'),
                    'ml-auto rounded-full text-[9px] uppercase tracking-widest',
                  )}
                  style={{
                    backgroundColor: 'var(--mol-color-secondary-dark)',
                    color: 'var(--color-sidebar-text-active)',
                  }}
                >
                  {t('payrollManagerLayout.runBadge', {}, { defaultValue: 'Now' })}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className={cm.cn(cm.sp('pt', 4), cm.sp('mt', 4), 'border-t border-surface/5')}>
          <UserMenu />
        </div>
      </aside>

      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.flex1,
          'min-w-0 min-h-screen md:h-screen',
        )}
      >
        {/* Mobile top bar — the sidebar's brand + user menu, sticky. */}
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            'sticky top-0 z-30 md:hidden border-b border-outline-variant/40',
          )}
          style={{ backgroundColor: 'var(--color-sidebar)' }}
        >
          <Link
            to="/dashboard"
            className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'text-white py-2')}
          >
            <span
              className={cm.cn(
                cm.w(7),
                cm.h(7),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'bg-gradient-to-br from-primary to-secondary text-white shadow-lg',
              )}
              aria-hidden="true"
            >
              <span
                className={cm.cn(`material-symbols-outlined text-base`)}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                receipt_long
              </span>
            </span>
            <span className={cm.cn(cm.textSize('base'), 'font-extrabold tracking-tight')}>
              {APP_NAME}
            </span>
          </Link>
          <UserMenu />
        </header>

        <main className={cm.cn(cm.flex1, 'min-w-0 md:overflow-y-auto')}>
          <Outlet />
        </main>
        {/* Clear the fixed mobile bottom nav (hidden at md where the
            sidebar takes over). */}
        <div className={cm.cn('h-16 md:hidden')} aria-hidden="true" />
      </div>
      <PayrollMobileNav />
    </div>
  )
}
