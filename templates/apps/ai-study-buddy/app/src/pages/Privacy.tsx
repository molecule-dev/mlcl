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
    id: 'collect',
    titleKey: 'privacy.collectTitle',
    titleDefault: 'What we collect',
    bodyKey: 'privacy.collectBody',
    bodyDefault:
      'Account email, the courses, decks, notes and quiz attempts you create, and aggregated study activity used to surface your progress charts.',
  },
  {
    id: 'use',
    titleKey: 'privacy.useTitle',
    titleDefault: 'How we use it',
    bodyKey: 'privacy.useBody',
    bodyDefault:
      'To deliver tutoring, schedule spaced repetition reviews, send reset emails, and process subscription payments through Stripe. We never sell your data.',
  },
  {
    id: 'share',
    titleKey: 'privacy.shareTitle',
    titleDefault: 'Sharing',
    bodyKey: 'privacy.shareBody',
    bodyDefault:
      'AI tutor questions are sent to our LLM provider for generation. Payments are processed by Stripe. Authentication emails are routed via Mailgun.',
  },
  {
    id: 'control',
    titleKey: 'privacy.controlTitle',
    titleDefault: 'Control',
    bodyKey: 'privacy.controlBody',
    bodyDefault:
      'Update your profile or delete your account in Settings. Email account@example.com to request a full data export or deletion.',
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
            '{{app}} respects your privacy. This page explains what we collect, why, and how to control it.',
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
      </div>
    </ContentPageShell>
  )
}

export default Privacy
export { Privacy as PrivacyPage }
