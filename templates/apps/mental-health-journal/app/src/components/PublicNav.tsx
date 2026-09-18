import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Public marketing nav shared by the Landing, About, Privacy, and Terms
 * pages so the brand chrome stays identical across every logged-out view.
 *
 * Auth-aware: once the visitor is signed in, the Sign in / Start journaling
 * links collapse into a single "Go to Dashboard" CTA pointing at the app's
 * primary authed route (`/home`).
 */
export function PublicNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  const ctaGradient = {
    background: 'linear-gradient(90deg, var(--mol-color-primary), var(--mol-color-secondary))',
  }

  return (
    <nav
      data-mol-id="public-nav"
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
          data-mol-id="public-nav-brand"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xl'),
            cm.fontWeight('extrabold'),
          )}
        >
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined text-2xl')}
            style={{ color: 'var(--mol-color-primary)', fontVariationSettings: "'FILL' 1" }}
          >
            nights_stay
          </span>
          <span style={{ letterSpacing: '-0.02em' }}>{APP_NAME}</span>
        </Link>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          {isAuthenticated ? (
            <Link
              to="/home"
              data-mol-id="public-nav-dashboard"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'text-white rounded-full shadow-md hover:shadow-lg transition-shadow',
              )}
              style={ctaGradient}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                data-mol-id="public-nav-login"
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
                data-mol-id="public-nav-signup"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'text-white rounded-full shadow-md hover:shadow-lg transition-shadow',
                )}
                style={ctaGradient}
              >
                {t('landing.getStarted', {}, { defaultValue: 'Start journaling' })}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default PublicNav
