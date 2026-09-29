import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { DesignLegalPage } from '../components/DesignLegalPage.js'
import { loadContent } from '../config.js'

/** The four headline commitments (design: tenet band). */
const COMMITMENTS = [
  {
    key: 'sla',
    icon: 'verified',
    title: '99.999% Carrier Paging SLA',
    body: 'Direct carrier trunk interconnects with contractual service credits if alert latency exceeds the sub-second dispatch threshold.',
    foot: 'Sub-second threshold',
  },
  {
    key: 'surcharges',
    icon: 'phone_in_talk',
    title: 'Zero Telecom Surcharges',
    body: 'Uncapped SMS, cellular calls, and global dial-outs on all active paid tiers. Zero surprise metered billing.',
    foot: '0 hidden surcharges',
  },
  {
    key: 'isolation',
    icon: 'security',
    title: 'Air-Gapped Isolation',
    body: 'Customer alert traces, stack dumps, and war-room transcripts are tenant-partitioned, memory-isolated, and never monetized.',
    foot: 'Zero model training on dumps',
  },
  {
    key: 'blameless',
    icon: 'shield',
    title: 'Blameless Immunity',
    body: 'Terms recognizing incident retrospectives as engineering learning artifacts, protected from discovery where enforceable.',
    foot: 'Incident root-cause refuge',
  },
] as const

interface Clause {
  key: string
  title: string
  body: string
}

/** The seven contractual clauses (design: section stack). */
const CLAUSES: Clause[] = [
  {
    key: 'availability',
    title: 'Platform Availability, Latency Thresholds & Liquidated Downtime Credits',
    body: 'The incident ingestion endpoint and the downline dispatch engine carry a 99.999% monthly uptime commitment, excluding maintenance announced 72 hours ahead. Dispatch latency is measured from webhook acknowledgement to carrier hand-off; if the published thresholds are missed in a billing cycle, service credits apply automatically on the next invoice — 15% for a minor miss, 30% for a major one, and 50% plus a termination right for a sev-0 month.',
  },
  {
    key: 'ingress',
    title: 'Ingress Data Rights, Webhook Bursts & Zero-Retention Buffers',
    body: 'You retain 100% of the rights to every payload you send. Ingress applies automated token scrubbing for high-risk headers and credentials, stores payloads encrypted at rest, and holds voice or SMS transcripts for at most fourteen days before an unrecoverable zero-fill overwrite. Payloads are never used to train machine-learning models.',
  },
  {
    key: 'telephony',
    title: 'Telephony Bypass & Emergency Notification Protocols',
    body: 'The mobile daemon uses platform critical-alert entitlements to breach hardware mute switches and focus states exclusively for sev-0 and sev-1 alerts. Carrier notifications route through direct tier-1 trunks across 180+ jurisdictions; carrier-side failures caused by local telecommunication blackouts or handset hardware are outside our control.',
  },
  {
    key: 'governance',
    title: 'Customer Account Governance & Key Custody',
    body: 'Workspaces enforce multi-factor authentication for commanders, with enterprise identity-provider provisioning available on the platform tier. Each tenant holds offline break-glass credentials; platform engineers hold zero access to decrypt them.',
  },
  {
    key: 'fairuse',
    title: 'Fair Use, Synthetic Alert Flooding & DoS Protection',
    body: 'Recursive feedback loops and alert floods are contained by a dynamic token-bucket rate limiter per tenant namespace. Beyond the cap, alerts are consolidated into deduplicated batch summaries so a flood cannot throttle your responders’ devices or ours.',
  },
  {
    key: 'liability',
    title: 'Limitation of Operational Liability & Blameless Protocols',
    body: 'Except in cases of gross negligence, aggregate liability for dispatch delays or outages is capped at the fees paid in the preceding twelve months. All retrospective analyses and telemetry snapshots inside the product are blameless technical artifacts, and we will oppose third-party discovery motions targeting them to the fullest extent permitted by law.',
  },
  {
    key: 'purge',
    title: 'Hard Purge & Cryptographic Tenant Termination',
    body: 'A tenant may be decommissioned at any moment. On invocation, master encryption keys are expunged from hardware security modules and residual records become mathematically unrecoverable — no grace-period archive, no residual copy.',
  },
]

