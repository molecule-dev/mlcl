import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { useMediaQuery } from '../lib/useMediaQuery.js'
import { UserMenu } from './UserMenu.js'

/**
 * Lucid app shell — two template-local shapes behind one route outlet:
 *
 * - Desktop (≥768px): the shared SidebarLayout, same shell pattern as
 *   habit-tracker/StreakLayout and health-records/MeridianLayout, with nav
 *   targets matched to mental-health-journal's screen-map.json.
 * - Mobile (<768px): the shared sidebar has no collapse, so at phone widths it
 *   would leave ~150px for content. The mobile shell is a sticky top bar
 *   (brand + UserMenu + hamburger drawer) — a fleet pattern, kept
 *   template-local until the shared shell grows a breakpoint.
 *
 * Exactly one shell mounts at a time (media-query hook, not CSS-hiding), so
 * pages fetch once and `<Outlet />` never renders two route trees.
 */

const NAV_KEYS = [
  { to: '/home', key: 'home', defaultLabel: 'Today', icon: 'today' },
  { to: '/journal', key: 'journal', defaultLabel: 'Journal', icon: 'menu_book' },
  { to: '/insights', key: 'insights', defaultLabel: 'Insights', icon: 'insights' },
  { to: '/calendar', key: 'calendar', defaultLabel: 'Calendar', icon: 'calendar_month' },
  { to: '/prompts', key: 'prompts', defaultLabel: 'Prompts', icon: 'lightbulb' },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'account_circle' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
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
    label: t(`mentalHealthJournalLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
}

function MobileShell({ navItems }: { navItems: NavItem[] }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Close the drawer whenever the route changes (nav link tap) and on Escape.
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const activeKey = navItems.reduce<string | null>((best, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return best
    if (best === null) return item.key
    const bestItem = navItems.find((i) => i.key === best)
    return bestItem && item.to.length > bestItem.to.length ? item.key : best
  }, null)

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <header
        className={cm.cn(
          'sticky top-0 z-40 bg-surface/95 backdrop-blur border-b border-outline-variant',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'h-14 px-3')}>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'min-w-0')}>
            <button
              type="button"
              onClick={() => setDrawerOpen((open) => !open)}
              aria-expanded={drawerOpen}
              aria-controls="mobile-primary-nav"
              aria-label={
                drawerOpen
                  ? t('mentalHealthJournalLayout.closeMenu', {}, { defaultValue: 'Close menu' })
                  : t('mentalHealthJournalLayout.openMenu', {}, { defaultValue: 'Open menu' })
              }
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'w-11 h-11 shrink-0 rounded-full text-on-surface bg-transparent hover:bg-surface-container transition-colors',
              )}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {drawerOpen ? 'close' : 'menu'}
              </span>
            </button>
            <Link
              to="/home"
              className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'truncate')}
            >
              <BrandWordmark as="span" size="sm" />
            </Link>
          </div>
          <div className={cm.flex({ align: 'center' })}>
            <UserMenu />
          </div>
        </div>

        {drawerOpen ? (
          <>
            {/* Overlay closes the drawer on outside tap; button inside handles AT. */}
            <button
              type="button"
              aria-label={t(
                'mentalHealthJournalLayout.closeMenu',
                {},
                { defaultValue: 'Close menu' },
              )}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 top-14 z-30 bg-black/20"
            />
            <nav
              id="mobile-primary-nav"
              aria-label={t(
                'mentalHealthJournalLayout.primaryNavLabel',
                {},
                { defaultValue: 'Primary navigation' },
              )}
              className={cm.cn(
                'absolute left-0 right-0 top-14 z-40 bg-surface shadow-lg border-b border-outline-variant',
                cm.sp('p', 2),
              )}
            >
              <ul className="space-y-1">
                {navItems.map((item) => {
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
                          'min-h-[44px] text-base rounded-xl',
                          cm.fontWeight('medium'),
                          isActive
                            ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
                            : cm.cn(cm.textMuted, cm.link),
                        )}
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </>
        ) : null}
      </header>

      <main className="min-w-0">
        <Outlet />
      </main>
    </div>
  )
}

export function MentalHealthJournalLayout() {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const { t } = useTranslation()
  const navItems = useNavItems()

  if (!isDesktop) return <MobileShell navItems={navItems} />

  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/home"
      navItems={navItems}
      userMenu={<UserMenu />}
      navAriaLabel={t(
        'mentalHealthJournalLayout.primaryNavLabel',
        {},
        { defaultValue: 'Primary navigation' },
      )}
      sidebarWidthClass="w-60"
    />
  )
}
