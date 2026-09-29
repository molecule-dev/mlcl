import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/**
 * Terms — the SignalLoop terms of service, rendered as nine numbered
 * sections (scope, zero seat-tax, content licensing, SLAs, API fair use,
 * data sovereignty, termination, liability, governing law) plus the legal
 * office contact card.
 */

interface TermsSection {
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const SECTIONS: TermsSection[] = [
  {
    titleKey: 'terms.s1Title',
    titleDefault: '1. Scope of Agreement and Platform Definitions',
    bodyKey: 'terms.s1Body',
    bodyDefault:
      'These terms govern how teams run feedback boards, backlogs, and telemetry syncs on the platform. Four distinct roles exist: Workspace Administrators, Triage Operators, Registered Contributors, and Public Voters. Administrators bind their organization to these terms on signup; public voters accept the shorter voter terms on their first vote or submission.',
  },
  {
    titleKey: 'terms.s2Title',
    titleDefault: '2. Zero Seat-Tax Guarantee & Account Tiers',
    bodyKey: 'terms.s2Body',
    bodyDefault:
      'We covenant never to meter, charge, or penalize workspaces based on the volume of external voters, anonymous suggestions, or public community contributors. Paid tiers raise staff-side caps — boards, triage seats, retention, integrations — never the price of a customer voice.',
  },
  {
    titleKey: 'terms.s3Title',
    titleDefault: '3. User Content, Telemetry & Feedback Licensing',
    bodyKey: 'terms.s3Body',
    bodyDefault:
      'Your customer data, user identities, and private roadmap descriptions remain 100% your property. We obtain only the minimal mechanical license required to host, replicate for availability, and display content as instructed — never to train models or advertise against it.',
  },
  {
    titleKey: 'terms.s4Title',
    titleDefault: '4. Service Level Commitments & Backlog Sync Latency',
    bodyKey: 'terms.s4Body',
    bodyDefault:
      'We commit to commercially reasonable efforts to keep the production ingest pipeline and public roadmap portals available at 99.9% monthly uptime, excluding scheduled maintenance. Status-page history and incident postmortems are published for every outage lasting more than five minutes.',
  },
  {
    titleKey: 'terms.s5Title',
    titleDefault: '5. API Fair Use, Webhooks & Telemetry Rate Limits',
    bodyKey: 'terms.s5Body',
    bodyDefault:
      'We provide generous rate limits and signed webhook delivery. If you surpass burst ceilings during high-volume launches, requests are smoothly queued rather than abruptly hard-dropped, and we alert your technical contact before any persistent throttling begins.',
  },
  {
    titleKey: 'terms.s6Title',
    titleDefault: '6. Data Sovereignty, SOC 2 Type II & Warehouse Streaming',
    bodyKey: 'terms.s6Body',
    bodyDefault:
      'Customer data is encrypted in transit and at rest, hosted in the region selected at workspace creation, and never transferred outside it without instruction. Enterprise plans include continuous SOC 2 Type II monitoring evidence and native warehouse streaming so your compliance team can audit what we hold at any time.',
  },
  {
    titleKey: 'terms.s7Title',
    titleDefault: '7. Termination, Data Export & Complete Deletion',
    bodyKey: 'terms.s7Body',
    bodyDefault:
      'Customers may terminate at any time via workspace self-service. You have the contractual right to export 100% of your historical data — boards, posts, votes, comments, and telemetry — in open formats, after which production data is deleted within 30 days and backups within 90.',
  },
  {
    titleKey: 'terms.s8Title',
    titleDefault: '8. Limitation of Liability & Warranties',
    bodyKey: 'terms.s8Body',
    bodyDefault:
      'To the maximum extent permitted by applicable law, the service is provided "as is" and neither party is liable for indirect, incidental, or consequential damages. Each party\u2019s aggregate liability is capped at the amounts paid or payable in the twelve months preceding the claim.',
  },
  {
    titleKey: 'terms.s9Title',
    titleDefault: '9. Governing Law & Legal Contacts',
    bodyKey: 'terms.s9Body',
    bodyDefault:
      'These terms are governed by the laws of the State of Delaware, United States, without regard to conflicts-of-law principles. The parties consent to the exclusive jurisdiction of the state and federal courts located in Delaware for any dispute arising out of these terms.',
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
      eyebrow={t('terms.eyebrow', {}, { defaultValue: 'Legal' })}
      title={t(
        'terms.title',
        { appName: APP_NAME },
        { defaultValue: '{{appName}} Terms of Service' },
      )}
      subtitle={t(
        'terms.subtitle',
        {},
        {
          defaultValue:
            'Clear, transparent commitments between the platform, engineering teams, and feedback contributors. Zero dark patterns, explicit data sovereignty, and verifiable backlog commitments.',
        },
      )}
    >
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
        {SECTIONS.map((section) => (
          <section
            key={section.titleKey}
            aria-labelledby={section.titleKey}
            className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
          >
            <h2
              id={section.titleKey}
              className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}
            >
              {t(section.titleKey, {}, { defaultValue: section.titleDefault })}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                'text-on-surface-variant leading-relaxed whitespace-pre-wrap',
              )}
            >
              {t(section.bodyKey, {}, { defaultValue: section.bodyDefault })}
            </p>
          </section>
        ))}

        <aside
          data-mol-id="terms-legal-office"
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'xs' }),
            cm.sp('p', 5),
            'rounded-xl border border-outline-variant/40 bg-surface-container-low/40',
          )}
        >
          <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'), 'text-on-surface')}>
            {t(
              'terms.officeTitle',
              { appName: APP_NAME },
              { defaultValue: '{{appName}} Legal & Compliance Office' },
            )}
          </h3>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'terms.officeBody',
              {},
              {
                defaultValue:
                  'Need custom Data Processing Agreements (DPAs), standard contractual clauses (SCCs), or Enterprise Master Service Agreements (MSAs)? Reach the office through your workspace Settings — a human on the compliance team answers every request.',
              },
            )}
          </p>
        </aside>
      </div>
    </ContentPageShell>
  )
}

export default Terms
export { Terms as TermsPage }
