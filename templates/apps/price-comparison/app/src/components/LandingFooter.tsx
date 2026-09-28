import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

/**
 * Public marketing-chrome footer shared by the Landing page and the
 * standalone public pages (About, Privacy, Terms). Privacy and Terms open
 * IN-PLACE modals via {@link LegalModalLinks} (same bonded content as the
 * /privacy and /terms routes) rather than navigating away.
 *
 * Restyled to reference/flagship-apps-designs/design-price-comparison-landing.html:
 * a warm surface-container-low grid with a Product column and a Company
 * column around the brand block.
 */
export function LandingFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()

  const linkClassName = cm.cn(
    'text-on-surface-variant hover:text-primary underline-offset-4 hover:underline transition-colors duration-200',
  )
  const headingClassName = cm.cn(cm.fontWeight('semibold'), 'text-on-surface mb-2')

  return (
    <footer
      className={cm.cn(
        cm.sp('px', 8),
        cm.sp('py', 16),
        'w-full border-t border-outline-variant/50 bg-surface-container-low',
      )}
    >
      <div
        data-mol-id="landing-footer"
        className={cm.cn(cm.maxW('xl'), cm.mxAuto, 'grid grid-cols-2 md:grid-cols-4 gap-8 text-sm')}
      >
        <div className={cm.cn('col-span-2 md:col-span-1 flex flex-col gap-4')}>
          <div
            className={cm.cn(
              cm.fontWeight('extrabold'),
              cm.textSize('xl'),
              'text-on-surface tracking-tight',
            )}
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {APP_NAME}
          </div>
          {/* App-scoped key: the shared `common.copyrightBuiltWithMolecule`
              already contains ". Built with Molecule.dev", which duplicated
              the sibling link below. */}
          <p className={cm.cn('text-on-surface-variant', cm.sp('mt', 2))}>
            {t(
              'landing.copyright',
              { year: new Date().getFullYear(), app: APP_NAME },
              { defaultValue: '© {{year}} {{app}}' },
            )}
            {' — Built with '}
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
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          <h4 className={headingClassName}>
            {t('landing.footer.product', {}, { defaultValue: 'Product' })}
          </h4>
          <Link to="/about" className={linkClassName}>
            {t('landing.howItWorks', {}, { defaultValue: 'How it works' })}
          </Link>
          <Link to="/deals" className={linkClassName}>
            {t('landing.browseDeals', {}, { defaultValue: 'Browse Deals' })}
          </Link>
          <Link to="/alerts" className={linkClassName}>
            {t('landing.nav.alerts', {}, { defaultValue: 'Alerts' })}
          </Link>
          <Link to="/signup" className={linkClassName}>
            {t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
          </Link>
        </div>
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          <h4 className={headingClassName}>
            {t('landing.footer.company', {}, { defaultValue: 'Company' })}
          </h4>
          <Link to="/about" className={linkClassName}>
            {t('footer.about', { appName: APP_NAME }, { defaultValue: 'About' })}
          </Link>
          <Link to="/pricing" className={linkClassName}>
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
        </div>
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          <h4 className={headingClassName}>
            {t('landing.footer.legal', {}, { defaultValue: 'Legal' })}
          </h4>
          <LegalModalLinks
            linkClassName={linkClassName}
            appName={APP_NAME}
            loadContent={loadContent}
          />
        </div>
      </div>
    </footer>
  )
}

export default LandingFooter
