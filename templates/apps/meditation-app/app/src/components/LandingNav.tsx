import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'

/**
 * Public top navigation for Stillpoint's marketing surfaces (Landing, About,
 * Privacy, Terms). Auth-aware: signed-out visitors see Sign in / Start free,
 * signed-in visitors see a single "Go to Dashboard" link to the practice home.
 * Keeps the theme toggle so the public chrome respects light/dark.
 */
export function LandingNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <nav
      data-mol-id="landing-nav"
      className={cm.cn(
        cm.sp('px', 6),
        cm.sp('py', 4),
        'sticky top-0 inset-x-0 z-50 bg-surface/80 backdrop-blur-md border-b border-primary-container shadow-sm',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          'max-w-7xl mx-auto h-16',
        )}
      >
        <Link
          to="/"
          data-mol-id="landing-nav-home"
          className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}
        >
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined text-primary')}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            self_improvement
          </span>
          <span className={cm.cn(cm.fontWeight('bold'), 'text-2xl text-primary tracking-tight')}>
            {APP_NAME}
          </span>
        </Link>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to="/home"
              data-mol-id="landing-nav-dashboard"
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 2),
                cm.fontWeight('medium'),
                cm.textSize('sm'),
                'bg-primary text-white rounded-full hover:bg-primary/90 transition-colors shadow-sm',
              )}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                data-mol-id="landing-nav-login"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant hover:text-primary transition-colors hidden sm:inline',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                data-mol-id="landing-nav-signup"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 2),
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'bg-primary text-white rounded-full hover:bg-primary/90 transition-colors shadow-sm',
                )}
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

export default LandingNav
