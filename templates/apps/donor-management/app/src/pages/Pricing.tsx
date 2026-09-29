import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { Link } from 'react-router'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

/** Nonprofit-specific guarantee cards under "Built exclusively for nonprofits". */
const GUARANTEES = [
  {
    key: 'cuts',
    icon: 'percent',
    defaultTitle: 'Zero Platform Cuts',
    defaultBody:
      'Unlike consumer crowdfunding sites that silently skim 1–5% of donations, {{appName}} charges only a predictable flat subscription. 100% of donor capital stays inside your organization.',
  },
  {
    key: 'safeHarbor',
    icon: 'verified_user',
    defaultTitle: 'IRS Safe-Harbor Assurance',
    defaultBody:
      'Every generated receipt carries the contemporaneous written acknowledgment disclosures required by IRC § 170(f)(8) — amount, goods-or-services statement, and an immutable receipt number — so you are audit-ready each filing cycle.',
  },
  {
    key: 'migration',
    icon: 'swap_horiz',
    defaultTitle: 'Frictionless Migration',
    defaultBody:
      'Switching from legacy donor databases or fragmented spreadsheets is guided: import donors and giving history from CSV, keep your tags, and reconcile nothing by hand.',
  },
] as const

/** Frequently asked questions (nonprofit pricing & compliance). */
const FAQS = [
  {
    key: 'cuts',
    q: 'Do you take any percentage of our donations?',
    a: 'Never. {{appName}} operates as a pure software subscription — donations settle directly into your own Stripe or bank account at normal nonprofit processing rates. We never add a platform cut, tip, or percentage of any gift.',
  },
  {
    key: 'limit',
    q: 'What happens if we cross our donor limit during a viral campaign?',
    a: 'We never freeze your campaigns or block inbound contributions. If your active donor count crosses the tier threshold you get a grace window to upgrade smoothly, with prorated billing — your donors never see an error page.',
  },
  {
    key: 'irs',
    q: 'Are the receipts compliant with IRS Section 170(f)(8)?',
    a: 'Yes. Every receipt states the amount contributed and whether any goods or services were provided in exchange, carries a sequential immutable receipt number, and can be re-produced verbatim from the receipt record — the elements a contemporaneous written acknowledgment requires.',
  },
  {
    key: 'cancel',
    q: 'Can we export our data if we leave?',
    a: 'Anytime, without asking us: donors, gifts, campaigns, notes, and issued receipts export to CSV and printable formats from the app. Cancelling never deletes your data automatically — you keep export access for 90 days.',
  },
] as const

/** Feature-comparison rows for the "Complete Plan Feature Comparison" table. */
const COMPARISON: { feature: string; tiers: [string, string, string] }[] = [
  { feature: 'Active donor records', tiers: ['Up to 500', 'Up to 2,500', 'Unlimited'] },
  { feature: 'Donor profiles & giving history', tiers: ['✓', '✓', '✓'] },
  {
    feature: 'Year-end tax receipts (IRS 170(f)(8))',
    tiers: ['Per gift', 'Batch', 'Batch + consolidated'],
  },
  { feature: 'Campaigns with live goal progress', tiers: ['5', 'Unlimited', 'Unlimited'] },
  { feature: 'Donor notes timeline', tiers: ['✓', '✓', '✓'] },
  { feature: 'Data export (CSV)', tiers: ['✓', '✓', '✓'] },
  { feature: 'Roles & multiple staff seats', tiers: ['—', '✓', '✓'] },
  { feature: 'Priority support', tiers: ['—', '✓', '✓'] },
]

/**
 * Public pricing page — the bonded tier grid plus the nonprofit-specific
 * sections from the app's design: tier help, full comparison table,
 * guarantee cards, FAQ, and closing CTA.
 *
 * @returns The rendered pricing page.
 */
