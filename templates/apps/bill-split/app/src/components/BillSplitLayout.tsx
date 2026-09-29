import { NavLink, Outlet } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { Footer } from './Footer.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Shell layout for all auth'd Evenly pages — the shared `ResponsiveAppShell`
 * composed to this app's shape: a mobile-only top bar (<768px; brand +
 * actions + the shell's own menu trigger), a ≥768px sidebar (brand + nav +
 * Add-expense CTA + settings, actions in the footer row), and a <768px
 * dialog drawer carrying the SAME nav element. The shell owns the
 * breakpoint, root direction, drawer open state, focus/Escape/backdrop
 * handling, and auto-close-on-navigation.
 *
 * data-mol-id discipline: the sidebar and the drawer receive the SAME `nav`
 * element, and only the mounted breakpoint instantiates it — so the
 * `nav-*` ids are never duplicated in the DOM. The desktop brand keeps
 * `sidebar-brand` (unique per breakpoint — the drawer header brand carries
 * no id) and the mobile top-bar brand stays `mobile-brand`. Sidebar uses
 * Evenly's green accent for the active nav item.
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

  const navItemClass = (isActive: boolean): string =>
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

  // ONE nav element for both breakpoints — the Sidebar and the Drawer receive
  // the same element, and only the mounted breakpoint instantiates it. The
  // drawer closes itself on navigation (shell-owned), so links carry no
  // onClick close; react-router's NavLink sets aria-current="page" itself.
  const nav = (
    <>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          data-mol-id={`nav-${item.to.replace(/\//g, '-').slice(1)}`}
          className={({ isActive }) => navItemClass(isActive)}
        >
          <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
            {item.icon}
          </span>
          <span>{t(item.key, {}, { defaultValue: item.fallback })}</span>
        </NavLink>
      ))}
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
        className={({ isActive }) => cm.cn(navItemClass(isActive), 'mt-auto')}
      >
        <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
          settings
        </span>
        <span>{t('nav.settings', {}, { defaultValue: 'Settings' })}</span>
      </NavLink>
    </>
  )

  const actions = (
    <>
      <ThemeToggle />
      <UserMenu />
    </>
  )

  return (
    <ResponsiveAppShell sidebarWidth="md" dataMolId="evenly-layout">
      {/* Mobile top bar (<768px): brand + the shell's menu trigger. Desktop
          is brandless up top — the sidebar carries the brand row. */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={
          <NavLink
            to="/dashboard"
            data-mol-id="mobile-brand"
            className={cm.cn(cm.sp('px', 2), 'block')}
          >
            <BrandWordmark as="span" />
          </NavLink>
        }
      />

      {/*
        Desktop sidebar (≥768px). The brand row leads the nav column — the
        shared Sidebar has no header slot, so it rides inside `children`.
      */}
      <ResponsiveAppShell.Sidebar
        className={cm.cn(cm.sp('px', 4), cm.sp('py', 6))}
        footer={<div className={cm.flex({ align: 'center', gap: 'sm' })}>{actions}</div>}
      >
        <NavLink
          to="/dashboard"
          className={cm.cn(cm.sp('px', 3), cm.sp('mb', 8), 'block')}
          data-mol-id="sidebar-brand"
        >
          <BrandWordmark as="span" withTagline />
        </NavLink>
        {nav}
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (<768px): a full dialog panel (focus trap, Escape,
        backdrop click, body-scroll lock) over the same nav, with the brand
        in the header row and the actions in the footer.
      */}
      <ResponsiveAppShell.Drawer
        header={<BrandWordmark as="span" />}
        footer={<div className={cm.flex({ align: 'center', justify: 'between' })}>{actions}</div>}
      >
        {nav}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content className={cm.cn('overflow-x-hidden px-4 py-6 md:px-8 md:py-8')}>
        <Outlet />
        <Footer />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
