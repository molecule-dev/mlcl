import { Link } from 'react-router'

import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ContentPageShell } from '@molecule/app-legal-pages-react'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { Footer } from '../components/Footer.js'

/**
 * Public pricing page. Renders the tier ladder declared in the API's
 * `tiers.ts` (Free / Pro / Team) with month-or-yearly variants and a
 * Stripe-Checkout-backed upgrade CTA, plus the design's spec matrix,
 * billing FAQ and enterprise/CTA sections.
 *
 * @returns The rendered pricing page.
 */
export function Pricing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const yes = t('common.yes', {}, { defaultValue: '✓' })
  const no = t('common.no', {}, { defaultValue: '—' })
  return (
    <ContentPageShell bare containerSize="xl" footer={<Footer />}>
      <PricingPage
        period="month"
        headlineFontFamily="var(--font-display)"
        headingDefault={t(
          'pricing.heading',
          { app: APP_NAME },
          {
            defaultValue: `Choose your ${APP_NAME} plan`,
          },
        )}
        subheadingDefault={t(
          'pricing.subheading',
          {},
          { defaultValue: 'Predictable per-engineer pricing. Zero telecom surcharges.' },
        )}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {formatNum(read(limits, 'maxSchedules'))}{' '}
              {t('pricing.schedulesLabel', {}, { defaultValue: 'schedules' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxPolicies'))}{' '}
              {t('pricing.policiesLabel', {}, { defaultValue: 'escalation policies' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxOpenIncidents'))}{' '}
              {t('pricing.incidentsLabel', {}, { defaultValue: 'open incidents' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxPostmortems'))}{' '}
              {t('pricing.postmortemsLabel', {}, { defaultValue: 'postmortems' })}
            </LimitsItem>
            <LimitsItem>
              {t('common.advancedFeatures', {}, { defaultValue: 'Advanced features' })}:{' '}
              {read(limits, 'advancedFeatures') ? yes : no}
            </LimitsItem>
            <LimitsItem>
              {t('common.dataExport', {}, { defaultValue: 'Data export' })}:{' '}
              {read(limits, 'canExport') ? yes : no}
            </LimitsItem>
          </LimitsList>
        )}
      />

      {/* Technical Specification Matrix (design: comparison table) */}
      <section
        className={cm.cn('rounded-2xl p-6 mt-10 overflow-x-auto')}
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
        data-mol-id="pricing-spec-matrix"
      >
        <h2
          className={cm.cn('text-xl font-bold tracking-tight')}
          style={{ color: 'var(--color-text)' }}
        >
          {t('pricing.matrixHeading', {}, { defaultValue: 'Technical Specification Matrix' })}
        </h2>
        <p className={cm.cn('text-sm mt-1 mb-4')} style={{ color: 'var(--color-text-secondary)' }}>
          {t(
            'pricing.matrixCopy',
            {},
            {
              defaultValue:
                'Deep telemetry comparison across all paging tiers, built for transparent vendor evaluation.',
            },
          )}
        </p>
        <table className={cm.cn('w-full min-w-[640px] text-sm border-collapse')}>
          <thead>
            <tr
              className={cm.cn(
                'font-mono text-[10px] uppercase tracking-widest text-left border-b',
              )}
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-tertiary)' }}
            >
              <th className={cm.cn('py-2 pr-4 font-black')}>
                {t('pricing.matrixCapability', {}, { defaultValue: 'Platform capability' })}
              </th>
              <th className={cm.cn('py-2 pr-4 font-black')}>
                {t('pricing.matrixDeveloper', {}, { defaultValue: 'Developer (Free)' })}
              </th>
              <th className={cm.cn('py-2 pr-4 font-black')}>
                {t('pricing.matrixPro', {}, { defaultValue: 'SRE Pro' })}
              </th>
              <th className={cm.cn('py-2 font-black')}>
                {t('pricing.matrixTeam', {}, { defaultValue: 'Team & Platform SRE' })}
              </th>
            </tr>
          </thead>
          <tbody>
            {SPEC_MATRIX.map((row) => (
              <tr
                key={row.key}
                className={cm.cn('border-b last:border-b-0')}
                style={{ borderColor: 'var(--color-border-subtle)' }}
              >
                <th
                  className={cm.cn('py-2.5 pr-4 text-left font-medium')}
                  style={{ color: 'var(--color-text)' }}
                >
                  {t(
                    `pricing.matrix.${row.key}.label` as 'pricing.matrix.schedules.label',
                    {},
                    {
                      defaultValue: row.label,
                    },
                  )}
                </th>
                <td
                  className={cm.cn('py-2.5 pr-4 font-mono text-xs')}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {row.free}
                </td>
                <td
                  className={cm.cn('py-2.5 pr-4 font-mono text-xs')}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {row.pro}
                </td>
                <td
                  className={cm.cn('py-2.5 font-mono text-xs')}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {row.team}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Engineering & billing FAQ (design: FAQ accordion) */}
      <section
        className={cm.cn('rounded-2xl p-6 mt-6')}
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
        data-mol-id="pricing-faq"
      >
        <h2
          className={cm.cn('text-xl font-bold tracking-tight')}
          style={{ color: 'var(--color-text)' }}
        >
          {t('pricing.faqHeading', {}, { defaultValue: 'Engineering & Billing FAQ' })}
        </h2>
        <p className={cm.cn('text-sm mt-1 mb-4')} style={{ color: 'var(--color-text-secondary)' }}>
          {t(
            'pricing.faqCopy',
            {},
            { defaultValue: 'Clear answers for incident commanders and procurement leads.' },
          )}
        </p>
        <div className={cm.cn('space-y-3')}>
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.key}
              className={cm.cn('rounded-lg border px-4 py-3')}
              style={{ borderColor: 'var(--color-border)' }}
              data-mol-id={`pricing-faq-${item.key}`}
            >
              <summary
                className={cm.cn('cursor-pointer select-none font-bold text-sm')}
                style={{ color: 'var(--color-text)' }}
              >
                {t(
                  `pricing.faq.${item.key}.q` as 'pricing.faq.surcharges.q',
                  {},
                  {
                    defaultValue: item.q,
                  },
                )}
              </summary>
              <p className={cm.cn('mt-2 text-sm')} style={{ color: 'var(--color-text-secondary)' }}>
                {t(
                  `pricing.faq.${item.key}.a` as 'pricing.faq.surcharges.a',
                  {},
                  {
                    defaultValue: item.a,
                  },
                )}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Air-gapped / regulated deployments (design: enterprise band) */}
      <section
        className={cm.cn('rounded-2xl p-6 mt-6')}
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid color-mix(in srgb, var(--color-tertiary) 35%, transparent)',
        }}
        data-mol-id="pricing-enterprise"
      >
        <h2
          className={cm.cn('text-xl font-bold tracking-tight flex items-center gap-2')}
          style={{ color: 'var(--color-text)' }}
        >
          <span
            className={cm.cn('inline-flex h-8 w-8 items-center justify-center rounded-lg')}
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-tertiary) 14%, transparent)',
              color: 'var(--color-tertiary)',
            }}
            aria-hidden="true"
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')}>shield</span>
          </span>
          {t(
            'pricing.enterpriseHeading',
            {},
            { defaultValue: 'Need Air-Gapped On-Premises or FedRAMP High Compliance?' },
          )}
        </h2>
        <p
          className={cm.cn('text-sm mt-2 max-w-3xl')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t(
            'pricing.enterpriseCopy',
            {},
            {
              defaultValue:
                'Dedicated telecom routing, hardware FIDO2 key enforcement, zero-egress VPC peering, and a designated incident commander assigned to your engineering leadership. Custom invoicing, tailored agreements, and a dedicated 15-minute SLA support tier.',
            },
          )}
        </p>
        <div className={cm.cn('mt-4 flex gap-3 flex-wrap')}>
          <Link
            to="/about"
            data-mol-id="pricing-enterprise-cta"
            className={cm.cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border hover:opacity-80',
            )}
            style={{ borderColor: 'var(--color-tertiary)', color: 'var(--color-tertiary)' }}
          >
            {t('pricing.enterpriseCta', {}, { defaultValue: 'Read the platform posture' })}
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        </div>
      </section>

      {/* Final CTA (design: zero-latency on-call band) */}
      <section
        className={cm.cn('rounded-2xl p-8 mt-6 mb-10 text-center')}
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
        data-mol-id="pricing-final-cta"
      >
        <p
          className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mb-2')}
          style={{ color: BRAND_COLOR }}
        >
          {t('pricing.ctaEyebrow', {}, { defaultValue: '// zero-latency on-call' })}
        </p>
        <h2
          className={cm.cn('text-2xl md:text-3xl font-extrabold tracking-tight')}
          style={{ color: 'var(--color-text)' }}
        >
          {t(
            'pricing.ctaHeading',
            { app: APP_NAME },
            { defaultValue: 'Stop sleeping through outages. Deploy {{app}} today.' },
          )}
        </h2>
        <p
          className={cm.cn('text-sm mt-2 max-w-2xl mx-auto')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t(
            'pricing.ctaCopy',
            {},
            {
              defaultValue:
                'Equip your incident response rotation with carrier-guaranteed paging and automated post-mortem runbooks. 14 days free.',
            },
          )}
        </p>
        <Link
          to="/signup"
          data-mol-id="pricing-final-cta-start"
          className={cm.cn(
            'inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-md font-mono text-sm font-bold uppercase tracking-widest hover:opacity-90',
          )}
          style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
        >
          {t('pricing.ctaStart', {}, { defaultValue: 'Start 14-day trial' })}
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_forward
          </span>
        </Link>
      </section>
    </ContentPageShell>
  )
}

