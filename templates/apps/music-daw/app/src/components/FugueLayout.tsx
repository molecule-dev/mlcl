import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { TransportBar } from './TransportBar.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Studio', icon: 'home' },
  { to: '/projects', key: 'projects', defaultLabel: 'Projects', icon: 'folder' },
  { to: '/samples', key: 'samples', defaultLabel: 'Samples', icon: 'library_music' },
  { to: '/profile/me', key: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Vertical-sidebar studio shell on the shared <ResponsiveAppShell />. The
 * shell owns the breakpoint split: the Sidebar mounts only ≥768px, the
 * mobile Drawer (SAME nav element, full APG dialog contract) only below it,
 * and the mobile-only TopBar renders the menu trigger itself — the former
 * template-local hamburger, drawer state, escape handler and useMediaQuery
 * hook are deleted with the old two-shell split.
 *
 * Reserves space at the bottom of `Content` for the fixed <TransportBar />
 * (DAW play/stop/record + BPM + timecode) so page content never disappears
 * under the transport. Pages keep owning their own padding.
 *
 * Translated from music-streaming's ReverbLayout.tsx (sidebar + NowPlayingBar
 * dock pattern), with DAW-specific nav (Studio, Projects, Samples, Mixer,
 * Settings) and the transport-bar slot.
 */
export function FugueLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const navAriaLabel = t('fugueLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })

  // ONE nav element for `Sidebar` (≥768px) and `Drawer` (<768px) — the shell
  // closes the drawer on navigation, so only the mounted breakpoint
  // instantiates it and nav `data-mol-id`s stay unique in the DOM.
  const nav = (
    <>
      {NAV_KEYS.map((item) => {
        const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`)
        return (
          <Link
            key={item.key}
            to={item.to}
            data-mol-id={`nav-${item.key}`}
            aria-current={isActive ? 'page' : undefined}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              'min-h-[44px] rounded-xl text-sm font-medium transition-colors',
              isActive
                ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
                : cm.cn(cm.textMuted, cm.link),
            )}
          >
            {item.icon ? (
              <span className="material-symbols-outlined" aria-hidden="true">
                {item.icon}
              </span>
            ) : null}
            <span>{t(`fugueLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}</span>
          </Link>
        )
      })}
    </>
  )

  return (
    <>
      <ResponsiveAppShell sidebarWidth="md">
        {/* Mobile-only top bar (<768px): trigger (shell-rendered) + brand +
            avatar user menu. The desktop keeps its sidebar brand row, so the
            bar mounts nowhere else. */}
        <ResponsiveAppShell.TopBar
          mobileOnly
          brand={
            <Link to="/dashboard" className="truncate">
              <BrandWordmark as="span" size="sm" />
            </Link>
          }
          actions={<UserMenu />}
        />

        {/* Desktop sidebar (≥768px). The shared Sidebar has no header slot,
            so the brand row rides inside children, above the nav list. */}
        <ResponsiveAppShell.Sidebar
          navLabel={navAriaLabel}
          className={cm.sp('p', 4)}
          footer={<UserMenu side="left" />}
        >
          <Link to="/dashboard" className={cm.cn(cm.sp('mb', 6), cm.displayBlock)}>
            <BrandWordmark as="span" />
          </Link>
          {nav}
        </ResponsiveAppShell.Sidebar>

        {/* Mobile drawer (<768px): full-height dialog panel over the same
            nav, brand in the header row, close button shell-rendered. */}
        <ResponsiveAppShell.Drawer
          navLabel={navAriaLabel}
          className={cm.cn('h-full', cm.sp('p', 4))}
          header={
            <span>
              <BrandWordmark as="span" size="sm" />
            </span>
          }
        >
          {nav}
        </ResponsiveAppShell.Drawer>

        {/* Pages own their padding; this offset only keeps the last rows
            clear of the fixed TransportBar. */}
        <ResponsiveAppShell.Content className="pb-[72px]">
          <Outlet />
        </ResponsiveAppShell.Content>
      </ResponsiveAppShell>
      <TransportBar />
    </>
  )
}
