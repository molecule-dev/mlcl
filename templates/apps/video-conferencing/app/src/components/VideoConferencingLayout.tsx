/**
 * Convoke shell layout.
 *
 * Desktop (>= md): fixed left side-nav (260px) + sticky frosted topbar with
 * search + theme toggle + user menu, and a scrollable main column.
 * Mobile (< md): the shared-sidebar pattern eats two thirds of the viewport,
 * so a template-local shell swaps in a sticky top bar + hamburger drawer
 * (scrim, Escape-to-close, auto-close on navigation, 44px targets).
 *
 * Translated from team-chat's SideNavBar + dashboard shell, adapted for
 * video-conferencing's information architecture (Dashboard / Schedule /
 * Recordings / Notifications / Team / Settings / Billing).
 */
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const NAV_ITEMS: ReadonlyArray<{ to: string; icon: string; key: string; defaultLabel: string }> = [
  { to: '/dashboard', icon: 'dashboard', key: 'nav.dashboard', defaultLabel: 'Dashboard' },
  { to: '/schedule', icon: 'event', key: 'nav.schedule', defaultLabel: 'Schedule' },
  { to: '/recordings', icon: 'play_circle', key: 'nav.recordings', defaultLabel: 'Recordings' },
  {
    to: '/notifications',
    icon: 'notifications',
    key: 'nav.notifications',
    defaultLabel: 'Notifications',
  },
  { to: '/team-members', icon: 'groups', key: 'nav.team', defaultLabel: 'Team' },
]

const FOOTER_NAV: ReadonlyArray<{ to: string; icon: string; key: string; defaultLabel: string }> = [
  { to: '/settings', icon: 'settings', key: 'nav.settings', defaultLabel: 'Settings' },
  { to: '/billing', icon: 'credit_card', key: 'nav.billing', defaultLabel: 'Billing' },
]

function navLinkClass(cm: ReturnType<typeof getClassMap>, isActive: boolean): string {
  return cm.cn(
    cm.flex({ align: 'center', gap: 3 }),
    cm.sp('px', 3),
    cm.sp('py', 2),
    cm.textSize('sm'),
    cm.fontWeight('medium'),
    'rounded-lg transition-colors',
    isActive
      ? 'bg-primary-container/30 text-primary font-semibold'
      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
  )
}

