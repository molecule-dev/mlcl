import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell, SidebarUserCard, usePanelClose } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { SettingsPanel } from './SettingsPanel.js'

/**
 * Authenticated shell — the shared `ResponsiveAppShell` with this app's nav,
 * brand and user panel.
 *
 * The shell owns the breakpoint split: the Sidebar mounts only ≥768px, the
 * mobile Drawer (same nav element, full dialog contract — focus trap,
 * Escape/backdrop close, scroll lock) only below it, and the TopBar renders
 * the menu trigger itself — the app's former hamburger button, module-level
 * drawer store and escape/backdrop handlers are deleted with it.
 *
 * Composition notes:
 * - `flex-wrap` on the root + `w-full` on each page's TopBar keeps the top
 *   bar a full-width row ABOVE the sidebar/content row (the shell root is a
 *   flex row on desktop — without `flex-wrap` the bar renders as a squeezed
 *   column beside the sidebar).
 * - The SAME nav element goes to `Sidebar` and `Drawer`, so only the mounted
 *   breakpoint instantiates it — no duplicate nav landmarks, no duplicate
 *   `data-mol-id`s.
 * - Page padding stays inside pages: `.Content` is a bare `<main>`.
 */

/** Brand block — the app name + tagline, above the nav links. */
function ShellBrand() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <Link
      to="/"
      className={cm.cn(
        cm.sp('pt', 6),
        cm.sp('mb', 8),
        cm.sp('px', 4),
        cm.flex({ direction: 'col', gap: 1 }),
      )}
    >
      <span className={cm.cn(cm.textSize('2xl'), cm.textPrimary, 'font-black tracking-tighter')}>
        {t('sideNavBar.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
      </span>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('medium'),
          'text-foreground-secondary tracking-tight uppercase',
        )}
      >
        {t('sideNavBar.productTagline', {}, { defaultValue: 'Support Desk' })}
      </span>
    </Link>
  )
}

/**
 * Nav links shared by the desktop Sidebar and the mobile Drawer — the shell
 * mounts only the breakpoint's copy. Marking the current item is the
 * consumer's job: `aria-current="page"` from the active link.
 */
function ShellNavLinks() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const links = [
    { to: '/', exact: true, icon: 'dashboard', labelKey: 'nav.dashboard', fallback: 'Dashboard' },
    {
      to: '/tickets',
      exact: false,
      icon: 'confirmation_number',
      labelKey: 'sideNavBar.navTickets',
      fallback: 'Tickets',
    },
    {
      to: '/knowledge-base',
      exact: false,
      icon: 'book',
      labelKey: 'sideNavBar.navKnowledgeBase',
      fallback: 'Knowledge Base',
    },
    {
      to: '/reports',
      exact: false,
      icon: 'bar_chart',
      labelKey: 'nav.reports',
      fallback: 'Reports',
    },
    {
      to: '/settings',
      exact: false,
      icon: 'settings',
      labelKey: 'nav.settings',
      fallback: 'Settings',
    },
  ]

  return (
    <>
      {links.map((link) => {
        const active = link.exact ? pathname === link.to : pathname.startsWith(link.to)
        return (
          <Link
            key={link.to}
            to={link.to}
            aria-current={active ? 'page' : undefined}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 3 }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              'transition-colors duration-200',
              active
                ? cm.cn(
                    cm.textPrimary,
                    cm.fontWeight('bold'),
                    'border-r-2 border-primary hover:bg-border/50 scale-[0.98]',
                  )
                : 'text-foreground-secondary hover:text-foreground hover:bg-border/50',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon={link.icon}>
              {link.icon}
            </span>
            <span
              className={cm.cn(
                cm.fontWeight('medium'),
                cm.textSize('sm'),
                "font-['Inter'] tracking-tight",
              )}
            >
              {t(link.labelKey, {}, { defaultValue: link.fallback })}
            </span>
          </Link>
        )
      })}
    </>
  )
}

/**
 * Below-nav identity card — the same SettingsPanel the former sidebars
 * hosted. `usePanelClose` must resolve INSIDE the `SidebarUserCard` (its
 * panel context), hence the dedicated child component.
 */
function SidebarUserFooter() {
  return (
    <SidebarUserCard>
      <SidebarUserPanel />
    </SidebarUserCard>
  )
}

function SidebarUserPanel() {
  return <SettingsPanel onClose={usePanelClose()} />
}

/**
 * Drawer footer — the same identity/settings/sign-out panel the former mobile
 * drawer hosted. Closing after an action is the shell's job: the drawer
 * closes on every SPA navigation, so the panel's own onClose is a no-op here.
 */
function DrawerUserFooter() {
  return <SettingsPanel onClose={() => {}} />
}

interface AppShellProps {
  /**
   * The page's top bar — a `<ResponsiveAppShell.TopBar>` element with
   * `className="w-full …"` (the shell root is `flex-wrap`, so a full-width
   * TopBar takes its own row above the sidebar/content row). Omit on pages
   * with no desktop bar and pass `mobileTitle` instead.
   */
  topBar?: ReactNode
  /**
   * Page title for a mobile-only top bar (below 768px only) — for pages that
   * ship no desktop bar. Renders the shell menu trigger + the title.
   */
  mobileTitle?: ReactNode
  /** `data-mol-id` for the content `<main>` (fleet locator convention). */
  contentMolId?: string
  /** The routed page content. */
  children: ReactNode
}

/**
 * The shell every signed-in page composes into — see the module doc.
 *
 * @param props - Top-bar chrome, content id, and the page content.
 */
export default function AppShell({ topBar, mobileTitle, contentMolId, children }: AppShellProps) {
  const cm = getClassMap()
  const nav = <ShellNavLinks />

  return (
    <ResponsiveAppShell sidebarWidth="md" className={cm.cn('flex-wrap')}>
      {topBar}
      {mobileTitle ? (
        <ResponsiveAppShell.TopBar
          mobileOnly
          className="w-full"
          brand={
            <span
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('semibold'),
                'text-on-surface truncate',
              )}
            >
              {mobileTitle}
            </span>
          }
        />
      ) : null}
      <ResponsiveAppShell.Sidebar footer={<SidebarUserFooter />}>
        <ShellBrand />
        {nav}
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer header={<ShellBrand />} footer={<DrawerUserFooter />}>
        {nav}
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content dataMolId={contentMolId}>{children}</ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

export { AppShell }
