import { NavLink, Outlet } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'

/**
 * Sorthaus shell layout — the shared `ResponsiveAppShell` from
 * `@molecule/app-ui-react` composed to this app's fixed navy sidebar
 * (#0f172a per DESIGN.md): a mobile-only top bar (the shell renders the 44px
 * menu trigger itself), a ≥768px sidebar, a <768px dialog drawer carrying the
 * same nav (full APG contract — focus trap, Escape/backdrop close, scroll
 * lock, auto-close on navigation), and one `<Outlet />` so pages mount
 * exactly once at any width. The dock team works on phones, so the shell
 * must not assume a desktop viewport — the former hand-rolled hamburger
 * button, drawer open state and Escape/backdrop handlers are deleted with
 * the old shell.
 *
 * Chrome kept app-local: the navy brand pass (`bg-[var(--color-sidebar)]`
 * className override — the sanctioned tailwind-merge extension point) and
 * the desktop sticky search header (a non-duplicating CSS swap — this app
 * has no drawer search, so exactly one search form exists per width). Page
 * padding wraps the routed content inside `.Content`; larger 44px touch
 * targets per DESIGN.md's "Touch-friendly" principle.
 */
export function WarehouseFulfillmentLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const auth = useAuth() as {
    user?: { name?: string; avatar?: string; email?: string; role?: string }
    signOut?: () => void
    logout?: () => void
  }
  const user = auth.user
  const signOut = auth.signOut ?? auth.logout
  const userName =
    user?.name || t('warehouseFulfillmentLayout.defaultUser', {}, { defaultValue: 'Floor lead' })

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

  // Navy brand pass — the shared shell ships `cm.surface`; the last-wins
  // tailwind-merge in `cm.cn` lets these className overrides recolor the
  // Sidebar and Drawer to the navy rail with white text.
  const navy = 'bg-[var(--color-sidebar)] text-white'

  const navLabel = t(
    'warehouseFulfillmentLayout.drawerAria',
    {},
    { defaultValue: 'Navigation menu' },
  )

  // ONE nav element for both breakpoints — the Sidebar and the Drawer receive
  // the same element, and only the mounted breakpoint instantiates it, so the
  // links are never duplicated in the DOM. NavLink applies
  // `aria-current="page"` on the active link itself; the shell closes the
  // drawer on navigation, so links carry no onClick close.
  const nav = sections.map((section) => (
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

  // Brand block — leads the desktop sidebar (inside `children`; the shared
  // Sidebar has no header slot) and heads the mobile drawer (in the shell
  // `header` slot, next to the close button). Breakpoint-exclusive mounts,
  // so never duplicated.
  const brandBlock = (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
      <BrandWordmark
        as="span"
        size="md"
        invert
        subtitle={t(
          'warehouseFulfillmentLayout.brandSubtitle',
          {},
          { defaultValue: 'Fulfillment Console' },
        )}
      />
    </div>
  )

  // Operator block — the identity card + sign-out, the footer of both the
  // Sidebar and the Drawer (the shell's footer row owns the border + padding).
  const operatorBlock = (
    <>
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
    </>
  )

  // Notifications bell — the TopBar action on mobile, the desktop search
  // header's trail on desktop (breakpoint-exclusive mounts).
  const notificationsBell = (className: string) => (
    <NavLink
      to="/notifications"
      aria-label={t(
        'warehouseFulfillmentLayout.notificationsAria',
        {},
        { defaultValue: 'Open notifications' },
      )}
      className={className}
    >
      <span className={cm.cn('material-symbols-outlined text-[22px]')} data-icon="notifications">
        notifications
      </span>
      <span
        className={cm.cn(
          'absolute right-2 top-2 h-2 w-2 rounded-full bg-error ring-2 ring-surface',
        )}
        aria-hidden="true"
      />
    </NavLink>
  )

  return (
    <ResponsiveAppShell sidebarWidth="lg">
      {/*
        Mobile top bar (<768px). The shell renders the 44px menu trigger
        itself; the brand and the floor shortcuts keep their pre-migration
        slots. On desktop this bar does not mount — the sidebar carries the
        brand and the search header carries the shortcuts.
      */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={
          <div className={cm.cn('min-w-0')}>
            <BrandWordmark
              as="span"
              size="sm"
              subtitle={t(
                'warehouseFulfillmentLayout.brandSubtitle',
                {},
                { defaultValue: 'Fulfillment Console' },
              )}
            />
          </div>
        }
        actions={
          <>
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
            {notificationsBell(
              cm.cn(
                'relative inline-flex h-11 w-11',
                cm.flex({ align: 'center', justify: 'center' }),
                'rounded-lg text-on-surface-variant hover:bg-background-secondary hover:text-on-surface transition-colors',
              ),
            )}
          </>
        }
      />

      {/*
        Desktop sidebar (≥768px): the navy rail with the brand row leading the
        nav column and the operator block in the bordered footer row.
      */}
      <ResponsiveAppShell.Sidebar className={navy} footer={operatorBlock}>
        <div className={cm.cn(cm.sp('px', 6), cm.sp('pt', 6), cm.sp('pb', 2))}>{brandBlock}</div>
        {/* The shell's Sidebar already renders the <nav> landmark; this wrapper
            only carries the rail's padding + internal scroll. */}
        <div className={cm.cn(cm.sp('px', 3), cm.sp('pb', 4), 'flex-1 overflow-y-auto')}>{nav}</div>
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (<768px): the full dialog panel over the same nav, with
        the brand in the header row (next to the shell's close button) and the
        operator block in the footer. `h-full` restores the full-height
        left-panel geometry (the shared panel ships no height token).
      */}
      <ResponsiveAppShell.Drawer
        className={cm.cn(navy, 'h-full')}
        navLabel={navLabel}
        header={brandBlock}
        footer={operatorBlock}
      >
        <div className={cm.cn(cm.sp('px', 3), cm.sp('pb', 4))}>{nav}</div>
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        {/*
          Desktop top bar — global search + scan CTA + account shortcuts.
          Content-column chrome the mobile-only TopBar replaces below md
          (a non-duplicating CSS swap: exactly one bar is visible per width).
        */}
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
            {notificationsBell(
              cm.cn(
                'relative inline-flex h-10 w-10',
                cm.flex({ align: 'center', justify: 'center' }),
                'rounded-full text-on-surface-variant hover:bg-background-secondary hover:text-on-surface transition-colors',
              ),
            )}
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

        {/* Page padding wraps the routed content — `.Content` stays a bare <main>. */}
        <div className={cm.cn('px-4 py-6 md:px-8 md:py-8')}>
          <Outlet />
        </div>
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

export default WarehouseFulfillmentLayout
