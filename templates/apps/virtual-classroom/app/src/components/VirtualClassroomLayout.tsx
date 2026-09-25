import type { ReactElement } from 'react'
import { Link, Outlet } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { AulaBrand, AulaNav, AulaNavFooter } from './AulaSideNav.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Authenticated dashboard shell — the shared `ResponsiveAppShell`.
 *
 * Desktop (≥768px): the Sidebar mounts — brand block, nav links and the
 * weekly-quota footer card at 260px. Below 768px the Sidebar unmounts and a
 * `mobileOnly` TopBar carries the brand + actions (bell, theme, user menu)
 * alongside the shell-rendered menu trigger; the nav opens in the Drawer
 * (full APG dialog contract — focus trap, Escape/backdrop close, scroll
 * lock, auto-close on navigation).
 *
 * `.Sidebar` and `.Drawer` receive the SAME nav/footer elements, so only the
 * mounted breakpoint instantiates them and the nav `data-mol-id`s never
 * duplicate. The drawer open state, hamburger button, Escape/backdrop
 * handlers and close button this layout used to hand-roll are the shell's
 * now (`shell-drawer-open` / `shell-drawer` / `shell-drawer-close`).
 *
 * Pattern source: lms/Dashboard.tsx (sidebar + offset main), recolored to
 * Aula's lavender surface.
 */
export function VirtualClassroomLayout(): ReactElement {
  const cm = getClassMap()
  const { t } = useTranslation()

  const navLabel = t('aulaSideNav.label', {}, { defaultValue: 'Primary navigation' })

  // The SAME elements for both surfaces — only the mounted breakpoint
  // instantiates them.
  const nav = <AulaNav />
  const footer = <AulaNavFooter />
  const brand = <AulaBrand />
  const mobileBrand = <AulaBrand compact />

  return (
    <ResponsiveAppShell
      // The old hand-rolled rail was 260px — keep its exact geometry.
      sidebarWidth={260}
      className="bg-background text-on-surface antialiased"
    >
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={mobileBrand}
        actions={
          <>
            <AulaBell />
            <ThemeToggle />
            <UserMenu />
          </>
        }
      />
      <ResponsiveAppShell.Sidebar navLabel={navLabel} className={cm.sp('p', 6)} footer={footer}>
        <div className={cm.sp('mb', 6)}>{brand}</div>
        {nav}
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer
        navLabel={navLabel}
        header={brand}
        footer={footer}
        // The shared panel ships no height token (its content would size it);
        // `h-full` restores the documented full-height left-panel geometry.
        className="h-full"
      >
        {nav}
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content
        className={cm.cn('px-4 md:px-8', cm.sp('pt', 6), cm.sp('pb', 12))}
      >
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

/**
 * Notification bell — the old top bar's link, kept for the mobile TopBar
 * (desktop reaches /notifications through the sidebar's nav link).
 */
function AulaBell() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <Link
      to="/notifications"
      aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
      className={cm.cn(
        'relative h-10 w-10 rounded-xl flex items-center justify-center bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-primary-container transition-colors',
      )}
    >
      <span className={cm.cn('material-symbols-outlined text-[20px]')}>notifications</span>
      <span
        className={cm.cn(
          'absolute top-2 right-2 h-2 w-2 rounded-full bg-secondary ring-2 ring-surface-container-lowest',
        )}
        aria-hidden="true"
      ></span>
    </Link>
  )
}

export default VirtualClassroomLayout
