import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'

import { useAuth, useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Icon } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

/**
 * Inventory shell layout — fixed navy sidebar (`#0f1729`) + sticky frosted
 * topbar with global SKU search, alerts bell, and user avatar.
 *
 * Pattern source: composed from online-store/AdminDashboardSideNav.tsx and
 * online-store/AdminDashboardTopNavBar.tsx, retuned to the Locus DESIGN.md
 * brief (deep navy `#0f1729` sidebar, teal `#0e7490` active accent, search
 * width 480px, top bar 56-64px).
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

  return (
    <div className={cm.cn(cm.flex({ direction: 'row' }), cm.minH('screen'), 'bg-background')}>
      <aside
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'fixed left-0 top-0 z-40 h-screen w-64 text-white',
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

      <div className={cm.cn(cm.flex({ direction: 'col' }), 'flex-1 ml-64 min-w-0')}>
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            cm.sp('px', 8),
            'sticky top-0 z-30 h-16 border-b border-outline-variant/60 bg-surface/80 backdrop-blur-md',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'flex-1 min-w-0')}>
            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault()
                const q = query.trim()
                navigate(q ? `/inventory?q=${encodeURIComponent(q)}` : '/inventory')
              }}
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

        <main className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'flex-1 min-w-0')}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default InventoryManagementLayout
