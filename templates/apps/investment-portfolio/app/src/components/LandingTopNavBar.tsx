import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, LOGO_SIZE } from '../branding.js'

/**
 * Public marketing top navigation, shared across the Landing, About,
 * Privacy and Terms pages so the brand chrome stays identical everywhere.
 *
 * Auth-aware (C1): once the visitor is signed in, the Sign in / Open an
 * account links collapse into a single "Go to Dashboard" CTA.
 */
export function LandingTopNavBar() {
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
        <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <img src="/logo.svg" width={LOGO_SIZE} height={LOGO_SIZE} alt={`${APP_NAME} logo`} />
          <span className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {APP_NAME}
          </span>
        </Link>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          <Link
            to="/pricing"
            className={cm.cn(
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-on-surface-variant hover:text-on-surface',
            )}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              data-mol-id="nav-go-to-dashboard"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'bg-primary text-on-primary rounded-full hover:shadow-md transition-shadow',
              )}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cm.cn(
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant hover:text-on-surface',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                aria-label={t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'bg-primary text-on-primary rounded-full hover:shadow-md transition-shadow',
                )}
              >
                {t('landing.getStarted', {}, { defaultValue: 'Open an account' })}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default LandingTopNavBar
