import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'
import { loadContent } from '../config.js'

/** The four at-a-glance trade guarantees. */
const GUARANTEES: {
  key: string
  badge: string
  icon: string
  title: string
  body: string
  proof: string
}[] = [
  {
    key: 'monthToMonth',
    badge: 'Rule 01 // Freedom',
    icon: 'event_available',
    title: 'Month-to-Month',
    body: 'No 3-year hostage contracts. Cancel anytime with 1 click in your billing console. Zero early-termination fees.',
    proof: '0 hassle guarantee',
  },
  {
    key: 'noPerSeatTax',
    badge: 'Rule 02 // Seats',
    icon: 'group_add',
    title: 'No Per-Seat Tax',
    body: 'Never get punished for adding another apprentice, dispatcher, or truck. Flat, predictable subscription math for the whole shop.',
    proof: 'Unlimited truck access',
  },
  {
    key: 'dataOwnership',
    badge: 'Rule 03 // Privacy',
    icon: 'database',
    title: '100% Data Ownership',
    body: 'Your customer records, margin tiers, equipment tags, and work orders export instantly to CSV or SQL whenever you request.',
    proof: 'Raw SQL / CSV export',
  },
  {
    key: 'integerCentMath',
    badge: 'Rule 04 // Billing',
    icon: 'calculate',
    title: 'Integer-Cent Math',
    body: 'Transparent flat card processing. No junk statement maintenance fees, PCI non-compliance penalties, or batch holdbacks.',
    proof: 'Next-day direct deposit',
  },
]

/** One numbered terms section: heading + body blocks. */
interface TermsSection {
  heading: string
  translation?: string
  paragraphs?: string[]
  clauses?: { num: string; title: string; body: string }[]
}

