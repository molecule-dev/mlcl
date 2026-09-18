import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'
import { SafeLink } from './SafeLink.js'
function LoginFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <footer className={cm.cn(cm.w('full'), 'mt-20 bg-surface-container-low')}>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', justify: 'between', align: 'center', gap: 'lg' }),
          cm.sp('px', 8),
          cm.sp('py', 12),
          cm.mxAuto,
          'max-w-7xl',
          'md:flex-row',
        )}
      >
        <SafeLink to="/" className={cm.cn(cm.textSize('lg'), 'font-serif italic text-foreground')}>
          {t('common.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </SafeLink>
        <div className={cm.cn(cm.flex({ wrap: 'wrap', justify: 'center' }), 'gap-x-8 gap-y-4')}>
          <SafeLink
            className={cm.cn(
              'text-[10px]',
              'font-sans tracking-wide uppercase text-foreground-secondary hover:text-foreground transition-all',
            )}
            to="/help"
          >
            {t('loginFooter.help', {}, { defaultValue: 'Help' })}
          </SafeLink>
          <SafeLink
            className={cm.cn(
              'text-[10px]',
              'font-sans tracking-wide uppercase text-foreground-secondary hover:text-foreground transition-all',
            )}
            to="/about"
          >
            {t('footer.about', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
          </SafeLink>
          <LegalModalLinks
            linkClassName={cm.cn(
              'text-[10px]',
              'font-sans tracking-wide uppercase text-foreground-secondary hover:text-foreground transition-all',
            )}
            appName={APP_NAME}
            loadContent={loadContent}
            privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
          />
        </div>
        <div
          className={cm.cn(
            cm.textSize('xs'),
            'font-sans tracking-wide uppercase text-foreground-secondary',
          )}
        >
          {t(
            'loginFooter.copyright',
            { year: new Date().getFullYear(), appName: APP_NAME },
            { defaultValue: '© {{year}} {{appName}}. All rights reserved.' },
          )}
        </div>
      </div>
    </footer>
  )
}

export default LoginFooter
export { LoginFooter }
