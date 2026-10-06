import { Link } from 'react-router'

import { ContentPageShell, PlanUpdatedPage } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

/** Growth-tier capability cards — what the upgrade actually unlocks. */
const CAPABILITIES = [
  {
    key: 'batch',
    icon: 'mark_email_read',
    defaultTitle: 'Batch year-end receipts',
    defaultBody:
      'Generate one numbered, itemized statement per donor per year and print the whole batch from the Receipts page.',
  },
  {
    key: 'campaigns',
    icon: 'flag',
    defaultTitle: 'Unlimited campaigns',
    defaultBody:
      'Run every appeal with live raised-to-date progress — capital campaigns, annual funds, and matching challenges side by side.',
  },
  {
    key: 'reporting',
    icon: 'monitoring',
    defaultTitle: 'Year-over-year reporting',
    defaultBody:
      'Dashboard giving intelligence across fiscal years: totals, averages, and per-campaign progress at a glance.',
  },
  {
    key: 'roles',
    icon: 'group',
    defaultTitle: 'Expanded roster capacity',
    defaultBody:
      'Room for the whole donor book, with filters, cohorts, and stewardship notes for every profile.',
  },
] as const

export function PlanUpdated() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-plan-updated"
      header={<AuthBrandHeader />}
      footer={<Footer />}
      eyebrow={t('settings.billing', {}, { defaultValue: 'Billing' })}
      title={t('planUpdated.message', {}, { defaultValue: 'Your plan has been updated.' })}
      subtitle={t('planUpdated.thankYou', {}, { defaultValue: 'Thank you!' })}
    >
      <div className={cm.stack(8)}>
        <PlanUpdatedPage />

        {/* Upgrade confirmation — the design's success + invoice panel. */}
        <section
          data-mol-id="plan-updated-success"
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-xl bg-success-container text-on-success-container flex items-start justify-between gap-4 flex-wrap',
          )}
        >
          <div className={cm.stack(1)}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
              {t(
                'planUpdated.successHeading',
                {},
                { defaultValue: 'Subscription Successfully Upgraded to Growth Tier' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('sm'))}>
              {t(
                'planUpdated.successBody',
                {},
                {
                  defaultValue:
                    'Donor record capacity is expanded, batch year-end receipting is unlocked, and year-over-year reporting is now active — effective immediately.',
                },
              )}
            </p>
          </div>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'w-12 h-12 rounded-full bg-surface/25 shrink-0',
            )}
            aria-hidden="true"
          >
            <span
              className="material-symbols-outlined text-2xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
          </span>
        </section>

        <div className={cm.grid({ cols: 2, gap: 'lg' })}>
          <section className={cm.cn(cm.card(), cm.sp('p', 6), cm.stack(3))}>
            <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
              {t('planUpdated.invoiceHeading', {}, { defaultValue: 'Invoice' })}
            </h3>
            <dl className={cm.stack(2)}>
              <div className={cm.flex({ align: 'start', justify: 'between', gap: 'sm' })}>
                <dt className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t('planUpdated.invoicePlan', {}, { defaultValue: 'Upgraded plan' })}
                </dt>
                <dd className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-right')}>
                  {t(
                    'planUpdated.invoiceTier',
                    {},
                    { defaultValue: 'Growth tier (annual commitment)' },
                  )}
                </dd>
              </div>
              <div className={cm.flex({ align: 'start', justify: 'between', gap: 'sm' })}>
                <dt className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t('planUpdated.invoiceBilling', {}, { defaultValue: 'Billing cycle' })}
                </dt>
                <dd className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-right')}>
                  {t(
                    'planUpdated.invoiceCycle',
                    {},
                    { defaultValue: 'Monthly, billed on your anniversary date' },
                  )}
                </dd>
              </div>
              <div className={cm.flex({ align: 'start', justify: 'between', gap: 'sm' })}>
                <dt className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(
                    'planUpdated.invoiceEntity',
                    {},
                    { defaultValue: 'IRS Fiduciary Billing Entity' },
                  )}
                </dt>
                <dd className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-right')}>
                  <Link to="/settings" className={'text-primary hover:underline'}>
                    {t(
                      'planUpdated.invoiceEntityEdit',
                      {},
                      { defaultValue: 'Your organization domain — edit in Settings' },
                    )}
                  </Link>
                </dd>
              </div>
            </dl>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'planUpdated.invoiceNote',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'Subscription invoices are software charges — {{appName}} never takes a cut of donor gifts.',
                },
              )}
            </p>
          </section>

          <section className={cm.cn(cm.card(), cm.sp('p', 6), cm.stack(3))}>
            <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
              {t('planUpdated.nextStepsHeading', {}, { defaultValue: 'Recommended Next Steps' })}
            </h3>
            <ol className={cm.stack(3)}>
              {[
                {
                  key: 'receipts',
                  label: t(
                    'planUpdated.stepReceipts',
                    {},
                    { defaultValue: 'Prepare year-end tax statements' },
                  ),
                  href: '/receipts',
                  cta: t('planUpdated.stepReceiptsCta', {}, { defaultValue: 'Go to receipts' }),
                },
                {
                  key: 'donors',
                  label: t(
                    'planUpdated.stepDonors',
                    {},
                    { defaultValue: 'Import or tidy the donor directory' },
                  ),
                  href: '/donors',
                  cta: t('planUpdated.stepDonorsCta', {}, { defaultValue: 'Open donors' }),
                },
                {
                  key: 'identity',
                  label: t(
                    'planUpdated.stepIdentity',
                    {},
                    { defaultValue: 'Verify your EIN and receipt signatory' },
                  ),
                  href: '/settings',
                  cta: t('planUpdated.stepIdentityCta', {}, { defaultValue: 'Review settings' }),
                },
              ].map((step, i) => (
                <li key={step.key} className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'w-7 h-7 rounded-full bg-primary-container text-on-primary-container shrink-0',
                    )}
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block')}>
                      {step.label}
                    </span>
                    <Link
                      to={step.href}
                      className={cm.cn(cm.textSize('xs'), 'text-primary hover:underline')}
                    >
                      {step.cta} →
                    </Link>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <section className={cm.cn(cm.stack(4))}>
          <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
            {t('planUpdated.capabilitiesHeading', {}, { defaultValue: 'Unlocked Capabilities' })}
          </h3>
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2')}>
            {CAPABILITIES.map((cap) => (
              <div
                key={cap.key}
                className={cm.cn(
                  cm.flex({ align: 'start', gap: 'md' }),
                  cm.sp('p', 4),
                  'rounded-xl border border-outline-variant/60',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-10 h-10 rounded-lg bg-primary-container text-on-primary-container shrink-0',
                  )}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined text-xl">{cap.icon}</span>
                </span>
                <div className={cm.stack(1)}>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {t(
                      `planUpdated.capability.${cap.key}.title`,
                      {},
                      { defaultValue: cap.defaultTitle },
                    )}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      `planUpdated.capability.${cap.key}.body`,
                      {},
                      { defaultValue: cap.defaultBody },
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default PlanUpdated
