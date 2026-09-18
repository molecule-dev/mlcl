import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

/**
 * Public marketing footer shared by the Landing page and the standalone public
 * pages (About / Privacy / Terms). Auth-aware: signed-in visitors see a single
 * "Go to Dashboard" link instead of the sign-in / sign-up pair.
 */
export function LandingFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  const linkClass = cm.cn(
    cm.textSize('xs'),
    cm.fontWeight('semibold'),
    'uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors',
  )

  return (
    <footer
      data-mol-id="landing-footer"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'border-t border-outline-variant/40')}
    >
      <div
        className={cm.cn(
          cm.mxAuto,
          'max-w-[1400px]',
          cm.flex({ align: 'center', justify: 'between' }),
          'flex-wrap gap-4',
        )}
      >
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          © 2026 {APP_NAME}
        </p>
        <div className={cm.flex({ align: 'center', gap: 6 })}>
          <Link to="/about" className={linkClass}>
            {t('nav.about', {}, { defaultValue: 'About' })}
          </Link>
          <LegalModalLinks
            linkClassName={linkClass}
            appName={APP_NAME}
            loadContent={loadContent}
            privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
          />
          {isAuthenticated ? (
            <Link to="/dashboard" data-mol-id="footer-go-to-dashboard" className={linkClass}>
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link to="/login" className={linkClass}>
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link to="/signup" className={linkClass}>
                {t('common.signUp', {}, { defaultValue: 'Create workspace' })}
              </Link>
            </>
          )}
        </div>
      </div>
    </footer>
  )
}

export default LandingFooter
