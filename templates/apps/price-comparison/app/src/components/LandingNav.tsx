import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Public marketing-chrome navigation shared by the Landing page and the
 * standalone public pages (About, Privacy, Terms) so the brand stays
 * consistent. Auth-aware: signed-in visitors see a single "Go to
 * Dashboard" CTA instead of the Sign in / Start saving pair.
 */
export function LandingNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <nav
      data-mol-id="landing-nav"
      className={cm.cn(
        'sticky top-0 z-50 border-b border-outline-variant/40 bg-surface/80 backdrop-blur-md',
      )}
    >
      <div
        className={cm.cn(
          cm.maxW('xl'),
          cm.sp('px', 6),
          cm.sp('py', 4),
          cm.flex({ align: 'center', justify: 'between' }),
          cm.mxAuto,
          'max-w-screen-2xl',
        )}
      >
        <Link
          to="/"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.fontWeight('extrabold'),
            cm.textSize('xl'),
            'text-primary tracking-tighter',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-primary')} aria-hidden="true">
            filter_alt
          </span>
          {APP_NAME}
        </Link>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          <Link
            to="/pricing"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('landing.seePricing', {}, { defaultValue: 'See pricing' })}
          </Link>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              data-mol-id="nav-go-to-dashboard"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-full bg-primary text-on-primary hover:opacity-90 transition-all shadow-sm',
              )}
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
                  'text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-full bg-primary text-on-primary hover:opacity-90 transition-all shadow-sm',
                )}
              >
                {t('landing.getStarted', {}, { defaultValue: 'Start saving' })}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default LandingNav
export { LandingNav as LandingTopNavBar }
