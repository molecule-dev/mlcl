import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BrandWordmark } from '../components/BrandWordmark.js'
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
        'sticky top-0 z-40 backdrop-blur-xl bg-surface-container-lowest/80 shadow-landing-nav',
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
        <Link to="/" className={cm.cn('hover:opacity-80 transition-opacity rounded')}>
          <BrandWordmark as="span" />
        </Link>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              data-mol-id="nav-dashboard"
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 2.5),
                cm.fontWeight('medium'),
                'text-sm rounded-xl btn-gradient text-white ambient-shadow hover:opacity-90 transition-opacity',
              )}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cm.cn(
                  'hidden sm:inline-block text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                data-mol-id="landing-nav-cta"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 2.5),
                  cm.fontWeight('medium'),
                  'text-sm rounded-xl btn-gradient text-white ambient-shadow hover:opacity-90 transition-opacity',
                )}
              >
                {t('landing.nav.start', {}, { defaultValue: 'Get the Box' })}
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}

export default LandingTopNavBar
