import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'

const heroGradient = 'linear-gradient(135deg, var(--mol-color-primary), var(--mol-color-secondary))'

/**
 * Public top navigation shared by the marketing-adjacent pages (About,
 * Privacy, Terms). Mirrors the Landing header brand mark, but is
 * auth-aware: when the visitor is signed in the auth links collapse to a
 * single "Go to Dashboard" CTA.
 */
export function LandingTopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <header
      data-mol-id="landing-top-nav"
      className={cm.cn(
        'fixed top-0 left-0 right-0 z-40 bg-surface/80 backdrop-blur-md border-b border-outline-variant/10',
      )}
    >
      <div
        className={cm.cn(
          'max-w-7xl',
          cm.mxAuto,
          cm.sp('px', 6),
          cm.sp('py', 4),
          cm.flex({ align: 'center', justify: 'between' }),
        )}
      >
        <Link
          to="/"
          data-mol-id="nav-brand"
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
        >
          <div
            className={cm.cn(
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
            )}
            style={{ background: heroGradient }}
          >
            <span
              className={cm.cn('material-symbols-outlined text-white text-base')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              pets
            </span>
          </div>
          <span className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {APP_NAME}
          </span>
        </Link>
        <nav className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'hidden md:flex')}>
          <a
            href="/#features"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-on-surface-variant hover:text-on-surface transition-colors',
            )}
          >
            {t('nav.features', {}, { defaultValue: 'Features' })}
          </a>
          <a
            href="/#sitters"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-on-surface-variant hover:text-on-surface transition-colors',
            )}
          >
            {t('landing.nav.sitters', {}, { defaultValue: 'Sitters' })}
          </a>
          <Link
            to="/about"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-on-surface-variant hover:text-on-surface transition-colors',
            )}
          >
            {t('nav.about', {}, { defaultValue: 'About' })}
          </Link>
        </nav>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              data-mol-id="nav-dashboard"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'text-white rounded-lg hover:shadow-lg transition-all',
              )}
              style={{ background: heroGradient }}
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
                  'text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'text-white rounded-lg hover:shadow-lg transition-all',
                )}
                style={{ background: heroGradient }}
              >
                {t('common.getStarted', {}, { defaultValue: 'Get started' })}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default LandingTopNavBar
