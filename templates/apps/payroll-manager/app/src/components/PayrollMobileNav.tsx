import { NavLink, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Mobile bottom navigation for the signed-in payroll shell (<768px).
 *
 * The navy sidebar is hidden below `md`, which left phones with no
 * navigation at all. This fixed bottom tab bar is the fleet-standard
 * mobile shell for that gap: sticky, thumb-reachable, ~48px tap targets,
 * active route marked with aria-current, and safe-area padding so
 * home-indicator devices don't clip the labels. The five highest-traffic
 * destinations get tabs; reports / audit log / notifications / settings
 * stay reachable through the user menu in the top bar.
 */
const MOBILE_NAV = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/employees', key: 'employees', defaultLabel: 'Employees', icon: 'group' },
  { to: '/pay-runs', key: 'payRuns', defaultLabel: 'Pay runs', icon: 'event_available' },
  { to: '/run-payroll', key: 'runPayroll', defaultLabel: 'Run payroll', icon: 'play_circle' },
  { to: '/taxes', key: 'taxes', defaultLabel: 'Taxes', icon: 'receipt_long' },
] as const

export function PayrollMobileNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  return (
    <nav
      aria-label={t(
        'payrollManagerLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
      className={cm.cn(
        cm.flex({ align: 'stretch' }),
        cm.sp('px', 2),
        'fixed bottom-0 left-0 right-0 z-30 md:hidden bg-surface/95 backdrop-blur border-t border-outline-variant pb-[env(safe-area-inset-bottom)]',
      )}
      data-mol-id="payroll-mobile-nav"
    >
      {MOBILE_NAV.map((item) => {
        const active =
          item.to === '/dashboard' ? pathname === item.to : pathname.startsWith(item.to)
        return (
          <NavLink
            key={item.to}
            to={item.to}
            aria-current={active ? 'page' : undefined}
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'xs' }),
              'flex-1 min-w-0 py-2 rounded-xl transition-colors active:scale-95',
              active
                ? 'text-primary font-semibold'
                : item.to === '/run-payroll'
                  ? 'text-on-surface font-medium'
                  : 'text-on-surface-variant font-medium',
            )}
            data-mol-id={`mobile-nav-${item.key}`}
          >
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined text-2xl leading-none')}
            >
              {item.icon}
            </span>
            <span className={cm.cn(cm.textSize('xs'), 'truncate max-w-full px-1')}>
              {t(`payrollManagerLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
            </span>
          </NavLink>
        )
      })}
    </nav>
  )
}
