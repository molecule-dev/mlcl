import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'

/**
 * Shared public top navigation for the marketing/landing surface
 * (Landing, About, Privacy, Terms). Auth-aware: signed-in visitors see a
 * single "Go to Dashboard" CTA instead of the sign-in / start-free links.
 */
export function LandingTopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <nav
      data-mol-id="public-nav"
      className={cm.cn('sticky top-0 z-50 backdrop-blur-md border-b')}
      style={{
        backgroundColor: 'color-mix(in srgb, var(--mol-color-background) 85%, transparent)',
        borderColor: 'var(--mol-color-border)',
      }}
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
          className={cm.cn('flex items-center gap-2 text-xl font-extrabold tracking-tight')}
          style={{ color: 'var(--mol-color-text)' }}
        >
          <span
            className={cm.cn('inline-flex h-8 w-8 items-center justify-center rounded-lg')}
            style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
            aria-hidden="true"
          >
            <span className={cm.cn('material-symbols-outlined text-[20px]')}>cloud_sync</span>
          </span>
          <span>
            {APP_NAME}
            <span style={{ color: BRAND_COLOR }}>.</span>
          </span>
        </Link>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              data-mol-id="nav-dashboard"
              className={cm.cn(
                'px-5 py-2 font-mono font-semibold text-sm rounded-md transition-all hover:opacity-90 shadow-lg',
              )}
              style={{
                backgroundColor: BRAND_COLOR,
                color: 'var(--color-on-primary)',
                boxShadow:
                  '0 8px 24px -8px color-mix(in srgb, var(--mol-color-primary) 40%, transparent)',
              }}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                data-mol-id="nav-login"
                className={cm.cn('text-sm font-medium transition-colors hover:opacity-90')}
                style={{ color: 'var(--mol-color-text-secondary)' }}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                data-mol-id="nav-signup"
                className={cm.cn(
                  'px-5 py-2 font-mono font-semibold text-sm rounded-md transition-all hover:opacity-90 shadow-lg',
                )}
                style={{
                  backgroundColor: BRAND_COLOR,
                  color: 'var(--color-on-primary)',
                  boxShadow:
                    '0 8px 24px -8px color-mix(in srgb, var(--mol-color-primary) 40%, transparent)',
                }}
              >
                {t('common.startFree', {}, { defaultValue: 'Start free' })}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default LandingTopNavBar
export { LandingTopNavBar as PublicTopNav }
