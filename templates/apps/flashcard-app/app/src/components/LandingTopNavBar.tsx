import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Public top navigation shared across the marketing/legal surfaces
 * (Landing, About, Privacy, Terms). Auth-aware: when the visitor is signed
 * in, the Sign in / Start studying free links collapse to a single
 * "Go to Dashboard" CTA pointing at the primary authed route.
 */
export function LandingTopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <nav
      className={cm.cn(
        'sticky top-0 z-50 border-b border-outline-variant/30 bg-surface/80 backdrop-blur-md',
      )}
      data-mol-id="landing-nav"
    >
      <div
        className={cm.cn(
          cm.maxW('7xl'),
          cm.mxAuto,
          cm.sp('px', 6),
          cm.sp('py', 4),
          cm.flex({ align: 'center', justify: 'between' }),
        )}
      >
        <Link
          to="/"
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
          data-mol-id="nav-logo"
        >
          <span
            aria-hidden="true"
            className={cm.cn(
              'flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-container shadow-md',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-white text-lg')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              psychology
            </span>
          </span>
          <span className={cm.cn(cm.fontWeight('bold'), 'text-xl tracking-tight')}>{APP_NAME}</span>
        </Link>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'shrink-0')}>
          {/* Pricing + Sign in collapse away on phones — the wordmark plus the
              primary CTA already fill a 390px bar; both links stay reachable
              from the landing hero/footer. */}
          <Link
            to="/pricing"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'hidden sm:inline text-on-surface-variant hover:text-on-surface',
            )}
            data-mol-id="nav-pricing"
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                'rounded-xl bg-primary text-on-primary text-sm shadow-sm hover:scale-[1.02] transition-transform',
              )}
              data-mol-id="nav-dashboard"
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'hidden sm:inline text-on-surface-variant hover:text-on-surface',
                )}
                data-mol-id="nav-signin"
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 4),
                  'sm:px-5',
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  'rounded-xl bg-primary text-on-primary text-sm shadow-sm hover:scale-[1.02] transition-transform whitespace-nowrap',
                )}
                data-mol-id="nav-signup"
              >
                {t('landing.getStarted', {}, { defaultValue: 'Start studying free' })}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default LandingTopNavBar
