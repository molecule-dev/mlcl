import { Link, Outlet } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BrandWordmark } from './BrandWordmark.js'
import { EventTicketingLayout } from './EventTicketingLayout.js'

/**
 * Auth-aware shell for the public discovery surface (`/events`,
 * `/events/:id`). When the user is signed in, defers to the sidebar
 * layout so the discovery pages live alongside Dashboard / My tickets /
 * Notifications. When the user is anonymous, renders a slim top nav
 * (Browse · Sign in · Get started) — Eventbrite-style — so visitors can
 * browse publicly without being bounced to /login.
 *
 * Auth-gated mutations (purchase, host) still happen at the action call
 * site (e.g. EventDetail's Buy button hits POST /api/orders which 401s
 * for anon).
 */
export function DiscoveryShell() {
  const { isAuthenticated, state } = useAuth()
  const cm = getClassMap()
  const { t } = useTranslation()

  if (!state.initialized) {
    return (
      <div className={cm.cn(cm.sp('p', 8), cm.textCenter, cm.textMuted)}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }

  if (isAuthenticated) return <EventTicketingLayout />

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={cm.cn(
          'sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/40',
        )}
        aria-label={t('discoveryShell.nav', {}, { defaultValue: 'Site navigation' })}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            cm.mxAuto,
          )}
        >
          <Link
            to="/"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.textSize('xl'),
              'font-extrabold tracking-tighter',
            )}
          >
            <BrandWordmark as="span" />
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <Link
              to="/events"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'hidden md:inline text-on-surface-variant hover:text-on-surface',
              )}
            >
              {t('discoveryShell.browse', {}, { defaultValue: 'Browse events' })}
            </Link>
            <Link
              to="/login"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                'rounded-full text-white shadow-md shadow-primary/30 hover:-translate-y-0.5 transition-transform',
              )}
              style={{
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
              }}
            >
              {t('common.getStarted', {}, { defaultValue: 'Get started' })}
            </Link>
          </div>
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  )
}

export default DiscoveryShell
