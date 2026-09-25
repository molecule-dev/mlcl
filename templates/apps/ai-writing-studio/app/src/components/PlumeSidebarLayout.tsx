import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/documents', key: 'documents', defaultLabel: 'Documents', icon: 'menu_book' },
  { to: '/templates', key: 'templates', defaultLabel: 'Templates', icon: 'auto_stories' },
  { to: '/image-generator', key: 'imageGenerator', defaultLabel: 'Image Generator', icon: 'image' },
  { to: '/analytics', key: 'analytics', defaultLabel: 'Analytics', icon: 'query_stats' },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { to: '/billing', key: 'billing', defaultLabel: 'Billing', icon: 'receipt_long' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Plume sidebar shell for all signed-in pages — the shared
 * `ResponsiveAppShell` composed to Plume's shape: a mobile-only top bar (the
 * desktop brand row lives in the sidebar), a ≥768px sidebar, a <768px dialog
 * drawer, and one `<Outlet />` so pages mount exactly once at any width. The
 * shell owns the breakpoint, the drawer open state, the menu trigger,
 * focus/Escape/backdrop handling, and the auto-close-on-navigation; this
 * component only supplies nav + brand.
 */
export function PlumeSidebarLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const navLabel = t(
    'plumeSidebarLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )

  // Longest prefix-match, so a document-detail route (/documents/<id>) keeps
  // "Documents" lit.
  const activeKey = NAV_KEYS.reduce<string | null>((best, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return best
    if (best === null) return item.key
    const bestItem = NAV_KEYS.find((i) => i.key === best)
    return bestItem && item.to.length > bestItem.to.length ? item.key : best
  }, null)

  // ONE nav element for both breakpoints — the Sidebar and the Drawer receive
  // the same array, and only the mounted breakpoint instantiates it, so the
  // nav `data-mol-id`s stay unique in the DOM. The drawer closes itself on
  // navigation (shell-owned), so links carry no onClick close.
  const nav = NAV_KEYS.map((item) => {
    const isActive = item.key === activeKey
    return (
      <Link
        key={item.key}
        to={item.to}
        data-mol-id={`nav-${item.key}`}
        aria-current={isActive ? 'page' : undefined}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          cm.roundedFull,
          // 44px — the fleet's minimum tap target.
          'min-h-[44px] transition-colors',
          isActive
            ? // The container pair, NOT a primary tint under brand-colored
              // text (contrast — the shared shell family's rationale).
              cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
            : cm.cn(cm.textMuted, cm.link),
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined shrink-0')}
          style={{ fontSize: 20 }}
          aria-hidden="true"
        >
          {item.icon}
        </span>
        <span>
          {t(`plumeSidebarLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
        </span>
      </Link>
    )
  })

  return (
    <ResponsiveAppShell sidebarWidth="md">
      {/*
        Mobile top bar (<768px): the shell renders the menu trigger itself;
        the brand + user menu ride beside it. On desktop the sidebar carries
        the chrome, so this bar unmounts entirely.
      */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={
          <Link
            to="/dashboard"
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('base'),
              'font-serif text-on-surface truncate',
            )}
          >
            {APP_NAME}
          </Link>
        }
        actions={<UserMenu />}
      />

      {/*
        Desktop sidebar (≥768px): the brand row leads the nav column — the
        shared Sidebar has no header slot, so it rides inside `children` —
        with the theme + user row in the bordered footer, as before.
      */}
      <ResponsiveAppShell.Sidebar
        navLabel={navLabel}
        className={cm.sp('p', 4)}
        footer={
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            <div className={cm.cn(cm.flex({ justify: 'end' }))}>
              <ThemeToggle />
            </div>
            <UserMenu />
          </div>
        }
      >
        <Link
          to="/dashboard"
          className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.displayBlock)}
        >
          {APP_NAME}
        </Link>
        {nav}
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (<768px): the same nav inside the full APG dialog
        contract (focus trap, Escape/backdrop close, body-scroll lock,
        auto-close on navigation) — all shell-owned.
      */}
      <ResponsiveAppShell.Drawer
        navLabel={navLabel}
        header={
          <span className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
            {APP_NAME}
          </span>
        }
        footer={<ThemeToggle />}
        className={cm.sp('p', 3)}
      >
        {nav}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
