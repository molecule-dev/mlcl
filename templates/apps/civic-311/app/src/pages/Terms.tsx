/**
 * Public terms-of-service page — Stitch design design-civic-311-terms.
 * Statutory charter document: hero metadata cards, sticky outline with the
 * resident-rights summary and the City Solicitor contact box, eight codified
 * sections (with the non-emergency life-safety callout and the SLA lifecycle),
 * and the municipal ombudsman bottom callout. Every string flows through `t()`.
 *
 * @returns The rendered terms page.
 */
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/** Hero compliance card. */
interface MetaCard {
  id: string
  icon: string
  label: string
  value: string
  note: string
  tone?: 'error'
}

const META_CARDS: MetaCard[] = [
  {
    id: 'authority',
    icon: 'gavel',
    label: 'Statutory Authority',
    value: 'Riverton Charter § 4-112',
    note: 'PA RTKL Title 65 Compliant',
  },
  {
    id: 'jurisdiction',
    icon: 'map',
    label: 'Geographic Jurisdiction',
    value: 'Wards 1 through 6',
    note: 'Riverton Municipal Limits',
  },
  {
    id: 'proof',
    icon: 'verified_user',
    label: 'Cryptographic Proof',
    value: 'SHA-256 Ledger Audit',
    note: 'Public Work Order Hashing',
  },
  {
    id: 'emergency',
    icon: 'shield_with_heart',
    label: 'Emergency Notice',
    value: 'Non-Emergency Intake',
    note: 'Call 911 for Life Hazards',
    tone: 'error',
  },
]

/** Table-of-contents entry for one codified section. */
const OUTLINE: Array<{ href: string; label: string }> = [
  { href: '#terms-section-1', label: '§ 1. Statutory Charter & Intent' },
  { href: '#terms-section-2', label: '§ 2. Non-Emergency Boundaries (911)' },
  { href: '#terms-section-3', label: '§ 3. Open Telemetry & Cryptographic Ledger' },
  { href: '#terms-section-4', label: '§ 4. GPS, Geocoding & EXIF Custody' },
  { href: '#terms-section-5', label: '§ 5. Municipal SLAs & Dispatch Intake' },
  { href: '#terms-section-6', label: '§ 6. Automated Geofencing & SMS' },
  { href: '#terms-section-7', label: '§ 7. Ward Identity & Redaction' },
  { href: '#terms-section-8', label: '§ 8. Sovereign Immunity & Tort Act' },
]

/** Resident-rights bullet: bold lead + tail copy. */
const RIGHTS: Array<{ key: string; bold: string; rest: string }> = [
  {
    key: 'item1',
    bold: 'Immutable Ticket Proof:',
    rest: ' Every logged 311 report receives a verifiable public tracking ID.',
  },
  {
    key: 'item2',
    bold: 'Zero FOIA Filing Fees:',
    rest: ' Public telemetry and repair completion photos are accessible at zero fee.',
  },
  {
    key: 'item3',
    bold: 'Statutory Appeal Right:',
    rest: ' Closed work tickets can be contested within 14 calendar days.',
  },
]

