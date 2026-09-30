import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { NowPlayingBar } from './NowPlayingBar.js'
import { MobileUserMenu, UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/home', key: 'home', defaultLabel: 'Home', icon: 'home' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  { to: '/library', key: 'library', defaultLabel: 'Your library', icon: 'library_music' },
  { to: '/library/liked', key: 'liked', defaultLabel: 'Liked songs', icon: 'favorite' },
  { to: '/radio', key: 'radio', defaultLabel: 'Radio', icon: 'radio' },
  { to: '/now-playing', key: 'nowPlaying', defaultLabel: 'Now playing', icon: 'graphic_eq' },
  { to: '/queue', key: 'queue', defaultLabel: 'Queue', icon: 'queue_music' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/subscription', key: 'subscription', defaultLabel: 'Subscription', icon: 'credit_card' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Append `#top` to a Link target when it matches the current pathname so
 * clicking a same-route link (active nav item, brand) still produces an
 * observable URL change.
 */
function safeTarget(to: string, pathname: string): string {
  const samePath = pathname === to || pathname + '/' === to
  return samePath ? `${to.replace(/\/$/, '')}#top` : to
}

/**
 * Signed-in shell — the shared `ResponsiveAppShell` composed once for both
 * breakpoints: the TopBar mounts only below md (768px) and renders the mobile
 * menu trigger itself; the Sidebar mounts ≥768px (brand row + nav + user
 * card, the shape the shared `SidebarLayout` used to render); the Drawer
 * carries the SAME nav element below md under a full dialog contract (focus
 * trap, Escape/backdrop close, scroll lock, auto-close on navigation). Only
 * the mounted breakpoint instantiates the nav, so nav `data-mol-id`s stay
 * unique in the DOM. The shell owns the breakpoint split, drawer open state,
 * root direction, and trigger sizing — no app-side shims.
 *
 * The fixed NowPlayingBar still docks to the bottom on both breakpoints;
 * `Content` reserves the matching offset (96px mobile / 88px desktop).
 */
export function ReverbLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const navAriaLabel = t('reverbLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })

  // Single-active-item resolution: highlight the nav item whose `to` is the
  // longest prefix-match of the current pathname — `/library/liked` never
  // lights up `/library` too.
  const activeKey = NAV_KEYS.reduce<string | null>((bestKey, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return bestKey
    if (bestKey === null) return item.key
    const best = NAV_KEYS.find((i) => i.key === bestKey)
    return best && item.to.length > best.to.length ? item.key : bestKey
  }, null)

  // ONE nav element for `Sidebar` (≥768px) and `Drawer` (<768px) — the shell
  // closes the drawer on navigation, so links carry no onClick close.
  const nav = (
    <ul className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(1))}>
      {NAV_KEYS.map((item) => {
        const isActive = item.key === activeKey
        return (
          <li key={item.key}>
            <Link
              to={safeTarget(item.to, pathname)}
              data-mol-id={`nav-${item.key}`}
              aria-current={isActive ? 'page' : undefined}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'min-h-[44px] rounded-lg',
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
              <span>
                {t(`reverbLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )

  return (
    <>
      <ResponsiveAppShell sidebarWidth="md">
        {/* Mobile-only top bar (< md): trigger (shell-rendered) + brand +
            avatar user menu. The desktop keeps its sidebar brand row, so the
            bar mounts nowhere else. */}
        <ResponsiveAppShell.TopBar
          mobileOnly
          brand={
            <Link to={safeTarget('/home', pathname)} className="truncate">
              <BrandWordmark as="span" size="sm" />
            </Link>
          }
          actions={<MobileUserMenu />}
        />

        {/* Desktop sidebar (≥768px). The shared Sidebar has no header slot,
            so the brand row rides inside children, above the nav list. */}
        <ResponsiveAppShell.Sidebar
          navLabel={navAriaLabel}
          className={cm.sp('p', 4)}
          footer={<UserMenu />}
        >
          <Link
            to={safeTarget('/home', pathname)}
            className={cm.cn(cm.sp('mb', 6), cm.displayBlock)}
          >
            <BrandWordmark as="span" />
          </Link>
          {nav}
        </ResponsiveAppShell.Sidebar>

        {/* Mobile drawer (< md): full-height dialog panel over the same nav,
            brand in the header row, close button shell-rendered. */}
        <ResponsiveAppShell.Drawer
          navLabel={navAriaLabel}
          className={cm.cn('h-full', cm.sp('p', 4))}
          header={
            <span>
              <BrandWordmark as="span" size="lg" />
            </span>
          }
        >
          {nav}
        </ResponsiveAppShell.Drawer>

        {/* Pages own their padding; this offset only keeps the last rows
            clear of the fixed NowPlayingBar (96px mobile / 88px desktop). */}
        <ResponsiveAppShell.Content className="pb-[96px] md:pb-[88px]">
          <Outlet />
        </ResponsiveAppShell.Content>
      </ResponsiveAppShell>
      <NowPlayingBar />
    </>
  )
}
