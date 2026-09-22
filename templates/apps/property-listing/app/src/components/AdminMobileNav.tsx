import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

const NAV_ITEMS: Array<{ to: string; icon: string; key: string; fallback: string }> = [
  { to: '/admin/dashboard', icon: 'dashboard', key: 'nav.dashboard', fallback: 'Dashboard' },
  {
    to: '/admin/listings',
    icon: 'real_estate_agent',
    key: 'sideNav.listings',
    fallback: 'Listings',
  },
  { to: '/admin/leads', icon: 'group', key: 'sideNav.leads', fallback: 'Leads' },
  { to: '/admin/showings', icon: 'calendar_today', key: 'sideNav.showings', fallback: 'Showings' },
  { to: '/admin/analytics', icon: 'analytics', key: 'nav.analytics', fallback: 'Analytics' },
  { to: '/admin/settings', icon: 'settings', key: 'nav.settings', fallback: 'Settings' },
]

/**
 * Mobile admin shell — sticky top bar + slide-in drawer, shown below the
 * `md` breakpoint. The desktop side bars (AgentDashboardSideNavBar,
 * SideNavBar, AgentAnalyticsSideNavBar, SettingsSideNavBar,
 * ListingEditorSideNavBar) are fixed-width 256px columns that would eat
 * most of a phone screen, so they hide below md and this bar takes over.
 * Every admin page renders this right after its (desktop-only) side bar.
 */
export default function AdminMobileNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  // Close the drawer whenever the route changes; lock body scroll while open.
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const closeAnd = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  return (
    <>
      {/* Sticky top bar (mobile only) */}
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 4),
          'md:hidden sticky top-0 z-40 h-14 bg-surface/95 backdrop-blur-md border-b border-outline-variant/30',
        )}
        data-mol-id="admin-mobile-topbar"
      >
        <button
          type="button"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.roundedFull,
            'w-10 h-10 -ml-2 text-on-surface hover:bg-surface-container',
          )}
          data-mol-id="admin-mobile-menu"
          aria-label={t('nav.openMenu', {}, { defaultValue: 'Open navigation menu' })}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={cm.cn('material-symbols-outlined')}>{open ? 'close' : 'menu'}</span>
        </button>
        <Link
          to="/admin/dashboard"
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('lg'),
            'font-headline no-underline text-success',
          )}
          data-mol-id="admin-mobile-brand"
        >
          {t('brand.name', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </Link>
        <button
          type="button"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.roundedFull,
            'w-10 h-10 -mr-2 text-on-surface hover:bg-surface-container',
          )}
          data-mol-id="admin-mobile-new-listing"
          aria-label={t('sideNav.newListing', {}, { defaultValue: 'New Listing' })}
          onClick={() => closeAnd('/admin/listings/new')}
        >
          <span className={cm.cn('material-symbols-outlined')}>add</span>
        </button>
      </header>

      {/* Drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50" data-mol-id="admin-mobile-drawer">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setOpen(false)}
            role="presentation"
          />
          <nav
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              cm.sp('p', 4),
              'absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-surface shadow-xl overflow-y-auto',
            )}
            aria-label={t('nav.adminMenu', {}, { defaultValue: 'Admin navigation' })}
          >
            <div className={cm.cn(cm.sp('px', 2), cm.sp('mb', 4))}>
              <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-success')}>
                {t('brand.name', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
              </p>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.sp('mt', 1),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('brand.subtitle', {}, { defaultValue: 'Agent Portal' })}
              </p>
            </div>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.to}
                type="button"
                onClick={() => closeAnd(item.to)}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('px', 3),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-left hover:bg-surface-container min-h-11',
                )}
                data-mol-id={`admin-mobile-nav-${item.to.split('/').pop() || 'item'}`}
              >
                <span className={cm.cn('material-symbols-outlined')}>{item.icon}</span>
                {t(item.key, {}, { defaultValue: item.fallback })}
              </button>
            ))}
            <div className={cm.cn(cm.sp('mt', 2), 'border-t border-outline-variant/30 pt-2')}>
              <button
                type="button"
                onClick={() => closeAnd('/admin/listings/new')}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('px', 3),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'text-left text-primary hover:bg-surface-container min-h-11 w-full',
                )}
                data-mol-id="admin-mobile-nav-new-listing"
              >
                <span className={cm.cn('material-symbols-outlined')}>add</span>
                {t('sideNav.newListing', {}, { defaultValue: 'New Listing' })}
              </button>
              <button
                type="button"
                onClick={() => closeAnd('/help')}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('px', 3),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-left hover:bg-surface-container min-h-11 w-full',
                )}
                data-mol-id="admin-mobile-nav-support"
              >
                <span className={cm.cn('material-symbols-outlined')}>support_agent</span>
                {t('nav.support', {}, { defaultValue: 'Support' })}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setOpen(false)
                  try {
                    await logout()
                  } finally {
                    navigate('/login')
                  }
                }}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('px', 3),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-left text-error hover:bg-surface-container min-h-11 w-full',
                )}
                data-mol-id="admin-mobile-nav-logout"
              >
                <span className={cm.cn('material-symbols-outlined')}>logout</span>
                {t('common.signOut', {}, { defaultValue: 'Sign Out' })}
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
