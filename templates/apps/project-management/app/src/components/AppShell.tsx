/**
 * Authenticated app shell — the shared `ResponsiveAppShell` family from
 * `@molecule/app-ui-react`, composed fleet-canonically for a desktop-sidebar
 * app: the brand lockup lives in the `.Sidebar` (and the `.Drawer` header),
 * and the `.TopBar` is `mobileOnly` — it renders only below 768px, carrying
 * the menu trigger (the shell draws it), the current page's title and the
 * user menu.
 *
 * `.Sidebar` (≥768px) and `.Drawer` (<768px, full APG dialog contract — focus
 * trap, Escape/backdrop close, scroll lock) receive the SAME nav element, so
 * only the mounted breakpoint instantiates it and nav `data-mol-ids` never
 * duplicate in the DOM. The shell owns the drawer open state, the hamburger
 * trigger, Escape/backdrop handling, focus trapping and auto-close-on-
 * navigation — the former template-local `MobileNav` / `useIsMobile` chrome
 * (plus the four per-page CSS-hidden desktop rails) was deleted in favor of
 * it.
 *
 * Pages may pass a `footer` (below-nav quick action) — rendered after the
 * `<nav>` landmark in the Sidebar, and in the same slot inside the Drawer.
 */
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

interface NavItem {
  to: string
  labelKey: string
  defaultLabel: string
  icon: string
  /** Prefixes of the pathname this item is the active nav for. */
  matchPrefixes: string[]
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/dashboard',
    labelKey: 'nav.dashboard',
    defaultLabel: 'Dashboard',
    icon: 'dashboard',
    matchPrefixes: ['/dashboard', '/projects'],
  },
  {
    to: '/my-tasks',
    labelKey: 'nav.myTasks',
    defaultLabel: 'My Tasks',
    icon: 'assignment_turned_in',
    matchPrefixes: ['/my-tasks', '/tasks', '/list'],
  },
  {
    to: '/calendar',
    labelKey: 'nav.calendar',
    defaultLabel: 'Calendar',
    icon: 'calendar_today',
    matchPrefixes: ['/calendar', '/timeline'],
  },
  {
    to: '/settings',
    labelKey: 'nav.settings',
    defaultLabel: 'Settings',
    icon: 'settings',
    matchPrefixes: ['/settings', '/plan-updated'],
  },
  {
    to: '/help',
    labelKey: 'common.help',
    defaultLabel: 'Help',
    icon: 'help',
    matchPrefixes: ['/help'],
  },
]

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

function pageTitle(pathname: string, t: ReturnType<typeof useTranslation>['t']): string {
  for (const item of NAV_ITEMS) {
    if (item.matchPrefixes.some((p) => pathname.startsWith(p))) {
      return t(item.labelKey, {}, { defaultValue: item.defaultLabel })
    }
  }
  return t('brand.name', { appName: APP_NAME }, { defaultValue: '{{appName}}' })
}

/**
 * The nav links, shared by the desktop Sidebar and the mobile Drawer — the
 * shell mounts only the breakpoint's copy, so the `mobile-nav-<path>`
 * data-mol-ids are never duplicated in the DOM. Marking the current item is
 * the consumer's job: prefix match, exactly as the old mobile drawer did.
 */
function ShellNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  return (
    <>
      {NAV_ITEMS.map((item) => {
        const active = item.matchPrefixes.some((p) => pathname.startsWith(p))
        return (
          <Link
            key={item.to}
            to={item.to}
            data-mol-id={`mobile-nav-${item.to.replace(/\//g, '') || 'root'}`}
            aria-current={active ? 'page' : undefined}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              'px-4 py-3 rounded-lg text-sm transition-colors',
              active
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
              FOCUS_RING,
            )}
          >
            <span
              className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
              aria-hidden="true"
            >
              {item.icon}
            </span>
            <span>{t(item.labelKey, {}, { defaultValue: item.defaultLabel })}</span>
          </Link>
        )
      })}
    </>
  )
}

/** Brand lockup — the gradient mark + product name, from the former rails. */
function BrandLockup() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('px', 3), cm.sp('py', 2))}>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.w(8),
          cm.h(8),
          'bg-gradient-to-br from-primary to-primary-container rounded-lg text-on-primary shadow-lg',
        )}
      >
        <span
          className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          architecture
        </span>
      </div>
      <div className={cm.flex({ direction: 'col' })}>
        <span
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            'tracking-tight text-on-background',
          )}
        >
          {t('brand.name', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-on-surface-variant">
          {t('brand.tagline', {}, { defaultValue: 'Project Manager' })}
        </span>
      </div>
    </div>
  )
}

export interface AppShellProps {
  /**
   * Below-nav quick action (page CTA, legal links) — rendered in the
   * Sidebar's footer slot on desktop and the same slot inside the Drawer on
   * mobile. Only the mounted breakpoint's copy ever exists.
   */
  footer?: ReactNode
  /** The routed page content — rendered inside the shell's `<main>`. */
  children: ReactNode
}

/**
 * The shell every signed-in page composes into — see the module doc.
 *
 * @param props - An optional footer quick action plus the page content.
 */
export function AppShell({ footer, children }: AppShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navAriaLabel = t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })

  // The SAME element for both surfaces — only the mounted breakpoint
  // instantiates it.
  const nav = <ShellNav />

  return (
    <ResponsiveAppShell sidebarWidth="md">
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={
          <h2
            className={cm.cn(
              cm.textSize('lg'),
              'font-bold tracking-tight text-on-background truncate',
            )}
          >
            {pageTitle(pathname, t)}
          </h2>
        }
        actions={<UserMenu />}
      />
      <ResponsiveAppShell.Sidebar navLabel={navAriaLabel} footer={footer}>
        <BrandLockup />
        {nav}
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer navLabel={navAriaLabel} header={<BrandLockup />} footer={footer}>
        {nav}
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content>{children}</ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

export default AppShell
