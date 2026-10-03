/**
 * Public privacy policy page — Stitch design design-civic-311-privacy.
 * Municipal privacy charter: hero trust cards (EXIF sanitization, anonymized
 * dockets, cryptographic audit, zero-fee FOIA), eight codified sections
 * (collection matrix, media sanitization, resident shield, geofence/SMS
 * protocol, agency boundary, retention schedule, RTKL intake), and the
 * privacy-office bottom callout. Every string flows through `t()`.
 *
 * @returns The rendered privacy page.
 */
import { useState } from 'react'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Modal } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/** Hero trust card. */
interface TrustCard {
  id: string
  icon: string
  title: string
  body: string
  badge: string
}

const TRUST_CARDS: TrustCard[] = [
  {
    id: 'exif',
    icon: 'camera_enhance',
    title: 'EXIF Sanitization',
    body: 'Automated stripping of camera serials, lens identifiers, focal biometrics, and embedded GPS timestamps prior to docket publication.',
    badge: '100% Automated Pipeline',
  },
  {
    id: 'dockets',
    icon: 'shield_person',
    title: 'Anonymized Dockets',
    body: 'Resident names, personal phone numbers, and IP headers are redacted by default from public feeds, open APIs, and council reports.',
    badge: 'Redacted Under Open-Records § 708',
  },
  {
    id: 'audit',
    icon: 'security_update_good',
    title: 'Cryptographic Audit',
    body: 'Every incident transition receives an immutable SHA-256 state stamp, preventing clandestine closures or unrecorded municipal delays.',
    badge: 'Public SHA-256 Ledger',
  },
  {
    id: 'foia',
    icon: 'folder_shared',
    title: 'Zero-Fee Open FOIA',
    body: 'All non-redacted public records, street work orders, and departmental response times are downloadable free of charge.',
    badge: 'No Civic Surcharges',
  },
]

/** § 2.0 data-collection matrix rows. */
const MATRIX_ROWS: Array<{
  field: string
  source: string
  status: 'public' | 'sanitized' | 'redacted'
  retention: string
  basis: string
}> = [
  {
    field: 'Incident Lat/Long Coordinates',
    source: 'GPS / User Pin',
    status: 'public',
    retention: 'Permanent (GIS Ledger)',
    basis: 'Public Asset Repair',
  },
  {
    field: 'Defect Photographic Uploads',
    source: 'Citizen Camera',
    status: 'sanitized',
    retention: '7 Years Post-Resolution',
    basis: 'EXIF Scrubbed on Upload',
  },
  {
    field: 'Resident Full Name',
    source: 'User Registration',
    status: 'redacted',
    retention: 'Purged 90 Days Post-Close',
    basis: 'Open-Records § 708(b)(1)',
  },
  {
    field: 'Submitter Telephone / SMS',
    source: 'SMS Dispatch Gateway',
    status: 'redacted',
    retention: 'Purged 60 Days Post-Close',
    basis: 'Open-Records § 708(b)(6)',
  },
  {
    field: 'DPW Crew AVL Telemetry',
    source: 'Municipal Fleet GPS',
    status: 'public',
    retention: '10 Years (Auditing)',
    basis: 'Civic Performance Tracking',
  },
  {
    field: 'Client IP / Hardware Headers',
    source: 'HTTP Socket Request',
    status: 'redacted',
    retention: 'Memory Scrub / 48 hrs',
    basis: 'Cyber Security Rule 12',
  },
]

/** § 3.0 sanitization pipeline cards. */
const SANITIZATION: Array<{ id: string; icon: string; title: string; body: string }> = [
  {
    id: 'exif',
    icon: 'no_photography',
    title: 'EXIF Header Obliteration',
    body: 'Device serial numbers, lens focal metrics, ICC color profiles, user camera timestamps, and device altitude identifiers are permanently stripped from JPEG/PNG headers.',
  },
  {
    id: 'faces',
    icon: 'face',
    title: 'Incidental Bystander Blurring',
    body: 'Machine-vision algorithms automatically apply a Gaussian blur over any human faces caught within the field of view of a sidewalk or park defect photograph.',
  },
  {
    id: 'plates',
    icon: 'directions_car',
    title: 'License Plate Masking',
    body: 'Vehicle registration plates appearing in public right-of-way reports (potholes, snow berms) are black-boxed to protect vehicle owners from automated scraping.',
  },
]

