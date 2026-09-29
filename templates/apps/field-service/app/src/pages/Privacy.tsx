import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'
import { loadContent } from '../config.js'

/** The four plain-language rules of the trade privacy pledge. */
const PLEDGE_RULES: {
  key: string
  badge: string
  icon: string
  title: string
  body: string
  proof: string
}[] = [
  {
    key: 'noLeadSelling',
    badge: 'Rule 01 // Ownership',
    icon: 'block',
    title: 'No Lead Selling',
    body: 'We never broker, share, or sell your customer phone numbers, addresses, or job history to third-party lead aggregators or competitors.',
    proof: 'Guaranteed zero lead brokering',
  },
  {
    key: 'noDataHostageFees',
    badge: 'Rule 02 // Portability',
    icon: 'download',
    title: 'No Data Hostage Fees',
    body: '1-click full CSV & SQL database export at any time. If you leave, your records leave with you for free within minutes.',
    proof: 'Raw CSV + SQL format always available',
  },
  {
    key: 'subZeroSecurity',
    badge: 'Rule 03 // Field integrity',
    icon: 'lock',
    title: 'Sub-Zero Local Security',
    body: 'Encrypted on-device storage for offline job records in basements and crawlspaces, with bank-grade TLS transmission over the wire.',
    proof: 'Encrypted local field storage',
  },
  {
    key: 'zeroAiScraping',
    badge: 'Rule 04 // Confidentiality',
    icon: 'psychology',
    title: 'Zero Public AI Scraping',
    body: 'We never feed your proprietary job notes, technician wages, customer pricing, or equipment photos into public AI models.',
    proof: 'Strict isolation from public models',
  },
]

/** One numbered policy section: heading + body blocks. */
interface PolicySection {
  heading: string
  intro?: string
  bullets?: { title: string; body: string }[]
  paragraphs?: string[]
  table?: { partner: string; purpose: string; location: string; standard: string }[]
}

