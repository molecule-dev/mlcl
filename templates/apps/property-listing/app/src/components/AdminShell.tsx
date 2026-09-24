import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'

/**
 * The authenticated admin shell — the shared `ResponsiveAppShell` with the
 * agent-portal nav, brand and actions.
 *
 * The shell owns the breakpoint split: the Sidebar mounts only ≥768px, the
 * mobile Drawer (same nav element, full dialog contract — focus trap,
 * Escape/backdrop close, scroll lock) only below it, and the TopBar renders
 * the menu trigger itself — the former AdminMobileNav hamburger button,
 * drawer open state and backdrop handler are deleted with it, as are the
 * six per-page `hidden md:flex` side nav bars this composition replaces.
 *
 * Fleet-canonical composition: the brand lives in the Sidebar (desktop) and
 * the TopBar is `mobileOnly` — the shell renders it only below the
 * breakpoint, so the desktop layout is sidebar + content with no squeezed
 * top-bar row.
 *
 * Page padding stays inside pages: `.Content` is a bare `<main>`.
 */

interface AdminNavItem {
  to: string
  icon: string
  labelKey: string
  fallback: string
  exact?: boolean
}

const NAV_ITEMS: AdminNavItem[] = [
  {
    to: '/admin/dashboard',
    icon: 'dashboard',
    labelKey: 'nav.dashboard',
    fallback: 'Dashboard',
    exact: true,
  },
  {
    to: '/admin/listings',
    icon: 'real_estate_agent',
    labelKey: 'sideNav.listings',
    fallback: 'Listings',
  },
  { to: '/admin/leads', icon: 'group', labelKey: 'sideNav.leads', fallback: 'Leads' },
  {
    to: '/admin/showings',
    icon: 'calendar_today',
    labelKey: 'sideNav.showings',
    fallback: 'Showings',
  },
  { to: '/admin/analytics', icon: 'analytics', labelKey: 'nav.analytics', fallback: 'Analytics' },
  { to: '/admin/settings', icon: 'settings', labelKey: 'nav.settings', fallback: 'Settings' },
]

/** Brand block above the sidebar nav — app name + portal tagline. */
function AdminBrand() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <Link
      to="/admin/dashboard"
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 1 }),
        cm.sp('px', 6),
        cm.sp('py', 8),
        'no-underline',
      )}
    >
      <span
        className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-success tracking-tight')}
      >
        {t('brand.name', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
      </span>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('medium'),
          'uppercase tracking-widest text-success/60',
        )}
      >
        {t('brand.subtitle', {}, { defaultValue: 'Agent Portal' })}
      </span>
    </Link>
  )
}

/**
 * Nav links shared by the desktop Sidebar and the mobile Drawer — the shell
 * mounts only the breakpoint's copy. Marking the current item is the
 * consumer's job: `aria-current="page"` from the active link.
 */
function AdminNavLinks() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  return (
    <>
      {NAV_ITEMS.map((item) => {
        const active = item.exact ? pathname === item.to : pathname.startsWith(item.to)
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={active ? 'page' : undefined}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'md' }),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'transition-all duration-300 no-underline',
              active
                ? cm.cn(
                    cm.fontWeight('bold'),
                    'text-success bg-success-light/60 border-l-4 border-emerald-900',
                  )
                : 'text-success/60 hover:text-success hover:bg-success-light/50',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')}>{item.icon}</span>
            <span>{t(item.labelKey, {}, { defaultValue: item.fallback })}</span>
          </Link>
        )
      })}
    </>
  )
}

/**
 * Below-nav actions — New Listing, Support, Sign Out. The SAME element goes
 * to the Sidebar footer and the Drawer footer; only the mounted breakpoint's
 * copy ever instantiates. Closing after navigation is the shell's job (the
 * drawer auto-closes on SPA navigation).
 */
function AdminNavFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async (): Promise<void> => {
    try {
      await logout()
    } finally {
      navigate('/login')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => navigate('/admin/listings/new')}
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
          cm.sp('py', 3),
          cm.sp('px', 4),
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          cm.w('full'),
          'primary-gradient text-on-primary rounded-xl active:scale-95 transition-transform cursor-pointer',
        )}
      >
        <span className={cm.cn('material-symbols-outlined')}>add</span>
        {t('sideNav.newListing', {}, { defaultValue: 'New Listing' })}
      </button>
      <Link
        to="/help"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'md' }),
          cm.sp('px', 2),
          cm.sp('py', 3),
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          'text-success/60 hover:text-success transition-colors no-underline',
        )}
      >
        <span className={cm.cn('material-symbols-outlined')}>support_agent</span>
        {t('sideNav.support', {}, { defaultValue: 'Support' })}
      </Link>
      <button
        type="button"
        onClick={() => void handleLogout()}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'md' }),
          cm.sp('px', 2),
          cm.sp('py', 3),
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          'text-error hover:text-error/80 transition-colors cursor-pointer',
        )}
      >
        <span className={cm.cn('material-symbols-outlined')}>logout</span>
        {t('common.signOut', {}, { defaultValue: 'Sign Out' })}
      </button>
    </>
  )
}

interface AdminShellProps {
  /** The routed page content (the page's own chrome + sections). */
  children: ReactNode
  /** Extra classes on the shell root (page canvas/text colors). */
  className?: string
  /** `data-mol-id` for the shell root (defaults to `shell-root`). */
  rootMolId?: string
  /** `data-mol-id` for the content `<main>` (fleet locator convention). */
  contentMolId?: string
  /** Extra classes on the content `<main>` (e.g. page-level flex column). */
  contentClassName?: string
}

/**
 * The shell every `/admin` page composes into — see the module doc.
 *
 * @param props - Root/content classes + ids, and the page content.
 */
export default function AdminShell({
  children,
  className,
  rootMolId,
  contentMolId,
  contentClassName,
}: AdminShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const nav = <AdminNavLinks />
  const footer = <AdminNavFooter />

  return (
    <ResponsiveAppShell sidebarWidth="lg" className={className} dataMolId={rootMolId}>
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={
          <Link
            to="/admin/dashboard"
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('lg'),
              'font-headline no-underline text-success',
            )}
          >
            {t('brand.name', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </Link>
        }
        actions={
          <button
            type="button"
            aria-label={t('sideNav.newListing', {}, { defaultValue: 'New Listing' })}
            onClick={() => navigate('/admin/listings/new')}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'w-10 h-10 text-on-surface hover:bg-surface-container cursor-pointer',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')}>add</span>
          </button>
        }
      />
      <ResponsiveAppShell.Sidebar footer={footer}>
        <AdminBrand />
        {nav}
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer
        header={
          <span className={cm.cn(cm.flex({ direction: 'col' }))}>
            <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-success')}>
              {t('brand.name', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
            </span>
            <span className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest text-success/60')}>
              {t('brand.subtitle', {}, { defaultValue: 'Agent Portal' })}
            </span>
          </span>
        }
        footer={footer}
      >
        {nav}
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content dataMolId={contentMolId} className={contentClassName}>
        {children}
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

export { AdminShell }
