import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingTopNavBar } from '../components/LandingTopNavBar.js'

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
    bodyKey: 'privacy.collectBody',
    bodyDefault:
      'We collect account info (email, display name), meeting audio you upload or record, plus the transcripts and summaries our models generate from it, and subscription metadata from Stripe.',
  },
  {
    id: 'use',
    titleKey: 'privacy.useTitle',
    titleDefault: 'How we use it',
    bodyKey: 'privacy.useBody',
    bodyDefault:
      'Audio is sent to OpenAI Whisper for transcription and to Anthropic Claude for summarization and action-item extraction. Their APIs do not retain your data for training. We store the resulting transcripts, summaries, and action items in our database so you can search and revisit them.',
  },
  {
    id: 'share',
    titleKey: 'privacy.shareTitle',
    titleDefault: 'Sharing',
    bodyKey: 'privacy.shareBody',
    bodyDefault:
      'We do not sell your data. The only third parties that process your meeting content are the transcription, summarization, and infrastructure providers explicitly listed in this policy.',
  },
  {
    id: 'control',
    titleKey: 'privacy.controlTitle',
    titleDefault: 'Your controls',
    bodyKey: 'privacy.controlBody',
    bodyDefault:
      'You can delete a meeting (and its transcript) from the meeting detail page at any time. Deleting your account removes all meetings, action items, integrations, and team membership records associated with it.',
  },
  {
    id: 'contact',
    titleKey: 'nav.contact',
    titleDefault: 'Contact',
    bodyKey: 'privacy.contactBody',
    bodyDefault:
      'Privacy questions or data-export requests can be sent to privacy@murmur.app. We respond within ten business days.',
  },
]

export function Privacy() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-privacy"
      header={<LandingTopNavBar />}
      footer={<LandingFooter />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
      subtitle={t(
        'privacy.intro',
        { appName: APP_NAME },
        {
          defaultValue:
            '{{appName}} turns audio recordings of your meetings into transcripts, summaries, and action items. This policy explains what data we collect, how we use it, and the controls you have over it.',
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
  )
}

export default Privacy
export { Privacy as PrivacyPage }
