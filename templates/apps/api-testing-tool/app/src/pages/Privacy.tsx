/**
 * Public Privacy notice. Plain-English summary of what data Pylon stores
 * and how it is used. Phrased as i18n defaults so locales can override.
 */
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
    titleKey: 'privacy.collect.title',
    titleDefault: 'What we store',
    bodyKey: 'privacy.collect.account',
    bodyDefault:
      'Account: your email, hashed password, display name, and the timestamp of your last sign-in; workspace content: collections, saved requests, environment variables, mock servers, monitors, and the assertions attached to your tests; request history: the URL, method, status code, latency, and response body of every request you fire, retained according to your subscription tier; billing: subscription status and the Stripe customer/subscription identifiers required to operate the plan you bought.',
  },
  {
    id: 'share',
    titleKey: 'privacy.share.title',
    titleDefault: 'Who can see your data',
    bodyKey: 'privacy.share.body',
    bodyDefault:
      'Only you. We never sell, share, or rent your workspace content to third parties. Server logs are retained for 30 days for incident response and then deleted.',
  },
  {
    id: 'rights',
    titleKey: 'privacy.rights.title',
    titleDefault: 'Your controls',
    bodyKey: 'privacy.rights.body',
    bodyDefault:
      'You can export your collections + environments at any time, or delete your account from Settings to permanently remove all data within 30 days.',
  },
  {
    id: 'contact',
    titleKey: 'privacy.contact.title',
    titleDefault: 'Questions',
    bodyKey: 'privacy.contact.body',
    bodyValues: { app: APP_NAME },
    bodyDefault:
      'Email privacy@pylon.dev for any data-handling question. We answer every request within five business days.',
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
      title={t('privacy.title', {}, { defaultValue: 'Privacy notice' })}
      subtitle={t(
        'privacy.intro',
        { app: APP_NAME },
        {
          defaultValue:
            '{{app}} respects your privacy. This page summarises the data we collect, why we collect it, and how to remove it.',
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
