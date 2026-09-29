import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { DesignLegalPage } from '../components/DesignLegalPage.js'
import { loadContent } from '../config.js'

/**
 * Standalone Privacy page at `/privacy`. Renders the design's commitment
 * sections (ingestion boundaries, carrier privacy, retention, subprocessors,
 * DSR rights, audits) followed by the **same** bonded legal copy the footer
 * modal shows, via {@link DesignLegalPage}.
 *
 * @returns The rendered privacy page.
 */
export function Privacy() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const muted = 'color-mix(in srgb, var(--color-text) 62%, transparent)'
  const card = {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
  }
  const h2 = cm.cn('text-xl font-extrabold tracking-tight mb-2')
  const h2Style = { color: 'var(--color-text)' }
  const body = 'text-sm leading-relaxed'
  const bodyStyle = { color: muted }

  return (
    <DesignLegalPage
      kind="privacy"
      loadContent={loadContent}
      titleKey="privacy.pageTitle"
      titleDefault="Data Privacy, Telemetry Ingestion & Pager Confidentiality"
      introKey="privacy.intro"
      introDefault={`${APP_NAME} is engineered for zero-snooping incident telemetry: we route high-urgency alerts, carrier payloads, and blameless retrospectives without selling, training models on, or retaining unencrypted production payloads.`}
      ctaKey="privacy.ctaTitle"
      ctaDefault="Deploy your on-call cluster with verified privacy guarantees."
      ctaBodyKey="privacy.ctaBody"
      ctaBodyDefault="Connect your monitoring stack — alert routing ships with absolute data isolation and a zero-snooping pipeline."
    >
      {/* 01 — ingestion boundaries */}
      <section data-mol-id="privacy-ingestion" className={cm.cn('space-y-3')}>
        <h2 className={h2} style={h2Style}>
          {t(
            'privacy.ingestionHeading',
            {},
            { defaultValue: 'Telemetry Ingested & Collection Boundaries' },
          )}
        </h2>
        <p className={body} style={bodyStyle}>
          {t(
            'privacy.ingestionCopy',
            {},
            {
              defaultValue:
                'We distinguish strictly between structural routing metadata (required to reach the on-call engineer) and diagnostic incident payloads. Ingress filters strip authorization headers, bearer tokens, and card primitives at the border proxy before persistence.',
            },
          )}
        </p>
        <div className={cm.cn('rounded-xl overflow-x-auto')} style={card}>
          <table className={cm.cn('w-full min-w-[560px] text-sm border-collapse')}>
            <thead>
              <tr
                className={cm.cn(
                  'font-mono text-[10px] uppercase tracking-widest text-left border-b',
                )}
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-tertiary)' }}
              >
                <th className={cm.cn('py-2 px-4 font-black')}>
                  {t('privacy.tableVector', {}, { defaultValue: 'Data vector' })}
                </th>
                <th className={cm.cn('py-2 px-4 font-black')}>
                  {t('privacy.tablePurpose', {}, { defaultValue: 'Operational purpose' })}
                </th>
                <th className={cm.cn('py-2 px-4 font-black')}>
                  {t('privacy.tableRetention', {}, { defaultValue: 'Default retention' })}
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  key: 'identity',
                  vector: 'SRE identity & auth',
                  purpose: 'User mapping & schedule assignment',
                  retention: 'Duration of contract',
                },
                {
                  key: 'numbers',
                  vector: 'Phone numbers & carrier ids',
                  purpose: 'Direct SMS & voice paging bridge dialing',
                  retention: 'Active subscription',
                },
                {
                  key: 'payloads',
                  vector: 'Alarm payloads & stack traces',
                  purpose: 'Alert deduplication & incident dispatch',
                  retention: '30–90 days, configurable',
                },
                {
                  key: 'audio',
                  vector: 'Incident bridge audio',
                  purpose: 'Ephemeral bridge routing & IVR ack inputs',
                  retention: '14 days, hard purge',
                },
                {
                  key: 'retros',
                  vector: 'Incident retrospectives',
                  purpose: 'Blameless audit records & timelines',
                  retention: 'Tenant-specified',
                },
              ].map((row) => (
                <tr
                  key={row.key}
                  className={cm.cn('border-b last:border-b-0')}
                  style={{ borderColor: 'var(--color-border-subtle)' }}
                >
                  <th
                    className={cm.cn('py-2.5 px-4 text-left font-medium')}
                    style={{ color: 'var(--color-text)' }}
                  >
                    {t(
                      `privacy.vector.${row.key}` as 'privacy.vector.identity',
                      {},
                      {
                        defaultValue: row.vector,
                      },
                    )}
                  </th>
                  <td className={cm.cn('py-2.5 px-4 font-mono text-xs')} style={bodyStyle}>
                    {t(
                      `privacy.purpose.${row.key}` as 'privacy.purpose.identity',
                      {},
                      {
                        defaultValue: row.purpose,
                      },
                    )}
                  </td>
                  <td
                    className={cm.cn('py-2.5 px-4 font-mono text-xs')}
                    style={{ color: 'var(--color-severity-resolved)' }}
                  >
                    {t(
                      `privacy.retention.${row.key}` as 'privacy.retention.identity',
                      {},
                      {
                        defaultValue: row.retention,
                      },
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 02 — carrier & push privacy */}
      <section data-mol-id="privacy-carrier" className={cm.cn('space-y-3')}>
        <h2 className={h2} style={h2Style}>
          {t(
            'privacy.carrierHeading',
            {},
            { defaultValue: 'Carrier Telephony, Direct SS7 & Push Notification Privacy' },
          )}
        </h2>
        <div className={cm.cn('grid gap-4 grid-cols-1 sm:grid-cols-2')}>
          {[
            {
              key: 'relay',
              icon: 'phonelink_ring',
              title: 'Dynamic virtual relay numbers',
              body: 'Outgoing alert calls use rotating virtual carrier numbers — personal mobile numbers are never revealed to third parties during bridge escalation.',
            },
            {
              key: 'dnd',
              icon: 'notifications_active',
              title: 'DND override tokens',
              body: 'Critical-alert override tokens travel only via authenticated APNs/FCM TLS tunnels, with payloads stripped to incident id and severity tier.',
            },
          ].map((item) => (
            <div
              key={item.key}
              className={cm.cn('rounded-xl p-4 flex items-start gap-3')}
              style={card}
            >
              <span
                className={cm.cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-lg shrink-0',
                )}
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                  color: 'var(--color-primary)',
                }}
                aria-hidden="true"
              >
                <span className={cm.cn('material-symbols-outlined text-[20px]')}>{item.icon}</span>
              </span>
              <div className={cm.cn('min-w-0')}>
                <p className={cm.cn('text-sm font-bold')} style={{ color: 'var(--color-text)' }}>
                  {t(
                    `privacy.carrier.${item.key}.title` as 'privacy.carrier.relay.title',
                    {},
                    {
                      defaultValue: item.title,
                    },
                  )}
                </p>
                <p className={cm.cn('text-xs mt-1')} style={bodyStyle}>
                  {t(
                    `privacy.carrier.${item.key}.body` as 'privacy.carrier.relay.body',
                    {},
                    {
                      defaultValue: item.body,
                    },
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 03 — retention ladder */}
      <section data-mol-id="privacy-retention" className={cm.cn('space-y-3')}>
        <h2 className={h2} style={h2Style}>
          {t(
            'privacy.retentionHeading',
            {},
            { defaultValue: 'Data Retention Schedules & Automated Purge Daemons' },
          )}
        </h2>
        <p className={body} style={bodyStyle}>
          {t(
            'privacy.retentionCopy',
            {},
            {
              defaultValue:
                'Every incident event crosses a retention ladder; past its threshold a background shredder renders the underlying storage unreadable by cryptographic zeroing.',
            },
          )}
        </p>
        <ol className={cm.cn('grid gap-3 grid-cols-1 sm:grid-cols-2')}>
          {[
            {
              key: 'proxy',
              stage: '01 · ingress',
              body: 'Inline sanitization drops bearer tokens and credentials before persistence.',
            },
            {
              key: 'ring',
              stage: '02 · 0–48h',
              body: 'Active escalation ring buffers — ephemeral, non-persisted memory.',
            },
            {
              key: 'hot',
              stage: '03 · 14–90d',
              body: 'Encrypted partitioned logs retained for retrospective analytics.',
            },
            {
              key: 'purge',
              stage: '04 · purge',
              body: 'Cryptographic key deletion renders raw blocks unrecoverable.',
            },
          ].map((stage) => (
            <li key={stage.key} className={cm.cn('rounded-xl p-4')} style={card}>
              <p
                className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
                style={{ color: 'var(--color-primary)' }}
              >
                {t(
                  `privacy.stage.${stage.key}.label` as 'privacy.stage.proxy.label',
                  {},
                  {
                    defaultValue: stage.stage,
                  },
                )}
              </p>
              <p className={cm.cn('text-sm mt-1')} style={bodyStyle}>
                {t(
                  `privacy.stage.${stage.key}.body` as 'privacy.stage.proxy.body',
                  {},
                  {
                    defaultValue: stage.body,
                  },
                )}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* 04 — subprocessors */}
      <section data-mol-id="privacy-subprocessors" className={cm.cn('space-y-3')}>
        <h2 className={h2} style={h2Style}>
          {t(
            'privacy.subprocessorsHeading',
            {},
            { defaultValue: 'Subprocessor Architecture & Data Locality' },
          )}
        </h2>
        <p className={body} style={bodyStyle}>
          {t(
            'privacy.subprocessorsCopy',
            {},
            {
              defaultValue:
                'We keep a minimal third-party footprint and never outsource alert-dispatch computation. Every subprocessor is audited under SOC 2 Type II and bound by data protection addenda, with single-region isolation available.',
            },
          )}
        </p>
        <ul className={cm.cn('space-y-2')}>
          {[
            {
              key: 'hosting',
              vendor: 'Cloud infrastructure provider',
              role: 'Core compute & database — primary hosting with configurable regional isolation.',
              locations: 'US, EU',
            },
            {
              key: 'voice',
              vendor: 'Voice carrier (primary trunk)',
              role: 'High-priority PSTN voice paging and global SMS gateways under zero-data-retention agreements.',
              locations: 'Global direct carrier routes',
            },
            {
              key: 'fallback',
              vendor: 'Voice carrier (fallback trunk)',
              role: 'Secondary geographic fallback routing for high-concurrency incident storms.',
              locations: 'EU & Singapore',
            },
            {
              key: 'email',
              vendor: 'Transactional email provider',
              role: 'Notification dispatch for executive post-incident summaries over enforced TLS.',
              locations: 'United States',
            },
          ].map((row) => (
            <li key={row.key} className={cm.cn('rounded-xl p-4')} style={card}>
              <div className={cm.cn('flex items-baseline gap-2 flex-wrap')}>
                <p className={cm.cn('text-sm font-bold')} style={{ color: 'var(--color-text)' }}>
                  {t(
                    `privacy.vendor.${row.key}.name` as 'privacy.vendor.hosting.name',
                    {},
                    {
                      defaultValue: row.vendor,
                    },
                  )}
                </p>
                <span
                  className={cm.cn('font-mono text-[10px] uppercase tracking-widest')}
                  style={{ color: 'var(--color-severity-resolved)' }}
                >
                  {t(
                    `privacy.vendor.${row.key}.locations` as 'privacy.vendor.hosting.locations',
                    {},
                    {
                      defaultValue: row.locations,
                    },
                  )}
                </span>
              </div>
              <p className={cm.cn('text-xs mt-1')} style={bodyStyle}>
                {t(
                  `privacy.vendor.${row.key}.role` as 'privacy.vendor.hosting.role',
                  {},
                  {
                    defaultValue: row.role,
                  },
                )}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* 05 — enterprise rights & DSR */}
      <section data-mol-id="privacy-dsr" className={cm.cn('space-y-3')}>
        <h2 className={h2} style={h2Style}>
          {t(
            'privacy.dsrHeading',
            {},
            { defaultValue: 'Enterprise Rights, GDPR/CCPA & Data Subject Requests (DSR)' },
          )}
        </h2>
        <p className={body} style={bodyStyle}>
          {t(
            'privacy.dsrCopy',
            {},
            {
              defaultValue:
                'Compliance teams should not wait weeks for manual exports. Authenticated data-subject operations cover export, rectification, and hard erasure, with response inside the 72-hour breach-notification window we commit to in the DPA.',
            },
          )}
        </p>
        <ul className={cm.cn('space-y-2 text-sm')} style={bodyStyle}>
          {[
            'access — export every incident, schedule, and retrospective tied to a subject',
            'rectification — correct identity and routing records on request',
            'erasure — cryptographic key deletion renders residual records unrecoverable',
            'portability — machine-readable export of tenant telemetry',
          ].map((right, i) => (
            <li key={i} className={cm.cn('flex items-start gap-2')}>
              <span
                className={cm.cn('material-symbols-outlined text-base shrink-0 mt-0.5')}
                style={{ color: 'var(--color-severity-resolved)' }}
                aria-hidden="true"
              >
                verified
              </span>
              {t(`privacy.dsrRight.${i}` as 'privacy.dsrRight.0', {}, { defaultValue: right })}
            </li>
          ))}
        </ul>
      </section>

      {/* 06 — security governance & audits */}
      <section data-mol-id="privacy-audits" className={cm.cn('space-y-3')}>
        <h2 className={h2} style={h2Style}>
          {t(
            'privacy.auditsHeading',
            {},
            { defaultValue: 'Security Governance & Third-Party Audits' },
          )}
        </h2>
        <p className={body} style={bodyStyle}>
          {t(
            'privacy.auditsCopy',
            {},
            {
              defaultValue:
                'Verified proof over promises: continuous compliance monitoring, third-party penetration testing, and a standard DPA with SCC provisions available to every enterprise workspace.',
            },
          )}
        </p>
        <ul className={cm.cn('grid gap-3 grid-cols-1 sm:grid-cols-2')}>
          {[
            {
              key: 'soc2',
              title: 'SOC 2 Type II report',
              note: 'Independent auditor — available under NDA',
            },
            {
              key: 'pentest',
              title: 'Penetration test summary',
              note: 'Annual third-party assessment',
            },
            { key: 'dpa', title: 'Standard DPA & SCCs', note: 'Pre-executed enterprise addendum' },
            {
              key: 'breach',
              title: '72-hour breach notice',
              note: 'Contractual incident-notification window',
            },
          ].map((item) => (
            <li key={item.key} className={cm.cn('rounded-xl p-4')} style={card}>
              <p className={cm.cn('text-sm font-bold')} style={{ color: 'var(--color-text)' }}>
                {t(
                  `privacy.audit.${item.key}.title` as 'privacy.audit.soc2.title',
                  {},
                  {
                    defaultValue: item.title,
                  },
                )}
              </p>
              <p className={cm.cn('text-xs mt-0.5')} style={bodyStyle}>
                {t(
                  `privacy.audit.${item.key}.note` as 'privacy.audit.soc2.note',
                  {},
                  {
                    defaultValue: item.note,
                  },
                )}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </DesignLegalPage>
  )
}

export default Privacy
export { Privacy as PrivacyPage }
