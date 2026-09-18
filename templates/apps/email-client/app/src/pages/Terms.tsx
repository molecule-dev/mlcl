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
    id: 'account',
    titleKey: 'terms.account.title',
    titleDefault: '1. Your account',
    bodyKey: 'terms.account.body',
    bodyDefault:
      'You are responsible for maintaining the confidentiality of your password and for any activity that happens through your account. Notify us at security@courier.example if you believe your account has been compromised.',
  },
  {
    id: 'acceptable',
    titleKey: 'terms.acceptable.title',
    titleDefault: '2. Acceptable use',
    bodyKey: 'terms.acceptable.intro',
    bodyDefault: '',
    list: [
      {
        key: 'terms.acceptable.spam',
        defaultValue:
          'No bulk unsolicited messaging. We will close accounts that send spam without warning.',
      },
      {
        key: 'terms.acceptable.phishing',
        defaultValue:
          'No phishing or impersonation. Your sender display name must not deceive recipients.',
      },
      {
        key: 'terms.acceptable.malware',
        defaultValue: 'No malware payloads or links to known malicious destinations.',
      },
    ],
  },
  {
    id: 'billing',
    titleKey: 'terms.billing.title',
    titleDefault: '3. Subscriptions and billing',
    bodyKey: 'terms.billing.body',
    bodyValues: { app: APP_NAME },
    bodyDefault:
      'Paid plans renew at the cadence chosen at sign-up. You can cancel from Settings → Billing at any time and you keep access for the rest of the billing period. Refunds are issued for service downtime that exceeds the SLA.',
  },
  {
    id: 'termination',
    titleKey: 'terms.termination.title',
    titleDefault: '4. Termination',
    bodyKey: 'terms.termination.body',
    bodyDefault:
      'You may delete your account at any time. We may suspend an account that violates these terms; if we do, we will explain the reason and let you export your data first.',
  },
  {
    id: 'warranty',
    titleKey: 'terms.warranty.title',
    titleDefault: '5. Warranty disclaimer',
    bodyKey: 'terms.warranty.body',
    bodyDefault:
      'The service is provided as-is. We work hard to keep it reliable and secure, but we cannot guarantee uninterrupted access. To the extent permitted by law, our aggregate liability is capped at the amount you paid us in the preceding 12 months.',
  },
]

export function Terms() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-terms"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('footer.termsOfService', { app: APP_NAME }, { defaultValue: 'Terms of Service' })}
      subtitle={t(
        'terms.intro',
        { app: APP_NAME },
        {
          defaultValue:
            'These terms govern your use of {{app}}. By creating an account or sending email through us you agree to be bound by them.',
        },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('terms.lastUpdated', {}, { defaultValue: 'Effective: April 1, 2026' })}
        </p>

        {SECTIONS.map((s) => (
          <section key={s.id} data-mol-id={`terms-${s.id}`} className={cm.cn(cm.stack(2))}>
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

        <Link
          to="/privacy"
          data-mol-id="terms-privacy-link"
          className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
        >
          {t('terms.linkPrivacy', {}, { defaultValue: 'Read our Privacy Policy →' })}
        </Link>
      </div>
    </ContentPageShell>
  )
}

export default Terms
export { Terms as TermsPage }