/** § 7.0 retention rows. */
const RETENTION: Array<{ id: string; title: string; note: string; window: string }> = [
  {
    id: 'sms',
    title: 'Transient SMS & Dispatch Voice Recordings',
    note: 'Audio transcripts and temporary gateway SMS strings',
    window: '30-Day Purge',
  },
  {
    id: 'contact',
    title: 'Submitter Direct Contact Data (Name, Phone, Email)',
    note: 'Disassociated from the docket once the work order verification closes',
    window: '90-Day Purge',
  },
  {
    id: 'ledger',
    title: 'Public Infrastructure Work Order Log',
    note: 'Asset location, asphalt metric, crew labor timestamp, resolution verification',
    window: 'Permanent Public Record',
  },
]

export function Privacy() {
  const { t } = useTranslation()
  const cm = getClassMap()
  // RTKL intake confirmation — a shared Modal dialog (the former native
  // window.alert read as an unstyled browser widget and blocked the thread).
  const [rtklConfirmOpen, setRtklConfirmOpen] = useState(false)
  const tr = (key: string, def: string, values?: Record<string, string>): string =>
    t(key, values ?? {}, { defaultValue: def })
  const h2 = cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')
  const body = cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')
  const article = cm.cn('scroll-mt-24', cm.stack(4))
  const statusTone: Record<string, string> = {
    public: 'bg-secondary-container text-on-secondary-container',
    sanitized: 'bg-[var(--color-status-in-review)]/15 text-[var(--color-status-in-review)]',
    redacted: 'bg-error-container text-on-error-container',
  }
  const statusLabel: Record<string, string> = {
    public: tr('privacy.status.public', 'Unredacted Public'),
    sanitized: tr('privacy.status.sanitized', 'Sanitized Public'),
    redacted: tr('privacy.status.redacted', 'Strictly Redacted'),
  }

  return (
    <ContentPageShell
      bare
      containerSize="xl"
      dataMolId="page-privacy"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={tr('privacy.title', 'Municipal Privacy, Telemetry Custody & Public Records Policy')}
      subtitle={tr(
        'privacy.intro',
        'This codified governance charter outlines how the City of Riverton collects, redacts, secures, and publishes municipal 311 service telemetry for {{app}}. Our mandate balances statutory public openness with uncompromised citizen privacy protections.',
        { app: APP_NAME },
      )}
    >
      <div className={cm.stack(10)}>
        {/* Trust & statutory cards row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_CARDS.map((card) => (
            <div
              key={card.id}
              data-mol-id={`privacy-trust-${card.id}`}
              className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 transition-colors hover:border-primary"
            >
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-primary">
                <span className="material-symbols-outlined text-[18px]">{card.icon}</span>
              </div>
              <h2
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 1),
                  'text-on-surface',
                )}
              >
                {tr(`privacy.trust.${card.id}.title`, card.title)}
              </h2>
              <p className={cm.cn(cm.textSize('xs'), 'leading-normal text-on-surface-variant')}>
                {tr(`privacy.trust.${card.id}.body`, card.body)}
              </p>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 1 }),
                  cm.sp('mt', 2),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'text-primary',
                )}
              >
                <span className="material-symbols-outlined text-[12px]">check_circle</span>
                <span>{tr(`privacy.trust.${card.id}.badge`, card.badge)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Two-column charter canvas */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <aside className={cm.cn(cm.stack(6), 'lg:col-span-4')}>
            {/* Resident protections summary */}
            <div
              data-mol-id="privacy-protections-glance"
              className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-5"
            >
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 3))}>
                <span className="material-symbols-outlined text-[18px] text-primary">
                  verified_user
                </span>
                <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
                  {tr('privacy.glance.title', 'Resident Protections at a Glance')}
                </h2>
              </div>
              <ul className={cm.stack(3)}>
                {(
                  [
                    [
                      'privacy.glance.item1',
                      'Zero Commercial Exploitation:',
                      ' 311 reports are never sold, licensed to data brokers, or monetized for ad retargeting.',
                    ],
                    [
                      'privacy.glance.item2',
                      'Auto-Redacted Facial Imagery:',
                      ' Incidental bystanders or license plates captured in roadway photos are blurred before docketing.',
                    ],
                    [
                      'privacy.glance.item3',
                      'Immutable Hash Trace:',
                      ' Verified submissions receive an unchangeable audit key for administrative accountability.',
                    ],
                  ] as const
                ).map(([key, bold, rest]) => (
                  <li
                    key={key}
                    className={cm.cn(
                      cm.flex({ align: 'start', gap: 'sm' }),
                      'text-xs text-on-surface-variant',
                    )}
                  >
                    <span className="material-symbols-outlined mt-0.5 shrink-0 text-sm text-primary">
                      check
                    </span>
                    <span>
                      <strong className="text-on-surface">{tr(`${key}.bold`, bold)}</strong>
                      {tr(key, rest)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Data ombudsman contact box */}
            <div
              data-mol-id="privacy-ombudsman"
              className="rounded-xl border border-primary/20 bg-surface-container-lowest p-5 shadow-sm"
            >
              <h2
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 1),
                  'text-primary',
                )}
              >
                <span className="material-symbols-outlined text-base">badge</span>
                {tr('privacy.ombudsman.title', 'Office of the Data Ombudsman')}
              </h2>
              <p className={cm.cn(cm.textSize('xs'), cm.sp('mb', 3), 'text-on-surface-variant')}>
                {tr(
                  'privacy.ombudsman.role',
                  'Designated Municipal Records Custodian & Open-Records Appeals Officer',
                )}
              </p>
              <div
                className={cm.cn(
                  cm.stack(2),
                  'border-t border-outline-variant/40 pt-3 text-xs text-on-surface',
                )}
              >
                <div className={cm.flex({ align: 'start', gap: 'sm' })}>
                  <span className="material-symbols-outlined text-sm text-on-surface-variant">
                    location_on
                  </span>
                  <div>
                    <div className={cm.fontWeight('semibold')}>
                      {tr('privacy.ombudsman.line1', 'City Hall — Suite 204')}
                    </div>
                    <div className="text-on-surface-variant">
                      {tr('privacy.ombudsman.line2', '401 Market Street, Riverton PA 19047')}
                    </div>
                  </div>
                </div>
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <span className="material-symbols-outlined text-sm text-on-surface-variant">
                    mail
                  </span>
                  <a
                    className="font-medium text-primary hover:underline"
                    href="mailto:privacy@rivertonpa.gov"
                  >
                    {tr('privacy.ombudsman.email', 'privacy@rivertonpa.gov')}
                  </a>
                </div>
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <span className="material-symbols-outlined text-sm text-on-surface-variant">
                    call
                  </span>
                  <span className="font-medium text-on-surface-variant">
                    {tr('privacy.ombudsman.phone', '(555) 019-3112 / Ext. 804')}
                  </span>
                </div>
              </div>
            </div>
          </aside>

          {/* Right column: statutory text */}
          <div className={cm.cn(cm.stack(12), 'lg:col-span-8')}>
            {/* § 1.0 */}
            <article id="privacy-section-1" data-mol-id="privacy-section-1" className={article}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' }),
                  'border-b border-outline-variant/40 pb-2',
                )}
              >
                <h2 className={h2}>
                  <span className="mr-2 font-mono text-primary">§ 1.0</span>{' '}
                  {tr('privacy.s1.title', 'Statutory Authority, Purpose & Jurisdiction')}
                </h2>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'rounded bg-surface-container px-2 py-0.5 font-mono text-on-surface-variant',
                  )}
                >
                  {tr('privacy.s1.ref', 'RMC § 4-113.1')}
                </span>
              </div>
              <p className={body}>
                {tr(
                  'privacy.s1.p1',
                  'The CivicPulse 311 operational apparatus is deployed pursuant to the statutory power granted by the Home Rule Charter of the City of Riverton (Chapter 18, as amended by Ordinance #2024-91). As an administrative arm of the Riverton Department of Public Works and the Department of Municipal Information Technology, CivicPulse operates within the dual mandate of civic dispatch speed and state transparency compliance.',
                )}
              </p>
              <p className={body}>
                {tr(
                  'privacy.s1.p2',
                  'All records generated through this platform are categorized under the state Right-to-Know Law. The City recognizes that public right-of-way telemetry — including potholes, damaged lighting fixtures, illegal dumping points, and sewer backups — constitutes public data of paramount communal interest. Concurrently, the City recognizes the constitutional and common-law privacy interests of residents who lodge reports.',
                )}
              </p>
              <div className="rounded-xl border-l-4 border-primary bg-surface-container-low p-4">
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 2 }),
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    cm.sp('mb', 1),
                    'text-on-surface',
                  )}
                >
                  <span className="material-symbols-outlined text-primary">gavel</span>
                  {tr(
                    'privacy.s1.callout.title',
                    'Civic Data as a Public Good with Resident Privacy Protections',
                  )}
                </div>
                <p className={body}>
                  {tr(
                    'privacy.s1.callout.body',
                    'Riverton Municipal Code explicitly proscribes treating resident interactions as transactional consumer telemetry. Every data element captured must either directly facilitate public asset restoration or be immediately expunged. No predictive behavioral scoring or third-party syndication is legally authorized within city operational bounds.',
                  )}
                </p>
              </div>
            </article>

            {/* § 2.0 — data matrix */}
            <article id="privacy-section-2" data-mol-id="privacy-section-2" className={article}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' }),
                  'border-b border-outline-variant/40 pb-2',
                )}
              >
                <h2 className={h2}>
                  <span className="mr-2 font-mono text-primary">§ 2.0</span>{' '}
                  {tr('privacy.s2.title', 'Data Collection vs. Exclusion Matrix')}
                </h2>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'rounded bg-surface-container px-2 py-0.5 font-mono text-on-surface-variant',
                  )}
                >
                  {tr('privacy.s2.ref', 'RMC § 4-113.2')}
                </span>
              </div>
              <p className={body}>
                {tr(
                  'privacy.s2.p1',
                  'The following statutory matrix details every distinct category of telemetry processed by CivicPulse Riverton 311, its visibility on the open municipal map, archival limits, and statutory classification:',
                )}
              </p>
              <div className="overflow-x-auto rounded-xl border border-outline-variant/40 bg-surface-container-lowest shadow-sm">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-outline-variant/40 bg-surface-container font-semibold text-on-surface">
                      <th className="p-3">{tr('privacy.s2.th1', 'Data Field')}</th>
                      <th className="p-3">{tr('privacy.s2.th2', 'Source')}</th>
                      <th className="p-3">{tr('privacy.s2.th3', 'Public Docket Status')}</th>
                      <th className="p-3">{tr('privacy.s2.th4', 'Retention Schedule')}</th>
                      <th className="p-3">{tr('privacy.s2.th5', 'Statutory Basis')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30 text-on-surface-variant">
                    {MATRIX_ROWS.map((row, i) => (
                      <tr key={row.field} className="hover:bg-surface-container-low/50">
                        <td
                          className={cm.cn(
                            cm.sp('p', 3),
                            cm.fontWeight('semibold'),
                            'text-on-surface',
                          )}
                        >
                          {tr(`privacy.s2.r${i}.field`, row.field)}
                        </td>
                        <td className="p-3">{tr(`privacy.s2.r${i}.source`, row.source)}</td>
                        <td className="p-3">
                          <span
                            className={cm.cn(
                              'rounded px-2 py-0.5 text-[11px] font-semibold',
                              statusTone[row.status],
                            )}
                          >
                            {statusLabel[row.status]}
                          </span>
                        </td>
                        <td className="p-3">{tr(`privacy.s2.r${i}.retention`, row.retention)}</td>
                        <td className="p-3">{tr(`privacy.s2.r${i}.basis`, row.basis)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className={cm.cn(cm.textSize('xs'), 'italic text-on-surface-variant')}>
                {tr(
                  'privacy.s2.note',
                  '* Note: When an issue is logged on private property (e.g., an overgrown vegetative code violation), the exact house number is anonymized to the 100-block range on public maps until administrative summons or abatement occurs.',
                )}
              </p>
            </article>

            {/* § 3.0 — media sanitization */}
            <article id="privacy-section-3" data-mol-id="privacy-section-3" className={article}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' }),
                  'border-b border-outline-variant/40 pb-2',
                )}
              >
                <h2 className={h2}>
                  <span className="mr-2 font-mono text-primary">§ 3.0</span>{' '}
                  {tr('privacy.s3.title', 'Image & Media Sanitization Directive')}
                </h2>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'rounded bg-surface-container px-2 py-0.5 font-mono text-on-surface-variant',
                  )}
                >
                  {tr('privacy.s3.ref', 'RMC § 4-113.3')}
                </span>
              </div>
              <p className={body}>
                {tr(
                  'privacy.s3.p1',
                  'When a resident uploads media to substantiate an infrastructure hazard (such as a broken curb, buckled storm drain, fallen tree limb, or faded crosswalk), the payload passes through the Automated Civic Redaction Engine prior to touching any persistent public storage bucket.',
                )}
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {SANITIZATION.map((card, i) => (
                  <div
                    key={card.id}
                    className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-4"
                  >
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'sm' }),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        cm.sp('mb', 1),
                        'text-on-surface',
                      )}
                    >
                      <span className="material-symbols-outlined text-sm text-primary">
                        {card.icon}
                      </span>
                      {tr(`privacy.s3.card${i}.title`, card.title)}
                    </div>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        'leading-relaxed text-on-surface-variant',
                      )}
                    >
                      {tr(`privacy.s3.card${i}.body`, card.body)}
                    </p>
                  </div>
                ))}
              </div>
              <p className={body}>
                {tr(
                  'privacy.s3.p2',
                  'The original, unredacted media file is maintained in an encrypted, isolated administrative repository accessible solely by authorized Riverton Code Enforcement supervisors under court order or verified municipal claim litigation.',
                )}
              </p>
            </article>

            {/* § 4.0 — resident shield & anonymous reporting */}
            <article id="privacy-section-4" data-mol-id="privacy-section-4" className={article}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' }),
                  'border-b border-outline-variant/40 pb-2',
                )}
              >
                <h2 className={h2}>
                  <span className="mr-2 font-mono text-primary">§ 4.0</span>{' '}
                  {tr('privacy.s4.title', 'Resident Privacy Shield & Anonymous Reporting')}
                </h2>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'rounded bg-surface-container px-2 py-0.5 font-mono text-on-surface-variant',
                  )}
                >
                  {tr('privacy.s4.ref', 'RMC § 4-113.4')}
                </span>
              </div>
              <p className={body}>
                {tr(
                  'privacy.s4.p1',
                  'Riverton 311 permits citizens to submit municipal service requests under two distinct tiers of statutory disclosure:',
                )}
              </p>
              <div className={cm.stack(4)}>
                <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-4">
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' }),
                      cm.sp('mb', 2),
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        cm.flex({ align: 'center', gap: 2 }),
                        'uppercase tracking-wide text-on-surface',
                      )}
                    >
                      <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-status-resolved)]" />
                      {tr(
                        'privacy.s4.optionA',
                        'Option A: Verified Resident Submissions (Shielded)',
                      )}
                    </span>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'rounded bg-surface-container px-2 py-0.5 text-primary',
                      )}
                    >
                      {tr('privacy.s4.optionA.tag', 'Enhanced Tracking')}
                    </span>
                  </div>
                  <p className={body}>
                    {tr(
                      'privacy.s4.optionA.body',
                      "Residents authenticated via a verified email receive real-time dispatch updates, direct communication channels with assigned DPW supervisors, and automated notifications upon docket closure. Shielding rule: the citizen's identity is walled inside the dispatch backend and never exposed on the public portal, REST endpoints, or City Council agenda attachments.",
                    )}
                  </p>
                </div>
                <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-4">
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' }),
                      cm.sp('mb', 2),
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        cm.flex({ align: 'center', gap: 2 }),
                        'uppercase tracking-wide text-on-surface',
                      )}
                    >
                      <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-status-in-review)]" />
                      {tr('privacy.s4.optionB', 'Option B: Anonymous Public Submissions')}
                    </span>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'rounded bg-surface-container px-2 py-0.5 text-on-surface-variant',
                      )}
                    >
                      {tr('privacy.s4.optionB.tag', 'Zero Personal Info')}
                    </span>
                  </div>
                  <p className={body}>
                    {tr(
                      'privacy.s4.optionB.body',
                      'Residents may opt to report any physical street defect without supplying a name, telephone number, or email. In this mode, no user session identifier is stored; the system issues a tracking token (e.g., RIV-2025-8841) which the resident may query anonymously from the public docket without logging in.',
                    )}
                  </p>
                </div>
              </div>
            </article>

            {/* § 5.0 — geofence & SMS protocols */}
            <article id="privacy-section-5" data-mol-id="privacy-section-5" className={article}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' }),
                  'border-b border-outline-variant/40 pb-2',
                )}
              >
                <h2 className={h2}>
                  <span className="mr-2 font-mono text-primary">§ 5.0</span>{' '}
                  {tr('privacy.s5.title', 'Automated Geofence & SMS Privacy Protocols')}
                </h2>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'rounded bg-surface-container px-2 py-0.5 font-mono text-on-surface-variant',
                  )}
                >
                  {tr('privacy.s5.ref', 'RMC § 4-113.5')}
                </span>
              </div>
              <p className={body}>
                {tr(
                  'privacy.s5.p1',
                  'Residents who register for Neighborhood Geofence Watch alerts (e.g., asphalt paving notifications, water main maintenance, or street sweeping within 500 meters of their residence) are protected under strict carrier routing rules:',
                )}
              </p>
              <ul className={cm.cn(cm.stack(2), 'list-disc pl-5 text-sm text-on-surface-variant')}>
                <li>
                  <strong className="text-on-surface">
                    {tr('privacy.s5.b1.bold', 'Strict Opt-In:')}
                  </strong>{' '}
                  {tr(
                    'privacy.s5.b1',
                    'Telecommunication alerts require affirmative double opt-in confirmation under FCC TCPA regulations.',
                  )}
                </li>
                <li>
                  <strong className="text-on-surface">
                    {tr('privacy.s5.b2.bold', 'No Tower Tracking:')}
                  </strong>{' '}
                  {tr(
                    'privacy.s5.b2',
                    'Riverton 311 does not ingest mobile carrier tower triangulation or continuous device location streams. Geofenced alerts are calculated solely against the fixed parcel boundary nominated during preference configuration.',
                  )}
                </li>
                <li>
                  <strong className="text-on-surface">
                    {tr('privacy.s5.b3.bold', 'Immediate STOP Cancellation:')}
                  </strong>{' '}
                  {tr(
                    'privacy.s5.b3',
                    "Replying 'STOP' to 311-RIV instantly expunges the resident's mobile number from the neighborhood dispatch broker within 60 seconds.",
                  )}
                </li>
              </ul>
            </article>

            {/* § 6.0 — law-enforcement boundary */}
            <article id="privacy-section-6" data-mol-id="privacy-section-6" className={article}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' }),
                  'border-b border-outline-variant/40 pb-2',
                )}
              >
                <h2 className={h2}>
                  <span className="mr-2 font-mono text-primary">§ 6.0</span>{' '}
                  {tr('privacy.s6.title', 'Law Enforcement & Inter-Agency Boundary')}
                </h2>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'rounded bg-surface-container px-2 py-0.5 font-mono text-on-surface-variant',
                  )}
                >
                  {tr('privacy.s6.ref', 'RMC § 4-113.6')}
                </span>
              </div>
              <p className={body}>
                {tr(
                  'privacy.s6.p1',
                  'A vital civic priority of the Riverton Municipal Government is maintaining absolute public trust in 311 as a municipal civil service hotline, strictly decoupled from criminal surveillance or punitive intelligence gathering.',
                )}
              </p>
              <div className="rounded-xl border border-error/20 bg-error-container/30 p-4">
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 2 }),
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    cm.sp('mb', 1),
                    'text-on-error-container',
                  )}
                >
                  <span className="material-symbols-outlined text-error">security</span>
                  {tr('privacy.s6.callout.title', 'The Strict Firewalled Boundary')}
                </div>
                <p className={body}>
                  {tr(
                    'privacy.s6.callout.body',
                    'Riverton Police Department, state police, or federal agencies are legally barred from unfettered bulk query access to CivicPulse unredacted resident contact tables. Non-public submitter telemetry may only be disclosed pursuant to a formal judicial search warrant or subpoena signed by a judge upon a finding of probable cause concerning a life-safety felony event.',
                  )}
                </p>
              </div>
            </article>

            {/* § 7.0 — retention schedule */}
            <article id="privacy-section-7" data-mol-id="privacy-section-7" className={article}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' }),
                  'border-b border-outline-variant/40 pb-2',
                )}
              >
                <h2 className={h2}>
                  <span className="mr-2 font-mono text-primary">§ 7.0</span>{' '}
                  {tr('privacy.s7.title', 'Data Retention Schedule & Purge Protocol')}
                </h2>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'rounded bg-surface-container px-2 py-0.5 font-mono text-on-surface-variant',
                  )}
                >
                  {tr('privacy.s7.ref', 'RMC § 4-113.7')}
                </span>
              </div>
              <p className={body}>
                {tr(
                  'privacy.s7.p1',
                  'In conformance with the state municipal records retention and disposition schedule, CivicPulse applies automated data purging to mitigate data custody liability:',
                )}
              </p>
              <div className={cm.stack(3)}>
                {RETENTION.map((row, i) => (
                  <div
                    key={row.id}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
                      cm.sp('p', 3),
                      'rounded-lg border border-outline-variant/40 bg-surface-container-low',
                    )}
                  >
                    <div>
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('bold'),
                          'text-on-surface',
                        )}
                      >
                        {tr(`privacy.s7.r${i}.title`, row.title)}
                      </span>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {tr(`privacy.s7.r${i}.note`, row.note)}
                      </p>
                    </div>
                    <span className={cnRetentionBadge(cm)}>
                      {tr(`privacy.s7.r${i}.window`, row.window)}
                    </span>
                  </div>
                ))}
              </div>
            </article>

            {/* § 8.0 — FOIA rights + RTKL intake */}
            <article id="privacy-section-8" data-mol-id="privacy-section-8" className={article}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' }),
                  'border-b border-outline-variant/40 pb-2',
                )}
              >
                <h2 className={h2}>
                  <span className="mr-2 font-mono text-primary">§ 8.0</span>{' '}
                  {tr('privacy.s8.title', 'Resident FOIA Rights, Data Corrections & Ombudsman')}
                </h2>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'rounded bg-surface-container px-2 py-0.5 font-mono text-on-surface-variant',
                  )}
                >
                  {tr('privacy.s8.ref', 'Title 65')}
                </span>
              </div>
              <p className={body}>
                {tr(
                  'privacy.s8.p1',
                  'Every resident of Riverton possesses statutory rights under the Right-to-Know Law to inspect and request copies of public municipal service records.',
                )}
              </p>
              <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-sm">
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' }),
                    'border-b border-outline-variant/40 pb-3',
                  )}
                >
                  <div>
                    <h3
                      className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}
                    >
                      {tr('privacy.rtkl.title', 'Right-to-Know (RTKL) Request Intake')}
                    </h3>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {tr(
                        'privacy.rtkl.subtitle',
                        'Direct transmission to the Riverton Open Records Officer',
                      )}
                    </p>
                  </div>
                  <span className={cnRetentionBadge(cm)}>
                    {tr('privacy.rtkl.form', 'Form RTKL-311-2025')}
                  </span>
                </div>
                <form
                  className={cm.stack(3)}
                  onSubmit={(e) => {
                    e.preventDefault()
                    setRtklConfirmOpen(true)
                  }}
                >
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className={cm.stack(1)}>
                      <span className={cnLabel(cm)}>
                        {tr('privacy.rtkl.name', 'Requester Full Name')} *
                      </span>
                      <input
                        className={cnInput(cm)}
                        placeholder={tr('privacy.rtkl.namePh', 'Jane Doe')}
                        required
                        type="text"
                      />
                    </label>
                    <label className={cm.stack(1)}>
                      <span className={cnLabel(cm)}>
                        {tr('privacy.rtkl.address', 'Mailing Address or Riverton Parcel ID')} *
                      </span>
                      <input
                        className={cnInput(cm)}
                        placeholder={tr('privacy.rtkl.addressPh', '123 Oak St, Riverton PA')}
                        required
                        type="text"
                      />
                    </label>
                  </div>
                  <label className={cm.stack(1)}>
                    <span className={cnLabel(cm)}>
                      {tr('privacy.rtkl.dockets', 'Specific CivicPulse Docket ID(s) or Date Range')}
                    </span>
                    <input
                      className={cnInput(cm)}
                      placeholder={tr(
                        'privacy.rtkl.docketsPh',
                        "e.g., RIV-2025-4100 through RIV-2025-4120 or 'All pothole orders for 4th Ward in July 2025'",
                      )}
                      type="text"
                    />
                  </label>
                  <label className={cm.stack(1)}>
                    <span className={cnLabel(cm)}>
                      {tr('privacy.rtkl.scope', 'Scope of Records Sought')} *
                    </span>
                    <textarea
                      className={cnInput(cm)}
                      placeholder={tr(
                        'privacy.rtkl.scopePh',
                        'State clearly the municipal telemetry, dispatch logs, or department inspection memos requested…',
                      )}
                      required
                      rows={3}
                    />
                  </label>
                  <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <input
                      className="rounded border-surface-variant text-primary focus:ring-primary"
                      id="privacy-foia-cert"
                      required
                      type="checkbox"
                    />
                    <label className={cnLabel(cm)} htmlFor="privacy-foia-cert">
                      {tr(
                        'privacy.rtkl.certify',
                        'I certify that I am a legal resident of the United States and this request is submitted pursuant to the Right-to-Know Law.',
                      )}
                    </label>
                  </div>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'end', gap: 'md' }),
                      'pt-2',
                    )}
                  >
                    <button className={cnBtnGhost(cm)} type="reset">
                      {tr('privacy.rtkl.clear', 'Clear Form')}
                    </button>
                    <button className={cnBtnPrimary(cm)} type="submit">
                      <span className="material-symbols-outlined text-sm">send</span>
                      {tr('privacy.rtkl.submit', 'Transmit RTKL Request to City Clerk')}
                    </button>
                  </div>
                </form>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-surface-container p-4 text-sm text-on-surface">
                <span className="material-symbols-outlined mt-0.5 text-xl text-primary">
                  contact_support
                </span>
                <div className={cm.stack(1)}>
                  <span className={cm.fontWeight('bold')}>
                    {tr(
                      'privacy.appeal.title',
                      'Right to Appeal to the state Office of Open Records',
                    )}
                  </span>
                  <p className={body}>
                    {tr(
                      'privacy.appeal.body',
                      'If your request for municipal service records is denied in whole or in part by the Riverton City Clerk, you maintain the statutory right to lodge an appeal within fifteen (15) business days with the Commonwealth Office of Open Records.',
                    )}
                  </p>
                </div>
              </div>
            </article>

            {/* Bottom callout banner */}
            <div className="flex flex-col items-center justify-between gap-6 rounded-2xl bg-civic-gradient p-6 text-white shadow-sm md:flex-row">
              <div className={cm.stack(1)}>
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
                  {tr(
                    'privacy.cta.title',
                    'Have questions regarding municipal privacy or public record redactions?',
                  )}
                </h3>
                <p
                  className={cm.cn(cm.textSize('xs'), 'leading-relaxed text-on-primary-container')}
                >
                  {tr(
                    'privacy.cta.body',
                    'The Riverton City Solicitor and Data Privacy Ombudsman host public transparency open office hours every second Tuesday of the month at City Hall.',
                  )}
                </p>
              </div>
              <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                <a
                  data-mol-id="privacy-cta-officer"
                  className={cnBtnWhite(cm)}
                  href="mailto:privacy@rivertonpa.gov"
                >
                  {tr('privacy.cta.contact', 'Contact Privacy Officer')}
                </a>
                <a
                  data-mol-id="privacy-cta-audit"
                  className="rounded-lg border border-white/40 px-3.5 py-2.5 text-xs font-medium text-white transition-colors hover:bg-white/10"
                  href="mailto:privacy@rivertonpa.gov?subject=Audit"
                >
                  {tr('privacy.cta.download', 'Download Audit')}
                </a>
              </div>
            </div>

            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {tr('privacy.lastUpdated', 'Last updated: 2026-09-28')}
            </p>
          </div>
        </div>
      </div>

      {/* RTKL submission confirmation — shared Modal (replaces the former
          native window.alert). */}
      <Modal
        open={rtklConfirmOpen}
        onClose={() => setRtklConfirmOpen(false)}
        title={tr('privacy.rtkl.confirmTitle', 'RTKL request received')}
        data-mol-id="rtkl-confirm-modal"
        footer={
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-on-primary transition-colors hover:bg-primary-container"
            onClick={() => setRtklConfirmOpen(false)}
          >
            {tr('privacy.rtkl.confirmOk', 'Acknowledge')}
          </button>
        }
      >
        <p className={body}>
          {tr(
            'privacy.rtkl.confirm',
            'Your Right-to-Know docket query has been assigned tracking key RTK-2025-901. A formal response will be dispatched within 5 statutory business days.',
          )}
        </p>
      </Modal>
    </ContentPageShell>
  )
}

