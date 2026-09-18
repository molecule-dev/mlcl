import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'
export default function SearchPageFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <>
      {/* Footer Section */}
      <footer
        className={cm.cn(
          cm.sp('py', 12),
          'mt-20 border-t border-outline-variant/20 bg-surface-secondary',
        )}
        data-mol-id="footer"
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'start', justify: 'between', gap: 'xl' }),
            cm.mxAuto,
            cm.sp('px', 8),
            'max-w-7xl',
            'md:flex-row',
          )}
        >
          <div className={cm.maxW('xs')}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xl'),
                cm.sp('mb', 4),
                'font-manrope text-success block',
              )}
            >
              {t('footer.brandTitle', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
            </span>
            <p className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary leading-relaxed')}>
              {t(
                'footer.description',
                {},
                {
                  defaultValue:
                    'Defining digital space with the same intentionality as a physical luxury home. Curating excellence in residential experiences.',
                },
              )}
            </p>
          </div>
          <div
            className={cm.cn(
              cm.grid({ cols: 2, gap: 'xl' }),
              cm.w('full'),
              'md:grid-cols-3 md:w-auto',
            )}
          >
            <div className={cm.flex({ direction: 'col', gap: 'md' })}>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'text-on-surface uppercase tracking-widest',
                )}
              >
                {t('form.company', {}, { defaultValue: 'Company' })}
              </span>
              <Link
                className={cm.cn(
                  'font-inter text-foreground-secondary hover:text-success transition-colors text-sm',
                )}
                to="/about"
              >
                {t('footer.about', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
              </Link>
              <Link
                className={cm.cn(
                  cm.textSize('sm'),
                  'font-inter text-foreground-secondary hover:text-success transition-colors',
                )}
                to="/about"
              >
                {t('common.careers', {}, { defaultValue: 'Careers' })}
              </Link>
            </div>
            <div className={cm.flex({ direction: 'col', gap: 'md' })}>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'text-on-surface uppercase tracking-widest',
                )}
              >
                {t('footer.legalLabel', {}, { defaultValue: 'Legal' })}
              </span>
              <LegalModalLinks
                linkClassName={cm.cn(
                  'font-inter text-foreground-secondary hover:text-success transition-colors text-sm',
                )}
                appName={APP_NAME}
                loadContent={loadContent}
                privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
                termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
              />
            </div>
            <div className={cm.flex({ direction: 'col', gap: 'md' })}>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'text-on-surface uppercase tracking-widest',
                )}
              >
                {t('footer.supportLabel', {}, { defaultValue: 'Support' })}
              </span>
              <Link
                className={cm.cn(
                  cm.textSize('sm'),
                  'font-inter text-foreground-secondary hover:text-success transition-colors',
                )}
                to="/help"
              >
                {t('footer.fairHousingGuide', {}, { defaultValue: 'Fair Housing Guide' })}
              </Link>
              <Link
                className={cm.cn(
                  'font-inter text-foreground-secondary hover:text-success transition-colors text-sm',
                )}
                to="/help"
              >
                {t('common.helpCenter', {}, { defaultValue: 'Help Center' })}
              </Link>
            </div>
          </div>
        </div>
        <div
          className={cm.cn(
            cm.sp('mt', 12),
            cm.textCenter,
            cm.textSize('sm'),
            cm.sp('pt', 8),
            'text-foreground-tertiary font-inter border-t border-border',
          )}
        >
          {t(
            'footer.copyrightHousing',
            { year: new Date().getFullYear(), brand: APP_NAME },
            { defaultValue: '© {{year}} {{brand}}. Equal Housing Opportunity.' },
          )}
        </div>
      </footer>
    </>
  )
}
export { SearchPageFooter }
