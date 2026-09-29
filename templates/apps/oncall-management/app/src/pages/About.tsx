import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'

/** Hero reliability-index tiles (design: reliability index). */
const RELIABILITY_INDEX = [
  {
    key: 'pages',
    icon: 'verified_user',
    stat: 'Zero Dropped Pages',
    note: 'Direct hardware bypass',
  },
  {
    key: 'latency',
    icon: 'speed',
    stat: 'Sub-850ms Direct Dial',
    note: 'Multi-carrier SS7 interconnect',
  },
  {
    key: 'blameless',
    icon: 'psychology',
    stat: '100% Blameless Post-Mortems',
    note: 'Automated root telemetry sync',
  },
] as const

/** The manifesto cards (design: operational tenets). */
const TENETS = [
  {
    key: 'pager',
    icon: 'notifications_active',
    title: 'The Pager is a Sacred Interruption',
    body: 'Never ring an engineer for noise. If an alert rings, it has passed cross-telemetry correlation, has zero flapping markers, and strictly demands immediate human judgment. Noise ruins on-call rotations and degrades systemic vigilance.',
    foot: 'FLAPPING THRESHOLD: ZERO',
  },
  {
    key: 'carrier',
    icon: 'cell_tower',
    title: 'Direct Carrier Ingress, Zero Webhook Lag',
    body: 'Generic notification intermediaries bottleneck in third-party API queues during massive cloud outages. Klaxon bridges directly into global telecommunication SS7 trunks and hardware APNs/FCM critical alert channels to pierce OS Do-Not-Disturb protocols instantly.',
    foot: 'DELIVERY GUARANTEE: HARDWARE',
  },
  {
    key: 'blameless',
    icon: 'history_edu',
    title: 'Blameless Retrospectives as Core Architecture',
    body: 'Post-mortems should never be defensive, punitive post-incident chores. Klaxon records full timeline packet telemetry, automated log slices, and commander decisions so teams synthesize root-cause fixes into automated alert runbooks in minutes.',
    foot: 'LOOP: DIAGNOSE → SYNTHESIZE',
  },
  {
    key: 'calm',
    icon: 'dark_mode',
    title: 'Cognitive Calm Under Fire',
    body: 'Engineers woken at 3 AM experience elevated adrenaline and diminished pattern recognition. Klaxon enforces deep obsidian contrast, zero visual fluff, explicit hotkey navigation, and strictly governed severity colors to protect cognitive bandwidth.',
    foot: 'INTERFACE DENSITY: OPERATIONAL',
  },
] as const

/** Region rows for the carrier reliability grid. */
const REGIONS = [
  {
    key: 'use1',
    id: 'us-east-1',
    note: 'Direct trunk interconnect to the Ashburn fiber ring. Dual carrier interfaces.',
    latency: '18ms',
  },
  {
    key: 'usw2',
    id: 'us-west-2',
    note: 'Pacific rim routing & direct-connect mesh. Failover hot-standby for North America.',
    latency: '24ms',
  },
  {
    key: 'euw1',
    id: 'eu-west-1',
    note: 'Direct telecommunication nodes in Dublin/Frankfurt with full GDPR data isolation.',
    latency: '29ms',
  },
  {
    key: 'apne1',
    id: 'ap-northeast-1',
    note: 'Tokyo metro low-latency carrier gateway servicing APAC and Australasia on-call teams.',
    latency: '38ms',
  },
] as const

/** The founders (design: the humans behind the pagers). */
const FOUNDERS = [
  {
    key: 'elena',
    initials: 'ER',
    name: 'Elena Rostova',
    role: 'Co-founder & CEO',
    bio: 'Former Staff Incident Commander at a global edge provider. Spearheaded response protocols for L7 traffic surges and mitigations.',
    tag: 'ROTATION: 11 YRS',
  },
  {
    key: 'marcus',
    initials: 'MR',
    name: 'Marcus Ray',
    role: 'Co-founder & CTO',
    bio: 'Former core telemetry lead. Architected high-throughput time-series ingest engines handling trillions of events per hour.',
    tag: 'ROTATION: 9 YRS',
  },
  {
    key: 'sarah',
    initials: 'SC',
    name: 'Sarah Chen',
    role: 'VP of Reliability Engineering',
    bio: 'Led payments reliability at a major card network. Designed zero-downtime ledger migration pipelines and automated failover validation.',
    tag: 'ROTATION: 8 YRS',
  },
  {
    key: 'david',
    initials: 'DV',
    name: 'David Vance',
    role: 'Head of Telecom Systems',
    bio: 'Pioneered SS7 ingress and SIP routing cores in telecom voice. Designed resilient cellular handover architectures across 60+ countries.',
    tag: 'ROTATION: 14 YRS',
  },
] as const