const SECTIONS: PolicySection[] = [
  {
    heading: '1. The Workman Doctrine of Data Ownership',
    paragraphs: [
      'You own the customer list, the photos, your markup formulas, and the profit margins. The platform acts strictly as the custodian, the pipe, and the filing cabinet. We make money when you pay your subscription — not by quietly selling data behind your back.',
      'When a plumbing, mechanical, electrical, or roofing company uses the system, all customer personally identifiable information, job notes, flat-rate pricing assemblies, technician time cards, and diagnostic media remain the exclusive property of the subscribing business. The vendor operates solely as a data processor and service provider under the California Consumer Privacy Act and equivalent trade regulations. At no point during the contract or after termination does the vendor acquire ownership, syndication rights, or monetization privileges over customer rosters or jobsite records.',
    ],
  },
  {
    heading: '2. Field Data Collection: What We Collect & Why',
    intro:
      'Field telemetry is collected exclusively to execute service orders, calculate job costs, coordinate dispatch, and protect you in customer billing disputes.',
    bullets: [
      {
        title: 'Technician GPS coordinates',
        body: 'Recorded only during active job status (“en route”, “on site”, “arrived”). Off-duty hours, clock-out states, and lunch breaks are strictly suppressed — zero GPS points are recorded.',
      },
      {
        title: 'Equipment tags & job photos',
        body: 'Furnace serial numbers, panel breaker layouts, before/after damage photos, and homeowner signatures. Stored with tamper-evident metadata for warranty audits.',
      },
      {
        title: 'SMS & customer phone numbers',
        body: 'Customer phone numbers are used strictly for “technician is on the way” notifications, estimate approvals, and payment receipts — transactional only.',
      },
    ],
  },
  {
    heading: '3. Telematics & GPS Fleet Location Integrity',
    paragraphs: [
      'We honor the line between trade work and personal life. The field app terminates background location services immediately upon clock-out — no persistent background tracking on personal devices.',
      'Fleet tracking pings are downsampled after 90 days into aggregate mileage summaries. High-precision route traces are retained only as long as necessary to satisfy time-and-materials invoicing disputes and workers-compensation validation.',
    ],
  },
  {
    heading: '4. Payment & Banking Data (Stripe & Plaid Integration)',
    intro:
      'Raw 16-digit credit card numbers and online banking passwords are never stored, seen, or transmitted through application servers.',
    bullets: [
      {
        title: 'Credit card processing',
        body: 'Tap & chip card readers and online card payments are handled through Stripe’s certified PCI Level 1 service-provider vault. Only the card brand, last-4 digits, and expiration remain on the invoice for reference.',
      },
      {
        title: 'Direct next-day ACH deposits',
        body: 'Contractor bank-account linking is brokered by Plaid with end-to-end tokenization. Your shop’s banking credentials are encrypted and never pass through application databases.',
      },
    ],
  },
  {
    heading: '5. Storage, Encryption & Offline Field Resiliency',
    intro:
      'Trade contractors work in basements, steel-framed warehouses, and rural jobsites where cell service drops. The platform runs an offline-first sync architecture built for physical field work.',
    bullets: [
      {
        title: 'In transit',
        body: 'TLS 1.3, 256-bit bank-grade encryption on every connection.',
      },
      {
        title: 'At rest (cloud)',
        body: 'AES-256 with multi-region redundancy.',
      },
      {
        title: 'Offline device',
        body: 'Locally encrypted offline records; when the device regains signal, reconciliation queues verify data integrity before merging into the central dispatch ledger.',
      },
    ],
  },
  {
    heading: '6. Data Export & Zero-Fee Account Liquidation',
    bullets: [
      {
        title: '1-click full system export',
        body: 'Account owners can export the entire ledger at any time — all customers, addresses, phone logs, equipment records, and work orders in open CSV, JSON, and SQL formats within minutes.',
      },
      {
        title: 'Zero hostage fees',
        body: 'No exit or extraction fee is ever charged to retrieve your business history.',
      },
      {
        title: 'Right to erase (GDPR / CCPA)',
        body: 'On a verified owner request or subscription termination, a certified destruction of shop records from active tables is completed within 30 days, excluding statutory tax-invoice retention mandates.',
      },
    ],
  },
  {
    heading: '7. Authorized Third-Party Sub-Processors',
    intro:
      'We partner strictly with hardened enterprise infrastructure providers under rigorous data protection agreements.',
    table: [
      {
        partner: 'Amazon Web Services (AWS)',
        purpose: 'Core cloud hosting & encrypted media storage',
        location: 'US-East (USA)',
        standard: 'SOC 2 Type II / ISO 27001',
      },
      {
        partner: 'Stripe, Inc.',
        purpose: 'Field tap-to-pay, ACH invoicing & tokenization',
        location: 'USA / Global',
        standard: 'PCI-DSS Level 1',
      },
      {
        partner: 'Twilio, Inc.',
        purpose: 'Automated “on-the-way” SMS & appointment confirmations',
        location: 'USA Tier-1 telecom',
        standard: 'A2P 10DLC verified',
      },
      {
        partner: 'Intuit QuickBooks Online',
        purpose: 'General ledger sync & chart-of-accounts mirroring',
        location: 'USA',
        standard: 'OAuth 2.0 two-way TLS',
      },
    ],
  },
  {
    heading: '8. Contact & Direct Data Officer Desk',
    intro:
      'For urgent inquiries about records sovereignty, subpoena notifications, or a manual database extraction verified by a human, reach the compliance desk directly — no offshore phone tree. Signed-in shops can also reach the team from the Settings page; response target is under 4 business hours.',
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
 * Public privacy page: the bonded legal policy plus the shop-specific
 * trade data commitments.
 *
 * @returns The rendered privacy page.
 */
export function Privacy() {
  const cm = getClassMap()
  const { t } = useTranslation()
  // Re-render once the bonded content has been registered for the current
  // locale so `t('content.privacyPolicy')` resolves to the real HTML.
  const [, setReady] = useState(false)
  useEffect(() => {
    let cancelled = false
    Promise.resolve(loadContent('privacyPolicy')).then(
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
    'content.privacyPolicy',
    // The result is rendered as HTML — escape the interpolated app name the
    // same way the shared LegalContentPage does.
    { appName: escapeHtml(APP_NAME) },
    { defaultValue: '' },
  )

  return (
    <ContentPageShell
      dataMolId="page-privacy"
      header={<AuthBrandHeader />}
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
      subtitle={t(
        'privacy.meta',
        {},
        {
          defaultValue: 'Legal & compliance // Revision 2024.11 — Effective date: November 1, 2024',
        },
      )}
    >
      <div className={cm.cn(cm.stack(12))}>
        <section
          data-mol-id="privacy-pledge"
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
              shield
            </span>
            {t('privacy.pledge.eyebrow', {}, { defaultValue: 'Honest trade privacy pledge' })}
          </p>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'font-display')}>
            {t(
              'privacy.pledge.title',
              {},
              { defaultValue: 'Your customer records and price books belong to you. Full stop.' },
            )}
          </h2>
          <p className={cm.cn(cm.prose)}>
            {t(
              'privacy.pledge.body',
              {},
              {
                defaultValue:
                  'Most software companies write 40-page privacy policies loaded with loopholes so they can resell homeowner lead data or lock you into their platform. We run on four simple rules built for contractors who make their living on their reputation.',
              },
            )}
          </p>
          <div className={cm.grid({ cols: 4, gap: 'md' })}>
            {PLEDGE_RULES.map((rule) => (
              <article key={rule.key} className={cm.cn(cm.card(), cm.sp('p', 5), cm.stack(3))}>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-primary',
                  )}
                >
                  {t(`privacy.pledge.${rule.key}.badge`, {}, { defaultValue: rule.badge })}
                </p>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.roundedFull,
                    'h-10 w-10 bg-primary-container text-on-primary-container',
                  )}
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                    {rule.icon}
                  </span>
                </span>
                <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                  {t(`privacy.pledge.${rule.key}.title`, {}, { defaultValue: rule.title })}
                </h3>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(`privacy.pledge.${rule.key}.body`, {}, { defaultValue: rule.body })}
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
                    check_circle
                  </span>
                  {t(`privacy.pledge.${rule.key}.proof`, {}, { defaultValue: rule.proof })}
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

        <section data-mol-id="privacy-sections" className={cm.cn(cm.stack(10))}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t(
              'privacy.sections.eyebrow',
              {},
              { defaultValue: 'Field-service data commitments // Doc-Pol' },
            )}
          </p>
          {SECTIONS.map((section, idx) => (
            <section
              key={section.heading}
              data-mol-id={`privacy-section-${idx + 1}`}
              className={cm.cn(cm.stack(3))}
            >
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
                {t(`privacy.s${idx + 1}.heading`, {}, { defaultValue: section.heading })}
              </h2>
              {section.intro ? (
                <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                  {t(`privacy.s${idx + 1}.intro`, {}, { defaultValue: section.intro })}
                </p>
              ) : null}
              {section.paragraphs?.map((p, pi) => (
                <p key={pi} className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                  {t(`privacy.s${idx + 1}.p${pi}`, {}, { defaultValue: p })}
                </p>
              ))}
              {section.bullets ? (
                <ul className={cm.stack(3)}>
                  {section.bullets.map((b, bi) => (
                    <li
                      key={bi}
                      className={cm.cn(
                        cm.card(),
                        cm.sp('p', 4),
                        cm.flex({ align: 'start', gap: 'sm' }),
                      )}
                    >
                      <span
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'center' }),
                          cm.roundedFull,
                          'h-8 w-8 shrink-0 bg-primary-container text-on-primary-container',
                        )}
                      >
                        <span className="material-symbols-outlined text-base" aria-hidden="true">
                          verified
                        </span>
                      </span>
                      <span>
                        <strong className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                          {t(`privacy.s${idx + 1}.b${bi}.title`, {}, { defaultValue: b.title })}
                        </strong>
                        <span className={cm.cn(cm.textSize('sm'), 'block text-on-surface-variant')}>
                          {t(`privacy.s${idx + 1}.b${bi}.body`, {}, { defaultValue: b.body })}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {section.table ? (
                <div className={cm.cn(cm.card(), 'overflow-x-auto')}>
                  <table className={'w-full text-left text-sm'}>
                    <caption className="sr-only">
                      {t(
                        `privacy.s${idx + 1}.tableCaption`,
                        {},
                        { defaultValue: 'Authorized third-party sub-processors' },
                      )}
                    </caption>
                    <thead>
                      <tr className={'border-b border-outline-variant'}>
                        {[
                          { def: 'Partner Entity' },
                          { def: 'Functional Purpose' },
                          { def: 'Data Location' },
                          { def: 'Standard / Protocol' },
                        ].map((col, ci) => (
                          <th
                            key={col.def}
                            className={cm.cn(
                              cm.sp('px', 4),
                              cm.sp('py', 3),
                              cm.textSize('xs'),
                              cm.fontWeight('semibold'),
                              'text-on-surface-variant uppercase tracking-wider',
                            )}
                          >
                            {t(`privacy.s${idx + 1}.col${ci}`, {}, { defaultValue: col.def })}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.table.map((row) => (
                        <tr
                          key={row.partner}
                          className={'border-b border-outline-variant last:border-b-0'}
                        >
                          <td
                            className={cm.cn(
                              cm.sp('px', 4),
                              cm.sp('py', 3),
                              cm.fontWeight('medium'),
                            )}
                          >
                            {row.partner}
                          </td>
                          <td
                            className={cm.cn(
                              cm.sp('px', 4),
                              cm.sp('py', 3),
                              'text-on-surface-variant',
                            )}
                          >
                            {row.purpose}
                          </td>
                          <td
                            className={cm.cn(
                              cm.sp('px', 4),
                              cm.sp('py', 3),
                              'text-on-surface-variant',
                            )}
                          >
                            {row.location}
                          </td>
                          <td
                            className={cm.cn(
                              cm.sp('px', 4),
                              cm.sp('py', 3),
                              'text-on-surface-variant',
                            )}
                          >
                            {row.standard}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          ))}
        </section>

        <section
          data-mol-id="privacy-enterprise"
          className={cm.cn(
            cm.stack(3),
            cm.sp('p', 8),
            'bg-primary-container text-on-primary-container rounded-lg text-center',
          )}
        >
          <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t(
              'privacy.enterprise.title',
              {},
              { defaultValue: 'Need a Signed BAA, Custom MSA, or Enterprise Data Addendum?' },
            )}
          </h3>
          <p className={cm.cn(cm.prose, 'mx-auto max-w-2xl')}>
            {t(
              'privacy.enterprise.body',
              {},
              {
                defaultValue:
                  'If your shop handles hospital mechanical systems, school-district electrical overhauls, or municipal plumbing contracts that need customized data-retention exhibits, we provide counter-signed agreements within 24 hours.',
              },
            )}
          </p>
          <div className={cm.flex({ justify: 'center', gap: 'sm', wrap: 'wrap' })}>
            <Link
              to="/about"
              data-mol-id="privacy-enterprise-cta"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded-md',
              )}
            >
              {t('privacy.enterprise.cta', {}, { defaultValue: 'Request Addendum Pack' })}
            </Link>
          </div>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default Privacy
export { Privacy as PrivacyPage }
