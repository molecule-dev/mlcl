import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Shared public-page top navigation, mirroring the Landing hero nav so brand
 * stays consistent across Landing, About, Privacy, and Terms.
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
      className={cm.cn(
        'sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-border/60',
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
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(8),
              cm.h(8),
              'rounded-lg bg-gradient-to-br from-blue-600 to-emerald-500 text-white shadow-md',
            )}
          >
            <span
              className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              schedule
            </span>
          </span>
          <span
            className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-foreground')}
          >
            {APP_NAME}
          </span>
        </Link>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          {isAuthenticated ? (
            <Link
              data-mol-id="nav-go-to-dashboard"
              to="/dashboard"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                'bg-gradient-to-br from-blue-600 to-emerald-500 text-white rounded-full shadow-md hover:shadow-lg transition-all',
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
                  'text-foreground-secondary hover:text-foreground transition-colors',
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
                  'bg-gradient-to-br from-blue-600 to-emerald-500 text-white rounded-full shadow-md hover:shadow-lg transition-all',
                )}
              >
                {t('landing.getStarted', {}, { defaultValue: 'Start tracking — free' })}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default PublicTopNav
export { PublicTopNav as PublicTopNavBar }
