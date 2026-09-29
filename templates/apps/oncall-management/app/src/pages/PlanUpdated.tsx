import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { PlanUpdated as PlanUpdatedShared } from '@molecule/app-plan-updated-page-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { Footer } from '../components/Footer.js'

/** What the upgrade unlocks, rendered as activation telemetry rows. */
const ACTIVATION_SUBSYSTEMS = [
  {
    key: 'trunk',
    icon: 'cell_tower',
    name: 'Carrier SS7 direct trunk',
    detail: 'Voice + SMS dispatch pool provisioned on the direct carrier interconnect.',
    state: 'Active',
  },
  {
    key: 'dnd',
    icon: 'phonelink_ring',
    name: 'iOS Critical Alert & Android DND bypass',
    detail: 'Hardware ringtone-bypass entitlements verified for every responder device.',
    state: 'Enforced',
  },
  {
    key: 'ladders',
    icon: 'alt_route',
    name: 'Multi-tier escalation chains',
    detail: 'Tier-1 → Tier-2 → commander failover ladders unlocked for every rotation.',
    state: 'Unlocked',
  },
  {
    key: 'postmortems',
    icon: 'history_edu',
    name: 'Automated post-mortem generator',
    detail: 'Timeline collation and markdown synthesis initialize on the next resolved incident.',
    state: 'Initialized',
  },
] as const

/** Post-upgrade verifications, each pointing at the real surface. */
const ACTIVATION_CHECKLIST = [
  {
    key: 'pager',
    icon: 'volume_up',
    title: 'Verify hardware pager bindings',
    body: 'Trigger a zero-cost test page from an incident to confirm the DND carrier bypass on your physical phone.',
    href: '/incidents',
    cta: 'Open incidents',
    tag: 'HIGH PRIORITY',
  },
  {
    key: 'ladders',
    icon: 'alt_route',
    title: 'Configure escalation ladders',
    body: 'Attach tier-2 standby and commander shadow tiers to your critical rotations now that multi-tier chains are unlocked.',
    href: '/escalation-policies',
    cta: 'Configure policies',
    tag: 'CONFIG READY',
  },
  {
    key: 'team',
    icon: 'group_add',
    title: 'Invite team responders',
    body: 'Allocate your newly provisioned seats across infrastructure, data, and platform reliability rotations.',
    href: '/team',
    cta: 'Manage roster',
    tag: 'SEATS FREE',
  },
] as const

/**
 * Post-checkout confirmation at `/plan-updated`. Keeps the shared
 * plan-updated component, wrapped in the design's receipt, activation
 * telemetry and checklist sections.
 *
 * @returns The rendered plan-updated page.
 */