const SECTIONS: TermsSection[] = [
  {
    heading: '1. The Trade Agreement & Service Scope',
    translation:
      'We provide the dispatcher web app, the mobile tech apps, and an offline-capable database so your crew can invoice and take payments even in a shielded sub-basement. You agree to use it to run legitimate field trade operations.',
    clauses: [
      {
        num: '1.1',
        title: 'Provision of platform',
        body: 'The vendor grants your company a commercial, non-exclusive license to access and use the dispatch cloud, field tech apps, invoicing engine, and local offline data synchronization runtime.',
      },
      {
        num: '1.2',
        title: 'Offline engine architecture',
        body: 'Trade professionals operate in extreme environments — sub-basements, mechanical vaults, elevator shafts, rural utility corridors — without continuous coverage. Local actions executed while severed from the network queue locally and synchronize atomically upon reconnection.',
      },
      {
        num: '1.3',
        title: 'Authorized users',
        body: 'An authorized user is any technician, helper, master tradesperson, dispatcher, estimator, or office bookkeeper invited via your administrative account.',
      },
    ],
  },
  {
    heading: '2. No Lock-In & Instant Cancellation Rights',
    translation:
      'No sales rep calls to terminate, no 90-day certified-mail traps, no penalties. If you decide to switch software or close the business, click cancel in your settings. You keep 60 full days to pull all your historical data for free.',
    clauses: [
      {
        num: '2.1',
        title: 'Month-to-month autonomy',
        body: 'Standard 30-day recurring subscription terms apply unless you specifically enter a negotiated multi-year master contract. You may cancel at any time directly through the organization settings with zero penalty.',
      },
      {
        num: '2.2',
        title: 'Data departure buffer',
        body: 'Upon cancellation, the account transitions to read-only access for a minimum of sixty (60) calendar days at zero cost, with unimpeded rights to trigger full database dumps, customer CSV tables, work order attachments, and historical invoice PDFs.',
      },
      {
        num: '2.3',
        title: 'Zero data ransom',
        body: 'Data-extraction surcharges are expressly rejected. Fees are never charged for SQL/CSV exports or digital delivery of your business ledger.',
      },
    ],
  },
  {
    heading: '3. Pricing & Integer-Cent Flat Subscription Math',
    translation:
      'We bill your subscription flat. We do not inspect your gross revenue and demand a royalty. When price adjustments happen, you get 30 days notice — and if you don’t agree, you can export and leave.',
    clauses: [
      {
        num: '3.1',
        title: 'Zero percentage-of-revenue leeching',
        body: 'Pricing is fixed tiers based solely on functional capabilities. The vendor never takes a percentage cut of billable labor, material markups, or gross trade invoices.',
      },
      {
        num: '3.2',
        title: 'Taxes & statutory levies',
        body: 'Stated subscription pricing excludes regional sales taxes, computed from your principal garage or dispatch headquarters address.',
      },
      {
        num: '3.3',
        title: 'Notice of adjustments',
        body: '30 days prior written notice precedes any subscription tier adjustment. Continued operation after the effective date constitutes consent to the amended schedule.',
      },
    ],
  },
  {
    heading: '4. Contractor IP & Customer Data Sovereignty',
    translation:
      'You own your customer lists, jobsite photos, custom price books, and labor margins. Your client database is never sold to roll-ups, supply houses, or marketing brokers.',
    clauses: [
      {
        num: '4.1',
        title: 'Ownership of contractor data',
        body: 'As between the vendor and contractor, you hold exclusive right, title, and interest in all proprietary customer lists, pricing databases, equipment registries, dispatch logs, jobsite telemetry, and work orders (“Contractor Data”).',
      },
      {
        num: '4.2',
        title: 'No data commercialization',
        body: 'Contractor Data is never sold, rented, monetized, or sublicensed to hardware manufacturers, parts suppliers, consolidation aggregators, or lead-generation brokers.',
      },
      {
        num: '4.3',
        title: 'Limited system license',
        body: 'You grant the vendor a restricted, temporary license solely to host, parse, cache, and transmit Contractor Data for the direct purpose of operating the platform on your behalf.',
      },
    ],
  },
  {
    heading: '5. Payments & Card Processing (Integrated Field Engine)',
    translation:
      'Field card payments and tap-to-pay run through the integrated payment engine. Funds settle to your shop’s operating checking account on a next-business-day cycle.',
    clauses: [
      {
        num: '5.1',
        title: 'Merchant processing engine',
        body: 'Payment card collection and ACH disbursements are managed through integrated banking infrastructure (Stripe, Inc.). Activating tap-to-pay or digital invoices constitutes agreement to the Stripe Connected Account Agreement.',
      },
      {
        num: '5.2',
        title: 'Next-day settlement',
        body: 'Standard qualifying transactions settle on a rolling next-business-day cycle, subject to banking holidays and fraud-prevention checks.',
      },
      {
        num: '5.3',
        title: 'Chargeback defense',
        body: 'Digital signatures, GPS field timestamps, and signed job-authorization photos are preserved automatically to support your defense in card-dispute claims.',
      },
    ],
  },
  {
    heading: '6. Field Uptime, Offline Mode & Shop Liability',
    translation:
      'We engineer for 99.9% uptime. If a cell tower drops out while your tech is in a boiler room, offline mode lets them finish the job, collect a signature, and sync when they reach the van.',
    clauses: [
      {
        num: '6.1',
        title: 'Service level objective',
        body: 'Core API availability targets 99.9%. Maintenance windows are scheduled between 01:00 and 04:00 MT on Sundays to avoid peak dispatch hours.',
      },
      {
        num: '6.2',
        title: 'Physical worksite disclaimers',
        body: 'While the mobile app operates continuously offline, the vendor is not liable for worksite damages, gas-line incidents, electrical arc flashes, or structural defects arising during trade repairs performed by your personnel.',
      },
    ],
  },
  {
    heading: '7. Prohibited Uses & Trade Safety',
    translation:
      'Do not use the platform for illegal contracting, fraudulent change orders, wire fraud, or spam SMS blasts to homeowners. Keep it honest and trade-certified.',
    clauses: [
      {
        num: '7.1',
        title: 'Permitted trade workflows',
        body: 'The platform is engineered exclusively for field service, specialty trade maintenance, new-construction mechanical management, and dispatch communication.',
      },
      {
        num: '7.2',
        title: 'Abuse and revocation',
        body: 'Accounts engaging in payment-card laundering, automated SMS telemarketing harassment, or unauthorized scraping are terminated immediately.',
      },
    ],
  },
  {
    heading: '8. Direct Contractor Arbitration & Governing Law',
    translation:
      'If we have a disagreement we can’t settle over the phone, we sit down with a sensible trade arbitrator in Denver, Colorado. Real humans solving real disputes without endless corporate runarounds.',
    clauses: [
      {
        num: '8.1',
        title: 'Direct operations mediation',
        body: 'Before formal arbitration, both parties agree to an informal resolution conference between your operational owner and vendor management within thirty (30) business days.',
      },
      {
        num: '8.2',
        title: 'Binding arbitration',
        body: 'Unresolved controversies are settled by binding commercial arbitration administered by the American Arbitration Association under its Commercial Rules in the City and County of Denver, Colorado.',
      },
      {
        num: '8.3',
        title: 'Severability',
        body: 'If any provision is judged invalid or unenforceable, that clause is modified to the minimum extent necessary, leaving the remaining trade terms in full legal effect.',
      },
    ],
  },
]

