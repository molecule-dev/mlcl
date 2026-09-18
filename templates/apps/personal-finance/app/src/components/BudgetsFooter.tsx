import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'
function BudgetsFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <footer
      className={cm.cn(
        cm.sp('pt', 12),
        cm.flex({ justify: 'between', align: 'center' }),
        'mt-20 border-t border-border text-foreground-tertiary',
      )}
    >
      <p className={cm.textSize('xs')}>
        {t(
          'budgetsFooter.legalNotice',
          {
            copyrightYear: new Date().getFullYear(),
            updatedDate: new Date().toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            appName: APP_NAME,
          },
          {
            defaultValue:
              '© {{copyrightYear}} {{appName}} Financial Services. All figures updated as of {{updatedDate}}.',
          },
        )}
      </p>
      <div className={cm.flex({ gap: 'lg' })}>
        <LegalModalLinks
          linkClassName={cm.cn('text-xs hover:text-primary transition-colors')}
          appName={APP_NAME}
          loadContent={loadContent}
          privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
          termsLabel={t('budgetsFooter.termsOfUse', {}, { defaultValue: 'Terms of Use' })}
        />
      </div>
    </footer>
  )
}

export default BudgetsFooter
export { BudgetsFooter }
