import { NavLink, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Mobile navigation for the signed-in Trove shell (<1024px).
 *
 * The creator sidebar is hidden below `lg`, which left phones with NO
 * navigation at all (the shared SidebarLayout keeps rendering the 260px
 * rail and squeezes content off-screen — the 2026-09 fleet QA capture
 * shows /dashboard cut in half at 390px). This fixed bottom tab bar is
 * the fleet-standard mobile shell for that gap: sticky, thumb-reachable,
 * ~48px tap targets, active route marked with aria-current, and
 * safe-area padding so home-indicator devices don't clip the labels.
 * Settings stays reachable on phones via the top-bar user menu.
 */
const MOBILE_NAV = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'space_dashboard' },
  { to: '/products', key: 'products', defaultLabel: 'Products', icon: 'inventory_2' },
  { to: '/sales', key: 'sales', defaultLabel: 'Sales', icon: 'point_of_sale' },
  { to: '/library', key: 'library', defaultLabel: 'Library', icon: 'folder_special' },
  { to: '/orders', key: 'orders', defaultLabel: 'Orders', icon: 'receipt_long' },
] as const

export function TroveMobileNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  return (
    <nav
      aria-label={t('nav.creatorAria', {}, { defaultValue: 'Creator dashboard' })}
      className={cm.cn(
        cm.flex({ align: 'stretch' }),
        cm.sp('px', 2),
        'fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-surface/95 backdrop-blur border-t border-outline-variant pb-[env(safe-area-inset-bottom)]',
      )}
      data-mol-id="trove-mobile-nav"
    >
      {MOBILE_NAV.map((item) => {
        const active =
          item.to === '/dashboard' ? pathname === item.to : pathname.startsWith(`${item.to}/`)
        return (
          <NavLink
            key={item.to}
            to={item.to}
            aria-current={active ? 'page' : undefined}
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'xs' }),
              'flex-1 min-w-0 py-2 rounded-xl transition-colors active:scale-95',
              active ? 'text-primary-dark font-semibold' : 'text-on-surface-variant font-medium',
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
              {t(`nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
            </span>
          </NavLink>
        )
      })}
    </nav>
  )
}

export default TroveMobileNav
