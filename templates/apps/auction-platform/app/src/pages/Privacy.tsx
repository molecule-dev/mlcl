import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface PolicySection {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyValues?: Record<string, string>
  bodyDefault: string
}

const SECTIONS: PolicySection[] = [
  {
    id: 'collect',
    titleKey: 'privacy.section.collect.heading',
    titleDefault: 'What we collect',
    bodyKey: 'privacy.section.collect.body',
    bodyValues: { app: APP_NAME },
    bodyDefault: `${APP_NAME} stores the account info you give us (email, display name, shipping address) plus the bids and watchlist you create on the platform. We log basic IP/user-agent data on each request for fraud-prevention only.`,
  },
  {
    id: 'use',
    titleKey: 'privacy.section.use.heading',
    titleDefault: 'How we use it',
    bodyKey: 'privacy.section.use.body',
    bodyDefault:
      'We use your data to run the auction (matching bids, charging cards, shipping wins) and to send you the notifications you opt into. We never sell your information, and we never use your bidding history to retarget you with ads.',
  },
  {
    id: 'share',
    titleKey: 'privacy.section.share.heading',
    titleDefault: 'Who we share it with',
    bodyKey: 'privacy.section.share.body',
    bodyDefault:
      'We share the minimum necessary data with our payment processor (Stripe), our email provider (Mailgun), and the seller of any lot you win — and only when an auction closes. That is the entire list.',
  },
  {
    id: 'rights',
    titleKey: 'privacy.section.rights.heading',
    titleDefault: 'Your rights',
    bodyKey: 'privacy.section.rights.body',
    bodyDefault:
      'You can export your account data, delete your account, or revoke any consent at any time from Settings. We honour every GDPR / CCPA request within 30 days; email privacy@example to invoke them outside the app.',
  },
  {
    id: 'retention',
    titleKey: 'privacy.section.retention.heading',
    titleDefault: 'How long we keep it',
    bodyKey: 'privacy.section.retention.body',
    bodyDefault:
      'Account profiles are kept until you delete them. Auction records (bids, hammer prices, winning addresses) are retained for seven years for tax and dispute resolution; everything else is purged on account deletion within 30 days.',
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
      eyebrow={t('privacy.eyebrow', {}, { defaultValue: 'Privacy policy' })}
      title={t(
        'privacy.title',
        {},
        { defaultValue: 'We treat your data the way we treat your bids — privately.' },
      )}
      subtitle={t('privacy.lastUpdated', {}, { defaultValue: 'Last updated 2026-05-09.' })}
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
