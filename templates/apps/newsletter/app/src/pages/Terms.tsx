import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import LandingFooter from '../components/LandingFooter.js'
import LandingTopNavBar from '../components/LandingTopNavBar.js'

interface Guarantee {
  id: string
  icon: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

/** The four structural guarantees the editorial compact opens with. */
const GUARANTEES: Guarantee[] = [
  {
    id: 'ip',
    icon: 'copyright',
    titleKey: 'terms.guarantee.ip.title',
    titleDefault: '100% Author IP Ownership',
    bodyKey: 'terms.guarantee.ip.body',
    bodyDefault:
      'You hold irrevocable copyright over every essay, layout choice, archive, and reader thread. {{appName}} claims zero license beyond transit.',
  },
  {
    id: 'cut',
    icon: 'payments',
    titleKey: 'terms.guarantee.cut.title',
    titleDefault: 'Zero Platform Cut or Lock-In',
    bodyKey: 'terms.guarantee.cut.body',
    bodyDefault:
      'Subscriber payments flow directly through your own connected payment account. We never escrow your revenue or skim subscription fees.',
  },
  {
    id: 'egress',
    icon: 'unarchive',
    titleKey: 'terms.guarantee.egress.title',
    titleDefault: 'Instant Unconditional Egress',
    bodyKey: 'terms.guarantee.egress.body',
    bodyDefault:
      'Single-click export of complete reader CSVs and standard Markdown article archives anytime, with zero delays or exit interviews.',
  },
  {
    id: 'privacy',
    icon: 'shield',
    titleKey: 'terms.guarantee.privacy.title',
    titleDefault: 'Protocol-Level Reader Privacy',
    bodyKey: 'terms.guarantee.privacy.body',
    bodyDefault:
      'No hidden tracking pixels, no invasive surveillance scripts, no affiliate injection, and absolutely no reader behavioral data brokerage.',
  },
]

interface ContrastRow {
  id: string
  dimensionKey: string
  dimensionDefault: string
  legacyKey: string
  legacyDefault: string
  oursKey: string
  oursDefault: string
}

/** How this covenant formally diverges from legacy publication networks. */
const CONTRAST_ROWS: ContrastRow[] = [
  {
    id: 'cut',
    dimensionKey: 'terms.contrast.cut.dimension',
    dimensionDefault: 'Platform cut / take rate',
    legacyKey: 'terms.contrast.cut.legacy',
    legacyDefault: '10%–12% escalatable platform fee',
    oursKey: 'terms.contrast.cut.ours',
    oursDefault: '0% cut — payments settle directly in the author’s own payment account',
  },
  {
    id: 'custody',
    dimensionKey: 'terms.contrast.custody.dimension',
    dimensionDefault: 'Subscriber relationship custody',
    legacyKey: 'terms.contrast.custody.legacy',
    legacyDefault: 'Shared custody with platform brand loyalty hooks',
    oursKey: 'terms.contrast.custody.ours',
    oursDefault: 'Direct sovereign author-reader relationship',
  },
  {
    id: 'feeds',
    dimensionKey: 'terms.contrast.feeds.dimension',
    dimensionDefault: 'Algorithmic recommendation cross-pollination',
    legacyKey: 'terms.contrast.feeds.legacy',
    legacyDefault: 'Compulsory ad or recommended-network feeds inserted in the body',
    oursKey: 'terms.contrast.feeds.ours',
    oursDefault: 'Absolute zero network insertion; isolated publishing canvas',
  },
  {
    id: 'egress',
    dimensionKey: 'terms.contrast.egress.dimension',
    dimensionDefault: 'Data egress & off-boarding',
    legacyKey: 'terms.contrast.egress.legacy',
    legacyDefault: 'Delayed CSV exports; payment tokens retained',
    oursKey: 'terms.contrast.egress.ours',
    oursDefault: 'Instant 1-click export of billing tokens and Markdown archives',
  },
]

interface Section {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const SECTIONS: Section[] = [
  {
    id: 'eligibility',
    titleKey: 'terms.eligibility.title',
    titleDefault: 'Eligibility',
    bodyKey: 'terms.eligibility.body',
    bodyDefault:
      'You must be at least 13 years old to create an account on {{appName}}. By signing up you confirm that you meet that age and that the information you provide is accurate.',
  },
  {
    id: 'covenant',
    titleKey: 'terms.covenant.title',
    titleDefault: 'Author Covenant & Intellectual Property Ownership',
    bodyKey: 'terms.covenant.body',
    bodyDefault:
      '{{appName}} asserts no property rights, editorial stewardship, or proprietary license over any manuscript, audio dispatch, artwork, subscriber correspondence, or typographic arrangement published through the platform. You retain exhaustive, unencumbered, worldwide copyright over every character you compose. By provisioning an account, you grant {{appName}} solely the ephemeral technical license required to ingest Markdown, compile responsive HTML, distribute email across SMTP relays, and cache static assets for the duration of your publication’s active lifecycle — and that license terminates automatically upon deletion of a post or closure of your account.',
  },
  {
    id: 'content',
    titleKey: 'terms.content.title',
    titleDefault: 'Your content',
    bodyKey: 'terms.content.body',
    bodyDefault:
      'You retain ownership of every post, comment, and image you publish. By publishing on {{appName}} you grant us a non-exclusive worldwide license to host and display your content for the purpose of operating the service. Delete a post and the license ends.',
  },
  {
    id: 'reader-sovereignty',
    titleKey: 'terms.readerSovereignty.title',
    titleDefault: 'Reader Sovereignty & Anti-Surveillance',
    bodyKey: 'terms.readerSovereignty.body',
    bodyDefault:
      '{{appName}} adheres to a strict protocol-level prohibition against surveillance capitalism. We refuse to instrument reader devices with cross-site tracking beacons, retargeting pixels, canvas fingerprinting mechanisms, or telemetry daemons. Engagement statistics in the author studio (open rates, link clicks) are computed from pseudonymous send records — reader browser fingerprints are never exposed to third parties, and subscriber demographics are never monetized.',
  },
  {
    id: 'settlement',
    titleKey: 'terms.settlement.title',
    titleDefault: 'Financial Settlement & Stripe Direct Connect',
    bodyKey: 'terms.settlement.body',
    bodyDefault:
      'Commercial transactions between authors and their subscribers are mediated through the author’s own connected payment account. {{appName}} never serves as merchant of record, never commingles publisher funds into corporate accounts, and enforces zero withholding periods. We charge a flat software-tier fee and take 0.00% of recurring subscriber revenue.',
  },
  {
    id: 'billing',
    titleKey: 'terms.billing.title',
    titleDefault: 'Billing',
    bodyKey: 'terms.billing.body',
    bodyDefault:
      'Paid plans are billed monthly or annually via our payment provider. You can cancel any time from Settings → Billing; cancellation stops the next renewal but does not refund the current period unless we made a billing error.',
  },
  {
    id: 'conduct',
    titleKey: 'terms.conduct.title',
    titleDefault: 'Permitted & Prohibited Editorial Conduct',
    bodyKey: 'terms.conduct.body',
    bodyDefault:
      '{{appName}} exists to protect investigative depth, provocative literary discourse, and independent reporting; we stay neutral on lawful opinions, political stances, and critical inquiry. What we do not permit: unsolicited commercial email (spam or bought lists), phishing or credential harvesting, malware distribution, or targeted incitement to imminent lawless violence. We may remove content and suspend accounts that cross those boundaries.',
  },
  {
    id: 'sla',
    titleKey: 'terms.sla.title',
    titleDefault: 'Infrastructure SLAs & Delivery Guarantees',
    bodyKey: 'terms.sla.body',
    bodyDefault:
      'We warrant a monthly network availability of 99.95% across all publication sites and the author studio. Outbound dispatches route through isolated sending infrastructure configured for maximum DKIM, SPF, and DMARC compliance. If platform availability falls beneath 99.90% in a calendar month, authors are eligible for proportional service credits upon written request.',
  },
  {
    id: 'portability',
    titleKey: 'terms.portability.title',
    titleDefault: 'Data Portability & Egress Guarantees',
    bodyKey: 'terms.portability.body',
    bodyDefault:
      'We reject predatory data retention architectures. At any moment you hold an unqualified right to an instantaneous, machine-readable snapshot of your entire publication: the complete subscriber registry with join dates and tiers, every post as standard Markdown with frontmatter, original-resolution media, and a portable billing-token handoff — with zero delays, zero fees, and zero lock-in.',
  },
  {
    id: 'custody',
    titleKey: 'terms.custody.title',
    titleDefault: 'Cryptographic Account Custody',
    bodyKey: 'terms.custody.body',
    bodyDefault:
      'Authors are responsible for safeguarding access tokens, passkeys, and multi-factor authentication devices attached to their account. {{appName}} staff will never request your password or secondary authentication codes.',
  },
  {
    id: 'termination',
    titleKey: 'terms.termination.title',
    titleDefault: 'Termination',
    bodyKey: 'terms.termination.body',
    bodyDefault:
      'You may close your account at any time from Settings → Account. We may suspend an account if it violates these terms. We will email you a 30-day notice before any policy-driven termination so you can export your work.',
  },
  {
    id: 'changes',
    titleKey: 'terms.changes.title',
    titleDefault: 'Changes to these terms',
    bodyKey: 'terms.changes.body',
    bodyDefault:
      'When we change material parts of these terms we will email every active account at least 14 days in advance. Continued use after the effective date constitutes acceptance.',
  },
  {
    id: 'governing-law',
    titleKey: 'terms.governingLaw.title',
    titleDefault: 'Governing Law & Dispute Protocol',
    bodyKey: 'terms.governingLaw.body',
    bodyDefault:
      'This agreement is governed by the laws of the State of Delaware, without regard to its conflict-of-law principles. Any dispute arising out of or relating to this covenant first undergoes informal, good-faith mediation between the author and the {{appName}} custodian office before any formal proceeding may begin.',
  },
  {
    id: 'custodian',
    titleKey: 'terms.custodian.title',
    titleDefault: 'Legal & Editorial Custodian Contact',
    bodyKey: 'terms.custodian.body',
    bodyDefault:
      'For formal legal inquiries, takedown notices, subpoena processing, or protocol verification, direct all correspondence to the custodian desk: legal@dispatch.press. A named human responds to every substantive notice within two business days.',
  },
]

export function Terms() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-terms"
      header={<LandingTopNavBar />}
      footer={<LandingFooter />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('terms.title', {}, { defaultValue: 'Terms of service' })}
    >
      {/* Editorial compact — the design's sovereignty lead + guarantee grid */}
      <section data-mol-id="terms-compact" className={cm.cn(cm.stack(6), cm.sp('mb', 12))}>
        <h2
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            "font-['Newsreader'] text-on-background",
          )}
        >
          {t(
            'terms.compact.title',
            {},
            {
              defaultValue: 'Terms of Service Built for Intellectual Sovereignty, Not Extraction.',
            },
          )}
        </h2>
        <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'terms.compact.body',
            { appName: APP_NAME },
            {
              defaultValue:
                '{{appName}} is engineered as neutral editorial infrastructure. You retain 100% intellectual property ownership of your work, maintain sovereign direct custody of your subscriber registry, and command unencumbered portability at zero financial friction.',
            },
          )}
        </p>
        <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'sm:grid-cols-2')}>
          {GUARANTEES.map((g) => (
            <div
              key={g.id}
              data-mol-id={`terms-guarantee-${g.id}`}
              className={cm.cn(
                cm.stack(2),
                cm.sp('p', 5),
                'rounded-xl bg-surface-container-lowest border border-surface-container-highest',
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  'w-9 h-9 rounded-sm bg-primary-fixed text-primary justify-center',
                )}
              >
                <span className={cm.fv5b245ffa} aria-hidden>
                  {g.icon}
                </span>
              </div>
              <h3
                className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'text-on-surface')}
              >
                {t(g.titleKey, {}, { defaultValue: g.titleDefault })}
              </h3>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(g.bodyKey, { appName: APP_NAME }, { defaultValue: g.bodyDefault })}
              </p>
            </div>
          ))}
        </div>
      </section>

      <p
        data-mol-id="terms-effective"
        className={cm.cn(cm.textSize('sm'), cm.sp('mb', 8), 'font-body text-on-surface-variant')}
      >
        {t('terms.effective', {}, { defaultValue: 'Last updated: 1 May 2026' })}
      </p>
      <div data-mol-id="terms-sections" className={cm.cn(cm.stack(8))}>
        {SECTIONS.map((s) => (
          <section key={s.id} data-mol-id={`terms-${s.id}`} className={cm.cn(cm.stack(2))}>
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
              {t(s.titleKey, {}, { defaultValue: s.titleDefault })}
            </h2>
            <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
              {t(s.bodyKey, { appName: APP_NAME }, { defaultValue: s.bodyDefault })}
            </p>
            {/* The structural contrast table rides directly after the author
                covenant, exactly where the design places it. */}
            {s.id === 'covenant' && (
              <div
                data-mol-id="terms-contrast"
                className={cm.cn(
                  cm.sp('mt', 4),
                  cm.sp('p', 5),
                  'rounded-xl bg-surface-container-lowest border border-surface-container-highest overflow-x-auto',
                )}
              >
                <h3
                  className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), cm.sp('mb', 3))}
                >
                  {t(
                    'terms.contrast.title',
                    {},
                    { defaultValue: 'Architectural Structural Contrast' },
                  )}
                </h3>
                <table className={cm.cn('w-full', cm.textSize('sm'), 'text-left')}>
                  <thead>
                    <tr className="text-on-surface-variant">
                      <th
                        scope="col"
                        className={cm.cn(cm.sp('py', 2), cm.sp('pr', 4), cm.fontWeight('medium'))}
                      >
                        {t('terms.contrast.dimension', {}, { defaultValue: 'Covenant dimension' })}
                      </th>
                      <th
                        scope="col"
                        className={cm.cn(cm.sp('py', 2), cm.sp('pr', 4), cm.fontWeight('medium'))}
                      >
                        {t(
                          'terms.contrast.legacy',
                          {},
                          { defaultValue: 'Standard venture platforms' },
                        )}
                      </th>
                      <th scope="col" className={cm.cn(cm.sp('py', 2), cm.fontWeight('medium'))}>
                        {t(
                          'terms.contrast.ours',
                          {},
                          { defaultValue: `${APP_NAME} protocol terms` },
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {CONTRAST_ROWS.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t border-surface-container-highest align-top"
                      >
                        <th
                          scope="row"
                          className={cm.cn(
                            cm.sp('py', 3),
                            cm.sp('pr', 4),
                            cm.fontWeight('medium'),
                            'text-on-surface',
                          )}
                        >
                          {t(row.dimensionKey, {}, { defaultValue: row.dimensionDefault })}
                        </th>
                        <td
                          className={cm.cn(
                            cm.sp('py', 3),
                            cm.sp('pr', 4),
                            'text-on-surface-variant',
                          )}
                        >
                          {t(row.legacyKey, {}, { defaultValue: row.legacyDefault })}
                        </td>
                        <td className={cm.cn(cm.sp('py', 3), 'text-on-surface')}>
                          {t(row.oursKey, {}, { defaultValue: row.oursDefault })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>
    </ContentPageShell>
  )
}

export default Terms
export { Terms as TermsPage }
