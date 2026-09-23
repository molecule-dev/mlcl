import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { Header } from './Header.js'

interface NavItem {
  to: string
  key: string
  icon: string
  defaultLabel: string
}

// Primary navigation for the authed app. `/boxes/:id` detail routes resolve
// to the `/boxes` item via prefix matching below.
const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', key: 'dashboard', icon: 'dashboard', defaultLabel: 'Dashboard' },
  { to: '/boxes', key: 'boxes', icon: 'inventory_2', defaultLabel: 'Boxes' },
  { to: '/shipments', key: 'shipments', icon: 'local_shipping', defaultLabel: 'Shipments' },
  { to: '/customize', key: 'customize', icon: 'tune', defaultLabel: 'Customize' },
  { to: '/billing', key: 'billing', icon: 'credit_card', defaultLabel: 'Billing' },
  { to: '/settings', key: 'settings', icon: 'settings', defaultLabel: 'Settings' },
]

/**
 * Sticky app chrome for the authed shell: the shared AppHeader brand row plus
 * primary navigation in BOTH shapes — an inline link row on desktop (md+) and
 * a horizontally scrollable chip row below the 768px breakpoint (the fleet
 * mobile-shell pattern: sticky top bar + chip nav, no drawer needed at this
 * nav-item count). Both rows share one active-item rule (longest `to` prefix
 * of the current pathname) and 40px+ tap targets.
 */
export function AppNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  // Longest-prefix active resolution: /boxes/123 activates Boxes; exact
  // matches always win over prefixes of the same length.
  const activeTo = NAV_ITEMS.reduce<string | null>((best, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return best
    if (best === null || item.to.length > best.length) return item.to
    return best
  }, null)

  // Keep the active chip visible when the mobile row overflows.
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(
      '[data-testid="app-nav-mobile"] [aria-current="page"]',
    )
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [pathname])

  const label = (item: NavItem): string =>
    t(`appNav.${item.key}`, {}, { defaultValue: item.defaultLabel })

  const desktopLinkClass = (isActive: boolean): string =>
    cm.cn(
      cm.flex({ align: 'center', gap: 'xs' }),
      cm.sp('px', 4),
      'min-h-[40px] items-center text-sm font-bold tracking-tight rounded-full transition-colors',
      isActive
        ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
        : cm.cn(cm.textMuted, 'hover:text-on-surface hover:bg-surface-container'),
    )

  const chipClass = (isActive: boolean): string =>
    cm.cn(
      cm.flex({ align: 'center', gap: 'xs' }),
      'min-h-[40px] shrink-0 items-center whitespace-nowrap rounded-full border px-4 text-xs font-bold uppercase tracking-widest transition-colors',
      isActive
        ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer, 'border-transparent')
        : cm.cn(
            cm.textMuted,
            'border-outline-variant/40 bg-surface-container-lowest hover:bg-surface-container',
          ),
    )

  return (
    <div className={cm.cn('sticky top-0 z-40')} data-testid="app-topbar">
      <Header />
      {/* Desktop inline nav (md+) */}
      <nav
        aria-label={t('appNav.primaryLabel', {}, { defaultValue: 'Primary navigation' })}
        data-testid="app-nav-desktop"
        className={cm.cn(
          'hidden border-b border-outline-variant/30 bg-surface-container-lowest/95 backdrop-blur lg:block',
        )}
      >
        <div className={cm.cn(cm.mxAuto, cm.maxW('7xl'), cm.sp('px', 6))}>
          <ul className={cm.cn(cm.flex({ gap: 'sm' }), 'items-center py-1.5')}>
            {NAV_ITEMS.map((item) => {
              const isActive = item.to === activeTo
              return (
                <li key={item.key}>
                  <NavLink
                    to={item.to}
                    data-mol-id={`nav-${item.key}`}
                    aria-current={isActive ? 'page' : undefined}
                    className={desktopLinkClass(isActive)}
                  >
                    <span className={cm.cn('material-symbols-outlined text-lg')} aria-hidden="true">
                      {item.icon}
                    </span>
                    {label(item)}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>
      {/* Chip nav (< lg) — horizontally scrollable, 40px targets. Below the
          lg breakpoint (not md) because all six inline links overflow a
          768px tablet. */}
      <nav
        aria-label={t('appNav.mobileLabel', {}, { defaultValue: 'Primary navigation' })}
        data-testid="app-nav-mobile"
        className={cm.cn(
          'border-b border-outline-variant/30 bg-surface-container-lowest/95 backdrop-blur lg:hidden',
        )}
      >
        <ul
          className={cm.cn(
            cm.flex({ gap: 'xs' }),
            'overflow-x-auto px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          )}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = item.to === activeTo
            return (
              <li key={item.key}>
                <NavLink
                  to={item.to}
                  data-mol-id={`mnav-${item.key}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={chipClass(isActive)}
                >
                  <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                    {item.icon}
                  </span>
                  {label(item)}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}

export default AppNav
