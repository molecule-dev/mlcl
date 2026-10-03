import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AppShell } from '../components/AppShell.js'

interface Section {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const SECTIONS: Section[] = [
  {
    id: 'collect',
    titleKey: 'privacy.collectTitle',
    titleDefault: 'What we collect',
    bodyKey: 'privacy.collect',
    bodyDefault:
      'We collect account details (email, name), bot configuration, training data you upload, and conversation logs needed to operate the service.',
  },
  {
    id: 'share',
    titleKey: 'privacy.shareTitle',
    titleDefault: 'How we share data',
    bodyKey: 'privacy.share',
    bodyDefault:
      'We send prompts to your selected model provider (OpenAI, Anthropic, etc.) under their data-processing terms. We do not sell your data.',
  },
  {
    id: 'control',
    titleKey: 'privacy.controlTitle',
    titleDefault: 'Your controls',
    bodyKey: 'privacy.control',
    bodyDefault:
      'You can export or delete any bot, knowledge base item, or conversation from its detail page. Deleting your account purges all associated data within 30 days.',
  },
]

export function Privacy() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <AppShell sidebar={false}>
      <ContentPageShell
        dataMolId="page-privacy"
        eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
        title={t('privacy.title', {}, { defaultValue: 'Privacy policy' })}
        subtitle={t(
          'privacy.intro',
          { appName: APP_NAME },
          {
            defaultValue:
              '{{appName}} takes the privacy of your data and your end users seriously.',
          },
        )}
      >
        <div className={cm.cn(cm.stack(8))}>
          {SECTIONS.map((s) => (
            <section key={s.id} data-mol-id={`privacy-${s.id}`} className={cm.cn(cm.stack(2))}>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
                {t(s.titleKey, {}, { defaultValue: s.titleDefault })}
              </h2>
              <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                {t(s.bodyKey, {}, { defaultValue: s.bodyDefault })}
              </p>
            </section>
          ))}
        </div>
      </ContentPageShell>
    </AppShell>
  )
}

export default Privacy
export { Privacy as PrivacyPage }
