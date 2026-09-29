/**
 * Public "About" page — Stitch design design-civic-311-about.
 * Municipal accountability story: hero + quick stats, the Ordinance #2024-91
 * charter block with three statutory pillars, the participating-bureaus bento,
 * the Municipal Oversight Commission board, and the open-records callout.
 * Wrapped in the same public chrome (Header + Footer + ContentPageShell) as
 * the Pricing / Privacy / Terms pages. Every string flows through `t()`.
 *
 * @returns The rendered about page.
 */
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/** Hero quick-stat card. */
const STATS: Array<{ id: string; icon: string; label: string; value: string; note: string }> = [
  {
    id: 'sla',
    icon: 'timer',
    label: 'Supervisory SLA',
    value: '4 Minutes',
    note: 'Average incident triage velocity from citizen report to station supervisor verification.',
  },
  {
    id: 'resolution',
    icon: 'task_alt',
    label: 'Public DPW SLA',
    value: '96.4%',
    note: 'On-schedule resolution rate across all 6 City Council Wards during Q1 2025.',
  },
  {
    id: 'sunshine',
    icon: 'policy',
    label: 'Sunshine Compliance',
    value: '100%',
    note: 'Full statutory compliance under open-data and public oversight mandates.',
  },
  {
    id: 'fleet',
    icon: 'local_shipping',
    label: 'Fleet Telemetry',
    value: '28 Units',
    note: 'Live active automated vehicle locator (AVL) crews connected across Riverton.',
  },
]

/** Statutory pillar under the charter block. */
const PILLARS: Array<{ id: string; icon: string; title: string; body: string }> = [
  {
    id: 'ledger',
    icon: 'fingerprint',
    title: 'Immutable Public Ledger',
    body: 'Every citizen report generates an open cryptographic SHA-256 docket seal. Records cannot be purged, quietly altered, or hidden by city officials, preserving an auditable chain of custody.',
  },
  {
    id: 'geofence',
    icon: 'fmd_good',
    title: 'Geofenced Telemetry & Ward Alerts',
    body: 'Residents subscribe to real-time neighborhood corridors. When Department of Public Works asphalt or forestry trucks enter a flagged perimeter, subscribed residents receive instant dispatch updates.',
  },
  {
    id: 'equality',
    icon: 'balance',
    title: 'Equal Service Distribution',
    body: 'Work orders are routed strictly through deterministic severity scoring (pedestrian hazard index, school zone proximity, transit artery impact), preventing administrative favoritism across wards.',
  },
]

/** Participating bureau card. */
const BUREAUS: Array<{
  id: string
  division: string
  icon: string
  title: string
  body: string
  fleet: string
  turnaround: string
}> = [
  {
    id: 'dpw',
    division: 'Division 01',
    icon: 'hardware',
    title: 'Bureau of Street Maintenance (DPW)',
    body: 'Maintains 380 lane-miles of Riverton road surface. Direct dispatch for acute potholes, utility trench collapse, and winter thermal cracking repairs.',
    fleet: 'Fleet: 12 Hot-Patch Rigs',
    turnaround: 'Avg Turnaround: 26h',
  },
  {
    id: 'electrical',
    division: 'Division 02',
    icon: 'lightbulb',
    title: 'Bureau of Electrical Services',
    body: 'Calibrates 4,200 municipal LED street luminaires, pedestrian push-buttons, and 48 traffic control nodes along Riverton Commercial Corridors.',
    fleet: 'Fleet: 4 Bucket Boom Trucks',
    turnaround: 'Avg Turnaround: 14h',
  },
  {
    id: 'forestry',
    division: 'Division 03',
    icon: 'forest',
    title: 'Urban Forestry Division',
    body: 'Arborist crews conduct tree hazard assessments, storm limb removal, root-heaved sidewalk mediation, and canopy preservation in parklands.',
    fleet: 'Fleet: 5 Chipper & Crane Units',
    turnaround: 'Avg Turnaround: 48h',
  },
  {
    id: 'sanitation',
    division: 'Division 04',
    icon: 'delete_sweep',
    title: 'Sanitation & Public Space',
    body: 'Rapid abatement of illicit alley dumping, public receptacle overflows, and automated bio-hazard removal in municipal transit plazas.',
    fleet: 'Fleet: 5 Compact Haulers',
    turnaround: 'Avg Turnaround: 8h',
  },
  {
    id: 'code',
    division: 'Division 05',
    icon: 'domain_verification',
    title: 'Office of Code Enforcement',
    body: 'Reviews structural non-compliance, abandoned commercial hoardings, illegal curb cuts, and blocked public ADA pedestrian pathways.',
    fleet: 'Fleet: 6 Field Inspector Cars',
    turnaround: 'Avg Turnaround: 72h',
  },
]

