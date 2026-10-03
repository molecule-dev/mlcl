/**
 * Discussion Boards layout — the shared `ResponsiveAppShell` with this app's
 * forum navigation, used by every authenticated route. Nav holds primary
 * destinations (Categories, Compose, Search, Bookmarks, Notifications) plus
 * the Moderation Queue link for moderators and Settings.
 *
 * The shared shell owns the breakpoint split: the Sidebar mounts only ≥768px,
 * the mobile Drawer (same nav element, full dialog contract — focus trap,
 * Escape/backdrop close, scroll lock) only below it, and the TopBar renders
 * the menu trigger itself. The drawer auto-closes on route changes, so
 * navigation never leaves a full-screen panel open over the page the user
 * just navigated to.
 *
 * Translated from blog's BlogLayout (sidebar + main + chrome) but
 * routed through getClassMap helpers + brand tokens (no inline styles).
 */
import type { ReactElement } from 'react'
import { NavLink, Outlet } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell, ThemeToggle } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { Footer } from './Footer.js'
import { UserMenu } from './UserMenu.js'

interface NavItem {
  to: string
  icon: string
  labelKey: string
  defaultLabel: string
  end?: boolean
}

const PRIMARY_NAV: NavItem[] = [
  {
    to: '/c',
    icon: 'dashboard',
    labelKey: 'nav.categories',
    defaultLabel: 'Categories',
    end: true,
  },
  { to: '/compose', icon: 'edit_note', labelKey: 'nav.compose', defaultLabel: 'New thread' },
  { to: '/search', icon: 'search', labelKey: 'nav.search', defaultLabel: 'Search' },
  { to: '/bookmarks', icon: 'bookmark', labelKey: 'nav.bookmarks', defaultLabel: 'Bookmarks' },
  {
    to: '/notifications',
    icon: 'notifications',
    labelKey: 'nav.notifications',
    defaultLabel: 'Notifications',
  },
]

const SECONDARY_NAV: NavItem[] = [
  {
    to: '/moderation',
    icon: 'gavel',
    labelKey: 'nav.moderation',
    defaultLabel: 'Moderation queue',
  },
  { to: '/settings', icon: 'settings', labelKey: 'nav.settings', defaultLabel: 'Settings' },
]

export function DiscussionBoardsLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()

  const navAriaLabel = t('nav.primaryNavLabel', {}, { defaultValue: 'Forum navigation' })
  const drawerTitle = t('nav.drawerTitle', {}, { defaultValue: 'Menu' })
  const browseLabel = t('nav.browseHeader', {}, { defaultValue: 'Browse' })
  const manageLabel = t('common.manage', {}, { defaultValue: 'Manage' })

  // `NavLink` sets `aria-current="page"` on the active item itself.
  const renderNavItems = (items: NavItem[]): ReactElement => (
    <>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.fontWeight(isActive ? 'bold' : 'medium'),
              'rounded-lg text-sm transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
            )
          }
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden>
            {item.icon}
          </span>
          {t(item.labelKey, {}, { defaultValue: item.defaultLabel })}
        </NavLink>
      ))}
    </>
  )

  // The SAME nav sections for both surfaces — only the mounted breakpoint's
  // copy instantiates, so the links never duplicate in the DOM or the a11y
  // tree. The shell wraps them in its `<nav aria-label>` landmark.
  const navSections: ReactElement = (
    <>
      <div className={cm.cn(cm.stack(1))}>
        <p
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.sp('px', 3),
            cm.sp('mb', 2),
            'text-[10px] uppercase tracking-[0.25em] text-on-surface-variant',
          )}
        >
          {browseLabel}
        </p>
        {renderNavItems(PRIMARY_NAV)}
      </div>
      <div className={cm.cn(cm.stack(1), 'border-t border-outline-variant/30 pt-4')}>
        <p
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.sp('px', 3),
            cm.sp('mb', 2),
            'text-[10px] uppercase tracking-[0.25em] text-on-surface-variant',
          )}
        >
          {manageLabel}
        </p>
        {renderNavItems(SECONDARY_NAV)}
      </div>
    </>
  )

  // Below-nav community guidelines card + the relocated top-bar chrome
  // (theme toggle + user menu) — desktop sidebar footer only. The mobile
  // drawer never carried the card; its UserMenu lives in the mobileOnly
  // TopBar.
  const sidebarFooter: ReactElement = (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.w('full'))}>
      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }), cm.w('full'))}
      >
        <div className="text-on-surface-variant hover:text-on-surface transition-colors rounded-lg hover:bg-surface-container">
          <ThemeToggle />
        </div>
        <div className="text-on-surface-variant hover:text-on-surface transition-colors">
          <UserMenu />
        </div>
      </div>
      <div
        className={cm.cn(
          cm.sp('p', 4),
          cm.stack(2),
          'rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/15',
        )}
      >
        <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'text-primary')}>
          {t('nav.communityGuidelinesTitle', {}, { defaultValue: 'Community guidelines' })}
        </p>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t(
            'nav.communityGuidelinesBody',
            {},
            {
              defaultValue: 'Be considered. Quote sources. Mark solutions. Lift the conversation.',
            },
          )}
        </p>
      </div>
    </div>
  )

  // Brand block — mounted by the mobile TopBar AND the desktop Sidebar (never
  // simultaneously: the Sidebar is unmounted below 768px and the mobileOnly
  // TopBar returns null above it).
  const brand = <BrandWordmark />

  return (
    <ResponsiveAppShell sidebarWidth="md">
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={brand}
        actions={
          <>
            <div className="text-on-surface-variant hover:text-on-surface transition-colors rounded-lg hover:bg-surface-container">
              <ThemeToggle />
            </div>
            <div className="text-on-surface-variant hover:text-on-surface transition-colors">
              <UserMenu />
            </div>
          </>
        }
      />
      <ResponsiveAppShell.Sidebar
        navLabel={navAriaLabel}
        footer={sidebarFooter}
        className="p-4 gap-6"
      >
        <div className={cm.cn(cm.sp('px', 3), cm.sp('py', 1))}>{brand}</div>
        {navSections}
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer
        navLabel={navAriaLabel}
        header={
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('lg'),
              'tracking-tight text-on-surface',
            )}
          >
            {drawerTitle}
          </span>
        }
        className="p-4"
      >
        {navSections}
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content className="mx-auto w-full max-w-[1200px] px-4 py-8 md:px-8">
        <Outlet />
        <div className={cm.cn(cm.sp('mt', 12))}>
          <Footer />
        </div>
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

export default DiscussionBoardsLayout
