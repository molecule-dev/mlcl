import { Link, Outlet, useLocation } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell, useIsDesktop } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

interface NavItem {
  to: string
  key: string
  defaultLabel: string
  icon: string
}

const PRIMARY_NAV: ReadonlyArray<NavItem> = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/discover', key: 'discover', defaultLabel: 'Discover', icon: 'explore' },
  { to: '/campaign/new', key: 'newCampaign', defaultLabel: 'New campaign', icon: 'add_circle' },
  { to: '/backers', key: 'backers', defaultLabel: 'Backers', icon: 'group' },
  { to: '/my-pledges', key: 'myPledges', defaultLabel: 'My pledges', icon: 'favorite' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
]

/**
 * Dark navy creator-studio shell — the shared `ResponsiveAppShell`
 * (`@molecule/app-ui-react`) composed to DESIGN.md's "Dashboard Sidebar
 * Navigation": the navy rail (brand + eyebrow, nav with the 4px primary
 * active border, profile card in the footer row) on ≥768px, and the same
 * rail as a slide-in dialog drawer below it (focus trap, Escape/backdrop
 * close, body scroll lock, auto-close on navigation, trigger rendered by
 * the always-mounted top bar itself).
 *
 * The former hand-rolled fixed sidebar, `lg:ml-[260px]` flow hack and the
 * `CreatorMobileNav` bottom tab bar are deleted with it — one chrome per
 * breakpoint, and the fleet-standard 768px breakpoint replaces the old
 * 1024px fencepost. The top bar keeps its old both-breakpoints role
 * (brand + section label on the left, theme toggle + user menu on the
 * right) via the shell's `md:flex-wrap` + `w-full` pattern; the mobile
 * brand vs desktop section-label swap is MOUNT-conditioned with
 * `useIsDesktop()`, never CSS-hidden.
 *
 * data-mol-id discipline: `creator-shell`, `sidebar-profile-link` and every
 * `creator-nav-*` id are preserved. The sidebar and the drawer receive the
 * SAME `nav` element, and only the mounted breakpoint instantiates it, so
 * ids are never duplicated; the shell's `shell-drawer-open` / `shell-drawer`
 * ids replace the former `creator-mobile-nav` / `mobile-nav-*` ids.
 */
