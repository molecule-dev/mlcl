import { NavLink, Outlet } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { Footer } from './Footer.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Shell layout for all auth'd Evenly pages — sidebar + main column with a
 * sticky topbar, mirroring the finance-workspace treatment used across the
 * fleet. Sidebar uses Evenly's green accent for the active nav item.
 */
const NAV_ITEMS = [
  {
    to: '/dashboard',
    icon: 'space_dashboard',
    key: 'nav.dashboard',
    fallback: 'Dashboard',
    end: true,
  },
  { to: '/groups', icon: 'group', key: 'nav.groups', fallback: 'Groups', end: true },
  {
    to: '/balances',
    icon: 'account_balance',
    key: 'nav.balances',
    fallback: 'Balances',
    end: true,
  },
  { to: '/activity', icon: 'notifications', key: 'nav.activity', fallback: 'Activity', end: true },
  { to: '/friends', icon: 'people', key: 'nav.friends', fallback: 'Friends', end: true },
] as const

export function BillSplitLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      data-mol-id="evenly-layout"
      className={cm.cn(cm.flex(), cm.minH('screen'), 'bg-surface-container-low text-on-surface')}
    >
      <aside
        data-mol-id="evenly-sidebar"
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.sp('px', 4),
          cm.sp('py', 6),
          'sticky top-0 h-screen w-[260px] shrink-0 border-r border-outline-variant/40 bg-surface',
        )}
      >
        <NavLink
          to="/dashboard"
          className={cm.cn(cm.sp('px', 3), cm.sp('mb', 8), 'block')}
          data-mol-id="sidebar-brand"
        >
          <div
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'tracking-tight font-extrabold',
            )}
            style={{ color: 'var(--color-primary-hover)' }}
          >
            {APP_NAME}
          </div>
          <div
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('app.tagline', {}, { defaultValue: APP_TAGLINE })}
          </div>
        </NavLink>

        <nav className={cm.cn(cm.stack(1), cm.flex1)}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-mol-id={`nav-${item.to.replace(/\//g, '-').slice(1)}`}
              className={({ isActive }) =>
                cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'rounded-xl transition-colors',
                  isActive
                    ? 'bg-primary-container text-on-primary-container font-bold'
                    : 'text-on-surface-variant hover:bg-surface-container-low',
                )
              }
            >
              <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
                {item.icon}
              </span>
              <span>{t(item.key, {}, { defaultValue: item.fallback })}</span>
            </NavLink>
          ))}
        </nav>

        <NavLink
          to="/expenses/new"
          data-mol-id="nav-new-expense"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'mb-4 rounded-full text-white shadow-md shadow-primary/20 transition-colors',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--color-primary-hover), var(--color-gradient-end))',
          }}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            add_circle
          </span>
          <span>{t('nav.newExpense', {}, { defaultValue: 'Add expense' })}</span>
        </NavLink>

        <NavLink
          to="/settings"
          data-mol-id="nav-settings"
          className={({ isActive }) =>
            cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'mt-auto rounded-xl transition-colors',
              isActive
                ? 'bg-primary-container text-on-primary-container font-bold'
                : 'text-on-surface-variant hover:bg-surface-container-low',
            )
          }
        >
          <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
            settings
          </span>
          <span>{t('nav.settings', {}, { defaultValue: 'Settings' })}</span>
        </NavLink>
      </aside>

      <div className={cm.cn('flex flex-col flex-1 min-w-0 w-full')}>
        <header
          data-mol-id="evenly-topbar"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 8),
            'sticky top-0 z-30 h-14 border-b border-outline-variant/40 bg-surface/80 backdrop-blur-md',
          )}
        >
          <div
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('layout.workspace', {}, { defaultValue: 'Shared Costs Workspace' })}
          </div>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main className={cm.cn(cm.flex1, cm.sp('px', 8), cm.sp('py', 8), 'overflow-x-hidden')}>
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  )
}
