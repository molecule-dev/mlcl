import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Public marketing navigation bar shared across the Landing, About, and other
 * unauthenticated pages so the brand chrome stays consistent. Auth-aware: when
 * a session exists the sign-in / try-free links collapse to a single
 * "Go to Dashboard" CTA pointing at the app's primary authed route.
 *
 * @returns The rendered public top navigation bar.
 */
export function LandingTopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <nav
      data-mol-id="landing-nav"
      className={cm.cn(
        'sticky top-0 z-50 bg-surface/80 backdrop-blur border-b border-outline-variant/40',
      )}
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
        <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            aria-hidden="true"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'h-9 w-9 bg-gradient-to-br from-primary to-primary-container shadow-md',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-on-primary')}
              style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
            >
              graphic_eq
            </span>
          </span>
          <span
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              cm.textPrimary,
              'tracking-tight',
            )}
          >
            {APP_NAME}
          </span>
        </Link>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              data-mol-id="landing-nav-dashboard"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-full text-on-primary bg-gradient-to-r from-primary to-primary-container shadow-md hover:opacity-90 transition-opacity',
              )}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                data-mol-id="landing-nav-login"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant hover:text-on-surface transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                data-mol-id="landing-nav-signup"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-full text-on-primary bg-gradient-to-r from-primary to-primary-container shadow-md hover:opacity-90 transition-opacity',
                )}
              >
                {t('landing.getStarted', {}, { defaultValue: 'Try free' })}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default LandingTopNavBar
