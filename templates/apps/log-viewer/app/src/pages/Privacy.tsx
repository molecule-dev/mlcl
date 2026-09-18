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
  bodyDefault: string
  bodyValues?: Record<string, string>
}

const SECTIONS: Section[] = [
  {
    id: 'what',
    titleKey: 'privacy.what.heading',
    titleDefault: 'What we collect',
    bodyKey: 'privacy.what.body',
    bodyDefault:
      '{{appName}} stores the log lines, traces, alerts, incidents, and saved searches you submit, plus your account email and authentication metadata. We do not use customer log data for training models or sell it to third parties.',
  },
  {
    id: 'processors',
    titleKey: 'privacy.processors.heading',
    titleDefault: 'Subprocessors',
    bodyKey: 'privacy.processors.body',
    bodyDefault:
      'We rely on Stripe (billing), Mailgun (transactional email), AWS (hosting + S3 archives), and Meilisearch (search index). Each is contractually bound to handle your data per our privacy commitments.',
  },
  {
    id: 'retention',
    titleKey: 'privacy.retention.heading',
    titleDefault: 'Retention & deletion',
    bodyKey: 'privacy.retention.body',
    bodyDefault:
      'Logs follow per-stream retention you configure (default 30 days hot / 365 days cold). Deleting your account purges all associated logs, traces, alerts, incidents, saved searches, and API keys within 30 days.',
  },
  {
    id: 'contact',
    titleKey: 'nav.contact',
    titleDefault: 'Contact',
    bodyKey: 'privacy.contact.body',
    bodyDefault: 'Questions? Email privacy@signalink.example. We respond within 7 days.',
  },
]

export function Privacy() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-privacy"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('privacy.heading', {}, { defaultValue: 'Privacy policy' })}
      subtitle={t('privacy.lastUpdated', {}, { defaultValue: 'Last updated: 2026-01-01' })}
    >
      <div className={cm.cn(cm.stack(8))}>
        {SECTIONS.map((s) => (
          <section key={s.id} data-mol-id={`privacy-${s.id}`} className={cm.cn(cm.stack(2))}>
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
              {t(s.titleKey, {}, { defaultValue: s.titleDefault })}
            </h2>
            <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
              {t(s.bodyKey, s.bodyValues ?? { appName: APP_NAME }, { defaultValue: s.bodyDefault })}
            </p>
          </section>
        ))}
      </div>
    </ContentPageShell>
  )
}