export function VideoConferencingLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')
  const [pageTitle, setPageTitle] = useState<string>('')
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    const match = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to))
    setPageTitle(match ? t(match.key, {}, { defaultValue: match.defaultLabel }) : APP_NAME)
  }, [location.pathname, t])

  // Any navigation closes the mobile drawer.
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // Escape closes the drawer.
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        'lg:flex-row',
        cm.minH('screen'),
        'bg-surface-container-lowest',
      )}
    >
      {/* ——— Mobile top bar (< md) ——— */}
      <header
        data-testid="layout-topbar"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          'sticky top-0 z-40 h-14 shrink-0 border-b border-outline-variant/40 bg-surface/90 backdrop-blur-xl lg:hidden',
        )}
      >
        <button
          type="button"
          onClick={() => setDrawerOpen((o) => !o)}
          aria-label={t('nav.menu', {}, { defaultValue: 'Menu' })}
          aria-expanded={drawerOpen}
          aria-controls="mobile-nav-drawer"
          data-testid="layout-drawer-toggle"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'h-11 w-11 shrink-0 rounded-full text-on-surface hover:bg-surface-container',
          )}
        >
          <span
            className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
            aria-hidden="true"
          >
            {drawerOpen ? 'close' : 'menu'}
          </span>
        </button>
        <Link to="/dashboard" className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary shadow-md shadow-primary/30',
            )}
          >
            <span className={'material-symbols-outlined text-[18px] text-on-primary'}>
              videocam
            </span>
          </div>
          <span
            className={cm.cn(cm.textSize('base'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {APP_NAME}
          </span>
        </Link>
        <UserMenu />
      </header>

      {/* ——— Mobile drawer (< md) ——— */}
      {drawerOpen ? (
        <div className={cm.cn('lg:hidden')} data-testid="layout-drawer">
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label={t('nav.closeMenu', {}, { defaultValue: 'Close menu' })}
            data-testid="layout-drawer-scrim"
            className={cm.cn('fixed inset-0 z-40 cursor-default bg-black/50 backdrop-blur-sm')}
          />
          <aside
            id="mobile-nav-drawer"
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'fixed left-0 top-14 bottom-0 z-40 w-72 overflow-y-auto bg-surface shadow-2xl',
            )}
          >
            <div className={cm.cn(cm.sp('p', 4))}>
              <button
                type="button"
                onClick={() => navigate('/schedule')}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 2 }),
                  cm.sp('px', 4),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'w-full py-3 rounded-lg text-on-primary bg-gradient-to-r from-primary to-secondary shadow-md shadow-primary/25 transition-all active:scale-95',
                )}
              >
                <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>add</span>
                {t('nav.newMeeting', {}, { defaultValue: 'New meeting' })}
              </button>
            </div>
            <nav className={cm.cn(cm.flex1, cm.sp('px', 3), cm.sp('pb', 4), cm.stack(1))}>
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => navLinkClass(cm, isActive)}
                >
                  <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>
                    {item.icon}
                  </span>
                  <span>{t(item.key, {}, { defaultValue: item.defaultLabel })}</span>
                </NavLink>
              ))}
            </nav>
            <div
              className={cm.cn(
                cm.sp('p', 3),
                cm.sp('pb', 6),
                cm.stack(1),
                'border-t border-outline-variant/40',
              )}
            >
              {FOOTER_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => navLinkClass(cm, isActive)}
                >
                  <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>
                    {item.icon}
                  </span>
                  <span>{t(item.key, {}, { defaultValue: item.defaultLabel })}</span>
                </NavLink>
              ))}
            </div>
          </aside>
        </div>
      ) : null}

      {/* ——— Desktop side-nav (>= md) ——— */}
      <aside
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'hidden lg:flex fixed left-0 top-0 h-screen w-[260px] bg-surface border-r border-outline-variant/40 z-40',
        )}
      >
        <Link
          to="/dashboard"
          className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('p', 6))}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/30',
            )}
          >
            <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined text-on-primary')}>
              videocam
            </span>
          </div>
          <div>
            <h1
              className={cm.cn(
                cm.textSize('xl'),
                'font-extrabold tracking-tight leading-none text-on-surface',
              )}
            >
              {APP_NAME}
            </h1>
            <p
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.sp('mt', 1),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('nav.organization', {}, { defaultValue: 'Acme Workspace' })}
            </p>
          </div>
        </Link>
        <div className={cm.cn(cm.sp('px', 4), cm.sp('mb', 4))}>
          <button
            type="button"
            onClick={() => navigate('/schedule')}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 2 }),
              cm.sp('px', 4),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'w-full py-2.5 rounded-lg text-on-primary bg-gradient-to-r from-primary to-secondary shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/40 transition-all active:scale-95',
            )}
          >
            <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>add</span>
            {t('nav.newMeeting', {}, { defaultValue: 'New meeting' })}
          </button>
        </div>
        <nav className={cm.cn(cm.flex1, cm.sp('px', 3), cm.stack(1), 'overflow-y-auto')}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => navLinkClass(cm, isActive)}
            >
              <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>
                {item.icon}
              </span>
              <span>{t(item.key, {}, { defaultValue: item.defaultLabel })}</span>
            </NavLink>
          ))}
        </nav>
        <div className={cm.cn(cm.sp('p', 3), cm.stack(1), 'border-t border-outline-variant/40')}>
          {FOOTER_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => navLinkClass(cm, isActive)}
            >
              <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>
                {item.icon}
              </span>
              <span>{t(item.key, {}, { defaultValue: item.defaultLabel })}</span>
            </NavLink>
          ))}
        </div>
      </aside>

      <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'lg:ml-[260px] min-h-screen')}>
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 8),
            'sticky top-0 z-30 hidden lg:flex h-14 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/40',
          )}
        >
          <div className={cm.flex({ align: 'center', gap: 4 })}>
            <h2
              className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'text-on-surface')}
            >
              {pageTitle}
            </h2>
          </div>
          <div className={cm.flex({ align: 'center', gap: 4 })}>
            <div className={cm.cn(cm.flex({ align: 'center' }), 'relative')}>
              <span
                className={cm.cn(
                  cm.textSize('lg'),
                  'material-symbols-outlined absolute left-3 text-on-surface-variant/60',
                )}
                aria-hidden="true"
              >
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label={t(
                  'common.search',
                  {},
                  { defaultValue: 'Search meetings, recordings…' },
                )}
                placeholder={t(
                  'common.search',
                  {},
                  { defaultValue: 'Search meetings, recordings…' },
                )}
                className={cm.cn(
                  cm.sp('pl', 10),
                  cm.sp('pr', 4),
                  cm.textSize('sm'),
                  'w-72 py-1.5 bg-surface-container-low border-none rounded-lg text-on-surface placeholder:text-on-surface-variant/60 focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all',
                )}
              />
            </div>
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main className={cm.cn(cm.flex1, cm.sp('p', 4), 'lg:p-8 overflow-y-auto')}>
          <div className={cm.cn(cm.mxAuto, cm.maxW('2xl'), 'w-full max-w-[1400px]')}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
