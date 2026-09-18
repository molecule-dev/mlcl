import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'
function LandingFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <footer
      className={cm.cn(
        cm.w('full'),
        cm.sp('py', 16),
        cm.sp('px', 8),
        'mt-24 bg-surface-secondary border-t border-border',
      )}
    >
      <div
        className={cm.cn(
          cm.grid({ cols: 2, gap: 8 }),
          cm.maxW('7xl'),
          cm.mxAuto,
          'md:grid-cols-4 lg:grid-cols-6',
        )}
      >
        <div className={cm.cn('col-span-2 lg:col-span-2')}>
          <Link className={cm.cn('text-xl font-black text-foreground mb-4 inline-block')} to="/">
            {t('landingFooter.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </Link>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mb', 6),
              cm.maxW('xs'),
              'text-foreground-secondary',
            )}
          >
            {t(
              'landingFooter.tagline',
              {},
              {
                defaultValue:
                  'The premium 3D visualization platform for technical artisans and creative studios.',
              },
            )}
          </p>
          <div className={cm.cn(cm.textSize('xs'), 'text-foreground-tertiary')}>
            {t(
              'footer.copyright',
              { year: new Date().getFullYear(), appName: APP_NAME },
              { defaultValue: '© {{year}} {{appName}} Visualization. Precision Crafted.' },
            )}
          </div>
        </div>
        <div className={cm.flex({ direction: 'col', gap: 3 })}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              cm.sp('mb', 2),
              'text-foreground',
            )}
          >
            {t('nav.product', {}, { defaultValue: 'Product' })}
          </span>
          {/* Footer links only point to real routes — placeholder
          tools/pricing/learning/careers/etc. were removed because they 404'd. */}
          <Link
            className={cm.cn(
              'text-on-surface-variant hover:text-primary text-sm transition-colors',
            )}
            to="/models"
          >
            {t('landingFooter.showcase', {}, { defaultValue: 'Showcase' })}
          </Link>
          <Link
            className={cm.cn(
              'text-on-surface-variant hover:text-primary text-sm transition-colors',
            )}
            to="/upload"
          >
            {t('landingFooter.upload', {}, { defaultValue: 'Upload a model' })}
          </Link>
        </div>
        <div className={cm.flex({ direction: 'col', gap: 3 })}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              cm.sp('mb', 2),
              'text-foreground',
            )}
          >
            {t('form.company', {}, { defaultValue: 'Company' })}
          </span>
          <Link
            className={cm.cn(
              'text-on-surface-variant hover:text-primary text-sm transition-colors',
            )}
            to="/about"
          >
            {t('footer.about', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
          </Link>
        </div>
        <div className={cm.flex({ direction: 'col', gap: 3 })}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              cm.sp('mb', 2),
              'text-foreground',
            )}
          >
            {t('landingFooter.legalHeading', {}, { defaultValue: 'Legal' })}
          </span>
          <LegalModalLinks
            linkClassName={cm.cn(
              'text-on-surface-variant hover:text-primary text-sm transition-colors text-left',
            )}
            appName={APP_NAME}
            loadContent={loadContent}
            privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
            termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
          />
        </div>
      </div>
    </footer>
  )
}

export default LandingFooter
export { LandingFooter }
