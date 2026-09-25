import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_ITEMS = [
  {
    to: '/library',
    key: 'library',
    icon: 'auto_stories',
    labelKey: 'nav.library',
    defaultLabel: 'Library',
  },
  {
    to: '/stats',
    key: 'stats',
    icon: 'show_chart',
    labelKey: 'versalLayout.nav.stats',
    defaultLabel: 'Stats',
  },
  {
    to: '/billing',
    key: 'billing',
    icon: 'card_membership',
    labelKey: 'settings.billing',
    defaultLabel: 'Billing',
  },
  {
    to: '/settings',
    key: 'settings',
    icon: 'settings',
    labelKey: 'nav.settings',
    defaultLabel: 'Settings',
  },
] as const

/** Versal's editorial brand face — Charter with serif fallbacks. */
const BRAND_FACE = 'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif'

/**
 * Sidebar shell for Versal's authenticated routes — the shared
 * `ResponsiveAppShell` (brand in the sidebar, `mobileOnly` top bar) with this
 * app's nav, brand face and user menu.
 *
 * The shared shell owns the breakpoint split: the Sidebar mounts only ≥768px,
 * the mobile Drawer (same nav element, full dialog contract — focus trap,
 * Escape/backdrop close, scroll lock, auto-close on navigation) only below
 * it, and the TopBar renders the menu trigger itself.
 *
 * Translated from ai-writing-studio's PlumeSidebarLayout (same editorial
 * cluster as note-taking's VersoLayout).
 */
export function VersalLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  // Single-active-item resolution: highlight the nav item whose `to` is the
  // longest prefix-match of the current pathname, so a document route
  // (/editor/<id>) keeps "Library" lit.
  const activeKey = NAV_ITEMS.reduce<string | null>((bestKey, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return bestKey
    if (bestKey === null) return item.key
    const best = NAV_ITEMS.find((i) => i.key === bestKey)
    return best && item.to.length > best.to.length ? item.key : bestKey
  }, null)

  // safeTarget: when a Link's destination matches the current path, append a
  // `#top` fragment so clicking still produces an observable URL change.
  const safeTarget = (to: string): string => {
    const samePath = pathname === to || pathname + '/' === to
    return samePath ? `${to.replace(/\/$/, '')}#top` : to
  }

  const navLabel = t('versalLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })

  // Brand mark — Charter serif. One element passed to both the `mobileOnly`
  // TopBar and the Sidebar; only the mounted breakpoint instantiates it.
  const brand = (
    <Link
      to={safeTarget('/library')}
      className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface truncate')}
      style={{ fontFamily: BRAND_FACE }}
    >
      {APP_NAME}
    </Link>
  )

  // ONE nav element for both breakpoints — the Sidebar and the Drawer receive
  // the same array, and only the mounted breakpoint instantiates it. The
  // drawer closes itself on navigation (shell-owned), so links carry no
  // onClick close.
  const navLinks = NAV_ITEMS.map((item) => {
    const isActive = item.key === activeKey
    return (
      <Link
        key={item.key}
        to={safeTarget(item.to)}
        data-mol-id={`nav-${item.key}`}
        aria-current={isActive ? 'page' : undefined}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          cm.roundedFull,
          'min-h-[44px]',
          isActive
            ? // The container pair, NOT a primary tint under brand-colored
              // text (contrast — see the shared SidebarLayout's rationale).
              cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
            : cm.cn(cm.textMuted, cm.link),
        )}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          {item.icon}
        </span>
        <span>{t(item.labelKey, {}, { defaultValue: item.defaultLabel })}</span>
      </Link>
    )
  })

  const navList = <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>{navLinks}</ul>

  return (
    <ResponsiveAppShell sidebarWidth="md">
      {/*
        Mobile top bar (< 768px): menu trigger (shell-rendered) + brand +
        user menu. The desktop shell has no top bar — the brand lives in the
        sidebar, as before.
      */}
      <ResponsiveAppShell.TopBar mobileOnly brand={brand} actions={<UserMenu />} />

      {/*
        Desktop sidebar (>= 768px): brand row leads the nav column — the
        shared Sidebar has no header slot, so it rides inside `children` —
        and the user menu sits in the footer slot, as SidebarLayout rendered
        it before.
      */}
      <ResponsiveAppShell.Sidebar
        navLabel={navLabel}
        className={cm.sp('p', 4)}
        footer={<UserMenu />}
      >
        <div className={cm.sp('mb', 6)}>{brand}</div>
        {navList}
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (< 768px): a full dialog panel (focus trap, Escape,
        backdrop click, body-scroll lock) over the same nav, with the brand
        in the header row.
      */}
      <ResponsiveAppShell.Drawer
        navLabel={navLabel}
        header={
          <span
            className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}
            style={{ fontFamily: BRAND_FACE }}
          >
            {APP_NAME}
          </span>
        }
        // The shared panel ships no height token (its content would size it);
        // `h-full` restores the full-height left-panel geometry the old
        // hand-rolled drawer had.
        className="h-full"
      >
        {navList}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

export default VersalLayout
