import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Public marketing chrome — the top navigation shared by the Landing page and
 * the standalone public pages (About / Privacy / Terms) so the brand stays
 * consistent. Auth-aware: when the visitor is signed in the auth links collapse
 * to a single "Go to Dashboard" CTA.
 *
 * @param showSectionLinks - Render the on-page section anchors (Features /
 *   Customers). Only the Landing page has those sections, so sub-pages omit them.
 */
export function LandingTopNav({ showSectionLinks = false }: { showSectionLinks?: boolean }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <header
      data-mol-id="landing-top-nav"
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 8),
        cm.sp('py', 5),
        'sticky top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/40',
      )}
    >
      <Link to="/" data-mol-id="nav-brand" className={cm.flex({ align: 'center', gap: 3 })}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/30',
          )}
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined text-on-primary')}>
            videocam
          </span>
        </div>
        <span className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
          {APP_NAME}
        </span>
      </Link>

      <nav className={cm.cn(cm.flex({ align: 'center', gap: 6 }), 'hidden md:flex')}>
        {showSectionLinks ? (
          <>
            <a
              href="#features"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('landing.navFeatures', {}, { defaultValue: 'Features' })}
            </a>
            <a
              href="#trust"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('landing.navCustomers', {}, { defaultValue: 'Customers' })}
            </a>
          </>
        ) : (
          <Link
            to="/about"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('nav.about', {}, { defaultValue: 'About' })}
          </Link>
        )}
      </nav>

      <div className={cm.flex({ align: 'center', gap: 3 })}>
        {isAuthenticated ? (
          <Link
            to="/dashboard"
            data-mol-id="nav-go-to-dashboard"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.roundedFull,
              'bg-gradient-to-r from-primary to-secondary text-on-primary shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/40 transition-all',
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
                'text-on-surface-variant hover:text-primary transition-colors hidden sm:inline',
              )}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
            <Link
              to="/signup"
              data-mol-id="nav-sign-up"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                cm.roundedFull,
                'bg-gradient-to-r from-primary to-secondary text-on-primary shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/40 transition-all',
              )}
            >
              {t('common.signUp', {}, { defaultValue: 'Create workspace' })}
            </Link>
          </>
        )}
      </div>
    </header>
  )
}

export default LandingTopNav
