import { Link, NavLink, Outlet } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { Footer } from './Footer.js'
import { NAV_ITEMS } from './MainNav.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Sidebar/drawer nav links — ONE element passed to both `Sidebar` (≥768px)
 * and `Drawer` (<768px); only the mounted breakpoint instantiates it, so the
 * links are never duplicated in the DOM. NavLink carries
 * `aria-current="page"` on the active route itself; the 44px min-height keeps
 * the fleet tap-target floor on mobile.
 */
function ShellNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'min-h-[44px] rounded-xl transition-colors',
              isActive
                ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
                : cm.cn(cm.textMuted, 'hover:bg-surface-container hover:text-on-surface'),
            )
          }
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
            {item.glyph}
          </span>
          {t(item.key, {}, { defaultValue: item.label })}
        </NavLink>
      ))}
    </>
  )
}

/**
 * Authenticated shell — the shared `ResponsiveAppShell`. The top bar mounts
 * only below md (the desktop keeps its brand row in the sidebar, so a
 * full-width bar here would render as a squeezed flex-row sibling) and the
 * shell renders the mobile menu trigger itself; the drawer carries the same
 * nav element under a full dialog contract (focus trap, Escape/backdrop
 * close, scroll lock, auto-close on navigation). Pages keep their own
 * padding; the footer rides under the routed page inside `.Content`.
 */
export function AppLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navLabel = t('nav.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })
  const brand = (
    <Link
      to="/"
      className={cm.cn(
        cm.flex({ align: 'center', gap: 2 }),
        cm.fontWeight('extrabold'),
        cm.textSize('lg'),
        'tracking-tight truncate',
      )}
    >
      {APP_NAME}
    </Link>
  )

  return (
    <ResponsiveAppShell sidebarWidth="md">
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={brand}
        actions={
          <>
            <ThemeToggle />
            <UserMenu />
          </>
        }
      />
      <ResponsiveAppShell.Sidebar
        navLabel={navLabel}
        className={cm.sp('p', 4)}
        footer={
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <ThemeToggle />
            <UserMenu />
          </div>
        }
      >
        {brand}
        <ShellNav />
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer
        navLabel={navLabel}
        className={cm.cn('h-full', cm.sp('p', 4))}
        header={
          <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('extrabold'))}>{APP_NAME}</span>
        }
      >
        <ShellNav />
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content>
        <Outlet />
        <Footer />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