export function Pricing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell bare containerSize="xl" header={<AuthBrandHeader />} footer={<Footer />}>
      <PricingPage
        period="month"
        headlineFontFamily="var(--font-display)"
        headingDefault={t(
          'pricing.heading',
          { appName: APP_NAME },
          { defaultValue: `Choose your ${APP_NAME} plan` },
        )}
        subheadingDefault={t(
          'pricing.subheading',
          {},
          {
            defaultValue:
              'Predictable pricing that grows with your mission, not your donor generosity.',
          },
        )}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {formatNum(read(limits, 'maxDonors'))}{' '}
              {t('donors.title', {}, { defaultValue: 'donors' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxCampaigns'))}{' '}
              {t('campaigns.title', {}, { defaultValue: 'campaigns' })}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.advancedReporting', {}, { defaultValue: 'Year-over-year reporting' })}{' '}
              {read(limits, 'advancedReporting') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>
              {t('common.dataExport', {}, { defaultValue: 'Data export' })}:{' '}
              {read(limits, 'dataExport') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.batchReceipts', {}, { defaultValue: 'Batch year-end receipts' })}{' '}
              {read(limits, 'batchReceipts') ? '✓' : '—'}
            </LimitsItem>
          </LimitsList>
        )}
      />

      <div
        className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('pb', 20), cm.stack(12))}
      >
        {/* Tier help */}
        <section data-mol-id="pricing-tier-help" className={cm.cn(cm.stack(3), cm.textCenter)}>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'font-display')}>
            {t(
              'pricing.tierHelp.heading',
              {},
              { defaultValue: 'Not sure which tier matches your donor roster?' },
            )}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'pricing.tierHelp.body',
              {},
              {
                defaultValue:
                  'Count your active donor records — every plan includes the full CRM, campaigns, and year-end receipting. Start free and upgrade when the roster outgrows the limits; upgrading never interrupts a campaign.',
              },
            )}
          </p>
          <div className={cm.cn(cm.flex({ justify: 'center', gap: 'md', wrap: 'wrap' }))}>
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-lg bg-primary text-on-primary',
              )}
            >
              {t('pricing.tierHelp.cta', {}, { defaultValue: 'Start free' })}
            </Link>
          </div>
        </section>

        {/* Complete plan feature comparison */}
        <section data-mol-id="pricing-comparison" className={cm.cn(cm.stack(4))}>
          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              'font-display tracking-tight',
              cm.textCenter,
            )}
          >
            {t(
              'pricing.comparison.heading',
              {},
              { defaultValue: 'Complete Plan Feature Comparison' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.textCenter)}>
            {t(
              'pricing.comparison.subheading',
              {},
              {
                defaultValue:
                  'Every tier includes the whole stewardship workflow — the tiers scale capacity, not features.',
              },
            )}
          </p>
          <div className={cm.cn(cm.card(), 'overflow-x-auto')}>
            <table className={'w-full text-left text-sm'}>
              <thead>
                <tr className={'border-b border-outline-variant'}>
                  {[
                    t('pricing.comparison.col.feature', {}, { defaultValue: 'Capability' }),
                    t('pricing.comparison.col.seed', {}, { defaultValue: 'Seed' }),
                    t('pricing.comparison.col.growth', {}, { defaultValue: 'Growth' }),
                    t('pricing.comparison.col.scale', {}, { defaultValue: 'Scale & Endowment' }),
                  ].map((h) => (
                    <th
                      key={h}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'uppercase tracking-wider text-on-surface-variant',
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr
                    key={row.feature}
                    className={'border-b border-outline-variant hover:bg-surface-container'}
                  >
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.fontWeight('medium'))}>
                      {t(
                        `pricing.comparison.row.${slug(row.feature)}`,
                        {},
                        { defaultValue: row.feature },
                      )}
                    </td>
                    {row.tiers.map((cell, i) => (
                      <td
                        key={i}
                        className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Built exclusively for nonprofits */}
        <section data-mol-id="pricing-nonprofits" className={cm.cn(cm.stack(5))}>
          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              'font-display tracking-tight',
              cm.textCenter,
            )}
          >
            {t(
              'pricing.nonprofits.heading',
              {},
              { defaultValue: 'Built Exclusively for Nonprofits' },
            )}
          </h2>
          <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
            {GUARANTEES.map((g) => (
              <div
                key={g.key}
                className={cm.cn(cm.stack(2), cm.sp('p', 6), 'rounded-xl bg-surface-container-low')}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-11 h-11 rounded-lg bg-primary-container text-on-primary-container',
                  )}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined text-xl">{g.icon}</span>
                </span>
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                  {t(`pricing.nonprofits.${g.key}.title`, {}, { defaultValue: g.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    `pricing.nonprofits.${g.key}.body`,
                    { appName: APP_NAME },
                    { defaultValue: g.defaultBody },
                  )}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section data-mol-id="pricing-faq" className={cm.cn(cm.stack(4))}>
          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              'font-display tracking-tight',
              cm.textCenter,
            )}
          >
            {t('pricing.faq.heading', {}, { defaultValue: 'Frequently Asked Questions' })}
          </h2>
          <div className={cm.stack(3)}>
            {FAQS.map((f) => (
              <details
                key={f.key}
                className={cm.cn(cm.sp('p', 5), 'rounded-xl border border-outline-variant/60')}
              >
                <summary
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'cursor-pointer')}
                >
                  {t(`pricing.faq.${f.key}.q`, {}, { defaultValue: f.q })}
                </summary>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 3))}>
                  {t(`pricing.faq.${f.key}.a`, { appName: APP_NAME }, { defaultValue: f.a })}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section
          data-mol-id="pricing-cta"
          className={cm.cn(
            cm.stack(3),
            cm.sp('p', 10),
            'rounded-2xl bg-primary text-on-primary text-center',
          )}
        >
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'font-display')}>
            {t(
              'pricing.cta.heading',
              {},
              { defaultValue: 'Ready to simplify your giving operations?' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'))}>
            {t(
              'pricing.cta.subheading',
              {},
              {
                defaultValue:
                  'Start free, import your donor book, and issue your first compliant receipt today.',
              },
            )}
          </p>
          <div className={cm.cn(cm.flex({ justify: 'center', gap: 'md', wrap: 'wrap' }))}>
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-lg bg-surface text-primary',
              )}
            >
              {t('pricing.cta.primary', {}, { defaultValue: 'Start Free Trial' })}
            </Link>
            <Link
              to="/about"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-lg border border-current',
              )}
            >
              {t('pricing.cta.secondary', {}, { defaultValue: 'Meet the team' })}
            </Link>
          </div>
        </section>
      </div>
    </ContentPageShell>
  )
}

const formatNum = (n: number): string => (n >= 999_999 ? '∞' : n.toLocaleString())

const read = (limits: unknown, key: string): never => {
  if (limits != null && typeof limits === 'object' && key in (limits as Record<string, unknown>)) {
    return (limits as Record<string, unknown>)[key] as never
  }
  return 0 as never
}

/** Stable i18n key fragment from a comparison row label. */
const slug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
