import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Public marketing top nav, shared across the Landing page and the
 * standalone public pages (About / Privacy / Terms) so the brand chrome
 * stays consistent. Auth-aware: when the visitor is signed in, the
 * Sign in / Start free trial links collapse into a single Go to Dashboard
 * CTA pointing at the app's primary authed route (`/surveys`).
 */
export function LandingTopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <header
      data-mol-id="landing-nav"
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 6),
        cm.sp('py', 4),
        cm.maxW('7xl'),
        cm.mxAuto,
      )}
    >
      <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(8),
            cm.h(8),
            cm.roundedFull,
            'bg-gradient-to-br from-primary to-secondary text-white',
          )}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">
            graphic_eq
          </span>
        </span>
        <span className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
          {APP_NAME}
        </span>
      </Link>
      <nav
        className={cm.cn(cm.flex({ align: 'center', gap: 6 }), 'hidden md:flex')}
        aria-label={t('landing.navAria', {}, { defaultValue: 'Marketing' })}
      >
        <a
          href="#product"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'text-on-surface-variant hover:text-primary transition-colors',
          )}
        >
          {t('nav.product', {}, { defaultValue: 'Product' })}
        </a>
        <a
          href="#templates"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'text-on-surface-variant hover:text-primary transition-colors',
          )}
        >
          {t('nav.templates', {}, { defaultValue: 'Templates' })}
        </a>
        <a
          href="#pricing"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'text-on-surface-variant hover:text-primary transition-colors',
          )}
        >
          {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
        </a>
      </nav>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
        {isAuthenticated ? (
          <Link
            to="/surveys"
            data-mol-id="landing-nav-dashboard"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-md bg-gradient-to-r from-primary to-secondary text-white shadow-md hover:shadow-lg transition-all',
            )}
          >
            {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
          </Link>
        ) : (
          <>
            <Link
              to="/login"
              className={cm.cn(
                cm.flex({ align: 'center' }),
                cm.sp('px', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'min-h-[36px] items-center text-on-surface-variant hover:text-primary transition-colors',
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
                cm.textSize('sm'),
                'rounded-md bg-gradient-to-r from-primary to-secondary text-white shadow-md hover:shadow-lg transition-all',
              )}
            >
              {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
            </Link>
          </>
        )}
      </div>
    </header>
  )
}

export default LandingTopNavBar
