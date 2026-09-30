import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/talk', key: 'talk', defaultLabel: 'Talk', icon: 'graphic_eq' },
  { to: '/trips', key: 'trips', defaultLabel: 'Trips', icon: 'flight_takeoff' },
  { to: '/bills', key: 'bills', defaultLabel: 'Bills', icon: 'call_split' },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
  { to: '/settings/billing', key: 'billing', defaultLabel: 'Billing', icon: 'credit_card' },
] as const

interface NavItem {
  to: string
  key: string
  icon: string
  label: string
}

function useNavItems(): NavItem[] {
  const { t } = useTranslation()
  return NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`parlanceLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
}

/** True at the `md` breakpoint and up — where the shared sidebar fits. */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true
    return window.matchMedia('(min-width: 768px)').matches
  })
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

function isActive(pathname: string, to: string): boolean {
  // Same longest-prefix rule the shared sidebar uses: /settings/billing is
  // active while on it, /settings is not active ON /settings/billing.
  if (to === pathname) return true
  return pathname.startsWith(to + '/')
}

/**
 * ParlanceLayout — shell for all authed routes.
 *
 * Two shapes, one nav set (Talk / Trips / Bills / Profile / Settings / Billing):
 *   - md+ (768px and up): the shared `SidebarLayout` with the Wayfarer nav set.
 *     Brand link points back to `/talk` so the active surface is
 *     always one tap away.
 *   - below md: a template-local mobile shell — a sticky top bar (brand +
 *     hamburger + user menu) and a slide-in drawer with the same nav. The
 *     shared sidebar has no mobile collapse; rendering it at 390px crushed
 *     every page to ~40% width, so the fleet pattern (top bar + drawer)
 *     lives here.
 */
export function ParlanceLayout() {
  const { t } = useTranslation()
  const navItems = useNavItems()
  const isDesktop = useIsDesktop()

  if (isDesktop) {
    return (
      <SidebarLayout
        appName={APP_NAME}
        logoTo="/talk"
        navItems={navItems}
        // Styled host for the shared control — bare, it reads as an unstyled
        // browser widget in the shared shell's bordered footer row. The
        // trigger sits at the sidebar's bottom-LEFT, so the drawer opens
        // from the left (`side="left"`), adjacent to it.
        userMenu={
          <div className="w-full text-on-surface-variant hover:text-on-surface transition-colors">
            <UserMenu side="left" />
          </div>
        }
        navAriaLabel={t(
          'parlanceLayout.primaryNavLabel',
          {},
          { defaultValue: 'Primary navigation' },
        )}
      />
    )
  }
  return <MobileShell navItems={navItems} />
}

function MobileShell({ navItems }: { navItems: NavItem[] }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Any navigation closes the drawer — same contract the shared UserMenu
  // drawer honors ("closes on any route change, back/forward included").
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // Escape closes the drawer; focus returns to the hamburger so keyboard
  // users are not stranded behind the overlay.
  useEffect(() => {
    if (!drawerOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setDrawerOpen(false)
        document.getElementById('wayfarer-mobile-nav-toggle')?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [drawerOpen])

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-h-screen bg-background')}>
      <header
        data-mol-id="mobile-top-bar"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          'sticky top-0 z-40 h-14 shrink-0 border-b border-border bg-background/90 px-3 backdrop-blur-md',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'min-w-0')}>
          <button
            id="wayfarer-mobile-nav-toggle"
            type="button"
            aria-label={t('parlanceLayout.openMenu', {}, { defaultValue: 'Open navigation menu' })}
            aria-expanded={drawerOpen}
            aria-controls="wayfarer-mobile-drawer"
            data-mol-id="mobile-nav-toggle"
            onClick={() => setDrawerOpen(true)}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'h-11 w-11 shrink-0 text-foreground hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
            )}
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>
          <Link
            to="/talk"
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('lg'),
              'min-w-0 truncate tracking-tight text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded px-1',
            )}
          >
            <BrandWordmark as="span" size="sm" />
          </Link>
        </div>
        <UserMenu />
      </header>

      <main className={cm.cn(cm.flex1, 'min-w-0')}>
        <Outlet />
      </main>

      {drawerOpen ? (
        <div className={cm.cn('fixed inset-0 z-50 md:hidden')}>
          {/* Full-screen dismiss layer: a real button so tap-outside and
              keyboard focus both close the drawer without mouse-only
              handlers. */}
          <button
            type="button"
            data-mol-id="mobile-drawer-backdrop"
            aria-label={t('parlanceLayout.closeMenu', {}, { defaultValue: 'Close menu' })}
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-black/40 backdrop-blur-sm"
          />
          <nav
            id="wayfarer-mobile-drawer"
            aria-label={t(
              'parlanceLayout.primaryNavLabel',
              {},
              { defaultValue: 'Primary navigation' },
            )}
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              cm.stack(1),
              'absolute inset-y-0 left-0 w-[280px] max-w-[82vw] overflow-y-auto border-r border-border bg-background p-3 shadow-2xl',
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'px-2 py-2')}>
              <BrandWordmark as="span" size="sm" />
              <button
                type="button"
                aria-label={t('parlanceLayout.closeMenu', {}, { defaultValue: 'Close menu' })}
                data-mol-id="mobile-nav-close"
                onClick={() => setDrawerOpen(false)}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.roundedFull,
                  'h-11 w-11 text-foreground hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                )}
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>
            {navItems.map((item) => {
              const active = isActive(pathname, item.to)
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  data-mol-id={`mobile-nav-${item.key}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.fontWeight('medium'),
                    cm.sp('px', 3),
                    'min-h-[44px] rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                    active
                      ? 'bg-primary/15 text-primary'
                      : 'text-foreground hover:bg-surface-secondary',
                  )}
                >
                  <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      ) : null}
    </div>
  )
}