/** HTML-escape a value interpolated into an HTML-rendered translation. */
const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

/**
 * Public terms page: the bonded legal policy plus the plain-English trade
 * master terms.
 *
 * @returns The rendered terms page.
 */
export function Terms() {
  const cm = getClassMap()
  const { t } = useTranslation()
  // Re-render once the bonded content has been registered for the current
  // locale so `t('content.termsOfService')` resolves to the real HTML.
  const [, setReady] = useState(false)
  useEffect(() => {
    let cancelled = false
    Promise.resolve(loadContent('termsOfService')).then(
      () => {
        if (!cancelled) setReady(true)
      },
      () => {
        if (!cancelled) setReady(true)
      },
    )
    return () => {
      cancelled = true
    }
  }, [])
  const legalHtml = t(
    'content.termsOfService',
    // The result is rendered as HTML — escape the interpolated app name the
    // same way the shared LegalContentPage does.
    { appName: escapeHtml(APP_NAME) },
    { defaultValue: '' },
  )

  return (
    <ContentPageShell
      dataMolId="page-terms"
      header={<AuthBrandHeader />}
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
      subtitle={t(
        'terms.meta',
        {},
        {
          defaultValue:
            'Standard trade master terms // Effective: November 1, 2024 — Governing body: trade arbitration bench, Denver, CO',
        },
      )}
    >
      <div className={cm.cn(cm.stack(12))}>
        <section
          data-mol-id="terms-guarantees"
          className={cm.cn(
            cm.stack(4),
            cm.sp('p', 6),
            'bg-primary-container text-on-primary-container rounded-lg',
          )}
        >
          <p
            className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'uppercase tracking-widest')}
          >
            <span
              className="material-symbols-outlined text-sm align-middle mr-1"
              aria-hidden="true"
            >
              gavel
            </span>
            {t(
              'terms.intro.body',
              {},
              {
                defaultValue:
                  'Built by trade operators for plumbers, electricians, HVAC specialists, roofers, and general contractors — plain English, not 50 pages of corporate trapdoor legalese.',
              },
            )}
          </p>
          <div className={cm.grid({ cols: 4, gap: 'md' })}>
            {GUARANTEES.map((g) => (
              <article key={g.key} className={cm.cn(cm.card(), cm.sp('p', 5), cm.stack(3))}>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-primary',
                  )}
                >
                  {t(`terms.guarantees.${g.key}.badge`, {}, { defaultValue: g.badge })}
                </p>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.roundedFull,
                    'h-10 w-10 bg-primary-container text-on-primary-container',
                  )}
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                    {g.icon}
                  </span>
                </span>
                <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                  {t(`terms.guarantees.${g.key}.title`, {}, { defaultValue: g.title })}
                </h2>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(`terms.guarantees.${g.key}.body`, {}, { defaultValue: g.body })}
                </p>
                <p
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'text-success',
                  )}
                >
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">
                    verified
                  </span>
                  {t(`terms.guarantees.${g.key}.proof`, {}, { defaultValue: g.proof })}
                </p>
              </article>
            ))}
          </div>
        </section>

        <div className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {/* Bonded legal policy — the same copy the footer modal shows
              (@molecule/app-locales-legal-default), kept in sync by loadContent. */}
          <div dangerouslySetInnerHTML={{ __html: legalHtml }} />
        </div>

        <section data-mol-id="terms-sections" className={cm.cn(cm.stack(10))}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('terms.sections.eyebrow', {}, { defaultValue: 'Trade master terms // Doc-Tos' })}
          </p>
          {SECTIONS.map((section, idx) => (
            <section
              key={section.heading}
              data-mol-id={`terms-section-${idx + 1}`}
              className={cm.cn(cm.stack(3))}
            >
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
                {t(`terms.s${idx + 1}.heading`, {}, { defaultValue: section.heading })}
              </h2>
              {section.translation ? (
                <p
                  className={cm.cn(
                    cm.card(),
                    cm.sp('p', 4),
                    cm.prose,
                    'bg-surface-container text-on-surface-variant',
                  )}
                >
                  <strong className={cm.fontWeight('semibold')}>
                    {t('terms.sN.translation', {}, { defaultValue: 'Plain trade translation' })}
                    {': '}
                  </strong>
                  {t(`terms.s${idx + 1}.translation`, {}, { defaultValue: section.translation })}
                </p>
              ) : null}
              {section.clauses ? (
                <ul className={cm.stack(3)}>
                  {section.clauses.map((clause, ci) => (
                    <li key={clause.num} className={cm.cn(cm.card(), cm.sp('p', 4), cm.stack(1))}>
                      <span className={cm.flex({ align: 'center', gap: 'sm' })}>
                        <span
                          className={cm.cn(
                            cm.sp('px', 2),
                            cm.sp('py', 1),
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            'font-mono bg-primary-container text-on-primary-container rounded',
                          )}
                        >
                          {clause.num}
                        </span>
                        <strong className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                          {t(`terms.s${idx + 1}.c${ci}.title`, {}, { defaultValue: clause.title })}
                        </strong>
                      </span>
                      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                        {t(`terms.s${idx + 1}.c${ci}.body`, {}, { defaultValue: clause.body })}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </section>

        <section
          data-mol-id="terms-msa"
          className={cm.cn(
            cm.stack(3),
            cm.sp('p', 8),
            'bg-primary-container text-on-primary-container rounded-lg text-center',
          )}
        >
          <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t(
              'terms.msa.title',
              {},
              { defaultValue: 'Need a Signed Master Services Agreement (MSA) or Union Addendum?' },
            )}
          </h3>
          <p className={cm.cn(cm.prose, 'mx-auto max-w-2xl')}>
            {t(
              'terms.msa.body',
              {},
              {
                defaultValue:
                  'We provide custom MSA redlines, PLA compliance exhibits, certified payroll export addendums, and dedicated SLA tiers for multi-branch mechanical contractors with 25+ trucks.',
              },
            )}
          </p>
          <div className={cm.flex({ justify: 'center', gap: 'sm', wrap: 'wrap' })}>
            <Link
              to="/about"
              data-mol-id="terms-msa-cta"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded-md',
              )}
            >
              {t('terms.msa.cta', {}, { defaultValue: 'Request Master MSA Pack' })}
            </Link>
          </div>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default Terms
export { Terms as TermsPage }
