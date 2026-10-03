import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AppShell } from '../components/AppShell.js'

export function Help() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <AppShell>
      <main
        data-mol-id="page-help"
        className={cm.cn(
          cm.flex1,
          cm.mxAuto,
          cm.w('full'),
          'max-w-3xl',
          cm.sp('px', 6),
          cm.sp('py', 12),
        )}
      >
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
          {t('help.title', {}, { defaultValue: 'Help & support' })}
        </h1>
        <div className={cm.cn(cm.stack(4), 'prose')}>
          <p>
            {t(
              'help.intro',
              { appName: APP_NAME },
              {
                defaultValue:
                  '{{appName}} helps you build, train, and deploy AI chatbots without writing infrastructure code.',
              },
            )}
          </p>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mt', 6))}>
            {t('help.gettingStartedTitle', {}, { defaultValue: 'Getting started' })}
          </h2>
          <ul className={cm.cn(cm.stack(2))}>
            <li>
              {t('help.step1', {}, { defaultValue: 'Create a bot from My Bots → Create Bot.' })}
            </li>
            <li>
              {t(
                'help.step2',
                {},
                { defaultValue: 'Add intents and training phrases under the bot editor.' },
              )}
            </li>
            <li>
              {t(
                'help.step3',
                {},
                { defaultValue: 'Upload supporting documents to the Knowledge Base.' },
              )}
            </li>
            <li>
              {t(
                'help.step4',
                {},
                { defaultValue: 'Test conversations from the Test Chat panel.' },
              )}
            </li>
            <li>
              {t(
                'help.step5',
                {},
                { defaultValue: 'Deploy via the Deploy tab — embed widget, share link, or API.' },
              )}
            </li>
          </ul>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mt', 6))}>
            {t('help.contactTitle', {}, { defaultValue: 'Need more help?' })}
          </h2>
          <p>
            {t(
              'help.contact',
              {},
              {
                defaultValue: 'Contact support@neuralforge.dev for direct help with your account.',
              },
            )}
          </p>
        </div>
      </main>
    </AppShell>
  )
}

export default Help
export { Help as HelpPage }