export function PlanUpdated() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const card = {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
  }
  return (
    <ContentPageShell
      dataMolId="page-plan-updated"
      footer={<Footer />}
      eyebrow={t('planUpdated.eyebrow', {}, { defaultValue: 'Transaction committed' })}
      title={t(
        'planUpdated.upgradedTitle',
        {},
        { defaultValue: 'Subscription Upgraded: SRE Pro Active' },
      )}
      subtitle={t(
        'planUpdated.upgradedSubtitle',
        {},
        {
          defaultValue:
            'Tier activation completed — carrier routing, multi-tier escalation chains, and hardware bypass channels are unlocked across your cluster.',
        },
      )}
      bare
    >
      <div className={cm.cn('max-w-5xl mx-auto px-4 py-10 space-y-6')}>
        <PlanUpdatedShared />

        {/* Plan & billing receipt (design: receipt card) */}
        <section
          className={cm.cn('rounded-2xl p-6')}
          style={card}
          data-mol-id="plan-updated-receipt"
        >
          <div className={cm.cn('flex items-center gap-2 flex-wrap mb-4')}>
            <h2
              className={cm.cn('text-lg font-bold tracking-tight')}
              style={{ color: 'var(--color-text)' }}
            >
              {t('planUpdated.receiptHeading', {}, { defaultValue: 'Plan & Billing Receipt' })}
            </h2>
            <span
              className={cm.cn(
                'px-2 py-0.5 rounded-full font-mono text-[9px] font-black uppercase tracking-widest',
              )}
              style={{
                backgroundColor: 'var(--color-severity-resolved-light)',
                color: 'var(--color-severity-resolved)',
              }}
            >
              {t('planUpdated.receiptPaid', {}, { defaultValue: 'Paid & settled' })}
            </span>
          </div>
          <dl className={cm.cn('space-y-3')}>
            {[
              {
                label: t('planUpdated.receiptTier', {}, { defaultValue: 'Tier subscription' }),
                value: t(
                  'planUpdated.receiptTierValue',
                  { app: APP_NAME },
                  { defaultValue: '{{app}} SRE Pro — advanced paging + postmortems' },
                ),
              },
              {
                label: t('planUpdated.receiptBilling', {}, { defaultValue: 'Billing account' }),
                value: t(
                  'planUpdated.receiptBillingValue',
                  {},
                  { defaultValue: 'Stripe-backed automated invoicing · cancel any time' },
                ),
              },
              {
                label: t('planUpdated.receiptInvoice', {}, { defaultValue: 'Invoice reference' }),
                value: t(
                  'planUpdated.receiptInvoiceValue',
                  {},
                  { defaultValue: 'Emailed to your workspace billing contact' },
                ),
              },
              {
                label: t('planUpdated.receiptRenewal', {}, { defaultValue: 'Next renewal' }),
                value: t(
                  'planUpdated.receiptRenewalValue',
                  {},
                  { defaultValue: 'Managed from Settings → workspace plan' },
                ),
              },
            ].map((row) => (
              <div key={row.label} className={cm.cn('flex items-baseline gap-3 flex-wrap')}>
                <dt
                  className={cm.cn(
                    'font-mono text-[10px] font-black uppercase tracking-widest w-44 shrink-0',
                  )}
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  {row.label}
                </dt>
                <dd className={cm.cn('text-sm')} style={{ color: 'var(--color-text)' }}>
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Hardware & telecom activation telemetry (design: subsystem card) */}
        <section
          className={cm.cn('rounded-2xl p-6')}
          style={card}
          data-mol-id="plan-updated-telemetry"
        >
          <div className={cm.cn('flex items-center gap-2 flex-wrap mb-4')}>
            <h2
              className={cm.cn('text-lg font-bold tracking-tight')}
              style={{ color: 'var(--color-text)' }}
            >
              {t(
                'planUpdated.telemetryHeading',
                {},
                { defaultValue: 'Hardware & Telecom Activation Telemetry' },
              )}
            </h2>
            <span
              className={cm.cn(
                'px-2 py-0.5 rounded-full font-mono text-[9px] font-black uppercase tracking-widest',
              )}
              style={{
                backgroundColor: 'var(--color-severity-resolved-light)',
                color: 'var(--color-severity-resolved)',
              }}
            >
              {t(
                'planUpdated.telemetryAllUp',
                { count: ACTIVATION_SUBSYSTEMS.length },
                { defaultValue: '{{count}}/{{count}} subsystems up' },
              )}
            </span>
          </div>
          <ul className={cm.cn('space-y-3')}>
            {ACTIVATION_SUBSYSTEMS.map((sub) => (
              <li
                key={sub.key}
                data-mol-id={`plan-updated-subsystem-${sub.key}`}
                className={cm.cn('rounded-lg p-3.5 flex items-start gap-3')}
                style={{
                  backgroundColor: 'var(--color-background-tertiary)',
                  border: '1px solid var(--color-border-subtle)',
                }}
              >
                <span
                  className={cm.cn(
                    'inline-flex h-9 w-9 items-center justify-center rounded-lg shrink-0',
                  )}
                  style={{
                    backgroundColor: `color-mix(in srgb, ${BRAND_COLOR} 12%, transparent)`,
                    color: BRAND_COLOR,
                  }}
                  aria-hidden="true"
                >
                  <span className={cm.cn('material-symbols-outlined text-[20px]')}>{sub.icon}</span>
                </span>
                <div className={cm.cn('min-w-0 flex-1')}>
                  <p className={cm.cn('text-sm font-bold')} style={{ color: 'var(--color-text)' }}>
                    {t(
                      `planUpdated.subsystem.${sub.key}.name` as 'planUpdated.subsystem.trunk.name',
                      {},
                      { defaultValue: sub.name },
                    )}
                  </p>
                  <p
                    className={cm.cn('text-xs mt-0.5')}
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {t(
                      `planUpdated.subsystem.${sub.key}.detail` as 'planUpdated.subsystem.trunk.detail',
                      {},
                      { defaultValue: sub.detail },
                    )}
                  </p>
                </div>
                <span
                  className={cm.cn(
                    'px-2 py-0.5 rounded-full font-mono text-[9px] font-black uppercase tracking-widest shrink-0',
                  )}
                  style={{
                    backgroundColor: 'var(--color-severity-info-light)',
                    color: 'var(--color-severity-info)',
                  }}
                >
                  {sub.state}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Immediate activation checklist (design: checklist card) */}
        <section
          className={cm.cn('rounded-2xl p-6')}
          style={card}
          data-mol-id="plan-updated-checklist"
        >
          <h2
            className={cm.cn('text-lg font-bold tracking-tight')}
            style={{ color: 'var(--color-text)' }}
          >
            {t(
              'planUpdated.checklistHeading',
              {},
              { defaultValue: 'Immediate Activation Checklist' },
            )}
          </h2>
          <p
            className={cm.cn('text-sm mt-1 mb-4')}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t(
              'planUpdated.checklistCopy',
              {},
              {
                defaultValue:
                  'Perform these operational verifications so your on-call team bypasses silent switches from the first shift.',
              },
            )}
          </p>
          <ul className={cm.cn('grid gap-3 grid-cols-1 md:grid-cols-3')}>
            {ACTIVATION_CHECKLIST.map((step) => (
              <li
                key={step.key}
                data-mol-id={`plan-updated-check-${step.key}`}
                className={cm.cn('rounded-lg p-4 flex flex-col')}
                style={{
                  backgroundColor: 'var(--color-background-tertiary)',
                  border: '1px solid var(--color-border-subtle)',
                }}
              >
                <span
                  className={cm.cn(
                    'self-start px-2 py-0.5 rounded-full font-mono text-[9px] font-black uppercase tracking-widest mb-2',
                  )}
                  style={{
                    backgroundColor: 'var(--color-severity-warning-light)',
                    color: 'var(--color-severity-warning)',
                  }}
                >
                  {step.tag}
                </span>
                <p className={cm.cn('text-sm font-bold')} style={{ color: 'var(--color-text)' }}>
                  {t(
                    `planUpdated.check.${step.key}.title` as 'planUpdated.check.pager.title',
                    {},
                    { defaultValue: step.title },
                  )}
                </p>
                <p
                  className={cm.cn('text-xs mt-1 mb-3 flex-1')}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t(
                    `planUpdated.check.${step.key}.body` as 'planUpdated.check.pager.body',
                    {},
                    { defaultValue: step.body },
                  )}
                </p>
                <Link
                  to={step.href}
                  data-mol-id={`plan-updated-check-cta-${step.key}`}
                  className={cm.cn(
                    'inline-flex items-center gap-1.5 self-start px-3 py-1.5 rounded-md font-mono text-[11px] font-bold uppercase tracking-widest border hover:opacity-80',
                  )}
                  style={{ borderColor: BRAND_COLOR, color: BRAND_COLOR }}
                >
                  {t(
                    `planUpdated.check.${step.key}.cta` as 'planUpdated.check.pager.cta',
                    {},
                    { defaultValue: step.cta },
                  )}
                  <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                    arrow_forward
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default PlanUpdated
