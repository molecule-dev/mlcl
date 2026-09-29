import { useEffect } from 'react'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Terms of Service & Field Service Level Agreement — the design-shaped terms
 * page for the construction-management app.
 *
 * Renders the design's full structure: a section directory, the four jobsite
 * commitments, the master service agreement preamble, numbered articles 01-10
 * (license through legal dispatch), and a closing note pointing at the
 * canonical bonded Terms the footer modal shows — one legal copy, two
 * surfaces.
 *
 * i18n keys are app-scoped (`termsField.*`) — none of them exist in
 * `@molecule/app-locales-common`, so the inline `defaultValue`s are the
 * single source of the English copy (no catalog shadowing).
 *
 * @returns The rendered terms page.
 */
export function Terms() {
  const cm = getClassMap()
  const { t } = useTranslation()

  useEffect(() => {
    document.title = t(
      'termsField.docTitle',
      {},
      { defaultValue: 'Terms of Service & Field Service Level Agreement' },
    )
  }, [t])

  const h2 = cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'tracking-tight')
  const h3 = cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))
  const body = cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'leading-relaxed')
  const chip = cm.cn(
    cm.sp('px', 2),
    cm.sp('py', 1),
    cm.textSize('xs'),
    cm.fontWeight('semibold'),
    'rounded-full border border-outline-variant bg-surface-container',
  )
  const card = cm.cn(cm.card(), cm.sp('p', 6))

  const articles: Array<{
    id: string
    num: string
    key: string
    def: string
    bodyKey: string
    bodyDef: string
  }> = [
    {
      id: 'terms-license',
      num: '01',
      key: 'termsField.art01',
      def: '01. Jobsite License & Unlimited Trade Access',
      bodyKey: 'termsField.art01.body',
      bodyDef:
        'The subscriber receives a non-exclusive license to deploy the platform across its active jobsites with unlimited trade subcontractor, inspector, and architect access. We never charge per-seat fees for trade partners — inviting the field is the point.',
    },
    {
      id: 'terms-data-ownership',
      num: '02',
      key: 'termsField.art02',
      def: '02. Field Data Ownership & Blueprint IP',
      bodyKey: 'termsField.art02.body',
      bodyDef:
        'Customer plans, revisions, site scans, daily records, and closeout documentation remain the customer’s property. We claim zero ownership or license over project intellectual property beyond what operating the service requires.',
    },
    {
      id: 'terms-offline',
      num: '03',
      key: 'termsField.art03',
      def: '03. Offline Sub-Basement Cache & Sync Fidelity',
      bodyKey: 'termsField.art03.body',
      bodyDef:
        'Field devices keep an encrypted offline cache where coverage drops. When connectivity returns, the cache reconciles over an authenticated channel; conflicts resolve last-writer-wins per record with the audit trail preserved.',
    },
    {
      id: 'terms-sla',
      num: '04',
      key: 'termsField.art04',
      def: '04. 99.98% High-Pour Availability SLA & Service Credits',
      bodyKey: 'termsField.art04.body',
      bodyDef:
        'We target 99.98% monthly availability for the field application. Where a confirmed outage interrupts a scheduled pour window and the SLA is missed, the customer accrues service credits against the next invoice under the published credit schedule.',
    },
    {
      id: 'terms-hardware',
      num: '05',
      key: 'termsField.art05',
      def: '05. Permitted Hardware & Ruggedized Device Usage',
      bodyKey: 'termsField.art05.body',
      bodyDef:
        'The field application is supported on current ruggedized tablets, trailer kiosk hardware, and standard phones and tablets meeting the published baseline. Jailbroken or compromised devices are not permitted on jobsite terminals.',
    },
    {
      id: 'terms-safety',
      num: '06',
      key: 'termsField.art06',
      def: '06. Safety Protocol & OSHA 1926 Compliance Disclaimer',
      bodyKey: 'termsField.art06.body',
      bodyDef:
        'The platform records safety observations and muster state, but it does not replace the customer’s safety program. Compliance with 29 CFR Part 1926 and site-specific protocols remains the general contractor’s and each employer’s responsibility.',
    },
    {
      id: 'terms-billing',
      num: '07',
      key: 'termsField.art07',
      def: '07. Billing, Master Subscriptions & Payment in Integer Cents',
      bodyKey: 'termsField.art07.body',
      bodyDef:
        'Subscription charges are calculated and stored in integer cents (USD) with no fractional rounding, billed to the account owner under the master subscription. Plan changes take effect immediately; invoices itemize each jobsite and period.',
    },
    {
      id: 'terms-indemnification',
      num: '08',
      key: 'termsField.art08',
      def: '08. Mutual Indemnification & Field Risk Allocation',
      bodyKey: 'termsField.art08.body',
      bodyDef:
        'We defend the customer against third-party claims that the service infringes their intellectual property. The customer is responsible for the accuracy of field records it enters and for site decisions made from them — the platform documents the record; it does not direct the work.',
    },
    {
      id: 'terms-termination',
      num: '09',
      key: 'termsField.art09',
      def: '09. Termination, Data Export & 10-Year Project Archive Retainage',
      bodyKey: 'termsField.art09.body',
      bodyDef:
        'Either party may terminate the master subscription at the end of a billing period. On termination the customer can export every project record; closed project vaults move to tamper-evident read-only archive storage for ten full calendar years from closeout.',
    },
    {
      id: 'terms-contact',
      num: '10',
      key: 'termsField.art10',
      def: '10. Contact Field Legal Dispatch',
      bodyKey: 'termsField.art10.body',
      bodyDef:
        'Questions about this agreement, service credits, or archive retention go to the field legal dispatch desk, answered around the clock from the contact points on the About page and in the footer.',
    },
  ]

  const commitments = [
    {
      key: 'termsField.commit.seatTax.title',
      def: 'Zero Sub Seat Tax',
      bodyKey: 'termsField.commit.seatTax.body',
      bodyDef: 'Never pay per user when inviting trade partners, inspectors, or architects.',
    },
    {
      key: 'termsField.commit.ownership.title',
      def: 'You Own All Field Data',
      bodyKey: 'termsField.commit.ownership.body',
      bodyDef: 'We claim zero ownership or rights over your plans, revisions, or site scans.',
    },
    {
      key: 'termsField.commit.sla.title',
      def: 'Pour-Window Uptime',
      bodyKey: 'termsField.commit.sla.body',
      bodyDef: 'A published 99.98% availability target with service credits when it is missed.',
    },
    {
      key: 'termsField.commit.archive.title',
      def: '10-Year Vault',
      bodyKey: 'termsField.commit.archive.body',
      bodyDef: 'Closed projects land in tamper-evident read-only archive storage for a decade.',
    },
  ]

  return (
    <ContentPageShell
      dataMolId="page-terms"
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t(
        'termsField.heroTitle',
        {},
        { defaultValue: 'Terms of Service & Field Service Level Agreement' },
      )}
      subtitle={t(
        'termsField.heroSubtitle',
        {},
        {
          defaultValue:
            'The Groundwork Terms of Service for jobsite deployments: unlimited trade access, field data ownership, the high-pour availability SLA, and the ten-year project archive — written for the deck, not the fine print.',
        },
      )}
      bare
      containerSize="lg"
    >
      <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'lg:grid-cols-3')}>
        {/* Left rail — directory + commitments */}
        <aside className={cm.cn('space-y-6 lg:sticky lg:top-8 lg:self-start')}>
          <nav
            aria-label={t('termsField.directoryLabel', {}, { defaultValue: 'Section Directory' })}
            className={card}
          >
            <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), cm.sp('mb', 3))}>
              {t('termsField.directory', {}, { defaultValue: 'Section Directory' })}
            </h2>
            <ol className={cm.cn('space-y-1', cm.textSize('sm'))}>
              <li>
                <a
                  href="#terms-preamble"
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors"
                >
                  <span className="truncate">00. Master Service Agreement Preamble</span>
                  <span aria-hidden="true">→</span>
                </a>
              </li>
              {articles.map((a) => (
                <li key={a.id}>
                  <a
                    href={`#${a.id}`}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors"
                  >
                    <span className="truncate">{t(a.key, {}, { defaultValue: a.def })}</span>
                    <span aria-hidden="true">→</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className={card}>
            <h3 className={cm.cn(h3, cm.sp('mb', 3))}>
              {t('termsField.commitments', {}, { defaultValue: 'Jobsite Commitments' })}
            </h3>
            <ul className="space-y-3">
              {commitments.map((c) => (
                <li key={c.key} className={cm.flex({ gap: 'sm', align: 'start' })}>
                  <span
                    aria-hidden="true"
                    className={cm.cn(
                      'material-symbols-outlined text-tertiary shrink-0 inline-flex items-center justify-center w-6 h-6',
                    )}
                  >
                    check_circle
                  </span>
                  <div>
                    <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                      {t(c.key, {}, { defaultValue: c.def })}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(c.bodyKey, {}, { defaultValue: c.bodyDef })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Main body */}
        <div className={cm.cn('lg:col-span-2 space-y-10')}>
          {/* Preamble */}
          <section id="terms-preamble" className="space-y-3 scroll-mt-8">
            <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
              <span className={chip}>MSA</span>
              <h2 className={h2}>
                {t(
                  'termsField.preamble',
                  {},
                  { defaultValue: 'Master Service Agreement Preamble' },
                )}
              </h2>
            </div>
            <p className={body}>
              {t(
                'termsField.preamble.p1',
                {},
                {
                  defaultValue:
                    'This Master Subscription & Jobsite Service Agreement (“Agreement”) is executed between the platform operator and the subscriber general contractor, specialty trade subcontractor, or construction management entity (“Customer”).',
                },
              )}
            </p>
            <p className={body}>
              {t(
                'termsField.preamble.p2',
                {},
                {
                  defaultValue:
                    'By deploying the field application on any jobsite, trailer terminal, or mobile device, Customer agrees to these provisions, which are intended to be read alongside the standard general conditions governing the construction contract for the project.',
                },
              )}
            </p>
          </section>

          {/* Articles 01-10 */}
          {articles.map((a) => (
            <section key={a.id} id={a.id} className="space-y-3 scroll-mt-8">
              <h2 className={h2}>{t(a.key, {}, { defaultValue: a.def })}</h2>
              <p className={body}>{t(a.bodyKey, {}, { defaultValue: a.bodyDef })}</p>
            </section>
          ))}

          {/* Canonical bonded policy pointer */}
          <section
            data-mol-id="terms-full-policy"
            className={cm.cn(card, 'bg-surface-container-low')}
          >
            <h2 className={cm.cn(h2, cm.sp('mb', 3))}>
              {t('termsField.fullPolicy', {}, { defaultValue: 'Full terms of service' })}
            </h2>
            <p className={body}>
              {t(
                'termsField.fullPolicyBody',
                {},
                {
                  defaultValue:
                    'These field terms summarize the Groundwork Terms of Service of record. The footer’s Terms of Service link opens the complete legal document — master subscription, payment, and dispute provisions — at any time.',
                },
              )}
            </p>
          </section>
        </div>
      </div>
    </ContentPageShell>
  )
}

export default Terms