/** Spec-matrix rows — values mirror the API's tiers.ts limits. */
const SPEC_MATRIX = [
  { key: 'schedules', label: 'Rotation schedules', free: '5', pro: '500', team: 'Unlimited' },
  { key: 'policies', label: 'Escalation ladders', free: '5', pro: '500', team: 'Unlimited' },
  {
    key: 'retention',
    label: 'Telemetry log retention',
    free: '90 days',
    pro: '365 days',
    team: 'Unlimited',
  },
  { key: 'postmortems', label: 'Blameless postmortems', free: '5', pro: '500', team: 'Unlimited' },
  {
    key: 'advanced',
    label: 'Advanced correlation features',
    free: '—',
    pro: 'Included',
    team: 'Included',
  },
  { key: 'export', label: 'Data export', free: '—', pro: 'Included', team: 'Included' },
] as const

/** FAQ rows (design: engineering & billing accordion). */
const FAQ_ITEMS = [
  {
    key: 'surcharges',
    q: 'Do you charge extra for international emergency phone calls during a SEV-1?',
    a: 'No. There are strictly zero telephony surcharges on the paid tiers — every automated phone call, high-priority SMS blast, and multi-retry verification is included in the flat per-seat price.',
  },
  {
    key: 'trial',
    q: 'How does the 14-day free trial work?',
    a: 'The trial gives your entire engineering pod full access to the SRE Pro feature suite without asking for a credit card — cellular paging, DND-override tests on your physical phones, and simulated escalations included.',
  },
  {
    key: 'billing',
    q: 'Can we switch between monthly and annual billing at any time?',
    a: 'Yes. Upgrading to annual billing applies the discount across your active seats immediately, and mid-cycle downgrades keep prorated credits on your invoice balance.',
  },
  {
    key: 'invoicing',
    q: 'Do you support Purchase Orders and Net-30 invoicing?',
    a: 'Automated invoicing, ACH/wire transfers, and Net-30 terms are available for teams on the Team & Platform tier — reach out from your workspace settings to get onboarded.',
  },
] as const

const formatNum = (n: number): string => (n >= 999_999 ? '∞' : n.toLocaleString())

const read = (limits: unknown, key: string): never => {
  if (limits != null && typeof limits === 'object' && key in (limits as Record<string, unknown>)) {
    return (limits as Record<string, unknown>)[key] as never
  }
  return 0 as never
}
