import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/home', key: 'home', defaultLabel: 'Home', icon: 'home' },
  { to: '/trending', key: 'trending', defaultLabel: 'Trending', icon: 'trending_up' },
  {
    to: '/subscriptions',
    key: 'subscriptions',
    defaultLabel: 'Subscriptions',
    icon: 'subscriptions',
  },
  { to: '/library', key: 'library', defaultLabel: 'Library', icon: 'video_library' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  { to: '/upload', key: 'upload', defaultLabel: 'Upload', icon: 'upload' },
  { to: '/studio', key: 'studio', defaultLabel: 'Creator studio', icon: 'analytics' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Signed-in shell for all Spool screens — the shared `ResponsiveAppShell`
 * composed once for both breakpoints. The TopBar mounts only below md (768px)
 * and renders the mobile menu trigger itself; the Sidebar mounts ≥768px
 * (brand row + nav + user card, the shape the shared `SidebarLayout` used to
 * render); the Drawer carries the SAME nav element below md under a full
 * dialog contract (focus trap, Escape/backdrop close, scroll lock,
 * auto-close on navigation). Only the mounted breakpoint instantiates the
 * nav, so nav `data-mol-id`s stay unique in the DOM. The shell owns the
 * breakpoint split, drawer open state, root direction, and trigger sizing —
 * no app-side shims.
 *
 * Spool nav vocabulary: Home / Trending / Subscriptions / Library / Search /
 * Upload / Studio / Notifications / Settings, with video-domain icons
 * (`subscriptions`, `video_library`, …).
 */
export function SpoolLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const navAriaLabel = t('spoolLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })

  // Longest prefix-match, so a video-detail route (/watch/<id>) keeps "Home"
  // lit and /playlist/<id> keeps "Library" lit.
  const activeKey = NAV_KEYS.reduce<string | null>((best, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return best
    if (best === null) return item.key
    const bestItem = NAV_KEYS.find((i) => i.key === best)
    return bestItem && item.to.length > bestItem.to.length ? item.key : best
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
              to={item.to}
              data-mol-id={`nav-${item.key}`}
              aria-current={isActive ? 'page' : undefined}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                cm.roundedFull,
                isActive
                  ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
                  : cm.cn(cm.textMuted, cm.link),
              )}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {item.icon}
              </span>
              <span>
                {t(`spoolLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )

  return (
    <ResponsiveAppShell sidebarWidth="md">
      {/* Mobile-only top bar (< md): trigger (shell-rendered) + brand + user
          menu. The desktop keeps its sidebar brand row, so the bar mounts
          nowhere else. */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={
          <Link to="/home" className={cm.cn('min-w-0')}>
            <BrandWordmark as="span" size="sm" />
          </Link>
        }
        actions={<UserMenu />}
      />

      {/* Desktop sidebar (≥768px). The shared Sidebar has no header slot, so
          the brand row rides inside children, above the nav list. */}
      <ResponsiveAppShell.Sidebar
        navLabel={navAriaLabel}
        className={cm.sp('p', 4)}
        footer={<UserMenu />}
      >
        <Link to="/home" className={cm.cn(cm.sp('mb', 6))}>
          <BrandWordmark as="span" />
        </Link>
        {nav}
      </ResponsiveAppShell.Sidebar>

      {/* Mobile drawer (< md): full-height dialog panel over the same nav,
          brand in the header row, close button shell-rendered. The theme
          toggle keeps its old drawer-footer home. */}
      <ResponsiveAppShell.Drawer
        navLabel={navAriaLabel}
        className={cm.cn('h-full', cm.sp('p', 4))}
        header={<BrandWordmark as="span" />}
        footer={<ThemeToggle />}
      >
        {nav}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content className="overflow-y-auto bg-background">
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
