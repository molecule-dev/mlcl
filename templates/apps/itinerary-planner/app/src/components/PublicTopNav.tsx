import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'

/**
 * Public top navigation for marketing/content pages (About, Privacy, Terms).
 * Mirrors the Landing page's inline nav chrome so the brand stays consistent,
 * and is auth-aware: a signed-in visitor sees a single "Go to Dashboard" CTA
 * instead of the Sign in / Start a free trip links.
 */
export function PublicTopNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <nav
      data-mol-id="public-top-nav"
      className={cm.cn(
        'sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-outline-variant/40',
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
          className={cm.flex({ align: 'center', gap: 'sm' })}
        >
          <span
            className="material-symbols-outlined text-primary text-3xl"
            aria-hidden="true"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            explore
          </span>
          <span
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('extrabold'),
              'text-primary tracking-tight',
            )}
            style={{ fontFamily: '"Plus Jakarta Sans", -apple-system, sans-serif' }}
          >
            {APP_NAME}
          </span>
        </Link>
        <div className={cm.flex({ align: 'center', gap: 'lg' })}>
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              data-mol-id="public-nav-dashboard"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors',
              )}
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
                  'hidden md:inline text-on-surface hover:text-primary',
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
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors',
                )}
              >
                {t('landing.nav.join', {}, { defaultValue: 'Start a free trip' })}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default PublicTopNav