/** Oversight commission member. */
const COMMISSION: Array<{
  id: string
  initials: string
  name: string
  role: string
  unit: string
  body: string
}> = [
  {
    id: 'reed',
    initials: 'MR',
    name: 'Marcus Reed',
    role: 'City Council Infrastructure Chair',
    unit: 'Ward 2 Representative',
    body: 'Primary legislative sponsor of Charter § 4-112. Focuses on municipal capital allocation equity and roadway infrastructure integrity.',
  },
  {
    id: 'thorne',
    initials: 'AT',
    name: 'Dr. Aris Thorne',
    role: 'Director of IT & Public Records',
    unit: 'Department of Civic Technology',
    body: 'Architect of the SHA-256 docket validation pipeline and Riverton municipal open API compliance protocols.',
  },
  {
    id: 'kowalski',
    initials: 'MK',
    name: 'Marisa Kowalski',
    role: 'Chief Dispatch Administrator',
    unit: 'Bureau of Public Works',
    body: 'Directs fleet routing, supervisor shift allocations, and ensures emergency street clearing meets safety SLAs.',
  },
  {
    id: 'vance',
    initials: 'EV',
    name: 'Elena Vance',
    role: 'Citizen Advisory Board Chair',
    unit: 'Ward 2 Waterfront District',
    body: 'Appointed community ombudsperson representing neighborhood coalitions, tenant associations, and pedestrian safety councils.',
  },
]

