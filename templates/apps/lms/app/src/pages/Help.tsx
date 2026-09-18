import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

export function Help() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <main data-mol-id="page-help" className={cm.cn(cm.container({ size: 'md' }), cm.sp('py', 12))}>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
        {t('help.title', {}, { defaultValue: 'Help' })}
      </h1>
      <div className={cm.cn(cm.prose, cm.stack(6))}>
        <p>
          {t(
            'help.intro',
            {},
            {
              defaultValue:
                'Need help with coursework, assignments, or account access? Start with the resources below.',
            },
          )}
        </p>
        <section className={cm.stack(3)}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'))}>
            {t('help.studentsTitle', {}, { defaultValue: 'For students' })}
          </h2>
          <ul className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
            <li>
              {t(
                'help.studentsItem1',
                {},
                {
                  defaultValue:
                    'Check assignment due dates and submission status from the Assignments page.',
                },
              )}
            </li>
            <li>
              {t(
                'help.studentsItem2',
                {},
                {
                  defaultValue:
                    'Use Discussions to ask course questions and collaborate with classmates.',
                },
              )}
            </li>
            <li>
              {t(
                'help.studentsItem3',
                {},
                {
                  defaultValue: 'Reset your password from the login screen if you are locked out.',
                },
              )}
            </li>
          </ul>
        </section>
        <section className={cm.stack(3)}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'))}>
            {t('help.supportTitle', {}, { defaultValue: 'Contact support' })}
          </h2>
          <p>
            {t(
              'help.supportBody',
              {},
              {
                defaultValue:
                  'If a page is not loading, first refresh your browser and check your network connection. If the issue persists, contact your instructor or LMS administrator with your course name, timestamp, and a screenshot.',
              },
            )}
          </p>
        </section>
        <section className={cm.stack(2)}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'))}>
            {t('help.legalTitle', {}, { defaultValue: 'Policies' })}
          </h2>
          <div className={cm.flex({ gap: 4, align: 'center' })}>
            <LegalModalLinks
              linkClassName={cm.cn('text-primary hover:underline')}
              appName={APP_NAME}
              loadContent={loadContent}
              privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
              termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
            />
          </div>
        </section>
      </div>
    </main>
  )
}

export default Help
export { Help as HelpPage }
