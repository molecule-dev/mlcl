import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Shared public-page top navigation, mirroring the Landing hero nav so brand
 * stays consistent across Landing, About, Privacy, and Terms.
 *
 * Chrono design: text-only wordmark, gradient "Get Started" pill with the
 * soft ambient shadow, and the ghost hairline along the bottom edge.
 *
 * Auth-aware: when the visitor is signed in, the Sign in / Start tracking
 * links collapse to a single "Go to Dashboard" CTA.
 */
export function PublicTopNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <nav
      data-mol-id="public-top-nav"
      className={cm.cn('sticky top-0 z-50 bg-surface/70 backdrop-blur-xl')}
    >
      <div
        className={cm.cn(
          cm.maxW('7xl'),
          cm.mxAuto,
          cm.sp('px', 6),
          cm.sp('py', 4),
          cm.flex({ align: 'center', justify: 'between' }),
          'flex-wrap gap-x-4 gap-y-2',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 12 }))}>
          <Link
            to="/"
            className={cm.cn(
              'min-w-0 whitespace-nowrap shrink-0 text-2xl font-bold tracking-tighter text-on-surface',
            )}
          >
            {APP_NAME}
          </Link>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }), 'min-w-0 whitespace-nowrap')}>
          {isAuthenticated ? (
            <Link
              data-mol-id="nav-go-to-dashboard"
              to="/dashboard"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2.5),
                cm.fontWeight('medium'),
                cm.textSize('sm'),
                'shrink-0 transition-glide',
                'btn-gradient rounded-xl text-white shadow-ambient hover:opacity-90',
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
                  cm.fontWeight('medium'),
                  'text-on-surface-variant transition-glide hover:text-on-surface',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                data-mol-id="nav-cta"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2.5),
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'shrink-0 transition-glide',
                  'btn-gradient rounded-xl text-white shadow-ambient hover:opacity-90',
                )}
              >
                {t('landing.getStarted', {}, { defaultValue: 'Start tracking — free' })}
              </Link>
            </>
          )}
        </div>
      </div>
      {/* Ghost border */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-px w-full bg-outline-variant/15"
      />
    </nav>
  )
}

export default PublicTopNav
export { PublicTopNav as PublicTopNavBar }