export function About() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const tr = (key: string, def: string, values?: Record<string, string>): string =>
    t(key, values ?? {}, { defaultValue: def })
  const h2 = cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'text-on-surface')
  const eyebrow = cm.cn(
    cm.textSize('xs'),
    cm.fontWeight('semibold'),
    'uppercase tracking-wider text-primary',
  )
  const body = cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')

  return (
    <ContentPageShell
      bare
      containerSize="xl"
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t(
        'about.eyebrowBadge',
        {},
        { defaultValue: 'MUNICIPAL TRANSPARENCY & STATUTORY CHARTER § 4-112' },
      )}
      title={tr('about.title', 'Democratizing municipal accountability for the City of Riverton.')}
      subtitle={tr(
        'about.intro',
        "{{app}} 311 is Riverton's official open public telemetry and incident dispatch infrastructure. Built to replace opaque bureau backlogs with cryptographic records, real-time DPW GPS dispatch, and immutable civic trust.",
        { app: APP_NAME },
      )}
    >
      <div className={cm.stack(16)}>
        {/* Quick stats bento strip */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div
              key={stat.id}
              data-mol-id={`about-stat-${stat.id}`}
              className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-sm transition-colors hover:border-primary/40"
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('mb', 3),
                  'text-on-surface-variant',
                )}
              >
                <span className={cm.cn(cm.textSize('xs'), 'uppercase tracking-wider')}>
                  {tr(`about.stat.${stat.id}.label`, stat.label)}
                </span>
                <span className="material-symbols-outlined text-[20px] text-primary">
                  {stat.icon}
                </span>
              </div>
              <div
                className={cm.cn(cm.textSize('3xl'), cm.fontWeight('semibold'), 'text-on-surface')}
              >
                {tr(`about.stat.${stat.id}.value`, stat.value)}
              </div>
              <p className={cm.cn(body, cm.sp('mt', 1))}>
                {tr(`about.stat.${stat.id}.note`, stat.note)}
              </p>
            </div>
          ))}
        </div>

        {/* Legislative origin + statutory pillars */}
        <section
          data-mol-id="about-charter"
          className="rounded-2xl border border-outline-variant/40 bg-surface-container-low p-8 lg:p-10"
        >
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            <div className={cm.cn(cm.stack(4), 'lg:col-span-5')}>
              <span className={eyebrow}>
                {tr('about.charter.eyebrow', 'The Civic Charter & Legislative Origin')}
              </span>
              <h2 className={cm.cn(h2, 'leading-snug')}>
                {tr(
                  'about.charter.title',
                  'Ordinance #2024-91: Mandating zero-latency civic visibility.',
                )}
              </h2>
              <p className={body}>
                {tr(
                  'about.charter.body',
                  'In October 2024, Riverton City Council unanimously passed statutory Charter Amendment § 4-112. The ordinance declared that municipal work orders are public common goods, prohibiting closed ticketing queues and secretive ward-level prioritization.',
                )}
              </p>
              <div
                className={cm.cn(
                  cm.stack(2),
                  'rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-4',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'text-primary',
                  )}
                >
                  <span className="material-symbols-outlined text-[18px]">gavel</span>
                  {tr('about.charter.mandate.title', 'Statutory Mandate: Section § 4-112(c)')}
                </div>
                <p className={cm.cn(cm.textSize('sm'), 'italic text-on-surface-variant')}>
                  {tr(
                    'about.charter.mandate.body',
                    '"No municipal bureau may close, deprioritize, or archive any citizen grievance regarding street surface, water safety, or tree canopy without publicly verifiable photo evidence and digital dispatch audit timestamps."',
                  )}
                </p>
              </div>
            </div>
            <div className={cm.cn(cm.stack(4), 'lg:col-span-7')}>
              {PILLARS.map((pillar) => (
                <div
                  key={pillar.id}
                  data-mol-id={`about-pillar-${pillar.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'start', gap: 'md' }),
                    'rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6',
                  )}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-container text-primary">
                    <span className="material-symbols-outlined text-[26px]">{pillar.icon}</span>
                  </div>
                  <div className={cm.stack(1)}>
                    <h3
                      className={cm.cn(
                        cm.textSize('base'),
                        cm.fontWeight('semibold'),
                        'text-on-surface',
                      )}
                    >
                      {tr(`about.pillar.${pillar.id}.title`, pillar.title)}
                    </h3>
                    <p className={body}>{tr(`about.pillar.${pillar.id}.body`, pillar.body)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Participating bureaus & fleet operations */}
        <section data-mol-id="about-bureaus" className={cm.stack(6)}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', justify: 'between', gap: 'md', wrap: 'wrap' }),
              'md:flex-row md:items-end',
            )}
          >
            <div>
              <span className={eyebrow}>
                {tr('about.bureaus.eyebrow', 'Municipal Coordination')}
              </span>
              <h2 className={h2}>
                {tr('about.bureaus.title', 'Participating Bureaus & Fleet Operations')}
              </h2>
              <p className={cm.cn(body, cm.sp('mt', 1))}>
                {tr(
                  'about.bureaus.subtitle',
                  'Five coordinated city agencies directly integrated into the CivicPulse dispatch engine.',
                )}
              </p>
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-lg border border-outline-variant/60 bg-surface-container-high text-xs text-on-surface-variant',
              )}
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary-container" />
              <span>
                {tr(
                  'about.bureaus.engine',
                  'Engine: AVL Geoserver v4.18 (EPSG:2272 PA South Grid)',
                )}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {BUREAUS.map((bureau, i) => (
              <div
                key={bureau.id}
                data-mol-id={`about-bureau-${bureau.id}`}
                className={cm.cn(
                  cm.stack(3),
                  cm.flex({ direction: 'col', justify: 'between' }),
                  'rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 transition-colors hover:border-primary/40',
                )}
              >
                <div className={cm.stack(3)}>
                  <div className={cm.flex({ align: 'center', justify: 'between' })}>
                    <span
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        'rounded-full bg-secondary-container/60 text-xs font-medium text-on-secondary-container',
                      )}
                    >
                      {tr(`about.bureau.${bureau.id}.division`, `Division 0${i + 1}`)}
                    </span>
                    <span className="material-symbols-outlined text-[20px] text-primary">
                      {bureau.icon}
                    </span>
                  </div>
                  <h3
                    className={cm.cn(
                      cm.textSize('base'),
                      cm.fontWeight('semibold'),
                      'text-on-surface',
                    )}
                  >
                    {tr(`about.bureau.${bureau.id}.title`, bureau.title)}
                  </h3>
                  <p className={body}>{tr(`about.bureau.${bureau.id}.body`, bureau.body)}</p>
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('mt', 4),
                    'border-t border-outline-variant/40 pt-3 text-xs text-on-surface-variant',
                  )}
                >
                  <span>{tr(`about.bureau.${bureau.id}.fleet`, bureau.fleet)}</span>
                  <span className={cm.fontWeight('semibold') + ' text-primary'}>
                    {tr(`about.bureau.${bureau.id}.turnaround`, bureau.turnaround)}
                  </span>
                </div>
              </div>
            ))}
            {/* Dispatch hub card */}
            <div
              data-mol-id="about-dispatch-hub"
              className={cm.cn(
                cm.stack(2),
                cm.flex({ direction: 'col', justify: 'between' }),
                'rounded-xl border border-outline-variant/60 bg-surface-container p-5',
              )}
            >
              <div className={cm.stack(2)}>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'text-primary',
                  )}
                >
                  <span className="material-symbols-outlined text-[18px]">satellite_alt</span>
                  {tr('about.hub.eyebrow', 'CIVIC TELEMETRY HUB')}
                </div>
                <h3
                  className={cm.cn(
                    cm.textSize('base'),
                    cm.fontWeight('semibold'),
                    'text-on-surface',
                  )}
                >
                  {tr('about.hub.title', 'Automated Spatial Dispatch')}
                </h3>
                <p className={body}>
                  {tr(
                    'about.hub.body',
                    "Incidents are geocoded using Riverton's municipal GIS dataset and assigned to the nearest idling field crew with appropriate equipment payloads.",
                  )}
                </p>
              </div>
              <div className={cm.sp('mt', 4)}>
                <a
                  data-mol-id="about-dispatch-link"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 1 }),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'text-primary hover:underline',
                  )}
                  href="/explore"
                >
                  {tr('about.hub.link', 'View Riverton Live Dispatch Map')}
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Municipal oversight commission */}
        <section data-mol-id="about-commission" className={cm.stack(6)}>
          <div>
            <span className={eyebrow}>
              {tr('about.commission.eyebrow', 'Public Custodianship')}
            </span>
            <h2 className={h2}>{tr('about.commission.title', 'Municipal Oversight Commission')}</h2>
            <p className={cm.cn(body, cm.sp('mt', 1))}>
              {tr(
                'about.commission.subtitle',
                'Independent multi-stakeholder board ensuring computational fairness and open ledger compliance.',
              )}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {COMMISSION.map((member) => (
              <div
                key={member.id}
                data-mol-id={`about-member-${member.id}`}
                className={cm.cn(
                  cm.stack(4),
                  'rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5',
                )}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-outline-variant/40 bg-secondary-container text-sm font-bold text-primary">
                  {member.initials}
                </div>
                <div>
                  <h3
                    className={cm.cn(
                      cm.textSize('base'),
                      cm.fontWeight('semibold'),
                      'text-on-surface',
                    )}
                  >
                    {tr(`about.member.${member.id}.name`, member.name)}
                  </h3>
                  <p className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), 'text-primary')}>
                    {tr(`about.member.${member.id}.role`, member.role)}
                  </p>
                  <p
                    className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}
                  >
                    {tr(`about.member.${member.id}.unit`, member.unit)}
                  </p>
                </div>
                <p className={body}>{tr(`about.member.${member.id}.body`, member.body)}</p>
              </div>
            ))}
          </div>
          {/* Audit statement banner */}
          <div
            className={cm.cn(
              cm.sp('p', 4),
              cm.flex({
                direction: 'col',
                align: 'center',
                justify: 'between',
                gap: 'md',
                wrap: 'wrap',
              }),
              'rounded-xl border border-outline-variant/60 bg-surface-container-low sm:flex-row',
            )}
          >
            <div className={cm.flex({ align: 'center', gap: 'md' })}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[22px]">verified_user</span>
              </div>
              <div>
                <h4
                  className={cm.cn(
                    cm.textSize('base'),
                    cm.fontWeight('semibold'),
                    'text-on-surface',
                  )}
                >
                  {tr('about.audit.title', 'Statutory Audit Certification: Title 65 Compliant')}
                </h4>
                <p className={body}>
                  {tr(
                    'about.audit.body',
                    "Audited semi-annually by Riverton Comptroller's Office for open records fidelity and equal ward SLA distribution.",
                  )}
                </p>
              </div>
            </div>
            <a
              data-mol-id="about-audit-link"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 1 }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                'shrink-0 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm font-semibold text-primary transition-colors hover:bg-surface-container',
              )}
              href="mailto:comptroller@rivertonpa.gov"
            >
              {tr('about.audit.link', 'Read 2024 Audit (PDF)')}
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            </a>
          </div>
        </section>

        {/* Open records callout */}
        <section
          data-mol-id="about-open-records"
          className={cm.cn(
            cm.stack(6),
            cm.sp('p', 8),
            'rounded-r-xl border border-outline-variant/40 border-l-4 border-l-primary bg-surface-container-lowest shadow-sm lg:p-10',
          )}
        >
          <div className={cm.stack(3)}>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), eyebrow)}>
              <span className="material-symbols-outlined text-[18px]">public</span>
              {tr('about.openRecords.eyebrow', 'Open Records Directive')}
            </div>
            <h2 className={h2}>
              {tr('about.openRecords.title', 'Freedom of Information by Default.')}
            </h2>
            <p className={cm.cn(cm.textSize('base'), 'leading-relaxed text-on-surface-variant')}>
              {tr(
                'about.openRecords.body',
                "Under Riverton's Sunshine Law Directive, civic telemetry belongs to the public. Any citizen, journalist, or civic technologist may download raw dispatch datasets, geocoded incident shapes, and crew resolution logs without user accounts, FOIA forms, or administrative fees.",
              )}
            </p>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }), 'pt-2')}>
            <a
              data-mol-id="about-cta-open-data"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 5),
                cm.sp('py', 3),
                'rounded-lg bg-primary text-sm font-medium text-on-primary shadow-sm transition-colors hover:bg-primary-container',
              )}
              href="/explore"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              {tr('about.openRecords.ctaData', 'Download Municipal Open Data (GeoJSON / CSV)')}
            </a>
            <a
              data-mol-id="about-cta-charter"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-lg border border-outline-variant text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface',
              )}
              href="/terms"
            >
              <span className="material-symbols-outlined text-[18px]">menu_book</span>
              {tr('about.openRecords.ctaCharter', 'Read City Charter § 4-112')}
            </a>
            <a
              data-mol-id="about-cta-api"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-lg border border-outline-variant text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface',
              )}
              href="/privacy"
            >
              <span className="material-symbols-outlined text-[18px]">code</span>
              {tr('about.openRecords.ctaApi', 'Inspect API Documentation')}
            </a>
          </div>
        </section>

        {/* Get in touch */}
        <section data-mol-id="about-contact" className={cm.stack(2)}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
            {tr('about.contactTitle', 'Get in touch')}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {tr(
              'about.contactBody',
              'Questions about {{app}} or feedback on city services? Email hello@{{app}}.example or file a report of kind "other" from the app — every message reaches the 311 desk.',
              { app: APP_NAME },
            )}
          </p>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
