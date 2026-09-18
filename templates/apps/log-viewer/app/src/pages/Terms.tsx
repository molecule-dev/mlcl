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
    id: 'use',
    titleKey: 'terms.use.heading',
    titleDefault: 'Acceptable use',
    bodyKey: 'terms.use.body',
    bodyDefault:
      'You may submit logs you generate or are authorized to process. You may not use {{appName}} to ingest credentials, payment card data, or other regulated identifiers in plaintext.',
  },
  {
    id: 'billing',
    titleKey: 'settings.billing',
    titleDefault: 'Billing',
    bodyKey: 'terms.billing.body',
    bodyDefault:
      'Paid plans renew monthly or annually via Stripe. Cancel anytime; access continues through the current period and downgrades the account to Free at renewal.',
  },
  {
    id: 'sla',
    titleKey: 'terms.sla.heading',
    titleDefault: 'Availability',
    bodyKey: 'terms.sla.body',
    bodyDefault:
      'We target 99.9% monthly uptime for Pro and Team plans, measured against ingest + query API endpoints, with credits posted automatically when the SLA is missed.',
  },
  {
    id: 'contact',
    titleKey: 'nav.contact',
    titleDefault: 'Contact',
    bodyKey: 'terms.contact.body',
    bodyDefault: 'Operational issues: support@signalink.example. Legal: legal@signalink.example.',
  },
]

export function Terms() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-terms"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('terms.heading', {}, { defaultValue: 'Terms of service' })}
      subtitle={t('terms.lastUpdated', {}, { defaultValue: 'Last updated: 2026-01-01' })}
    >
      <div className={cm.cn(cm.stack(8))}>
        {SECTIONS.map((s) => (
          <section key={s.id} data-mol-id={`terms-${s.id}`} className={cm.cn(cm.stack(2))}>
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
