import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Public, brand-consistent top navigation shared by the standalone content
 * pages (About / Privacy / Terms). Mirrors the Landing hero nav so the brand
 * stays identical across every public surface, and is auth-aware: signed-in
 * visitors get a single "Go to Dashboard" CTA instead of the Sign in / signup
 * pair.
 */
export function PublicPageNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <nav
      data-mol-id="public-page-nav"
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
          className={cm.cn(
            cm.textSize('xl'),
            cm.flex({ align: 'center', gap: 'sm' }),
            'font-extrabold tracking-tight font-display',
          )}
        >
          <span
            className={cm.cn(
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              'bg-gradient-to-br from-primary to-tertiary',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-on-primary text-xl')}
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              local_fire_department
            </span>
          </span>
          {APP_NAME}
        </Link>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              data-mol-id="public-nav-dashboard"
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
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors',
                )}
              >
                {t('landing.getStarted', {}, { defaultValue: 'Open your kitchen' })}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default PublicPageNav