export function CreatorSidebarLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth()
  const { pathname } = useLocation()
  const isDesktop = useIsDesktop()
  const userEmail = (user as { email?: string } | null)?.email ?? ''
  const userId = (user as { id?: string } | null)?.id
  const userInitial = userEmail.charAt(0).toUpperCase() || 'C'
  // Top-bar section label — the matching nav item's (translated) label, or
  // the first path segment (never raw ids like "campaign/<uuid>/manage").
  const firstSegment = pathname.split('/')[1] || 'dashboard'
  const activeNav =
    PRIMARY_NAV.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`)) ??
    PRIMARY_NAV.find((item) => item.to === `/${firstSegment}`)

  // Single-active-item resolution: highlight the nav item whose `to` is the
  // longest prefix-match of the current pathname (never every ancestor).
  const activeTo = PRIMARY_NAV.reduce<string | null>((best, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return best
    if (best === null || item.to.length > best.length) return item.to
    return best
  }, null)

  // Same-route clicks append `#top` so the URL still changes (no dead links).
  const safeTarget = (to: string): string => {
    const samePath = pathname === to || pathname + '/' === to
    return samePath ? `${to.replace(/\/$/, '')}#top` : to
  }

  const navAriaLabel = t('creatorSidebar.label', {}, { defaultValue: 'Creator navigation' })

  // ONE nav element for both breakpoints — the Sidebar and the Drawer receive
  // the same element, and only the mounted breakpoint instantiates it. The
  // drawer closes itself on navigation (shell-owned), so links carry no
  // onClick close. No <nav> wrapper here — the shell's Sidebar/Drawer
  // already wrap children in the nav landmark.
  const nav = (
    <div className={cm.cn(cm.flex1, cm.sp('p', 4), cm.stack(1), 'overflow-y-auto')}>
      {PRIMARY_NAV.map((item) => {
        const isActive = item.to === activeTo
        return (
          <Link
            key={item.key}
            to={safeTarget(item.to)}
            data-mol-id={`creator-nav-${item.key}`}
            aria-current={isActive ? 'page' : undefined}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'min-h-[44px] rounded-lg transition-colors',
              isActive ? 'text-white' : 'text-white/70 hover:text-white hover:bg-surface/5',
            )}
            style={{
              backgroundColor: isActive
                ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)'
                : 'transparent',
              borderLeft: isActive ? '4px solid var(--color-primary)' : '4px solid transparent',
              marginLeft: isActive ? '-4px' : undefined,
              paddingLeft: isActive ? '12px' : undefined,
            }}
          >
            <span
              className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
              aria-hidden="true"
            >
              {item.icon}
            </span>
            <span>
              {t(`creatorSidebar.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
            </span>
          </Link>
        )
      })}
    </div>
  )

  // Sidebar/drawer footer — the profile card that closed the old rail.
  const profileCard = (
    <Link
      to={userId ? `/profile/${userId}` : '/settings'}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('p', 2),
        'w-full min-w-0 rounded-lg bg-surface/5 hover:bg-surface/10 transition-colors',
      )}
      aria-label={t('creatorSidebar.viewProfile', {}, { defaultValue: 'View your profile' })}
      data-mol-id="sidebar-profile-link"
    >
      <div
        className={cm.cn(
          cm.w(9),
          cm.h(9),
          cm.roundedFull,
          cm.flex({ align: 'center', justify: 'center' }),
          cm.fontWeight('bold'),
          'shrink-0 text-white',
        )}
        style={{
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
        }}
      >
        {userInitial}
      </div>
      <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0')}>
        <span
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-white truncate')}
        >
          {userEmail || t('creatorSidebar.guest', {}, { defaultValue: 'Creator' })}
        </span>
        <span className="text-[11px] uppercase tracking-widest text-white/40">
          {t('creatorSidebar.role', {}, { defaultValue: 'Creator' })}
        </span>
      </div>
    </Link>
  )

  return (
    <ResponsiveAppShell
      sidebarWidth="lg"
      dataMolId="creator-shell"
      // md:flex-wrap + the TopBar's w-full keep the always-mounted bar on
      // its own full-width row above [Sidebar, Content] on desktop (the
      // documented Clarion/Rapport pattern). Desktop-only: a wrapping
      // flex-COLUMN (mobile) would split tall content across wrap lines.
      className="md:flex-wrap"
    >
      {/*
        Top bar (both breakpoints, full-width row on desktop): brand on
        mobile / the active-section label on desktop (mount-conditioned via
        useIsDesktop — never CSS-hidden), theme toggle + user menu on both.
        The shell renders the 44px menu trigger itself below 768px.
      */}
      <ResponsiveAppShell.TopBar
        className="w-full"
        brand={
          isDesktop ? (
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {activeNav
                ? t(
                    `creatorSidebar.nav.${activeNav.key}`,
                    {},
                    { defaultValue: activeNav.defaultLabel },
                  )
                : firstSegment}
            </p>
          ) : (
            <Link to={safeTarget('/dashboard')} className="min-w-0 truncate">
              <BrandWordmark as="span" size="sm" />
            </Link>
          )
        }
        actions={
          <>
            <ThemeToggle />
            <UserMenu />
          </>
        }
      />

      {/*
        Desktop sidebar (≥768px): the navy rail — brand + eyebrow, nav,
        profile card in the bordered footer row.
      */}
      <ResponsiveAppShell.Sidebar
        navLabel={navAriaLabel}
        className="bg-[linear-gradient(180deg,var(--color-secondary),var(--color-secondary-hover))]"
        footer={profileCard}
      >
        <Link
          to={safeTarget('/dashboard')}
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ direction: 'col', gap: 'xs' }),
            'border-b border-surface/10',
          )}
        >
          <BrandWordmark as="span" invert />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
            {t('creatorSidebar.eyebrow', {}, { defaultValue: 'Creator Studio' })}
          </span>
        </Link>
        {nav}
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (<768px): the same navy rail as a full dialog panel
        (focus trap, Escape, backdrop click, body-scroll lock) over the SAME
        nav. `h-full` restores the full-height left-panel geometry.
      */}
      <ResponsiveAppShell.Drawer
        navLabel={navAriaLabel}
        className={cm.cn(
          'h-full bg-[linear-gradient(180deg,var(--color-secondary),var(--color-secondary-hover))]',
        )}
        header={
          <div className="min-w-0">
            <BrandWordmark as="span" size="sm" invert />
          </div>
        }
        footer={profileCard}
      >
        {nav}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

export default CreatorSidebarLayout
