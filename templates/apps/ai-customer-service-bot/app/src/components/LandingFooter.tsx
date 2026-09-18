/**
 * LandingFooter — shared public footer for Rapport's marketing & content pages
 * (Landing, About, Privacy, Terms). About links to its standalone route.
 * Privacy/Terms open IN-PLACE modals (`LegalModalLinks`) with the bonded legal
 * HTML pre-loaded via `loadContent`, so they never render empty — the standalone
 * `/privacy` and `/terms` routes still exist for direct/deep links.
 */
import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

export function LandingFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <footer
      data-mol-id="landing-footer"
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 6),
        cm.sp('py', 8),
        cm.textSize('xs'),
        'md:px-12 text-on-surface-variant border-t border-outline-variant/30',
      )}
    >
      <span>
        {t(
          'landing.footer.copyright',
          { year: new Date().getFullYear(), appName: APP_NAME },
          { defaultValue: '© {{year}} {{appName}}. Made with care.' },
        )}
      </span>
      <div className={cm.flex({ align: 'center', gap: 6 })}>
        <Link
          data-mol-id="footer-about"
          to="/about"
          className={'hover:text-on-surface transition-colors'}
        >
          {t('nav.about', {}, { defaultValue: 'About' })}
        </Link>
        <LegalModalLinks
          linkClassName={'hover:text-on-surface transition-colors'}
          appName={APP_NAME}
          loadContent={loadContent}
          privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
          termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
        />
      </div>
    </footer>
  )
}

export default LandingFooter
