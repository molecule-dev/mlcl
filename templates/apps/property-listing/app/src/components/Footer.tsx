import React from 'react'
import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

export function Footer() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const legalLinkClass = cm.cn(
    cm.textSize('sm'),
    'text-foreground-secondary font-inter hover:text-success dark:hover:text-emerald-300 transition-colors',
  )
  return (
    <footer
      className={cm.cn(
        cm.w('full'),
        'mt-20',
        cm.sp('py', 12),
        cm.sp('px', 8),
        cm.flex({ direction: 'col', justify: 'between', align: 'center' }),
        'md:flex-row',
        'max-w-7xl',
        cm.mxAuto,
        'border-t border-border bg-surface',
      )}
    >
      <div className={cm.cn(cm.sp('mb', 6), cm.textCenter, 'md:mb-0 md:text-left')}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('xl'),
            cm.sp('mb', 2),
            'text-success font-manrope block',
          )}
        >
          {t('footer.brand', { brand: APP_NAME }, { defaultValue: '{{brand}}' })}
        </span>
        <p className={cm.cn(cm.textSize('sm'), 'font-inter text-foreground-secondary')}>
          {t(
            'footer.copyright',
            { year: new Date().getFullYear(), brand: APP_NAME },
            { defaultValue: '© {{year}} {{brand}}. All rights reserved.' },
          )}
        </p>
      </div>
      <div className={cm.flex({ gap: 'xl' })}>
        <Link
          className={cm.cn(
            cm.textSize('sm'),
            'text-foreground-secondary font-inter hover:text-success dark:hover:text-emerald-300 transition-colors',
          )}
          to="/about"
        >
          {t('nav.about', {}, { defaultValue: 'About' })}
        </Link>
        <LegalModalLinks
          linkClassName={legalLinkClass}
          appName={APP_NAME}
          loadContent={loadContent}
          privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
          termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
        />
      </div>
    </footer>
  )
}
export default Footer
