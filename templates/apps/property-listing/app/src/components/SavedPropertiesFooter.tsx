import React from 'react'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

function SavedPropertiesFooter() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <footer className={cm.cn('bg-surface-container-low mt-20')} data-mol-id="footer-01">
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'between', gap: 'lg' }),
          cm.sp('px', 8),
          cm.sp('py', 12),
          cm.mxAuto,
          'md:flex-row w-full max-w-7xl',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
            'md:items-start',
          )}
        >
          <span
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('xl'), 'font-manrope text-success')}
          >
            {t('footer.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </span>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              'font-inter tracking-normal text-foreground-secondary',
            )}
          >
            {t(
              'footer.copyrightCurated',
              {
                year: new Date().getFullYear(),
                brand: t(
                  'footer.brandName',
                  { appName: APP_NAME },
                  { defaultValue: '{{appName}}' },
                ),
              },
              { defaultValue: '© {{year}} {{brand}}. Architectural Curation.' },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ justify: 'center', wrap: 'wrap', gap: 'xl' }))}>
          <LegalModalLinks
            linkClassName={cm.cn(
              'font-inter text-sm tracking-normal text-foreground-secondary hover:text-success dark:hover:text-emerald-300 transition-colors',
            )}
            appName={APP_NAME}
            loadContent={loadContent}
            privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
          />
        </div>
      </div>
    </footer>
  )
}

export default SavedPropertiesFooter
export { SavedPropertiesFooter }
