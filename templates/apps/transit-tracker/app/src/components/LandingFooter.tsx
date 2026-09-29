import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { loadContent } from '../config.js'

/**
 * Public marketing footer shared across the Landing page and the standalone
 * public pages (About / Privacy / Terms) so the brand chrome stays
 * consistent.
 *
 * About/Search/Alerts/Sign in/Create account are internal `<Link>` routes.
 * Privacy/Terms open IN-PLACE modals (`LegalModalLinks`) with the bonded legal
 * HTML pre-loaded via `loadContent` — the standalone `/privacy` and `/terms`
 * routes still exist for direct/deep links.
 */
export function LandingFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <footer
      data-mol-id="landing-footer"
      className={cm.cn('bg-surface border-t border-outline-variant/40')}
    >
      <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 12), cm.mxAuto)}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          )}
        >
          <div>
            <BrandWordmark as="span" footer />
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
              {t('landing.footer.tagline', {}, { defaultValue: 'Every line, every stop, live.' })}
            </p>
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
              cm.textSize('sm'),
            )}
          >
            <Link to="/about" className={'text-on-surface-variant hover:text-primary'}>
              {t('common.about', {}, { defaultValue: 'About' })}
            </Link>
            <Link to="/nearby" className={'text-on-surface-variant hover:text-primary'}>
              {t('nav.nearby', {}, { defaultValue: 'Live boards' })}
            </Link>
            <Link to="/saved" className={'text-on-surface-variant hover:text-primary'}>
              {t('nav.saved', {}, { defaultValue: 'Saved stops' })}
            </Link>
            <LegalModalLinks
              linkClassName={'text-on-surface-variant hover:text-primary'}
              appName={APP_NAME}
              loadContent={loadContent}
              privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
              termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
            />
            <Link to="/login" className={'text-on-surface-variant hover:text-primary'}>
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
            <Link to="/signup" className={'text-on-surface-variant hover:text-primary'}>
              {t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
            </Link>
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
