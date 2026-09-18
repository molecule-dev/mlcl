import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'

/**
 * Public marketing nav shared by the Landing page and the standalone public
 * pages (About, Privacy, Terms) so brand chrome stays consistent. Auth-aware:
 * authenticated visitors see a single "Go to Dashboard" CTA instead of the
 * sign-in / start-your-box links.
 */
export function LandingTopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <header
      data-mol-id="landing-nav"
      className={cm.cn(
        'sticky top-0 z-40 backdrop-blur-md bg-surface-container-lowest/80 border-b border-outline-variant/30',
      )}
    >
      <nav
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
              'flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-xl')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              redeem
            </span>
          </span>
          <span className={cm.cn('text-xl font-extrabold tracking-tight text-on-surface')}>
            {APP_NAME}
          </span>
        </Link>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              data-mol-id="nav-dashboard"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'text-sm bg-primary text-on-primary hover:bg-primary-hover hover:shadow-lg transition-all',
              )}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cm.cn(
                  'hidden sm:inline-block text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors',
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
                  cm.roundedFull,
                  'text-sm bg-primary text-on-primary hover:bg-primary-hover hover:shadow-lg transition-all',
                )}
              >
                {t('landing.nav.start', {}, { defaultValue: 'Start your box' })}
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}

export default LandingTopNavBar
