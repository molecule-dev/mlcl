import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'

import { useAuth, useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Icon } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

/**
 * Inventory shell layout.
 *
 * Desktop (>= md): fixed navy sidebar (`#0f1729`) + sticky frosted topbar with
 * global SKU search, alerts bell, and user avatar.
 *
 * Mobile (< md): the fixed-width sidebar has nowhere to go at 390px (it would
 * eat two thirds of the viewport), so a template-local shell swaps in a sticky
 * top bar + hamburger drawer instead (scrim, Escape-to-close, auto-close on
 * navigation, 44px targets, search + UserMenu + theme toggle in the drawer).
 * Both shells render ONE <Outlet /> so pages mount exactly at any width.
 *
 * Pattern source: energy-monitoring's EnergyMonitoringLayout / document-
 * collaboration's QuillonLayout (fleet QA mobile-shell pattern). Sidebar
 * palette retuned to the Locus DESIGN.md brief (deep navy `#0f1729`, teal
 * `#0e7490` active accent).
 */
export function InventoryManagementLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { mode, toggleTheme } = useTheme()
  const [query, setQuery] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
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
    setDrawerOpen(false)
    const q = query.trim()
    navigate(q ? `/inventory?q=${encodeURIComponent(q)}` : '/inventory')
  }

  return (
    <div
      className={cm.cn(
        // Stacked on mobile (topbar above content); row only once the desktop
        // sidebar appears at md.
        cm.minH('screen'),
        'flex flex-col md:flex-row bg-background',
      )}
    >
      {/* ——— Mobile top bar (< md) ——— */}
      <header
        data-testid="layout-topbar"
        className={cm.cn(
          'sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-surface/10 md:hidden',
        )}
        style={{ backgroundColor: 'var(--color-sidebar)' }}
      >
        <button
          type="button"
          onClick={() => setDrawerOpen((o) => !o)}
          aria-label={t('inventoryManagementLayout.menu', {}, { defaultValue: 'Menu' })}
          aria-expanded={drawerOpen}
          aria-controls="mobile-nav-drawer"
          data-testid="layout-drawer-toggle"
          className={cm.cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white',
            'hover:bg-surface/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
            {drawerOpen ? 'close' : 'menu'}
          </span>
        </button>
        <NavLink to="/dashboard" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary text-white',
            )}
            aria-hidden="true"
          >
            <span
              className={cm.cn('material-symbols-outlined text-[18px]')}
              data-icon="inventory_2"
            >
              inventory_2
            </span>
          </span>
          <span className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-white')}>
            {APP_NAME}
          </span>
        </NavLink>
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
          <span
            className={cm.cn('material-symbols-outlined text-[20px]')}
            data-icon="notifications"
          >
            notifications
          </span>
          <span
            className={cm.cn(
              'absolute right-2 top-2 h-2 w-2 rounded-full bg-error ring-2 ring-sidebar',
            )}
            aria-hidden="true"
          />
        </NavLink>
      </header>

      {/* ——— Mobile drawer (< md) ——— */}
      {drawerOpen ? (
        <div className={cm.cn('md:hidden')} data-testid="layout-drawer">
          <div
            className={cm.cn('fixed inset-x-0 bottom-0 top-14 z-30 bg-black/50')}
            aria-hidden="true"
            data-testid="layout-drawer-scrim"
            onClick={() => setDrawerOpen(false)}
          />
          <nav
            id="mobile-nav-drawer"
            aria-label={t(
              'inventoryManagementLayout.mobileNavLabel',
              {},
              { defaultValue: 'Mobile navigation' },
            )}
            className={cm.cn(
              'fixed inset-x-0 bottom-0 top-14 z-40 overflow-y-auto shadow-xl',
              cm.sp('px', 4),
              'pb-6 pt-3 text-white',
            )}
            style={{ backgroundColor: 'var(--color-sidebar)' }}
          >
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

            {sections.map((section) => (
              <div key={section.titleKey} className={cm.cn(cm.sp('mt', 4))}>
                <p
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('mb', 1),
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
                        onClick={() => setDrawerOpen(false)}
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

            <div
              className={cm.cn(
                cm.sp('mt', 4),
                cm.sp('pt', 4),
                cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                'border-t border-surface/10',
              )}
            >
              <span
                className={cm.cn('inline-flex [&_button]:min-h-[36px] [&_button]:min-w-[36px]')}
              >
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
                cm.sp('mt', 3),
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
          </nav>
        </div>
      ) : null}

      {/* ——— Desktop sidebar (>= md) ——— */}
      <aside
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'hidden md:flex fixed left-0 top-0 z-40 h-screen w-64 text-white',
        )}
        style={{ backgroundColor: 'var(--color-sidebar)' }}
      >
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
                // white/40 was 3.81:1 on the #0f1729 rail (axe serious); /60 = 7.0:1
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

        <nav className={cm.cn(cm.sp('px', 3), cm.sp('pb', 4), 'flex-1 overflow-y-auto')}>
          {sections.map((section) => (
            <div key={section.titleKey} className={cm.cn(cm.sp('mt', 5))}>
              <p
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('mb', 2),
                  // white/35 was 3.2:1 on the #0f1729 rail (axe serious); /60 = 7.0:1
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
          ))}
        </nav>

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
              {/* white/45 was 4.45:1 on the #0f1729 rail (axe serious); /60 = 7.0:1 */}
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
        </div>
      </aside>

      {/* ——— Shared content area ——— */}
      <div className={cm.cn(cm.flex({ direction: 'col' }), 'flex-1 md:ml-64 min-w-0')}>
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

        <main className={cm.cn('flex-1 min-w-0 px-4 py-5 md:px-8 md:py-8')}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default InventoryManagementLayout
