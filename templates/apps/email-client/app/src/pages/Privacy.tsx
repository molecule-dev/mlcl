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
  list?: Array<{ key: string; defaultValue: string }>
}

const SECTIONS: Section[] = [
  {
    id: 'collect',
    titleKey: 'privacy.collect.title',
    titleDefault: '1. What we collect',
    bodyKey: 'privacy.collect.intro',
    bodyDefault: '',
    list: [
      {
        key: 'privacy.collect.account',
        defaultValue:
          'Account data: name, email address, hashed password, and the date you signed up.',
      },
      {
        key: 'privacy.collect.mailbox',
        defaultValue:
          'Mailbox content: the messages, drafts, labels, and folder assignments you create or import. Stored encrypted at rest.',
      },
      {
        key: 'privacy.collect.usage',
        defaultValue:
          'Aggregate usage metrics (signed-in sessions, page-load timings) so we can fix what is slow. Never sold or shared with third parties.',
      },
    ],
  },
  {
    id: 'share',
    titleKey: 'privacy.share.title',
    titleDefault: '2. Who we share data with',
    bodyKey: 'privacy.share.body',
    bodyValues: { app: APP_NAME },
    bodyDefault:
      'We share data only with the sub-processors we need to run {{app}} (email delivery via Mailgun, billing via Stripe, hosting via AWS). Each is contractually obligated to use your data only to perform their service for us. We do not sell, rent, or trade your data with anyone.',
  },
  {
    id: 'security',
    titleKey: 'privacy.security.title',
    titleDefault: '3. How we secure your data',
    bodyKey: 'privacy.security.body',
    bodyDefault:
      'Mail content and attachments are encrypted at rest using AES-256. Connections to and from our service use TLS 1.3. Passwords are hashed with bcrypt; we never log or store plaintext passwords. Production access is limited to on-call engineers, audited monthly.',
  },
  {
    id: 'rights',
    titleKey: 'privacy.rights.title',
    titleDefault: '4. Your rights',
    bodyKey: 'privacy.rights.body',
    bodyDefault:
      'You can export every piece of data we hold about you from Settings → Account → Data export, and you can delete your account in one click — all rows wiped within 24 hours, audit logs purged after 30 days.',
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
      title={t('footer.privacyPolicy', { app: APP_NAME }, { defaultValue: 'Privacy Policy' })}
      subtitle={t(
        'privacy.intro',
        { app: APP_NAME },
        {
          defaultValue:
            'This privacy policy explains what data {{app}} collects, why we collect it, how we keep it safe, and what choices you have over it.',
        },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('privacy.lastUpdated', {}, { defaultValue: 'Last updated: April 1, 2026' })}
        </p>

        {SECTIONS.map((s) => (
          <section key={s.id} data-mol-id={`privacy-${s.id}`} className={cm.cn(cm.stack(2))}>
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
              {t(s.titleKey, {}, { defaultValue: s.titleDefault })}
            </h2>
            {s.list ? (
              <ul className={cm.cn(cm.prose, 'text-on-surface-variant', cm.sp('pl', 4))}>
                {s.list.map((item) => (
                  <li key={item.key}>{t(item.key, {}, { defaultValue: item.defaultValue })}</li>
                ))}
              </ul>
            ) : (
              <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                {t(s.bodyKey, s.bodyValues ?? {}, { defaultValue: s.bodyDefault })}
              </p>
            )}
          </section>
        ))}

        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('privacy.contact', {}, { defaultValue: 'Questions? Email privacy@courier.example.' })}
        </p>
        <Link
          to="/terms"
          data-mol-id="privacy-terms-link"
          className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
        >
          {t('privacy.linkTerms', {}, { defaultValue: 'Read our Terms of Service →' })}
        </Link>
      </div>
    </ContentPageShell>
  )
}

export default Privacy
export { Privacy as PrivacyPage }
