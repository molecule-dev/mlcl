import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

/**
 * Public marketing footer, shared across the Landing, About, Privacy and
 * Terms pages so the brand chrome stays identical everywhere.
 *
 * The About/Pricing/Sign in/Open-an-account links are internal `<Link>`
 * routes. Privacy/Terms open IN-PLACE modals (`LegalModalLinks`) with the
 * bonded legal HTML pre-loaded via `loadContent`, so they never render
 * empty — the standalone `/privacy` and `/terms` routes still exist for
 * direct/deep links.
 */
export function LandingFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <footer
      data-mol-id="landing-footer"
      className={cm.cn('bg-surface-container/30 border-t border-outline-variant/40')}
    >
      <div
        className={cm.cn(
          cm.maxW('7xl'),
          cm.sp('px', 6),
          cm.sp('py', 8),
          cm.mxAuto,
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          'flex-wrap',
        )}
      >
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t(
            'landing.copyright',
            { year: new Date().getFullYear(), app: APP_NAME },
            {
              defaultValue:
                '© {{year}} {{app}}. Not investment advice. Past performance does not guarantee future results.',
            },
          )}
        </p>
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'flex-wrap', cm.textSize('xs'))}
        >
          {/* py-2 keeps every footer link a ≥28px tap target on touch screens */}
          <Link
            to="/about"
            className={cm.cn(cm.sp('py', 2), 'text-on-surface-variant hover:text-on-surface')}
          >
            {t('nav.about', {}, { defaultValue: 'About' })}
          </Link>
          <Link
            to="/pricing"
            className={cm.cn(cm.sp('py', 2), 'text-on-surface-variant hover:text-on-surface')}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          <LegalModalLinks
            linkClassName={cm.cn(
              cm.sp('py', 2),
              'inline-block text-on-surface-variant hover:text-on-surface',
            )}
            appName={APP_NAME}
            loadContent={loadContent}
            privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
            termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
          />
          <Link
            to="/login"
            className={cm.cn(cm.sp('py', 2), 'text-on-surface-variant hover:text-on-surface')}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
          <Link
            to="/signup"
            className={cm.cn(cm.sp('py', 2), 'text-on-surface-variant hover:text-on-surface')}
          >
            {t('landing.footerSignup', {}, { defaultValue: 'Open an account' })}
          </Link>
        </div>
      </div>
    </footer>
  )
}

export default LandingFooter
