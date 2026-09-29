import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/**
 * PlanUpdated — the page Stripe redirects back to after a successful
 * checkout. Mirrors the design: confirmation hero, plan summary & invoice
 * breakdown, the workspace quotas that just scaled, and the unlocked
 * next-step cards that activate the new capabilities.
 */

interface NextStep {
  to: string
  icon: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
  ctaKey: string
  ctaDefault: string
  molId: string
}

const NEXT_STEPS: NextStep[] = [
  {
    to: '/boards',
    icon: 'sync_alt',
    titleKey: 'planUpdated.stepSyncTitle',
    titleDefault: 'Connect Linear & Jira Sync',
    bodyKey: 'planUpdated.stepSyncBody',
    bodyDefault:
      'Configure two-way status sync triggers. When engineering ships an issue in Linear, the roadmap card resolves automatically and every voter is notified.',
    ctaKey: 'planUpdated.stepSyncCta',
    ctaDefault: 'Open your boards',
    molId: 'plan-updated-step-sync',
  },
  {
    to: '/settings',
    icon: 'group_add',
    titleKey: 'planUpdated.stepInviteTitle',
    titleDefault: 'Invite 4 Additional Triage Leads',
    bodyKey: 'planUpdated.stepInviteBody',
    bodyDefault:
      'Grant product managers, engineering leads, or tech writers dedicated triage seats. Delegate board permissions and configure custom SLA alerts.',
    ctaKey: 'planUpdated.stepInviteCta',
    ctaDefault: 'Manage your profile',
    molId: 'plan-updated-step-invite',
  },
  {
    to: '/admin',
    icon: 'payments',
    titleKey: 'planUpdated.stepArrTitle',
    titleDefault: 'Enable ARR-Weighted Prioritization',
    bodyKey: 'planUpdated.stepArrBody',
    bodyDefault:
      'Link your CRM datasets to weigh user upvotes by contractual annual revenue. Prioritize what matters most to your highest-value enterprise accounts.',
    ctaKey: 'planUpdated.stepArrCta',
    ctaDefault: 'Review the dashboard',
    molId: 'plan-updated-step-arr',
  },
  {
    to: '/changelog',
    icon: 'dns',
    titleKey: 'planUpdated.stepCnameTitle',
    titleDefault: 'Configure Custom CNAME Domain',
    bodyKey: 'planUpdated.stepCnameBody',
    bodyDefault:
      'Serve your portal from feedback.yourbrand.com with automated TLS certificate issuance and zero third-party branding in the footer.',
    ctaKey: 'planUpdated.stepCnameCta',
    ctaDefault: 'See what shipped',
    molId: 'plan-updated-step-cname',
  },
]

