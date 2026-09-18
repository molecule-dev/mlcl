import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

function LoginFooter() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const { openPrivacy, openTerms, modals } = useLegalModals({
    appName: APP_NAME,
    loadContent,
  })
  return (
    <footer className={cm.cn(cm.w('full'), cm.sp('py', 6), 'mt-auto')}>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.w('full'),
          'max-w-7xl',
          cm.mxAuto,
          'md:flex-row',
        )}
      >
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('medium'),
            cm.sp('mb', 4),
            // foreground-tertiary (#94a3b8) was 2.56:1 on white (axe serious); secondary = 7.6:1
            "uppercase tracking-widest text-foreground-secondary font-['Inter'] md:mb-0",
          )}
        >
          {t(
            'loginFooter.copyright',
            { year: new Date().getFullYear(), appName: APP_NAME },
            { defaultValue: '© {{year}} {{appName}}. Precision Architected.' },
          )}
        </span>
        <div className={cm.flex({ gap: 'xl' })}>
          <button type="button" className={cm.fv64c8657e} onClick={openPrivacy}>
            {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
          </button>
          <button type="button" className={cm.fv64c8657e} onClick={openTerms}>
            {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
          </button>
          {/* Decorative brand label (matches Login's meta links + Signup's footer) —
              not a link; it previously opened the Terms modal, which was misleading */}
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              // foreground-tertiary (#94a3b8) was 2.56:1 on white (axe serious); secondary = 7.6:1
              "uppercase tracking-widest text-foreground-secondary font-['Inter']",
            )}
          >
            {t('nav.security', {}, { defaultValue: 'Security' })}
          </span>
        </div>
      </div>
      {modals}
    </footer>
  )
}

export default LoginFooter
export { LoginFooter }