/** Compliance posture tiles (design: audited assurance). */
const COMPLIANCE = [
  {
    key: 'soc2',
    icon: 'verified',
    title: 'SOC2 Type II',
    body: 'Continuous automated compliance monitoring across the control plane.',
  },
  {
    key: 'hipaa',
    icon: 'health_and_safety',
    title: 'BAA-ready safeguards',
    body: 'Full content redaction at ingress with business-associate safeguards on request.',
  },
  {
    key: 'fips',
    icon: 'lock',
    title: 'AES-256-GCM encryption',
    body: 'Envelope encryption with hardware-backed keying for paging credentials.',
  },
  {
    key: 'airgap',
    icon: 'cloud_off',
    title: 'Air-gapped tenancy',
    body: 'Dedicated isolated deployments available for regulated environments.',
  },
] as const

/**
 * Public "About" page: the mission, operational tenets, carrier mesh,
 * founders, and compliance posture, per the Stitch design.
 *
 * @returns The rendered About page.
 */
export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const muted = 'color-mix(in srgb, var(--color-text) 62%, transparent)'
  const card = {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
  }
  const iconTile = (icon: string, tint: string) => (
    <span
      className={cm.cn('inline-flex h-9 w-9 items-center justify-center rounded-lg shrink-0')}
      style={{
        backgroundColor: `color-mix(in srgb, ${tint} 12%, transparent)`,
        color: tint,
      }}
      aria-hidden="true"
    >
      <span className={cm.cn('material-symbols-outlined text-[20px]')}>{icon}</span>
    </span>
  )

  return (
    <ContentPageShell
      dataMolId="page-about"
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: '// the mission' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t(
        'about.subtitle',
        {},
        {
          defaultValue: 'Built by SREs who were tired of sleeping through silent outages.',
        },
      )}
      containerSize="lg"
    >
      <div className={cm.cn('max-w-4xl mx-auto space-y-12 py-4')}>
        {/* Mission intro */}
        <section data-mol-id="about-intro" className={cm.cn('space-y-3')}>
          <p className={cm.cn('text-base leading-relaxed')} style={{ color: muted }}>
            {t(
              'about.intro',
              { app: APP_NAME },
              {
                defaultValue: `${APP_NAME} was founded on a simple premise: incident alerting should never fail silently, noise shouldn't wake humans, and when production burns at 03:00, clarity is the only metric that matters.`,
              },
            )}
          </p>
          <div className={cm.cn('grid gap-4 grid-cols-1 sm:grid-cols-3')}>
            {RELIABILITY_INDEX.map((item) => (
              <div key={item.key} className={cm.cn('rounded-xl p-4')} style={card}>
                {iconTile(item.icon, 'var(--color-primary)')}
                <p
                  className={cm.cn('mt-3 text-sm font-bold')}
                  style={{ color: 'var(--color-text)' }}
                >
                  {t(
                    `about.index.${item.key}.stat` as 'about.index.pages.stat',
                    {},
                    { defaultValue: item.stat },
                  )}
                </p>
                <p className={cm.cn('font-mono text-[11px] mt-0.5')} style={{ color: muted }}>
                  {t(
                    `about.index.${item.key}.note` as 'about.index.pages.note',
                    {},
                    { defaultValue: item.note },
                  )}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Operational tenets */}
        <section data-mol-id="about-tenets" className={cm.cn('space-y-4')}>
          <div>
            <p
              className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mb-1')}
              style={{ color: 'var(--color-primary)' }}
            >
              {t('about.manifestoEyebrow', {}, { defaultValue: '// the manifesto' })}
            </p>
            <h2
              className={cm.cn('text-2xl font-extrabold tracking-tight')}
              style={{ color: 'var(--color-text)' }}
            >
              {t(
                'about.manifestoTitle',
                {},
                { defaultValue: 'Operational Tenets for High-Stakes Production' },
              )}
            </h2>
          </div>
          <div className={cm.cn('grid gap-4 grid-cols-1 md:grid-cols-2')}>
            {TENETS.map((tenet, i) => (
              <div key={tenet.key} className={cm.cn('rounded-xl p-5 flex flex-col')} style={card}>
                <div className={cm.cn('flex items-center gap-3 mb-3')}>
                  {iconTile(
                    tenet.icon,
                    i % 2 === 0 ? 'var(--color-primary)' : 'var(--color-tertiary)',
                  )}
                  <span
                    className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
                    style={{ color: muted }}
                  >
                    {t(
                      `about.tenet.${tenet.key}.label` as 'about.tenet.pager.label',
                      {},
                      { defaultValue: `TENET_0${i + 1}` },
                    )}
                  </span>
                </div>
                <h3
                  className={cm.cn('text-base font-extrabold mb-2')}
                  style={{ color: 'var(--color-text)' }}
                >
                  {t(
                    `about.tenet.${tenet.key}.title` as 'about.tenet.pager.title',
                    {},
                    { defaultValue: tenet.title },
                  )}
                </h3>
                <p className={cm.cn('text-sm leading-relaxed flex-1')} style={{ color: muted }}>
                  {t(
                    `about.tenet.${tenet.key}.body` as 'about.tenet.pager.body',
                    {},
                    { defaultValue: tenet.body },
                  )}
                </p>
                <p
                  className={cm.cn(
                    'font-mono text-[10px] font-black uppercase tracking-widest mt-3 pt-3 border-t',
                  )}
                  style={{
                    color: 'var(--color-severity-resolved)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  {t(
                    `about.tenet.${tenet.key}.foot` as 'about.tenet.pager.foot',
                    {},
                    { defaultValue: tenet.foot },
                  )}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Carrier mesh */}
        <section data-mol-id="about-carrier-mesh" className={cm.cn('space-y-4')}>
          <h2
            className={cm.cn('text-2xl font-extrabold tracking-tight')}
            style={{ color: 'var(--color-text)' }}
          >
            {t(
              'about.meshTitle',
              {},
              { defaultValue: 'Multi-Region Redundancy & Direct Dial Mesh' },
            )}
          </h2>
          <div className={cm.cn('grid gap-3 grid-cols-2 md:grid-cols-4')}>
            {[
              { label: 'dispatch p99', value: '412ms' },
              { label: 'pages transmitted', value: '4.28M+' },
              { label: 'active carriers', value: '4 trunks' },
              { label: 'ingress regions', value: '4 active/active' },
            ].map((stat) => (
              <div key={stat.label} className={cm.cn('rounded-xl p-4 text-center')} style={card}>
                <p
                  className={cm.cn('text-xl font-extrabold')}
                  style={{ color: 'var(--color-primary)' }}
                >
                  {stat.value}
                </p>
                <p
                  className={cm.cn('font-mono text-[10px] uppercase tracking-widest mt-1')}
                  style={{ color: muted }}
                >
                  {t(
                    `about.mesh.${stat.label.replace(/\s+/g, '')}` as 'about.mesh.dispatchp99',
                    {},
                    { defaultValue: stat.label },
                  )}
                </p>
              </div>
            ))}
          </div>
          <ul className={cm.cn('space-y-2')}>
            {REGIONS.map((region) => (
              <li
                key={region.key}
                className={cm.cn('rounded-xl p-4 flex items-start gap-3')}
                style={card}
              >
                <span
                  className={cm.cn(
                    'px-2 py-0.5 rounded font-mono text-[10px] font-bold shrink-0 mt-0.5',
                  )}
                  style={{
                    backgroundColor: 'var(--color-background-tertiary)',
                    color: 'var(--color-severity-resolved)',
                  }}
                >
                  {region.id}
                </span>
                <p className={cm.cn('text-sm flex-1')} style={{ color: muted }}>
                  {t(
                    `about.region.${region.key}.note` as 'about.region.use1.note',
                    {},
                    { defaultValue: region.note },
                  )}
                </p>
                <span
                  className={cm.cn('font-mono text-[11px] shrink-0')}
                  style={{ color: 'var(--color-severity-resolved)' }}
                >
                  {t(
                    `about.region.${region.key}.latency` as 'about.region.use1.latency',
                    {},
                    { defaultValue: `${region.latency} · nominal` },
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Founders */}
        <section data-mol-id="about-founders" className={cm.cn('space-y-4')}>
          <h2
            className={cm.cn('text-2xl font-extrabold tracking-tight')}
            style={{ color: 'var(--color-text)' }}
          >
            {t(
              'about.foundersTitle',
              {},
              { defaultValue: 'Founded by Veteran Incident Commanders' },
            )}
          </h2>
          <p className={cm.cn('text-sm')} style={{ color: muted }}>
            {t(
              'about.foundersIntro',
              {},
              {
                defaultValue:
                  "We have manned the frontline during DDoS attacks, split-brain database partitions, and fiber cuts at the world's most resilient infrastructure providers.",
              },
            )}
          </p>
          <div className={cm.cn('grid gap-4 grid-cols-1 sm:grid-cols-2')}>
            {FOUNDERS.map((person) => (
              <div
                key={person.key}
                data-mol-id={`about-founder-${person.key}`}
                className={cm.cn('rounded-xl p-5 flex items-start gap-4')}
                style={card}
              >
                <span
                  className={cm.cn(
                    'h-12 w-12 rounded-full flex items-center justify-center font-bold shrink-0',
                  )}
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-primary) 14%, transparent)',
                    color: 'var(--color-primary)',
                  }}
                  aria-hidden="true"
                >
                  {person.initials}
                </span>
                <div className={cm.cn('min-w-0')}>
                  <h3
                    className={cm.cn('text-base font-extrabold')}
                    style={{ color: 'var(--color-text)' }}
                  >
                    {t(
                      `about.founder.${person.key}.name` as 'about.founder.elena.name',
                      {},
                      { defaultValue: person.name },
                    )}
                  </h3>
                  <p
                    className={cm.cn('font-mono text-[11px] uppercase tracking-widest mt-0.5')}
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {t(
                      `about.founder.${person.key}.role` as 'about.founder.elena.role',
                      {},
                      { defaultValue: person.role },
                    )}
                  </p>
                  <p className={cm.cn('text-sm mt-2')} style={{ color: muted }}>
                    {t(
                      `about.founder.${person.key}.bio` as 'about.founder.elena.bio',
                      {},
                      { defaultValue: person.bio },
                    )}
                  </p>
                  <p
                    className={cm.cn(
                      'font-mono text-[10px] font-black uppercase tracking-widest mt-2',
                    )}
                    style={{ color: 'var(--color-severity-resolved)' }}
                  >
                    {t(
                      `about.founder.${person.key}.tag` as 'about.founder.elena.tag',
                      {},
                      { defaultValue: person.tag },
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Compliance posture */}
        <section data-mol-id="about-compliance" className={cm.cn('space-y-4')}>
          <h2
            className={cm.cn('text-2xl font-extrabold tracking-tight')}
            style={{ color: 'var(--color-text)' }}
          >
            {t(
              'about.complianceTitle',
              {},
              { defaultValue: 'Enterprise Compliance & Isolation Standards' },
            )}
          </h2>
          <div className={cm.cn('grid gap-4 grid-cols-1 sm:grid-cols-2')}>
            {COMPLIANCE.map((item) => (
              <div
                key={item.key}
                className={cm.cn('rounded-xl p-4 flex items-start gap-3')}
                style={card}
              >
                {iconTile(item.icon, 'var(--color-severity-resolved)')}
                <div className={cm.cn('min-w-0')}>
                  <p className={cm.cn('text-sm font-bold')} style={{ color: 'var(--color-text)' }}>
                    {t(
                      `about.compliance.${item.key}.title` as 'about.compliance.soc2.title',
                      {},
                      { defaultValue: item.title },
                    )}
                  </p>
                  <p className={cm.cn('text-xs mt-0.5')} style={{ color: muted }}>
                    {t(
                      `about.compliance.${item.key}.body` as 'about.compliance.soc2.body',
                      {},
                      { defaultValue: item.body },
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section
          data-mol-id="about-cta"
          className={cm.cn('rounded-2xl p-8 text-center')}
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid color-mix(in srgb, var(--color-primary) 35%, transparent)',
          }}
        >
          <h2
            className={cm.cn('text-2xl font-extrabold tracking-tight')}
            style={{ color: 'var(--color-text)' }}
          >
            {t(
              'about.ctaTitle',
              {},
              {
                defaultValue:
                  'Join the engineers who sleep peacefully through maintenance windows.',
              },
            )}
          </h2>
          <p className={cm.cn('text-sm mt-2')} style={{ color: muted }}>
            {t(
              'about.ctaBody',
              {},
              {
                defaultValue:
                  'Import your existing alert rules and put the first rotation live in under five minutes.',
              },
            )}
          </p>
          <Link
            to="/signup"
            data-mol-id="about-cta-start"
            className={cm.cn(
              'inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-md font-mono text-sm font-bold uppercase tracking-widest hover:opacity-90',
            )}
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
          >
            {t('about.ctaStart', {}, { defaultValue: 'Start 14-day free trial' })}
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
