import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'
import { BrandWordmark } from './BrandWordmark.js'

/**
 * Public marketing footer shared by the Landing page and the standalone public
 * pages (About / Privacy / Terms). Auth-aware: signed-in visitors see a single
 * "Go to Dashboard" link instead of the sign-in / sign-up pair.
 */
export function LandingFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  const columnHeading = cm.cn(
    cm.textSize('sm'),
    cm.fontWeight('semibold'),
    cm.sp('mb', 4),
    'text-on-surface',
  )
  const columnLink = cm.cn(
    cm.textSize('sm'),
    'text-on-surface-variant hover:text-primary transition-colors',
  )

  return (
    <footer
      data-mol-id="landing-footer"
      className={cm.cn(
        cm.sp('px', 8),
        'pt-14 pb-8',
        'border-t border-outline-variant/40 bg-surface-container-low',
      )}
    >
      <div className={cm.cn(cm.mxAuto, 'max-w-[1400px]')}>
        <div className={cm.sp('mb', 10)}>
          <BrandWordmark as="span" footer />
        </div>
        <div className={cm.cn('grid grid-cols-2 gap-10 md:grid-cols-4', cm.sp('mt', 8))}>
          <div>
            <h4 className={columnHeading}>
              {t('landing.footer.product', {}, { defaultValue: 'Product' })}
            </h4>
            <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              <li>
                <Link to="/signup" className={columnLink}>
                  {t('landing.ctaButton', {}, { defaultValue: 'Start free today' })}
                </Link>
              </li>
              <li>
                <Link to="/login" className={columnLink}>
                  {t('auth.login.signInButton', {}, { defaultValue: 'Log in' })}
                </Link>
              </li>
              {isAuthenticated ? (
                <li>
                  <Link to="/dashboard" data-mol-id="footer-go-to-dashboard" className={columnLink}>
                    {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
                  </Link>
                </li>
              ) : null}
            </ul>
          </div>
          <div>
            <h4 className={columnHeading}>
              {t('landing.footer.company', {}, { defaultValue: 'Company' })}
            </h4>
            <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              <li>
                <Link to="/about" className={columnLink}>
                  {t('nav.about', {}, { defaultValue: 'About' })}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className={columnHeading}>
              {t('landing.footer.legal', {}, { defaultValue: 'Legal' })}
            </h4>
            <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              <li
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  'flex-wrap [&>a:first-child]:mr-4',
                )}
              >
                <LegalModalLinks
                  linkClassName={columnLink}
                  appName={APP_NAME}
                  loadContent={loadContent}
                  privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy Policy' })}
                  termsLabel={t('nav.terms', {}, { defaultValue: 'Terms of Service' })}
                />
              </li>
            </ul>
          </div>
          <div>
            <h4 className={columnHeading}>
              {t('landing.footer.workspace', {}, { defaultValue: 'Workspace' })}
            </h4>
            <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              <li>
                <Link to="/signup" className={columnLink}>
                  {t('common.signUp', {}, { defaultValue: 'Create workspace' })}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mt', 12),
            'border-t border-outline-variant/40 pt-6 text-on-surface-variant',
          )}
        >
          {t(
            'landing.copyright',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '© {{year}} {{app}}' },
          )}{' '}
          — Built with{' '}
          <a
            href="https://molecule.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline font-medium"
          >
            Molecule.dev
          </a>
        </p>
      </div>
    </footer>
  )
}

export default LandingFooter
