import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Public top navigation shared across the Landing page and the standalone
 * public pages (About / Privacy / Terms) so the brand chrome stays
 * consistent. Auth-aware: signed-in visitors see a single "Go to Dashboard"
 * CTA instead of the Sign in / Join links.
 */
export function LandingTopNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <nav
      data-mol-id="landing-top-nav"
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
        <Link to="/" className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              'bg-primary text-on-primary',
            )}
            aria-hidden="true"
          >
            <span
              className={'material-symbols-outlined text-lg'}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              flight
            </span>
          </span>
          <span
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'text-primary tracking-tight',
            )}
          >
            {APP_NAME}
          </span>
        </Link>
        <div className={cm.flex({ align: 'center', gap: 'lg' })}>
          <Link
            to="/search"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'hidden md:inline text-on-surface-variant hover:text-primary',
            )}
          >
            {t('landing.nav.search', {}, { defaultValue: 'Search flights' })}
          </Link>
          <Link
            to="/alerts"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'hidden md:inline text-on-surface-variant hover:text-primary',
            )}
          >
            {t('landing.nav.alerts', {}, { defaultValue: 'Price alerts' })}
          </Link>
          {isAuthenticated ? (
            <Link
              to="/search"
              data-mol-id="nav-go-to-dashboard"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-full bg-accent text-on-accent hover:bg-accent/90 transition-colors shadow-sm',
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
                  'hidden md:inline text-on-surface hover:text-primary',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'rounded-full bg-accent text-on-accent hover:bg-accent/90 transition-colors shadow-sm',
                )}
              >
                {t('landing.nav.join', { app: APP_NAME }, { defaultValue: 'Join {{app}}' })}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default LandingTopNav
