import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

export default function AuthFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const legalLinkClass = cm.cn(
    'text-[10px] uppercase tracking-[0.15em] font-bold text-on-surface-variant hover:text-primary transition-colors',
  )
  return (
    <footer
      className={cm.cn(
        cm.flex({ justify: 'center', gap: 'xl', wrap: 'wrap' }),
        cm.sp('px', 8),
        'w-full shrink-0 pt-8',
      )}
    >
      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          'text-[10px] uppercase tracking-[0.15em] text-on-surface-variant',
        )}
      >
        {t(
          'footer.copyright',
          { year: new Date().getFullYear(), appName: APP_NAME },
          { defaultValue: '© {{year}} {{appName}}' },
        )}
      </span>
      <div className={cm.cn(cm.flex({ gap: 'lg' }))}>
        <LegalModalLinks
          linkClassName={legalLinkClass}
          appName={APP_NAME}
          loadContent={loadContent}
          privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
          termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
        />
        <Link
          className={cm.cn(
            'text-[10px] uppercase tracking-[0.15em] font-bold text-on-surface-variant hover:text-primary transition-colors',
          )}
          to="/help"
        >
          {t('footer.support', {}, { defaultValue: 'Support' })}
        </Link>
      </div>
    </footer>
  )
}
export { AuthFooter }