export function PlanUpdated() {
  const cm = getClassMap()
  const { t } = useTranslation()

  const quotas = [
    {
      icon: 'dashboard',
      labelKey: 'planUpdated.quotaBoards',
      labelDefault: 'Roadmap boards',
      valueKey: 'planUpdated.quotaBoardsValue',
      valueDefault: 'Unlimited',
    },
    {
      icon: 'group',
      labelKey: 'planUpdated.quotaSeats',
      labelDefault: 'Triage seats',
      valueKey: 'planUpdated.quotaSeatsValue',
      valueDefault: '5 included',
    },
    {
      icon: 'how_to_vote',
      labelKey: 'planUpdated.quotaVoters',
      labelDefault: 'Voter submissions',
      valueKey: 'planUpdated.quotaVotersValue',
      valueDefault: 'Unlimited — zero seat-tax',
    },
    {
      icon: 'database',
      labelKey: 'planUpdated.quotaStreaming',
      labelDefault: 'Warehouse streaming',
      valueKey: 'planUpdated.quotaStreamingValue',
      valueDefault: 'Enabled',
    },
  ]

  const invoiceLines = [
    {
      labelKey: 'planUpdated.invoicePlan',
      labelDefault: 'Pro plan — billed annually',
      valueKey: 'planUpdated.invoicePlanValue',
      valueDefault: 'Discounted annual rate',
    },
    {
      labelKey: 'planUpdated.invoiceSeats',
      labelDefault: 'Triage seats',
      valueKey: 'planUpdated.invoiceSeatsValue',
      valueDefault: '5 seats included',
    },
    {
      labelKey: 'planUpdated.invoiceBoards',
      labelDefault: 'Public roadmap boards & voter submissions',
      valueKey: 'planUpdated.invoiceBoardsValue',
      valueDefault: 'Unlimited',
    },
    {
      labelKey: 'planUpdated.invoiceNext',
      labelDefault: 'Next invoice',
      valueKey: 'planUpdated.invoiceNextValue',
      valueDefault: 'In 12 months — cancel anytime',
    },
  ]

  return (
    <ContentPageShell
      dataMolId="page-plan-updated"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('settings.billing', {}, { defaultValue: 'Billing' })}
      title={t('planUpdated.message', {}, { defaultValue: 'Your plan has been updated.' })}
      subtitle={t(
        'planUpdated.thankYou',
        {},
        {
          defaultValue:
            'Elevated quotas, extra triage seats, warehouse streaming, and backlog sync are now active across your workspace.',
        },
      )}
    >
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
        <section
          aria-labelledby="plan-updated-summary"
          className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
        >
          <h2
            id="plan-updated-summary"
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}
          >
            {t(
              'planUpdated.summaryTitle',
              {},
              { defaultValue: 'Plan Summary & Invoice Breakdown' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'planUpdated.summaryBody',
              {},
              {
                defaultValue:
                  'Triage seats included, with unlimited public roadmap boards and voter submissions. Your receipt is on its way by email.',
              },
            )}
          </p>
          <dl
            className={cm.cn(
              'rounded-xl border border-outline-variant/40 bg-surface-container-low/40 divide-y divide-outline-variant/40',
            )}
          >
            {invoiceLines.map((line) => (
              <div
                key={line.labelKey}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                )}
              >
                <dt
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface')}
                >
                  {t(line.labelKey, {}, { defaultValue: line.labelDefault })}
                </dt>
                <dd
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {t(line.valueKey, {}, { defaultValue: line.valueDefault })}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          aria-labelledby="plan-updated-quotas"
          className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
        >
          <h2
            id="plan-updated-quotas"
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}
          >
            {t('planUpdated.quotasTitle', {}, { defaultValue: 'Workspace Quotas & Limits' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'planUpdated.quotasBody',
              {},
              {
                defaultValue:
                  'Operational caps have automatically scaled across your workspace. Limits update synchronously with your API keys.',
              },
            )}
          </p>
          <div className={cm.cn('grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}>
            {quotas.map((quota) => (
              <div
                key={quota.labelKey}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'xs' }),
                  cm.sp('p', 4),
                  'rounded-xl border border-outline-variant/40 bg-surface',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(8),
                    cm.h(8),
                    'rounded-lg',
                  )}
                  style={{
                    backgroundColor: 'var(--color-primary-container)',
                    color: 'var(--color-primary)',
                  }}
                  aria-hidden="true"
                >
                  <span className={cm.cn('material-symbols-outlined', cm.textSize('base'))}>
                    {quota.icon}
                  </span>
                </span>
                <span
                  className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}
                >
                  {t(quota.valueKey, {}, { defaultValue: quota.valueDefault })}
                </span>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(quota.labelKey, {}, { defaultValue: quota.labelDefault })}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="plan-updated-next"
          className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
        >
          <h2
            id="plan-updated-next"
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}
          >
            {t('planUpdated.nextTitle', {}, { defaultValue: 'Unlocked Capabilities & Next Steps' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'planUpdated.nextBody',
              {},
              {
                defaultValue:
                  "Execute these key setup operations to immediately distribute your team's feedback loop and surface insights.",
              },
            )}
          </p>
          <div className={cm.cn('grid gap-4 grid-cols-1 md:grid-cols-2')}>
            {NEXT_STEPS.map((step) => (
              <div
                key={step.molId}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'sm' }),
                  cm.sp('p', 5),
                  'rounded-xl border border-outline-variant/40 bg-surface',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(9),
                      cm.h(9),
                      'rounded-lg shrink-0',
                    )}
                    style={{
                      backgroundColor: 'var(--color-primary-container)',
                      color: 'var(--color-primary)',
                    }}
                    aria-hidden="true"
                  >
                    <span className={cm.cn('material-symbols-outlined', cm.textSize('base'))}>
                      {step.icon}
                    </span>
                  </span>
                  <h3
                    className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'), 'text-on-surface')}
                  >
                    {t(step.titleKey, {}, { defaultValue: step.titleDefault })}
                  </h3>
                </div>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(step.bodyKey, {}, { defaultValue: step.bodyDefault })}
                </p>
                <a
                  href={step.to}
                  data-mol-id={step.molId}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'text-primary hover:underline self-start',
                  )}
                >
                  {t(step.ctaKey, {}, { defaultValue: step.ctaDefault })}
                  <span className="material-symbols-outlined text-base" aria-hidden="true">
                    arrow_forward
                  </span>
                </a>
              </div>
            ))}
          </div>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default PlanUpdated
