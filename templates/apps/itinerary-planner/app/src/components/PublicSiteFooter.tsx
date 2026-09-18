import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { loadContent } from '../config.js'

/**
 * Public site footer for marketing/content pages (About, Privacy, Terms).
 * Mirrors the Landing page's inline footer chrome (brand wordmark, tagline,
 * navigation links, copyright) so the public surfaces share one brand voice.
 *
 * Privacy/Terms open IN-PLACE modals (`LegalModalLinks`) with the bonded
 * legal HTML pre-loaded via `loadContent`, so they never render empty — the
 * standalone `/privacy` and `/terms` routes still exist for direct/deep links.
 */
export function PublicSiteFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <footer
      data-mol-id="public-site-footer"
      className={cm.cn('bg-surface border-t border-outline-variant/40')}
    >
      <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 12), cm.mxAuto)}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          )}
        >
          <div>
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
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
              {t(
                'landing.footer.tagline',
                { tagline: APP_TAGLINE },
                { defaultValue: '{{tagline}}.' },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), cm.textSize('sm'))}>
            <Link to="/about" className={'text-on-surface-variant hover:text-primary'}>
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
            <Link to="/login" className={'text-on-surface-variant hover:text-primary'}>
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
            <Link to="/signup" className={'text-on-surface-variant hover:text-primary'}>
              {t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
            </Link>
            <LegalModalLinks
              linkClassName={'text-on-surface-variant hover:text-primary'}
              appName={APP_NAME}
              loadContent={loadContent}
              privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
            />
          </div>
        </div>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.sp('mt', 8),
            cm.textCenter,
            'text-on-surface-variant',
          )}
        >
          {t(
            'common.copyrightAllRightsReserved',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '© {{year}} {{app}}. All rights reserved.' },
          )}
        </p>
      </div>
    </footer>
  )
}

export default PublicSiteFooter
