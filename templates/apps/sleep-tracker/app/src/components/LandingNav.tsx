import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Public marketing top navigation shared by the Landing, About, Privacy, and
 * Terms pages so the brand chrome stays consistent. Auth-aware: signed-in
 * visitors see a single "Go to Dashboard" CTA instead of the sign-in/sign-up
 * pair.
 */
export function LandingNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <nav
      data-mol-id="landing-nav"
      className={cm.cn(
        'sticky top-0 z-50 bg-surface/85 backdrop-blur-md border-b border-outline-variant',
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
          data-mol-id="nav-brand"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xl'),
            cm.fontWeight('extrabold'),
          )}
        >
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined text-2xl')}
            style={{ color: 'var(--color-border-focus)', fontVariationSettings: "'FILL' 1" }}
          >
            bedtime
          </span>
          <span style={{ letterSpacing: '-0.02em' }}>{APP_NAME}</span>
        </Link>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              data-mol-id="nav-dashboard-cta"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'bg-primary text-on-primary rounded-full shadow-md hover:shadow-lg transition-shadow',
              )}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                data-mol-id="nav-signin"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-on-surface-variant hover:text-on-surface',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                data-mol-id="nav-signup-cta"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'bg-primary text-on-primary rounded-full shadow-md hover:shadow-lg transition-shadow',
                )}
              >
                {t('landing.getStarted', {}, { defaultValue: 'Start tracking tonight' })}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default LandingNav
