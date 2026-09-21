/**
 * FeedbackLayout — the app shell for every non-auth page.
 *
 * Top header (brand + Boards / Roadmap / Changelog nav + theme toggle +
 * auth state), centered content column, footer. The public feedback face
 * (boards, roadmap, changelog) and the signed-in surfaces share this shell:
 * a feedback portal is one product, not a marketing site plus a hidden app.
 *
 * Admin nav (Dashboard / Posts) appears only when the signed-in user's
 * role is admin, read from /api/users/me on mount.
 */
import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { Footer } from './Footer.js'

interface NavItem {
  to: string
  labelKey: string
  defaultLabel: string
  matchPrefix?: string
}

const PUBLIC_NAV: NavItem[] = [
  { to: '/boards', labelKey: 'layout.boards', defaultLabel: 'Boards' },
  { to: '/roadmap', labelKey: 'layout.roadmap', defaultLabel: 'Roadmap' },
  { to: '/changelog', labelKey: 'layout.changelog', defaultLabel: 'Changelog' },
]

const ADMIN_NAV: NavItem[] = [
  { to: '/admin', labelKey: 'layout.adminDashboard', defaultLabel: 'Dashboard' },
  { to: '/admin/posts', labelKey: 'layout.adminPosts', defaultLabel: 'Manage posts' },
]

export function FeedbackLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { isAuthenticated, user } = useAuth<{ id?: string; name?: string; email?: string }>()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setIsAdmin(false)
      return
    }
    let cancelled = false
    const http = getHttpClient()
    void http
      .get<{ props?: { role?: string }; role?: string }>('/api/users/me')
      .then((res) => {
        if (cancelled) return
        const role = res?.data?.props?.role ?? res?.data?.role
        setIsAdmin(role === 'admin')
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false)
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.id])

  const isActive = (item: NavItem): boolean =>
    pathname === item.to ||
    (item.matchPrefix !== undefined && pathname.startsWith(item.matchPrefix))

  const renderNavItem = (item: NavItem, mobile = false) => (
    <Link
      key={item.to}
      to={item.to}
      data-mol-id={`nav-${item.to.replaceAll('/', '-')}${mobile ? '-mobile' : ''}`}
      className={cm.cn(
        cm.fontWeight('semibold'),
        cm.textSize('sm'),
        'whitespace-nowrap',
        // The mobile row is the row's own tap surface — pad it so the
        // links clear the ~28px minimum target, unlike the desktop labels.
        mobile ? 'py-1.5' : '',
        isActive(item)
          ? 'text-primary'
          : 'text-on-surface-variant hover:text-primary transition-colors',
      )}
    >
      {t(item.labelKey, {}, { defaultValue: item.defaultLabel })}
    </Link>
  )

  // Mobile nav — the desktop links are `hidden md:flex`, so without this row
  // a phone user has no way at all to reach Boards / Roadmap / Changelog
  // (or the admin surfaces) from any app page. Scrollable chip row pinned
  // under the brand row, inside the same sticky header.
  const renderMobileNav = () => (
    <nav
      data-mol-id="nav-mobile"
      aria-label={t('layout.mobileNav', {}, { defaultValue: 'Primary' })}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'md' }),
        '-mx-6 px-6 overflow-x-auto md:hidden',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
      )}
    >
      {PUBLIC_NAV.map((item) => renderNavItem(item, true))}
      {isAdmin && ADMIN_NAV.map((item) => renderNavItem(item, true))}
    </nav>
  )

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'bg-background')}>
      <header
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'xs' }),
          cm.sp('px', 6),
          cm.sp('py', 3),
          'sticky top-0 z-40 border-b border-outline-variant/30 bg-surface/95 backdrop-blur',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }))}>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
            <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
              <img src="/logo.svg" alt="" className={cm.cn(cm.w(8), cm.h(8))} aria-hidden="true" />
              <span
                className={cm.cn(cm.fontWeight('bold'), 'text-xl tracking-tight')}
                style={{ color: 'var(--color-primary)' }}
              >
                SignalLoop
              </span>
            </Link>
            <nav
              aria-label={t('layout.primaryNav', {}, { defaultValue: 'Primary' })}
              className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'hidden md:flex')}
            >
              {PUBLIC_NAV.map((item) => renderNavItem(item))}
              {isAdmin && ADMIN_NAV.map((item) => renderNavItem(item))}
            </nav>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            {isAuthenticated ? (
              <Link
                to="/submit"
                data-mol-id="nav-submit"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-full bg-primary text-on-primary hover:bg-primary-active transition-colors',
                )}
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">
                  add
                </span>
                {t('layout.submit', {}, { defaultValue: 'Submit feedback' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'text-on-surface-variant hover:text-primary transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  data-mol-id="nav-signup"
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'rounded-full bg-primary text-on-primary hover:bg-primary-active transition-colors',
                  )}
                >
                  {t('layout.signUp', {}, { defaultValue: 'Sign up' })}
                </Link>
              </>
            )}
          </div>
        </div>
        {renderMobileNav()}
      </header>

      <main className={cm.cn(cm.flex1, cm.sp('px', 6), cm.sp('py', 8))}>
        <div className="mx-auto max-w-[1040px]">
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default FeedbackLayout
