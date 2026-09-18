import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

/**
 * Public marketing footer shared across the Landing, About, and other
 * unauthenticated pages. Carries the copyright line plus quick links to the
 * About and Pricing pages, plus Privacy/Terms links that open IN-PLACE modals
 * (`LegalModalLinks`) with the bonded legal HTML pre-loaded via `loadContent` —
 * the standalone `/privacy` and `/terms` routes still exist for direct links.
 *
 * @returns The rendered public footer.
 */
export function LandingFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const legalLinkClass = cm.cn(cm.fontWeight('medium'), 'hover:text-on-surface transition-colors')

  return (
    <footer
      data-mol-id="landing-footer"
      className={cm.cn(
        cm.sp('py', 8),
        cm.textSize('sm'),
        'bg-surface border-t border-outline-variant text-on-surface-variant',
      )}
    >
      <div
        className={cm.cn(
          cm.maxW('7xl'),
          cm.mxAuto,
          cm.sp('px', 6),
          cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
        )}
      >
        <p>
          {t(
            'common.copyrightBuiltWithMolecule',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '© {{year}} {{app}}. Built with Molecule.' },
          )}
        </p>
        <nav
          aria-label={t('footer.linksLabel', {}, { defaultValue: 'Footer' })}
          className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}
        >
          <Link
            to="/about"
            data-mol-id="footer-about"
            className={cm.cn(cm.fontWeight('medium'), 'hover:text-on-surface transition-colors')}
          >
            {t('nav.about', {}, { defaultValue: 'About' })}
          </Link>
          <Link
            to="/pricing"
            data-mol-id="footer-pricing"
            className={cm.cn(cm.fontWeight('medium'), 'hover:text-on-surface transition-colors')}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          <LegalModalLinks
            linkClassName={legalLinkClass}
            appName={APP_NAME}
            loadContent={loadContent}
            privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
          />
        </nav>
      </div>
    </footer>
  )
}

export default LandingFooter