/** Small uppercase form label. */
function cnLabel(cm: ReturnType<typeof getClassMap>): string {
  return cm.cn(cm.textSize('xs'), 'font-medium text-on-surface-variant')
}

/** Uniform form input surface. */
function cnInput(cm: ReturnType<typeof getClassMap>): string {
  return cm.cn(
    cm.w('full'),
    cm.sp('p', 2),
    'rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-xs text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary',
  )
}

/** Mono badge (retention window / form id). */
function cnRetentionBadge(cm: ReturnType<typeof getClassMap>): string {
  return cm.cn(
    cm.textSize('xs'),
    'shrink-0 rounded border border-outline-variant/40 bg-surface-container-lowest px-2.5 py-1 font-mono font-bold text-primary',
  )
}

function cnBtnGhost(cm: ReturnType<typeof getClassMap>): string {
  return cm.cn(
    cm.sp('px', 3),
    cm.sp('py', 2),
    'rounded-lg text-xs font-medium text-on-surface-variant transition-colors hover:text-on-surface',
  )
}

function cnBtnPrimary(cm: ReturnType<typeof getClassMap>): string {
  return cm.cn(
    cm.flex({ align: 'center', justify: 'center', gap: 1 }),
    cm.sp('px', 4),
    cm.sp('py', 2),
    'rounded-lg bg-primary text-xs font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container',
  )
}

function cnBtnWhite(cm: ReturnType<typeof getClassMap>): string {
  return cm.cn(
    cm.sp('px', 4),
    cm.sp('py', 3),
    'rounded-lg bg-white text-xs font-semibold text-primary shadow-sm transition-colors hover:bg-surface-container',
  )
}

export default Privacy
export { Privacy as PrivacyPage }