export function Terms() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const tr = (key: string, def: string, values?: Record<string, string>): string =>
    t(key, values ?? {}, { defaultValue: def })
  const card = 'rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 sm:p-8'
  const tag = cm.cn(
    cm.sp('px', 3),
    cm.sp('py', 1),
    'rounded bg-surface-container text-primary text-xs font-semibold self-start',
  )
  const h2 = cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')
  const body = cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')

  return (
    <ContentPageShell
      bare
      containerSize="xl"
      dataMolId="page-terms"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={tr('terms.title', 'Statutory Terms of Service & Municipal Telemetry Directive')}
      subtitle={tr(
        'terms.intro',
        'Rules of engagement, open records custody, citizen telemetry rights, and municipal service dispatch responsibilities for the {{app}} system. All logged incidents constitute public dockets under the state Right to Know Law.',
        { app: `${APP_NAME} 311` },
      )}
    >
      <div className={cm.stack(10)}>
        {/* Compliance metadata cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {META_CARDS.map((meta) => (
            <div
              key={meta.id}
              data-mol-id={`terms-meta-${meta.id}`}
              className={cm.cn(
                cm.flex({ align: 'start', gap: 'md' }),
                cm.sp('p', 4),
                'rounded-xl border bg-surface-container-low',
                meta.tone === 'error' ? 'border-error/30' : 'border-outline-variant/40',
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.sp('p', 2),
                  'shrink-0 rounded-lg',
                  meta.tone === 'error'
                    ? 'bg-error-container text-on-error-container'
                    : 'bg-surface-container text-primary',
                )}
              >
                <span className="material-symbols-outlined text-[22px]">{meta.icon}</span>
              </div>
              <div>
                <div className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {tr(`terms.meta.${meta.id}.label`, meta.label)}
                </div>
                <div
                  className={cm.cn(
                    cm.textSize('base'),
                    cm.fontWeight('semibold'),
                    meta.tone === 'error' ? 'text-error' : 'text-on-surface',
                  )}
                >
                  {tr(`terms.meta.${meta.id}.value`, meta.value)}
                </div>
                <div
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('mt', 1),
                    meta.tone === 'error' ? 'text-error' : 'text-on-surface-variant',
                  )}
                >
                  {tr(`terms.meta.${meta.id}.note`, meta.note)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Two-column document canvas: sticky outline + statutory articles */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left sticky sidebar */}
          <aside className={cm.cn(cm.stack(6), 'lg:col-span-4')}>
            <nav
              aria-label={tr('terms.outlineLabel', 'Statutory Document Outline')}
              className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-sm"
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  'border-b border-outline-variant/40 pb-3 mb-3',
                )}
              >
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'uppercase tracking-wider text-on-surface-variant',
                  )}
                >
                  {tr('terms.outlineTitle', 'Statutory Chapters')}
                </span>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    'rounded bg-surface-container font-mono text-xs font-semibold text-primary',
                  )}
                >
                  {tr('terms.outlineCount', '8 SECTIONS')}
                </span>
              </div>
              <ul className={cm.stack(2)}>
                {OUTLINE.map((item) => (
                  <li key={item.href}>
                    <a
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                        cm.sp('p', 2),
                        'rounded-lg text-sm text-secondary transition-colors hover:bg-surface-container-low hover:text-on-surface',
                      )}
                      href={item.href}
                    >
                      <span className="truncate">
                        {tr(`terms.outline${item.href.slice(15)}`, item.label)}
                      </span>
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Resident rights summary */}
            <div
              data-mol-id="terms-rights-glance"
              className="rounded-xl border border-primary/20 bg-gradient-to-br from-surface-container-lowest to-surface-container-low p-5"
            >
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 3))}>
                <span className="material-symbols-outlined text-[20px] text-primary">verified</span>
                <h2
                  className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), 'text-on-surface')}
                >
                  {tr('terms.rights.title', 'Resident Rights at a Glance')}
                </h2>
              </div>
              <ul className={cm.stack(3)}>
                {RIGHTS.map((item) => (
                  <li
                    key={item.key}
                    className={cm.cn(
                      cm.flex({ align: 'start', gap: 'sm' }),
                      'text-sm text-on-surface-variant',
                    )}
                  >
                    <span className="material-symbols-outlined mt-0.5 shrink-0 text-[18px] text-primary">
                      check_circle
                    </span>
                    <span>
                      <strong className="text-on-surface">
                        {tr(`terms.rights.${item.key}.bold`, item.bold)}
                      </strong>
                      {tr(`terms.rights.${item.key}.rest`, item.rest)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* City Solicitor contact box */}
            <div
              data-mol-id="terms-solicitor"
              className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5"
            >
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.sp('mb', 1),
                  'block uppercase tracking-wider text-on-surface-variant',
                )}
              >
                {tr('terms.solicitor.eyebrow', 'Municipal Inquiries')}
              </span>
              <h2
                className={cm.cn(
                  cm.textSize('base'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 2),
                  'text-on-surface',
                )}
              >
                {tr('terms.solicitor.title', 'Office of the City Solicitor')}
              </h2>
              <p className={cm.cn(body, cm.sp('mb', 4))}>
                {tr(
                  'terms.solicitor.body',
                  'Statutory questions regarding the municipal telemetry charter may be served via registered public mail or in person:',
                )}
              </p>
              <div className={cm.stack(2)}>
                {(
                  [
                    ['domain', 'address', 'City Hall, Suite 200, 401 Market St'],
                    ['call', 'phone', '(555) 019-3110 (Solicitor Registry)'],
                    ['mail', 'email', 'clerk@rivertonpa.gov'],
                  ] as const
                ).map(([icon, id, def]) => (
                  <div
                    key={id}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      'text-sm text-on-surface',
                    )}
                  >
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                      {icon}
                    </span>
                    <span className={id === 'email' ? 'font-medium text-primary' : ''}>
                      {tr(`terms.solicitor.${id}`, def)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Right column: statutory articles */}
          <article className={cm.cn(cm.stack(10), 'lg:col-span-8')}>
            {/* Section 1 */}
            <section
              id="terms-section-1"
              data-mol-id="terms-section-1"
              className={cm.cn(card, cm.stack(4))}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
                )}
              >
                <span className={tag}>
                  {tr('terms.s1.tag', 'SECTION 1.0 · STATUTORY AUTHORITY')}
                </span>
                <span className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}>
                  {tr('terms.s1.ref', 'ORD #2024-91 § 1.1')}
                </span>
              </div>
              <h2 className={h2}>
                {tr('terms.s1.title', '1. Statutory Charter & Legislative Intent')}
              </h2>
              <p className={body}>
                {tr(
                  'terms.s1.p1',
                  'The CivicPulse 311 System operates pursuant to the express authority established under the Riverton City Charter § 4-112 (Municipal Telemetry, Transparent Infrastructure, and Civic Service Access Directive). Enacted by unanimous proclamation of the Riverton City Council, this platform transforms civil grievance filings from private departmental paperwork into an active, transparent public pipeline.',
                )}
              </p>
              <div className="rounded-xl border-l-4 border-primary bg-secondary-container/40 p-4">
                <h3
                  className={cm.cn(
                    cm.textSize('base'),
                    cm.fontWeight('semibold'),
                    cm.sp('mb', 1),
                    'text-primary',
                  )}
                >
                  {tr('terms.s1.declaration.title', 'Legislative Declaration of Public Ownership')}
                </h3>
                <p className={body}>
                  {tr(
                    'terms.s1.declaration.body',
                    '"Every road imperfection, fractured curb, malfunctioning traffic signal, and blighted parcel logged into CivicPulse exists as a direct public liability and matter of community record. Residents hold an indivisible public right to inspect municipal mitigation progress without barrier or procedural obstruction."',
                  )}
                </p>
              </div>
              <p className={body}>
                {tr(
                  'terms.s1.p2',
                  'By accessing, browsing, submitting data to, or subscribing to notification feeds within the platform, you ("the Resident" or "Citizen User") unconditionally assent to these statutory terms. If you do not accept these municipal protocols, you may lodge service requests via paper petition at the City Clerk\'s Office during standard legislative hours.',
                )}
              </p>
            </section>

            {/* Section 2 — life-safety callout */}
            <section
              id="terms-section-2"
              data-mol-id="terms-section-2"
              className={cm.cn(
                cm.sp('p', 5),
                'rounded-xl border-2 border-error/30 bg-surface-container-lowest sm:p-8',
                cm.stack(4),
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'text-error')}>
                <span className="material-symbols-outlined text-[24px]">warning</span>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-wide',
                  )}
                >
                  {tr('terms.s2.tag', 'Mandatory Life-Safety Perimeter Notice')}
                </span>
              </div>
              <h2 className={cm.cn(h2, 'text-error')}>
                {tr('terms.s2.title', '2. Non-Emergency Service Boundary (§ 2.1 – § 2.4)')}
              </h2>
              <p className={cm.cn(cm.prose, cm.fontWeight('semibold'), 'text-on-surface')}>
                {tr(
                  'terms.s2.p1',
                  'CivicPulse Riverton 311 is strictly an asynchronous municipal asset management intake tool. It is NEVER monitored as an emergency dispatch terminal.',
                )}
              </p>
              <div className="rounded-xl border border-error/20 bg-error-container/40 p-4 text-sm text-on-error-container">
                <ul className={cm.cn(cm.stack(2), 'list-disc pl-5 text-on-surface')}>
                  <li>
                    {tr(
                      'terms.s2.never1',
                      'Active structure fires, chemical odors, natural gas odors, or visible smoke plumes.',
                    )}
                  </li>
                  <li>
                    {tr(
                      'terms.s2.never2',
                      'Crimes in progress, domestic disputes, vehicular collisions, or suspicious persons.',
                    )}
                  </li>
                  <li>
                    {tr(
                      'terms.s2.never3',
                      'Fallen electrical wires or live downed conductors (treat all wires as lethal).',
                    )}
                  </li>
                  <li>
                    {tr(
                      'terms.s2.never4',
                      'Sudden structural collapses or immediate physical threats to human health.',
                    )}
                  </li>
                </ul>
                <p className={cm.cn(cm.sp('mt', 2), cm.fontWeight('semibold'), 'text-error')}>
                  {tr(
                    'terms.s2.action',
                    'Immediate Action Required: Dial 911 or contact Riverton Emergency Dispatch at (555) 911-0000.',
                  )}
                </p>
              </div>
              <p className={body}>
                {tr(
                  'terms.s2.p2',
                  'Neither the City of Riverton, the Department of Public Works, nor its technological contractors bear legal culpability for injury or property damages resulting from reports of emergencies logged incorrectly via CivicPulse 311.',
                )}
              </p>
            </section>

            {/* Section 3 */}
            <section
              id="terms-section-3"
              data-mol-id="terms-section-3"
              className={cm.cn(card, cm.stack(4))}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
                )}
              >
                <span className={tag}>
                  {tr('terms.s3.tag', 'SECTION 3.0 · DATA & CRYPTOGRAPHY')}
                </span>
                <span className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}>
                  {tr('terms.s3.ref', 'RTKL Title 65 § 3.2')}
                </span>
              </div>
              <h2 className={h2}>
                {tr('terms.s3.title', '3. Public Docket, Ledger Integrity & FOIA Exemptions')}
              </h2>
              <p className={body}>
                {tr(
                  'terms.s3.p1',
                  'In adherence to the state Right-to-Know Law, work tickets logged through CivicPulse are classified as presumptive public dockets. All ticket state transitions — from creation to supervisor validation, crew dispatch, and final remediation — are etched into a tamper-evident audit ledger using SHA-256 cryptographic hashing.',
                )}
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {(
                  [
                    [
                      'visibility',
                      'visibility',
                      'Public Docket Visibility',
                      'Location coordinates, incident categories, municipal response times, and photographic repair proof are published live on the CivicPulse Public GIS Map.',
                    ],
                    [
                      'shield',
                      'redaction',
                      'Resident PII Redaction',
                      'Submitting telephone numbers, resident home addresses, and personal email credentials are automatically redacted and shielded from open data exports.',
                    ],
                  ] as const
                ).map(([icon, id, title, text]) => (
                  <div
                    key={id}
                    className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-4"
                  >
                    <span className="material-symbols-outlined mb-1 text-[22px] text-primary">
                      {icon}
                    </span>
                    <h3
                      className={cm.cn(
                        cm.textSize('base'),
                        cm.fontWeight('semibold'),
                        cm.sp('mb', 1),
                        'text-on-surface',
                      )}
                    >
                      {tr(`terms.s3.${id}.title`, title)}
                    </h3>
                    <p className={body}>{tr(`terms.s3.${id}.body`, text)}</p>
                  </div>
                ))}
              </div>
              <p className={body}>
                {tr(
                  'terms.s3.p2',
                  'Any resident or civic researcher may query the Public Data API without paying Right-to-Know copying fees, guaranteeing unencumbered municipal transparency.',
                )}
              </p>
            </section>

            {/* Section 4 */}
            <section
              id="terms-section-4"
              data-mol-id="terms-section-4"
              className={cm.cn(card, cm.stack(4))}
            >
              <span className={tag}>
                {tr('terms.s4.tag', 'SECTION 4.0 · MEDIA INTELLECTUAL PROPERTY')}
              </span>
              <h2 className={h2}>
                {tr('terms.s4.title', '4. Citizen Submissions, Geocoding & EXIF Custody')}
              </h2>
              <p className={body}>
                {tr(
                  'terms.s4.p1',
                  'When uploading photographic evidence of infrastructural defects (e.g., roadway potholes, downed tree limbs, storm sewer backups), the submitter grants the City of Riverton an irrevocable, royalty-free, perpetual license to store, inspect, reproduce, and publicly display such imagery in connection with municipal maintenance.',
                )}
              </p>
              <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-4">
                <div
                  className={cm.cn(
                    cm.flex({ align: 'start', gap: 'sm' }),
                    'text-sm text-on-surface',
                  )}
                >
                  <span className="material-symbols-outlined mt-0.5 shrink-0 text-[20px] text-primary">
                    location_searching
                  </span>
                  <div>
                    <strong className={cm.fontWeight('semibold')}>
                      {tr('terms.s4.exif.title', 'EXIF Location Sanitization:')}
                    </strong>{' '}
                    {tr(
                      'terms.s4.exif.body',
                      'The system automatically reads Exchangeable Image File Format (EXIF) GPS tags to pin the exact geo-coordinates of the defect. However, device serial numbers, camera lens fingerprints, and unnecessary user metadata are purged upon upload to protect citizen privacy.',
                    )}
                  </div>
                </div>
              </div>
              <p className={body}>
                {tr(
                  'terms.s4.p2',
                  'Submitters certify that any uploaded media contains no proprietary trade secrets, unconsenting portraits of minors, or defamatory content. Media failing these tests will be expunged from the docket under Riverton Administrative Rule 12-A.',
                )}
              </p>
            </section>

            {/* Section 5 — SLA lifecycle */}
            <section
              id="terms-section-5"
              data-mol-id="terms-section-5"
              className={cm.cn(card, cm.stack(4))}
            >
              <span className={tag}>
                {tr('terms.s5.tag', 'SECTION 5.0 · OPERATIONAL DISPATCH')}
              </span>
              <h2 className={h2}>
                {tr('terms.s5.title', '5. Municipal Service SLAs & Departmental Discretion')}
              </h2>
              <p className={body}>
                {tr(
                  'terms.s5.p1',
                  'Service Level Agreements (SLAs) published across CivicPulse represent targeted municipal benchmarks and do not constitute binding civil warranties. The Department of Public Works (DPW) retains ultimate triage discretion based upon weather emergencies, budgetary appropriations, and life-safety priorities.',
                )}
              </p>
              <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-4">
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('mb', 3),
                    'block uppercase tracking-wider text-on-surface-variant',
                  )}
                >
                  {tr('terms.s5.lifecycle', 'Standard Intake Lifecycle')}
                </span>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {(
                    [
                      [
                        'step1',
                        '1. Submitted',
                        'Telemetry logged',
                        'var(--color-status-submitted)',
                      ],
                      [
                        'step2',
                        '2. Under Review',
                        'DPW supervisor triage',
                        'var(--color-status-in-review)',
                      ],
                      [
                        'step3',
                        '3. Dispatched',
                        'Crew on site',
                        'var(--color-status-acknowledged)',
                      ],
                      [
                        'step4',
                        '4. Resolved',
                        'Sealed verification photo',
                        'var(--color-status-resolved)',
                      ],
                    ] as const
                  ).map(([id, label, note, color]) => (
                    <div
                      key={id}
                      className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-3 text-center"
                    >
                      <div className={cnStepLabel(cm)} style={{ color }}>
                        {tr(`terms.s5.${id}`, label)}
                      </div>
                      <div
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.sp('mt', 1),
                          'text-on-surface-variant',
                        )}
                      >
                        {tr(`terms.s5.${id}Note`, note)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className={body}>
                {tr(
                  'terms.s5.p2',
                  'In the event of severe weather emergencies (including blizzards, flash floods, or windstorm downbursts), standard repair SLAs are temporarily stayed in favor of arterial roadway clearance.',
                )}
              </p>
            </section>

            {/* Section 6 */}
            <section
              id="terms-section-6"
              data-mol-id="terms-section-6"
              className={cm.cn(card, cm.stack(4))}
            >
              <span className={tag}>{tr('terms.s6.tag', 'SECTION 6.0 · NOTIFICATIONS & SMS')}</span>
              <h2 className={h2}>
                {tr('terms.s6.title', '6. Automated Geofence Subscriptions & SMS')}
              </h2>
              <p className={body}>
                {tr(
                  'terms.s6.p1',
                  'Residents who opt in to automated geofence alerts — receiving notifications when public works crews are deployed within 500 meters of their verified ward address — agree to standard carrier rates. The City of Riverton does not assess message or data fees for 311 SMS notifications. You may terminate SMS alerts at any time by replying STOP.',
                )}
              </p>
            </section>

            {/* Section 7 */}
            <section
              id="terms-section-7"
              data-mol-id="terms-section-7"
              className={cm.cn(card, cm.stack(4))}
            >
              <span className={tag}>
                {tr('terms.s7.tag', 'SECTION 7.0 · IDENTITY & INTEGRITY')}
              </span>
              <h2 className={h2}>
                {tr('terms.s7.title', '7. Malicious Reporting & Statutory False Statements')}
              </h2>
              <p className={body}>
                {tr(
                  'terms.s7.p1',
                  'Submitting intentionally fabricated, fraudulent, or vexatious service petitions to mislead municipal crews or divert municipal resources is strictly prohibited under the state crimes code (Unsworn Falsification to Authorities).',
                )}
              </p>
              <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 text-sm text-on-surface">
                <strong className={cm.fontWeight('semibold')}>
                  {tr('terms.s7.enforcementBold', 'Statutory Enforcement:')}
                </strong>{' '}
                {tr(
                  'terms.s7.enforcement',
                  'The City Solicitor will refer intentional misuse, bot-spamming, or automated denial-of-service attempts directly to the Riverton Bureau of Police and County District Attorney for criminal prosecution.',
                )}
              </div>
            </section>

            {/* Section 8 */}
            <section
              id="terms-section-8"
              data-mol-id="terms-section-8"
              className={cm.cn(card, cm.stack(4))}
            >
              <span className={tag}>
                {tr('terms.s8.tag', 'SECTION 8.0 · IMMUNITY & LIABILITY')}
              </span>
              <h2 className={h2}>
                {tr('terms.s8.title', '8. Limitation of Liability & Sovereign Immunity')}
              </h2>
              <p className={body}>
                {tr(
                  'terms.s8.p1',
                  'Nothing within this platform, nor the acknowledgment of any 311 incident ticket, shall be construed as a waiver of the governmental immunity conferred upon the City of Riverton and its municipal agents pursuant to the Political Subdivision Tort Claims Act.',
                )}
              </p>
              <p className={body}>
                {tr(
                  'terms.s8.p2',
                  'CivicPulse 311 is provided on an "as-is" and "as-available" civic telemetry basis. The City makes no warranties regarding the continuous availability of third-party cellular feeds or real-time GPS precision.',
                )}
              </p>
            </section>
          </article>
        </div>

        {/* Ombudsman bottom callout */}
        <section
          data-mol-id="terms-ombudsman-cta"
          className={cm.cn(
            cm.sp('p', 8),
            'flex flex-col items-center justify-between gap-6 rounded-xl border border-primary/20 bg-gradient-to-r from-surface-container-low via-surface-container-lowest to-surface-container-low shadow-sm md:flex-row',
          )}
        >
          <div className={cm.stack(2)}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-wider text-primary',
              )}
            >
              <span className="material-symbols-outlined text-[18px]">account_balance</span>
              {tr('terms.cta.eyebrow', 'Municipal Transparency & Legal Ombudsman')}
            </div>
            <h2 className={h2}>
              {tr('terms.cta.title', 'Have questions regarding statutory charter compliance?')}
            </h2>
            <p className={body}>
              {tr(
                'terms.cta.body',
                'The Office of the City Clerk and City Solicitor provides citizen guidance on public records access, ward resolutions, and administrative hearings.',
              )}
            </p>
          </div>
          <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'md' }), 'shrink-0')}>
            <a
              data-mol-id="terms-cta-privacy"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-lg border border-primary text-sm font-medium text-primary transition-colors hover:bg-surface-container-low',
              )}
              href="/privacy"
            >
              {tr('terms.cta.privacy', 'Read Open Data Policy')}
            </a>
            <a
              data-mol-id="terms-cta-solicitor"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-lg bg-primary text-sm font-medium text-on-primary shadow-sm transition-colors hover:bg-primary-container',
              )}
              href="mailto:clerk@rivertonpa.gov"
            >
              {tr('terms.cta.contact', 'Contact City Solicitor')}
            </a>
          </div>
        </section>

        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {tr('terms.lastUpdated', 'Last updated: 2026-09-28')}
        </p>
      </div>
    </ContentPageShell>
  )
}

/** Lifecycle step label — inline-flex dot label, color from the status token. */
function cnStepLabel(cm: ReturnType<typeof getClassMap>): string {
  return cm.cn(
    cm.textSize('xs'),
    cm.fontWeight('bold'),
    'inline-flex items-center gap-1 justify-center',
  )
}

export default Terms
export { Terms as TermsPage }
