import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_ACCENT_COLOR, BRAND_COLOR } from '../branding.js'

/**
 * Public marketing-chrome top navigation for Fugue, shared by the Landing,
 * About, Privacy, and Terms pages so the brand stays consistent across every
 * unauthenticated surface. Auth-aware: signed-in visitors see a single
 * "Go to Dashboard" CTA instead of the sign-in / get-started pair.
 */
export function PublicNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <nav
      data-mol-id="public-nav"
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
          data-mol-id="public-nav-brand"
          className={cm.cn('text-xl font-extrabold tracking-tighter')}
          style={{ color: BRAND_COLOR }}
        >
          {APP_NAME}
        </Link>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              data-mol-id="public-nav-dashboard"
              className={cm.cn('px-5 py-2 font-semibold text-white rounded-full transition-colors')}
              style={{
                background: `linear-gradient(135deg, ${BRAND_COLOR}, ${BRAND_ACCENT_COLOR})`,
              }}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                data-mol-id="public-nav-login"
                className={cm.cn(
                  'text-sm font-medium text-on-surface-variant hover:text-on-surface',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                data-mol-id="public-nav-signup"
                className={cm.cn(
                  'px-5 py-2 font-semibold text-white rounded-full transition-colors',
                )}
                style={{
                  background: `linear-gradient(135deg, ${BRAND_COLOR}, ${BRAND_ACCENT_COLOR})`,
                }}
              >
                {t('landing.getStarted', {}, { defaultValue: 'Open the studio' })}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default PublicNav