/**
 * Standalone Terms page at `/terms`. Renders the design's service-level
 * commitment sections followed by the **same** bonded legal copy the
 * footer modal shows, via {@link DesignLegalPage}.
 *
 * @returns The rendered terms page.
 */
export function Terms() {
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
      kind="terms"
      loadContent={loadContent}
      titleKey="terms.pageTitle"
      titleDefault="Service Level Terms, Telemetry Dispatch & SRE Operational Commitments"
      introKey="terms.intro"
      introDefault={`The governing agreement for high-urgency carrier paging, automated incident escalation, and multi-tenant telemetry ingestion — zero hidden telecom overages, guaranteed paging uptime, and strict blameless liability bounds. This page summarizes the ${APP_NAME} commitments; the full bonded policy follows.`}
      ctaKey="terms.ctaTitle"
      ctaDefault="Ready to deploy with guaranteed 99.999% SLA terms?"
      ctaBodyKey="terms.ctaBody"
      ctaBodyDefault="Equip your engineering rotation with contractual carrier-grade paging and transparent blameless terms — 14 days free, no credit card."
    >
      {/* Headline commitments */}
      <section
        data-mol-id="terms-commitments"
        className={cm.cn('grid gap-4 grid-cols-1 sm:grid-cols-2')}
      >
        {COMMITMENTS.map((item) => (
          <div key={item.key} className={cm.cn('rounded-xl p-5 flex flex-col')} style={card}>
            <div className={cm.cn('flex items-center gap-2 mb-2')}>
              <span
                className={cm.cn(
                  'inline-flex h-8 w-8 items-center justify-center rounded-lg shrink-0',
                )}
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                  color: 'var(--color-primary)',
                }}
                aria-hidden="true"
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')}>{item.icon}</span>
              </span>
              <h3
                className={cm.cn('text-sm font-extrabold')}
                style={{ color: 'var(--color-text)' }}
              >
                {t(
                  `terms.commitment.${item.key}.title` as 'terms.commitment.sla.title',
                  {},
                  {
                    defaultValue: item.title,
                  },
                )}
              </h3>
            </div>
            <p className={cm.cn('text-xs leading-relaxed flex-1')} style={bodyStyle}>
              {t(
                `terms.commitment.${item.key}.body` as 'terms.commitment.sla.body',
                {},
                {
                  defaultValue: item.body,
                },
              )}
            </p>
            <p
              className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mt-3')}
              style={{ color: 'var(--color-severity-resolved)' }}
            >
              {t(
                `terms.commitment.${item.key}.foot` as 'terms.commitment.sla.foot',
                {},
                {
                  defaultValue: item.foot,
                },
              )}
            </p>
          </div>
        ))}
      </section>

      {/* The seven clauses */}
      <section data-mol-id="terms-clauses" className={cm.cn('space-y-4')}>
        {CLAUSES.map((clause, i) => (
          <div
            key={clause.key}
            data-mol-id={`terms-clause-${clause.key}`}
            className={cm.cn('rounded-2xl p-6')}
            style={card}
          >
            <p
              className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mb-1')}
              style={{ color: 'var(--color-primary)' }}
            >
              {t(
                `terms.clause.${clause.key}.ref` as 'terms.clause.availability.ref',
                {},
                { defaultValue: `section 0${i + 1}.00` },
              )}
            </p>
            <h2 className={h2} style={h2Style}>
              {t(
                `terms.clause.${clause.key}.title` as 'terms.clause.availability.title',
                {},
                {
                  defaultValue: clause.title,
                },
              )}
            </h2>
            <p className={body} style={bodyStyle}>
              {t(
                `terms.clause.${clause.key}.body` as 'terms.clause.availability.body',
                {},
                {
                  defaultValue: clause.body,
                },
              )}
            </p>
          </div>
        ))}
      </section>
    </DesignLegalPage>
  )
}

export default Terms
export { Terms as TermsPage }
