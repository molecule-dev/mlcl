import { Link, useLocation } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface MobileNavItem {
  to: string
  labelKey: string
  labelDefault: string
  /** data-mol-id suffix — distinct from the desktop HeaderNav ids so the
   * `[data-mol-id^=…]` locator rule (no shared prefixes) stays true. */
  id: string
  authOnly?: boolean
}

const ITEMS: MobileNavItem[] = [
  { to: '/catalog', labelKey: 'landing.nav.shop', labelDefault: 'Shop', id: 'shop' },
  { to: '/cart', labelKey: 'nav.cart', labelDefault: 'Cart', id: 'cart', authOnly: true },
  { to: '/orders', labelKey: 'nav.orders', labelDefault: 'Orders', id: 'orders', authOnly: true },
  {
    to: '/vendor/dashboard',
    labelKey: 'nav.sell',
    labelDefault: 'Sell',
    id: 'sell',
    authOnly: true,
  },
  {
    to: '/notifications',
    labelKey: 'settings.notifications',
    labelDefault: 'Alerts',
    id: 'notifications',
    authOnly: true,
  },
]

/**
 * Mobile chip navigation (below the `md` breakpoint) — the shared AppHeader
 * hides its inline nav links under 768px, which left phones with no way to
 * reach Cart / Orders / Sell except the user menu. Fleet pattern: keep the
 * top bar minimal and expose the primary destinations as a horizontally
 * scrollable chip row that sticks below it. Hidden at `md:` and up, where the
 * inline header nav takes over.
 *
 * Text-only chips on purpose: the bonded icon set is a small curated subset
 * and `<Icon>` throws on names outside it, while the raw material-symbols
 * font may not carry a given glyph — labels carry the meaning either way.
 */
export function MobileNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  const location = useLocation()

  const visible = ITEMS.filter((item) => !item.authOnly || isAuthenticated)
  if (visible.length === 0) return null

  return (
    <nav
      aria-label={t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })}
      className={cm.cn(
        'md:hidden sticky top-0 z-30 border-b border-outline-variant bg-surface/95 backdrop-blur',
      )}
    >
      <div className="flex items-center gap-1 overflow-x-auto px-2 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visible.map((item) => {
          const active =
            item.to === '/catalog'
              ? location.pathname === '/' ||
                location.pathname.startsWith('/catalog') ||
                location.pathname.startsWith('/products')
              : location.pathname.startsWith(item.to)
          return (
            <Link
              key={item.id}
              to={item.to}
              data-mol-id={`mnav-${item.id}`}
              aria-current={active ? 'page' : undefined}
              className={cm.cn(
                'shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition-colors min-h-[40px] flex items-center',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-low',
              )}
            >
              {t(item.labelKey, {}, { defaultValue: item.labelDefault })}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default MobileNav
