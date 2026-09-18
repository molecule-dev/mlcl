import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Public marketing top nav, shared across the Landing, About, Privacy, and
 * Terms pages so brand chrome stays consistent. Auth-aware: when the visitor
 * is already signed in, the Sign in / Track-the-weather links collapse into a
 * single "Go to Dashboard" CTA pointing at the authed home.
 */
export function LandingNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <nav
      data-mol-id="landing-nav"
      className={cm.cn(
        'sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/40',
      )}
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
          data-mol-id="landing-nav-home"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            'tracking-tight',
          )}
        >
          <span
            className={cm.cn(
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              'bg-gradient-to-br from-primary to-tertiary-container shadow-md shadow-primary/30 text-on-primary',
            )}
            aria-hidden="true"
          >
            <span
              className={cm.cn('material-symbols-outlined', cm.textSize('xl'))}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              partly_cloudy_day
            </span>
          </span>
          {APP_NAME}
        </Link>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              data-mol-id="landing-nav-dashboard"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors',
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
                  'text-on-surface-variant hover:text-on-surface',
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
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors',
                )}
              >
                {t('landing.getStarted', {}, { defaultValue: 'Track the weather' })}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default LandingNav
