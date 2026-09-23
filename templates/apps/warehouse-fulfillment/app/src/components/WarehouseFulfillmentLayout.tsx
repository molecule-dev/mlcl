import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Sorthaus shell layout — fixed navy sidebar (#0f172a per DESIGN.md) +
 * sticky frosted topbar with global SKU/order search and a dock-team
 * avatar. Used by every authed screen except the Scanner full-viewport
 * mode (which renders the Outlet directly).
 *
 * Mobile (<768px): the fixed sidebar is replaced by a sticky top bar
 * (hamburger + brand + scan + notifications) and a slide-in drawer that
 * carries the same nav sections plus the operator block — the dock team
 * works on phones, so the shell must not assume a desktop viewport.
 *
 * Pattern source: composed from inventory-management/InventoryManagementLayout.tsx,
 * retuned to the fulfillment domain (orders/picks/shipments sections, dock
 * jargon, scanner shortcut button, larger 44px touch targets per DESIGN.md
 * "Touch-friendly" principle).
 */

export function WarehouseFulfillmentLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const auth = useAuth() as {
    user?: { name?: string; avatar?: string; email?: string; role?: string }
    signOut?: () => void
    logout?: () => void
  }
  const user = auth.user
  const signOut = auth.signOut ?? auth.logout
  const userName =
    user?.name || t('warehouseFulfillmentLayout.defaultUser', {}, { defaultValue: 'Floor lead' })

  // Close the drawer on Escape so keyboard users are never trapped in it.
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  type NavItem = { to: string; icon: string; labelKey: string; labelDefault: string }
  type NavSection = { titleKey: string; titleDefault: string; items: NavItem[] }

  const sections: NavSection[] = [
    {
      titleKey: 'warehouseFulfillmentLayout.sectionFloor',
      titleDefault: 'Floor',
      items: [
        {
          to: '/dashboard',
          icon: 'space_dashboard',
          labelKey: 'warehouseFulfillmentLayout.dashboard',
          labelDefault: 'Dashboard',
        },
        {
          to: '/scan',
          icon: 'qr_code_scanner',
          labelKey: 'warehouseFulfillmentLayout.scanner',
          labelDefault: 'Scanner',
        },
        {
          to: '/notifications',
          icon: 'notifications',
          labelKey: 'warehouseFulfillmentLayout.notifications',
          labelDefault: 'Notifications',
        },
      ],
    },
    {
      titleKey: 'warehouseFulfillmentLayout.sectionFulfillment',
      titleDefault: 'Fulfillment',
      items: [
        {
          to: '/orders',
          icon: 'list_alt',
          labelKey: 'warehouseFulfillmentLayout.orders',
          labelDefault: 'Orders',
        },
        {
          to: '/shipments',
          icon: 'local_shipping',
          labelKey: 'warehouseFulfillmentLayout.shipments',
          labelDefault: 'Shipments',
        },
        {
          to: '/receiving',
          icon: 'move_to_inbox',
          labelKey: 'warehouseFulfillmentLayout.receiving',
          labelDefault: 'Receiving',
        },
        {
          to: '/returns',
          icon: 'undo',
          labelKey: 'warehouseFulfillmentLayout.returns',
          labelDefault: 'Returns',
        },
      ],
    },
    {
      titleKey: 'warehouseFulfillmentLayout.sectionWarehouse',
      titleDefault: 'Warehouse',
      items: [
        {
          to: '/inventory',
          icon: 'inventory_2',
          labelKey: 'warehouseFulfillmentLayout.inventory',
          labelDefault: 'Inventory',
        },
        {
          to: '/locations',
          icon: 'warehouse',
          labelKey: 'warehouseFulfillmentLayout.locations',
          labelDefault: 'Locations',
        },
        {
          to: '/reports',
          icon: 'monitoring',
          labelKey: 'warehouseFulfillmentLayout.reports',
          labelDefault: 'Reports',
        },
      ],
    },
    {
      titleKey: 'warehouseFulfillmentLayout.sectionAccount',
      titleDefault: 'Account',
      items: [
        {
          to: '/profile',
          icon: 'badge',
          labelKey: 'warehouseFulfillmentLayout.profile',
          labelDefault: 'Profile',
        },
        {
          to: '/settings',
          icon: 'settings',
          labelKey: 'warehouseFulfillmentLayout.settings',
          labelDefault: 'Settings',
        },
      ],
    },
  ]

  /** Nav sections, shared by the desktop sidebar and the mobile drawer. */
  const renderNav = (onNavigate?: () => void) =>
    sections.map((section) => (
      <div key={section.titleKey} className={cm.cn(cm.sp('mt', 5))}>
        <p
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('mb', 2),
            'text-[10px] font-bold uppercase tracking-[0.2em] text-white/50',
          )}
        >
          {t(section.titleKey, {}, { defaultValue: section.titleDefault })}
        </p>
        <ul className={cm.stack(1)}>
          {section.items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/dashboard'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'rounded-md transition-colors',
                    isActive
                      ? 'bg-primary/15 text-white font-semibold border-l-[3px] border-primary'
                      : 'text-white/70 hover:bg-surface/5 hover:text-white',
                  )
                }
              >
                <span
                  className={cm.cn('material-symbols-outlined text-[20px]')}
                  data-icon={item.icon}
                >
                  {item.icon}
                </span>
                <span>{t(item.labelKey, {}, { defaultValue: item.labelDefault })}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    ))

  const brandBlock = (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('px', 6), cm.sp('py', 6))}>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-secondary text-on-primary shadow-lg shadow-primary/30',
        )}
      >
        <span className="material-symbols-outlined" data-icon="local_shipping">
          local_shipping
        </span>
      </div>
      <div>
        <p className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight leading-none')}>
          {APP_NAME}
        </p>
        <p className={cm.cn('text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50')}>
          {t(
            'warehouseFulfillmentLayout.brandSubtitle',
            {},
            { defaultValue: 'Fulfillment Console' },
          )}
        </p>
      </div>
    </div>
  )

  const operatorBlock = (
    <div className={cm.cn(cm.sp('p', 4), 'border-t border-surface/10')}>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 3))}>
        <div
          className={cm.cn(
            'h-9 w-9 rounded-full bg-gradient-to-br from-primary to-secondary',
            cm.flex({ align: 'center', justify: 'center' }),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
          )}
        >
          {userName.slice(0, 1).toUpperCase()}
        </div>
        <div className={cm.cn('min-w-0 flex-1')}>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'truncate')}>
            {userName}
          </p>
          <p className={cm.cn('truncate text-[11px] text-white/55')}>
            {user?.role ||
              t('warehouseFulfillmentLayout.role', {}, { defaultValue: 'Dock supervisor' })}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => signOut?.()}
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
          cm.w('full'),
          cm.sp('py', 2),
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'rounded-md border border-surface/10 text-white/70 hover:bg-surface/5 hover:text-white transition-colors uppercase tracking-wider',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-[16px]')} data-icon="logout">
          logout
        </span>
        {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
      </button>
    </div>
  )

  return (
    <div className={cm.cn(cm.flex({ direction: 'row' }), cm.minH('screen'), 'bg-background')}>
      {/* Desktop sidebar — hidden below md; the drawer takes over. */}
      <aside
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'fixed left-0 top-0 z-40 hidden h-screen w-64 text-white md:flex',
        )}
        style={{ backgroundColor: 'var(--color-sidebar)' }}
      >
        {brandBlock}
        <nav className={cm.cn(cm.sp('px', 3), cm.sp('pb', 4), 'flex-1 overflow-y-auto')}>
          {renderNav()}
        </nav>
        {operatorBlock}
      </aside>

      {/* Mobile slide-in drawer (same nav + operator block). */}
      {drawerOpen && (
        <div className={cm.cn('fixed inset-0 z-50 md:hidden')}>
          <div
            className={cm.cn('absolute inset-0 bg-black/50')}
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t(
              'warehouseFulfillmentLayout.drawerAria',
              {},
              { defaultValue: 'Navigation menu' },
            )}
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'absolute left-0 top-0 h-full w-72 max-w-[85vw] text-white shadow-xl',
            )}
            style={{ backgroundColor: 'var(--color-sidebar)' }}
          >
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
              {brandBlock}
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={t(
                  'warehouseFulfillmentLayout.closeMenuAria',
                  {},
                  { defaultValue: 'Close navigation menu' },
                )}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'mr-3 inline-flex h-11 w-11 shrink-0 rounded-full text-white/70 hover:bg-surface/5 hover:text-white transition-colors',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[22px]')} data-icon="close">
                  close
                </span>
              </button>
            </div>
            <nav className={cm.cn(cm.sp('px', 3), cm.sp('pb', 4), 'flex-1 overflow-y-auto')}>
              {renderNav(() => setDrawerOpen(false))}
            </nav>
            {operatorBlock}
          </div>
        </div>
      )}

      <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0 flex-1 md:ml-64')}>
        {/* Mobile top bar — hamburger + brand + floor shortcuts. */}
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            cm.sp('px', 4),
            'sticky top-0 z-30 flex h-16 items-center border-b border-outline-variant/60 bg-surface/80 backdrop-blur-md md:hidden',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label={t(
                'warehouseFulfillmentLayout.openMenuAria',
                {},
                { defaultValue: 'Open navigation menu' },
              )}
              aria-expanded={drawerOpen}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'inline-flex h-11 w-11 shrink-0 rounded-lg text-on-surface-variant hover:bg-background-secondary hover:text-on-surface transition-colors',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[24px]')} data-icon="menu">
                menu
              </span>
            </button>
            <div className={cm.cn('min-w-0')}>
              <p
                className={cm.cn(
                  cm.textSize('base'),
                  'truncate font-extrabold tracking-tight leading-none text-on-surface',
                )}
              >
                {APP_NAME}
              </p>
              <p
                className={cm.cn(
                  'truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant',
                )}
              >
                {t(
                  'warehouseFulfillmentLayout.brandSubtitle',
                  {},
                  { defaultValue: 'Fulfillment Console' },
                )}
              </p>
            </div>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'shrink-0')}>
            <NavLink
              to="/scan"
              aria-label={t(
                'warehouseFulfillmentLayout.scanAria',
                {},
                { defaultValue: 'Open scanner' },
              )}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'inline-flex h-11 w-11 rounded-lg bg-gradient-to-br from-primary to-primary-dark text-on-primary shadow shadow-primary/30',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-[22px]')}
                data-icon="qr_code_scanner"
              >
                qr_code_scanner
              </span>
            </NavLink>
            <NavLink
              to="/notifications"
              aria-label={t(
                'warehouseFulfillmentLayout.notificationsAria',
                {},
                { defaultValue: 'Open notifications' },
              )}
              className={cm.cn(
                'relative inline-flex h-11 w-11',
                cm.flex({ align: 'center', justify: 'center' }),
                'rounded-lg text-on-surface-variant hover:bg-background-secondary hover:text-on-surface transition-colors',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-[22px]')}
                data-icon="notifications"
              >
                notifications
              </span>
              <span
                className={cm.cn(
                  'absolute right-2 top-2 h-2 w-2 rounded-full bg-error ring-2 ring-surface',
                )}
                aria-hidden="true"
              />
            </NavLink>
          </div>
        </header>

        {/* Desktop top bar — global search + scan CTA + account shortcuts. */}
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            cm.sp('px', 8),
            'sticky top-0 z-30 hidden h-16 border-b border-outline-variant/60 bg-surface/80 backdrop-blur-md md:flex',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'flex-1 min-w-0')}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.h(10),
                'w-full max-w-[480px] rounded-lg border border-transparent bg-background-secondary text-on-surface-variant focus-within:border-primary focus-within:bg-surface transition-colors',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')} data-icon="search">
                search
              </span>
              <input
                type="search"
                aria-label={t(
                  'warehouseFulfillmentLayout.searchAria',
                  {},
                  { defaultValue: 'Search orders, SKUs, bins' },
                )}
                placeholder={t(
                  'warehouseFulfillmentLayout.searchPlaceholder',
                  {},
                  { defaultValue: 'Search orders, SKUs, bins…' },
                )}
                className={cm.cn(
                  'w-full bg-transparent border-none outline-none text-sm text-on-surface placeholder:text-on-surface-variant',
                )}
              />
              <kbd
                className={cm.cn(
                  'hidden md:inline-flex',
                  cm.flex({ align: 'center', justify: 'center' }),
                  'h-5 min-w-[20px] rounded border border-outline-variant bg-surface px-1.5 font-mono text-[10px] text-on-surface-variant',
                )}
              >
                /
              </kbd>
            </div>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <NavLink
              to="/scan"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.h(10),
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'rounded-lg bg-gradient-to-br from-primary to-primary-dark text-on-primary shadow shadow-primary/30 hover:opacity-95 transition-all uppercase tracking-wider',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-[18px]')}
                data-icon="qr_code_scanner"
              >
                qr_code_scanner
              </span>
              {t('warehouseFulfillmentLayout.scanCta', {}, { defaultValue: 'Scan' })}
            </NavLink>
            <NavLink
              to="/notifications"
              aria-label={t(
                'warehouseFulfillmentLayout.notificationsAria',
                {},
                { defaultValue: 'Open notifications' },
              )}
              className={cm.cn(
                'relative inline-flex h-10 w-10',
                cm.flex({ align: 'center', justify: 'center' }),
                'rounded-full text-on-surface-variant hover:bg-background-secondary hover:text-on-surface transition-colors',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-[20px]')}
                data-icon="notifications"
              >
                notifications
              </span>
              <span
                className={cm.cn(
                  'absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-error ring-2 ring-surface',
                )}
                aria-hidden="true"
              />
            </NavLink>
            <NavLink
              to="/profile"
              className={cm.cn(
                'inline-flex h-9 w-9 rounded-full ring-2 ring-outline-variant overflow-hidden text-white',
                cm.flex({ align: 'center', justify: 'center' }),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'bg-gradient-to-br from-primary to-secondary',
              )}
            >
              {userName.slice(0, 1).toUpperCase()}
            </NavLink>
          </div>
        </header>

        <main className={cm.cn('min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8')}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default WarehouseFulfillmentLayout
