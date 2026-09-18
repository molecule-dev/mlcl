/**
 * Public terms-of-service page. Real-content sections (intro, agent
 * responsibilities, customer data, billing, SLAs, changes) so the page
 * is not a boilerplate stub. Every string flows through `t()`.
 *
 * @returns The rendered terms page.
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
  bodyDefault: string
  bodyValues?: Record<string, string>
}

const SECTIONS: Section[] = [
  {
    id: 'account',
    titleKey: 'terms.account.title',
    titleDefault: 'Your workspace',
    bodyKey: 'terms.account.body',
    bodyDefault:
      'You are responsible for keeping your agent credentials secret and for the activity that happens under those accounts. Workspace owners can delete the entire workspace at any time from Settings; deletion purges all tickets, replies, knowledge-base articles, macros, and SLA policies tied to that workspace.',
  },
  {
    id: 'usage',
    titleKey: 'terms.usage.title',
    titleDefault: 'Acceptable use',
    bodyKey: 'terms.usage.body',
    bodyDefault:
      "You agree not to use {{app}} to harass, defraud, or surveil customers, to upload content that infringes third-party rights, or to attempt to break the platform's authentication, rate limits, or tenant isolation.",
    bodyValues: { app: APP_NAME },
  },
  {
    id: 'customerData',
    titleKey: 'terms.customerData.title',
    titleDefault: 'Customer data',
    bodyKey: 'terms.customerData.body',
    bodyDefault:
      'Tickets, replies, attachments, and knowledge-base articles you create remain your property. We process them on your behalf to provide the service and never sell them. See the Privacy Policy for retention windows and sub-processor list.',
  },
  {
    id: 'billing',
    titleKey: 'terms.billing.title',
    titleDefault: 'Billing & cancellation',
    bodyKey: 'terms.billing.body',
    bodyDefault:
      'Paid plans are billed monthly or yearly via Stripe at the prices listed on /pricing. You can cancel anytime from Settings; access continues through the end of the paid period and no refunds are issued for partial periods.',
  },
  {
    id: 'sla',
    titleKey: 'terms.sla.title',
    titleDefault: 'Service availability',
    bodyKey: 'terms.sla.body',
    bodyDefault:
      'We aim for 99.9% monthly uptime on the Pro and Team plans, excluding scheduled maintenance windows. The Free plan is provided as-is without an availability guarantee.',
  },
  {
    id: 'changes',
    titleKey: 'terms.changes.title',
    titleDefault: 'Changes',
    bodyKey: 'terms.changes.body',
    bodyDefault:
      'We will notify workspace owners in-app if these terms materially change. Continued use of the workspace after that notice means you accept the updates.',
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
      title={t('terms.title', {}, { defaultValue: 'Terms of service' })}
      subtitle={t(
        'terms.intro',
        { app: APP_NAME },
        {
          defaultValue:
            "These terms govern your team's use of {{app}}, our helpdesk ticketing platform. By creating an account or inviting agents you accept them on behalf of your organization.",
        },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        {SECTIONS.map((s) => (
          <section key={s.id} data-mol-id={`terms-${s.id}`} className={cm.cn(cm.stack(2))}>
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
              {t(s.titleKey, {}, { defaultValue: s.titleDefault })}
            </h2>
            <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
              {t(s.bodyKey, s.bodyValues ?? {}, { defaultValue: s.bodyDefault })}
            </p>
          </section>
        ))}
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t('terms.lastUpdated', {}, { defaultValue: 'Last updated: 2026-05-01' })}
        </p>
      </div>
    </ContentPageShell>
  )
}

export default Terms
export { Terms as TermsPage }
