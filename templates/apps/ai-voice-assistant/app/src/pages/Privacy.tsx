/**
 * Public privacy policy. Real-content sections (intro, what we collect,
 * subprocessors, deleting your data, contact) so the page is not a
 * boilerplate stub. Every string flows through `t()`.
 *
 * @returns The rendered privacy policy page.
 */
import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface Section {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyValues?: Record<string, string>
  bodyDefault: string
}

const SECTIONS: Section[] = [
  {
    id: 'collection',
    titleKey: 'privacy.collection.title',
    titleDefault: 'What we collect',
    bodyKey: 'privacy.collection.workspace',
    bodyDefault:
      'Your account email and display name; conversation transcripts, audio you record, and persona settings you create; aggregate usage analytics (page navigations, feature toggles).',
  },
  {
    id: 'processors',
    titleKey: 'privacy.processors.title',
    titleDefault: 'Subprocessors',
    bodyKey: 'privacy.processors.body',
    bodyDefault:
      'When you talk to your assistant we forward your audio to OpenAI Whisper for transcription, your transcript to Anthropic (Claude) for the reply, and the reply to ElevenLabs or OpenAI for voice synthesis. Each provider is bound by its own data-processing terms; nothing is retained for retraining.',
  },
  {
    id: 'deletion',
    titleKey: 'privacy.deletion.title',
    titleDefault: 'Deleting your data',
    bodyKey: 'privacy.deletion.body',
    bodyDefault:
      'You can delete a conversation, persona, or audio clip at any time from the relevant page. Deleting your account from Settings purges every conversation, transcript, and persona row tied to your workspace.',
  },
  {
    id: 'contact',
    titleKey: 'nav.contact',
    titleDefault: 'Contact',
    bodyKey: 'privacy.contact.body',
    bodyValues: { app: APP_NAME },
    bodyDefault:
      'Questions about this policy? Reach the {{app}} team through the support link in your account menu.',
  },
]

export function Privacy() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-privacy"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('privacy.title', {}, { defaultValue: 'Privacy policy' })}
      subtitle={t(
        'privacy.intro',
        { app: APP_NAME },
        {
          defaultValue:
            '{{app}} stores the conversations and voice clips you create only as long as needed to deliver the assistant experience. We never sell your data, and we never use customer audio or transcripts to train external AI models.',
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
              {t(s.bodyKey, s.bodyValues ?? {}, { defaultValue: s.bodyDefault })}
            </p>
          </section>
        ))}
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t('privacy.lastUpdated', {}, { defaultValue: 'Last updated: 2026-05-01' })}
        </p>
        <Link
          to="/"
          data-mol-id="privacy-back-home"
          className={cm.cn(cm.fontWeight('bold'), 'text-primary')}
        >
          {t('nav.backToHome', {}, { defaultValue: '← Back to home' })}
        </Link>
      </div>
    </ContentPageShell>
  )
}

export default Privacy
export { Privacy as PrivacyPage }
