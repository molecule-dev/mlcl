import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'

import { useAuth, useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Icon, ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

/**
 * Inventory shell layout — the shared `ResponsiveAppShell` composed to this
 * app's Locus design (deep navy `#0f1729` rail via `--color-sidebar`, teal
 * `#0e7490` active accent).
 *
 * The shell owns the breakpoint split: the Sidebar mounts only ≥768px, the
 * mobile Drawer (same nav element, full APG dialog contract — focus trap,
 * Escape/backdrop close, scroll lock, auto-close on navigation) only below
 * it, and the TopBar renders the 44px menu trigger itself. The former
 * template-local hamburger button, drawer open state and Escape/scrim
 * handlers are deleted with the hand-rolled shell.
 *
 * Chrome kept app-local: the navy brand pass (`bg-[var(--color-sidebar)]`
 * className overrides — the sanctioned tailwind-merge extension point), the
 * desktop sticky search header (the drawer carries search on mobile, so the
 * `hidden md:flex` pair is a non-duplicating surface swap), and page padding
 * around the `<Outlet />` inside `.Content`.
 */
export function InventoryManagementLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { mode, toggleTheme } = useTheme()
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  // "/" focuses the global search (the <kbd>/</kbd> hint next to the input).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      )
        return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const auth = useAuth() as {
    user?: { name?: string; avatar?: string; email?: string; role?: string }
    signOut?: () => void
    logout?: () => void
  }
  const user = auth.user
  const signOut = auth.signOut ?? auth.logout
  const userName =
    user?.name || t('inventoryManagementLayout.defaultUser', {}, { defaultValue: 'Operations' })

  type NavItem = { to: string; icon: string; labelKey: string; labelDefault: string }
  type NavSection = { titleKey: string; titleDefault: string; items: NavItem[] }

  const sections: NavSection[] = [
    {
      titleKey: 'inventoryManagementLayout.sectionOverview',
      titleDefault: 'Overview',
      items: [
        {
          to: '/dashboard',
          icon: 'space_dashboard',
          labelKey: 'inventoryManagementLayout.dashboard',
          labelDefault: 'Dashboard',
        },
        {
          to: '/notifications',
          icon: 'notifications',
          labelKey: 'inventoryManagementLayout.notifications',
          labelDefault: 'Notifications',
        },
      ],
    },
    {
      titleKey: 'inventoryManagementLayout.sectionInventory',
      titleDefault: 'Inventory',
      items: [
        {
          to: '/inventory',
          icon: 'inventory_2',
          labelKey: 'inventoryManagementLayout.inventory',
          labelDefault: 'Inventory',
        },
        {
          to: '/warehouses',
          icon: 'warehouse',
          labelKey: 'inventoryManagementLayout.warehouses',
          labelDefault: 'Warehouses',
        },
        {
          to: '/transfers',
          icon: 'sync_alt',
          labelKey: 'inventoryManagementLayout.transfers',
          labelDefault: 'Stock Transfers',
        },
      ],
    },
    {
      titleKey: 'inventoryManagementLayout.sectionOrders',
      titleDefault: 'Orders',
      items: [
        {
          to: '/orders',
          icon: 'receipt_long',
          labelKey: 'inventoryManagementLayout.orders',
          labelDefault: 'Orders',
        },
        {
          to: '/reports',
          icon: 'monitoring',
          labelKey: 'inventoryManagementLayout.reports',
          labelDefault: 'Reports',
        },
      ],
    },
    {
      titleKey: 'inventoryManagementLayout.sectionAccount',
      titleDefault: 'Account',
      items: [
        {
          to: '/profile',
          icon: 'person',
          labelKey: 'inventoryManagementLayout.profile',
          labelDefault: 'Profile',
        },
        {
          to: '/settings',
          icon: 'settings',
          labelKey: 'inventoryManagementLayout.settings',
          labelDefault: 'Settings',
        },
      ],
    },
  ]

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // The shell closes the drawer on SPA navigation, so no drawer reset here.
    const q = query.trim()
    navigate(q ? `/inventory?q=${encodeURIComponent(q)}` : '/inventory')
  }

  // Navy brand pass — the shared shell ships `cm.surface`; the last-wins
  // tailwind-merge in `cm.cn` lets these className overrides recolor the
  // TopBar, Sidebar and Drawer to the Locus navy rail with white text.
  const navy = 'bg-[var(--color-sidebar)] text-white'

  const brandLink = (
    <NavLink to="/dashboard" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
      <span
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary text-white',
        )}
        aria-hidden="true"
      >
        <span className={cm.cn('material-symbols-outlined text-[18px]')} data-icon="inventory_2">
          inventory_2
        </span>
      </span>
      <span className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-white')}>
        {APP_NAME}
      </span>
    </NavLink>
  )

  const notificationsBell = (
    <NavLink
      to="/notifications"
      aria-label={t(
        'inventoryManagementLayout.notificationsAria',
        {},
        { defaultValue: 'Open notifications' },
      )}
      className={cm.cn(
        'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white',
        'hover:bg-surface/10',
      )}
    >
      <span className={cm.cn('material-symbols-outlined text-[20px]')} data-icon="notifications">
        notifications
      </span>
      <span
        className={cm.cn(
          'absolute right-2 top-2 h-2 w-2 rounded-full bg-error ring-2 ring-sidebar',
        )}
        aria-hidden="true"
      />
    </NavLink>
  )

  // ONE nav element for both breakpoints — the Sidebar and the Drawer receive
  // the same element, and only the mounted breakpoint instantiates it, so the
  // links are never duplicated in the DOM. NavLink applies
  // `aria-current="page"` on the active link itself.
  const nav = (
    <>
      {sections.map((section) => (
        <div key={section.titleKey} className={cm.cn(cm.sp('mt', 4))}>
          <p
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('mb', 1),
              // white/60 = 7.0:1 on the #0f1729 rail (axe serious)
              'text-[10px] font-bold uppercase tracking-[0.2em] text-white/60',
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
                      'min-h-[44px] rounded-md transition-colors',
                      isActive
                        ? 'bg-primary/15 text-white font-semibold border-l-[3px] border-primary'
                        : 'text-white/70 hover:bg-surface/5 hover:text-white',
                    )
                  }
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[20px]')}
                    data-icon={item.icon}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  <span>{t(item.labelKey, {}, { defaultValue: item.labelDefault })}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  )

  // Drawer-only search — the desktop header carries the search field at ≥768px
  // (a non-duplicating CSS swap: exactly one search form is visible per width).
  const drawerSearch = (
    <form
      role="search"
      onSubmit={submitSearch}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('px', 3),
        'h-11 rounded-lg border border-surface/20 bg-surface/5',
      )}
    >
      <span
        className={cm.cn('material-symbols-outlined text-[18px] text-white/70')}
        data-icon="search"
        aria-hidden="true"
      >
        search
      </span>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={t(
          'inventoryManagementLayout.searchAria',
          {},
          { defaultValue: 'Search SKUs, products, warehouses' },
        )}
        placeholder={t(
          'inventoryManagementLayout.searchPlaceholder',
          {},
          { defaultValue: 'Search SKUs, products, warehouses…' },
        )}
        className={cm.cn(
          'w-full bg-transparent border-none outline-none text-sm text-white placeholder:text-white/60',
        )}
      />
    </form>
  )

  const drawerFooter = (
    <>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}>
        <span className={cm.cn('inline-flex [&_button]:min-h-[36px] [&_button]:min-w-[36px]')}>
          <UserMenu />
        </span>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={t('theme.toggle')}
          data-testid="theme-toggle-mobile"
          className={cm.cn(
            'flex h-11 w-11 items-center justify-center rounded-full text-white/70',
            'hover:bg-surface/5 hover:text-white',
          )}
        >
          <Icon name={mode === 'dark' ? 'moon' : 'sun'} size={20} />
        </button>
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
          'min-h-[44px] rounded-md border border-surface/10 text-white/70 hover:bg-surface/5 hover:text-white transition-colors uppercase tracking-wider',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-[16px]')} data-icon="logout">
          logout
        </span>
        {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
      </button>
    </>
  )

  // Desktop sidebar footer — the identity card + sign-out, exactly where the
  // hand-rolled sidebar kept them.
  const sidebarFooter = (
    <>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
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
          {/* white/60 = 7.0:1 on the #0f1729 rail (axe serious) */}
          <p className={cm.cn('truncate text-[11px] text-white/60')}>
            {user?.role ||
              t('inventoryManagementLayout.role', {}, { defaultValue: 'Operations Lead' })}
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

  return (
    <ResponsiveAppShell sidebarWidth="lg">
      {/*
        Mobile top bar (<768px). The shell renders the 44px menu trigger
        itself; the brand and the alerts bell keep their pre-migration slots.
        On desktop this bar does not mount — the sidebar carries the brand.
      */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        className={navy}
        brand={brandLink}
        actions={notificationsBell}
      />

      {/*
        Desktop sidebar (≥768px): the brand row leads the nav column (the
        shared Sidebar has no header slot, so it rides inside `children`),
        with the user card + sign-out in the bordered footer row.
      */}
      <ResponsiveAppShell.Sidebar className={navy} footer={sidebarFooter}>
        <div
          className={cm.cn(cm.sp('px', 6), cm.sp('py', 6), cm.flex({ align: 'center', gap: 'sm' }))}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/30',
            )}
          >
            <span className="material-symbols-outlined" data-icon="inventory_2">
              inventory_2
            </span>
          </div>
          <div>
            <p className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight leading-none')}>
              {APP_NAME}
            </p>
            <p
              className={cm.cn(
                // white/60 = 7.0:1 on the #0f1729 rail (axe serious)
                'text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60',
              )}
            >
              {t(
                'inventoryManagementLayout.brandSubtitle',
                {},
                { defaultValue: 'Inventory Control' },
              )}
            </p>
          </div>
        </div>
        {nav}
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (<768px): the full dialog panel over the same nav, with
        the search form above it and the user affordances in the footer.
      */}
      <ResponsiveAppShell.Drawer
        className={navy}
        navLabel={t(
          'inventoryManagementLayout.mobileNavLabel',
          {},
          { defaultValue: 'Mobile navigation' },
        )}
        footer={drawerFooter}
      >
        {drawerSearch}
        {nav}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        {/*
          Desktop search header — content-column chrome the drawer replaces on
          mobile (non-duplicating CSS swap: exactly one search form is visible
          per width). Sticky, frosted, with theme toggle + bell + user menu.
        */}
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            cm.sp('px', 8),
            'sticky top-0 z-30 hidden h-16 border-b border-outline-variant/60 bg-surface/80 backdrop-blur-md md:flex',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'flex-1 min-w-0')}>
            <form
              role="search"
              onSubmit={submitSearch}
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
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={t(
                  'inventoryManagementLayout.searchAria',
                  {},
                  { defaultValue: 'Search SKUs, products, warehouses' },
                )}
                placeholder={t(
                  'inventoryManagementLayout.searchPlaceholder',
                  {},
                  { defaultValue: 'Search SKUs, products, warehouses…' },
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
            </form>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={t('theme.toggle')}
              data-testid="theme-toggle"
              className={cm.cn(
                'inline-flex h-10 w-10',
                cm.flex({ align: 'center', justify: 'center' }),
                'rounded-full text-on-surface-variant hover:bg-background-secondary hover:text-on-surface transition-colors',
              )}
            >
              <Icon name={mode === 'dark' ? 'moon' : 'sun'} size={20} />
            </button>
            <NavLink
              to="/notifications"
              aria-label={t(
                'inventoryManagementLayout.notificationsAria',
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
            <UserMenu />
          </div>
        </header>

        {/* Page padding wraps the routed content — `.Content` stays a bare <main>. */}
        <div className={cm.cn('px-4 py-5 md:px-8 md:py-8')}>
          <Outlet />
        </div>
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

export default InventoryManagementLayout
