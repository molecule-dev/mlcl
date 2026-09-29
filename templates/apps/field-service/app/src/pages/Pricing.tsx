import { useState } from 'react'
import { Link } from 'react-router'

import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

/** One sizing tier of the fleet calculator. */
interface SizingTier {
  key: string
  name: string
  blurb: string
  price: number
  includedTrucks: number
  extraTruck: number
  features: { key: string; def: string }[]
  cta: string
  dataMolId: string
  highlight?: boolean
}

const SOLO: SizingTier = {
  key: 'solo',
  name: 'Solo Operator',
  blurb: 'For master tradesmen running their own rig without office overhead.',
  price: 49,
  includedTrucks: 1,
  extraTruck: 0,
  features: [
    { key: 'pricing.solo.f1', def: 'Unlimited quotes, work orders & invoices' },
    { key: 'pricing.solo.f2', def: 'Tap-to-Pay & ACH direct deposit (1.9% flat rate)' },
    { key: 'pricing.solo.f3', def: 'Customer SMS signatures & digital instant approvals' },
    { key: 'pricing.solo.f4', def: 'Built-in trade price books (copper, refrigerant, fittings)' },
    { key: 'pricing.solo.f5', def: 'QuickBooks 2-way automatic ledger sync' },
  ],
  cta: 'Start 14-Day Solo Trial',
  dataMolId: 'pricing-plan-solo',
}

const CREW: SizingTier = {
  key: 'crew',
  name: 'Crew & Dispatch',
  blurb: 'The core engine for dispatchers and multi-tech service teams.',
  price: 129,
  includedTrucks: 5,
  extraTruck: 20,
  features: [
    { key: 'pricing.crew.f1', def: 'Real-time GPS fleet dispatch board & route planner' },
    { key: 'pricing.crew.f2', def: 'Field photo checklists & wiring proof (liability shield)' },
    { key: 'pricing.crew.f3', def: 'Role-based tech permissions & GPS clock-in hours tracker' },
    { key: 'pricing.crew.f4', def: 'Automated customer “On-my-way” SMS with live truck tracking' },
    { key: 'pricing.crew.f5', def: 'Direct 24/7 priority phone dispatch support' },
  ],
  cta: 'Start 14-Day Crew Trial',
  dataMolId: 'pricing-plan-crew',
  highlight: true,
}

const COMMERCIAL: SizingTier = {
  key: 'commercial',
  name: 'Commercial & Multi-Shop',
  blurb: 'For high-volume mechanical, commercial PM, and multi-location operations.',
  price: 299,
  includedTrucks: 15,
  extraTruck: 15,
  features: [
    { key: 'pricing.commercial.f1', def: 'Multi-warehouse & truck inventory stock replenishing' },
    { key: 'pricing.commercial.f2', def: 'Progress billing & AIA-style commercial contract draws' },
    {
      key: 'pricing.commercial.f3',
      def: 'Custom parts markup formulas & flat-rate catalog builder',
    },
    {
      key: 'pricing.commercial.f4',
      def: 'Dedicated shop onboarding specialist & free 1-on-1 migration',
    },
    { key: 'pricing.commercial.f5', def: 'Custom webhooks & enterprise ERP automated exports' },
  ],
  cta: 'Schedule Shop Demo & Trial',
  dataMolId: 'pricing-plan-commercial',
}

const TIERS = [SOLO, CREW, COMMERCIAL]

/** Estimate the monthly cost for a truck count against one sizing tier. */
function tierCost(tier: SizingTier, trucks: number): number {
  const extra = Math.max(0, trucks - tier.includedTrucks)
  return tier.price + extra * tier.extraTruck
}

/** The cheapest tier that still fits the fleet (never shrinks features). */
function matchTier(trucks: number): SizingTier {
  if (trucks <= SOLO.includedTrucks) return SOLO
  if (trucks <= CREW.includedTrucks) return CREW
  return COMMERCIAL
}

const BLOATWARE_ROWS: { feature: string; toolbelt: string; legacy: string }[] = [
  {
    feature: 'Setup & onboarding fees',
    toolbelt: '$0 — self-serve or free guided onboarding',
    legacy: '$3,000–$5,500 mandatory onboarding fee',
  },
  {
    feature: 'Contract lock-in',
    toolbelt: 'Zero contracts. Month-to-month. Cancel anytime.',
    legacy: '12–36 month rigid binding contract',
  },
  {
    feature: 'Extra technician surcharge',
    toolbelt: '$15–$20 / month flat per truck',
    legacy: '$99–$189 / month per additional technician',
  },
  {
    feature: 'Payment processing margin',
    toolbelt: '1.9% flat rate — tap-to-pay on the phone, next-day ACH',
    legacy: '2.9% + 30¢ + non-qualified card surcharge penalties',
  },
  {
    feature: 'Go-live rollout speed',
    toolbelt: '10 minutes — import your customer CSV and run jobs',
    legacy: '6–12 weeks with a mandatory implementation consultant',
  },
  {
    feature: 'Offline truck caching',
    toolbelt: 'Full offline mode — works in sub-basements & dead zones',
    legacy: 'Fragile sync; drops work order data when signal fades',
  },
]

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Can I migrate my customer history and price book from my old software?',
    a: 'Yes. Free white-glove migration covers your customer rosters, historical job records, and standard price books from ServiceTitan, Housecall Pro, Jobber, FieldEdge, or plain Excel spreadsheets. You never retype anything.',
  },
  {
    q: 'What happens if my tech is in a basement with zero cell reception?',
    a: 'The technician app keeps working offline: open work orders, log equipment serial numbers, add line items, capture photos, and collect customer signatures with no signal. The moment the phone sees cellular or shop Wi-Fi, everything syncs cleanly in the background.',
  },
  {
    q: 'Are there any per-quote or per-invoice fees?',
    a: 'Never. Issue 5 quotes a month or 5,000 — there are zero invoice count caps, zero estimate throttles, and zero surcharges on document volume.',
  },
  {
    q: 'Can I change my truck count up or down mid-season?',
    a: 'Yes. Trade businesses are seasonal. Add or remove truck licenses with one click in your shop settings and your billing adjusts immediately, pro-rated daily.',
  },
]

const PAYMENT_TILES: { stat: string; label: string; body: string }[] = [
  {
    stat: '1.9% Flat',
    label: 'Direct tap-to-pay',
    body: 'Customers tap their card against the tech’s phone — no dongles, no hardware to buy.',
  },
  {
    stat: '7:00 AM',
    label: 'Next-day ACH deposits',
    body: 'Collected jobs settle straight into your shop’s bank account early the next morning.',
  },
  {
    stat: '$0 Batch',
    label: 'Zero transfer fees',
    body: 'No end-of-month batch fees, statement fees, or statement surcharges. Ever.',
  },
]

/**
 * Public pricing page.
 *
 * @returns The rendered pricing page.
 */
export function Pricing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [trucks, setTrucks] = useState(5)
  const matched = matchTier(trucks)
  const estimate = tierCost(matched, trucks)

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
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {formatNum(read(limits, 'maxCustomers'))}{' '}
              {t('customers.title', {}, { defaultValue: 'customers' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxQuotes'))}{' '}
              {t('quotes.title', {}, { defaultValue: 'quotes' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxJobs'))} {t('jobs.title', {}, { defaultValue: 'jobs' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxTechnicians'))}{' '}
              {t('technicians.title', {}, { defaultValue: 'technicians' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxInvoices'))}{' '}
              {t('invoices.title', {}, { defaultValue: 'invoices' })}
            </LimitsItem>
            <LimitsItem>
              {t('common.advancedFeatures', {}, { defaultValue: 'Advanced features' })}:{' '}
              {read(limits, 'advancedFeatures') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>
              {t('common.dataExport', {}, { defaultValue: 'Data export' })}:{' '}
              {read(limits, 'canExport') ? '✓' : '—'}
            </LimitsItem>
          </LimitsList>
        )}
      />

      <section
        data-mol-id="pricing-straightforward"
        className={cm.cn(cm.stack(3), cm.sp('mt', 12))}
      >
        <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'font-display')}>
          {t(
            'pricing.straightforward',
            {},
            { defaultValue: 'Straightforward pricing. Pay for itself on your first call.' },
          )}
        </h2>
        <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'pricing.straightforwardBody',
            {},
            {
              defaultValue:
                'No contracts. No per-seat extortion. No onboarding fees. Every plan includes the full quote-to-cash workflow, offline mobile sync, and direct phone dispatch support.',
            },
          )}
        </p>
      </section>

      <section data-mol-id="pricing-calculator" className={cm.cn(cm.stack(5), cm.sp('mt', 12))}>
        <div className={cm.stack(2)}>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('pricing.calculator.heading', {}, { defaultValue: 'Fleet Sizing Calculator' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'pricing.calculator.blurb',
              {},
              {
                defaultValue:
                  'Drag to preview monthly shop software cost based on your actual truck roster.',
              },
            )}
          </p>
        </div>

        <div className={cm.cn(cm.card(), cm.sp('p', 6), cm.stack(4))}>
          <div
            className={cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' })}
          >
            <label
              htmlFor="fleet-size-range"
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
            >
              {t('pricing.calculator.truckCount', {}, { defaultValue: 'Truck count' })}
            </label>
            <output
              htmlFor="fleet-size-range"
              className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'font-mono')}
            >
              {t(
                'pricing.calculator.trucksValue',
                { count: trucks },
                { defaultValue: '{{count}} trucks' },
              )}
            </output>
          </div>
          <input
            id="fleet-size-range"
            type="range"
            min={1}
            max={30}
            step={1}
            value={trucks}
            onChange={(e) => setTrucks(Number(e.target.value))}
            className={cm.cn('w-full accent-primary')}
          />
          <div
            className={cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' })}
          >
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('pricing.calculator.range', {}, { defaultValue: 'Range: 1 to 30 trucks' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('pricing.calculator.tierMatch', {}, { defaultValue: 'Tier match' })}:{' '}
              <strong className={cm.fontWeight('semibold')}>{matched.name}</strong>
            </p>
          </div>
          <p
            className={cm.cn(
              cm.sp('py', 3),
              cm.sp('px', 4),
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              'font-mono bg-primary-container text-on-primary-container rounded-md',
            )}
          >
            {t(
              'pricing.calculator.estimate',
              { amount: estimate.toLocaleString('en-US') },
              { defaultValue: '${{amount}}/mo estimated total' },
            )}
          </p>
        </div>

        <div className={cm.grid({ cols: 3, gap: 'md' })}>
          {TIERS.map((tier) => (
            <SizingCard key={tier.key} tier={tier} trucks={trucks} />
          ))}
        </div>
      </section>

      <section data-mol-id="pricing-bloatware" className={cm.cn(cm.stack(4), cm.sp('mt', 12))}>
        <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'font-display')}>
          {t('pricing.bloatware.heading', {}, { defaultValue: 'The True Cost of Bloatware' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'pricing.bloatware.blurb',
            {},
            {
              defaultValue:
                'Legacy software traps trade contractors with setup fees, lengthy lock-ins, and tech tax. Compare the math.',
            },
          )}
        </p>
        <div className={cm.cn(cm.card(), 'overflow-x-auto')}>
          <table className={'w-full text-left text-sm'}>
            <caption className="sr-only">
              {t(
                'pricing.bloatware.caption',
                {},
                { defaultValue: 'Toolbelt compared with legacy field service software' },
              )}
            </caption>
            <thead>
              <tr className={'border-b border-outline-variant'}>
                <th
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'text-on-surface-variant uppercase tracking-wider',
                  )}
                >
                  {t('pricing.bloatware.col.feature', {}, { defaultValue: 'Feature / Terms' })}
                </th>
                <Th>{t('pricing.bloatware.col.toolbelt', {}, { defaultValue: 'Toolbelt' })}</Th>
                <Th>
                  {t('pricing.bloatware.col.legacy', {}, { defaultValue: 'Legacy software' })}
                </Th>
              </tr>
            </thead>
            <tbody>
              {BLOATWARE_ROWS.map((row) => (
                <tr key={row.feature} className={'border-b border-outline-variant last:border-b-0'}>
                  <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 3), cm.fontWeight('medium'))}>
                    {row.feature}
                  </td>
                  <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 3), 'text-success')}>
                    {row.toolbelt}
                  </td>
                  <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 3), 'text-on-surface-variant')}>
                    {row.legacy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section data-mol-id="pricing-payments" className={cm.cn(cm.stack(4), cm.sp('mt', 12))}>
        <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'font-display')}>
          {t(
            'pricing.payments.heading',
            {},
            { defaultValue: 'How payments work: We don’t skim your hard-earned margins.' },
          )}
        </h2>
        <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'pricing.payments.body',
            {},
            {
              defaultValue:
                'When you complete an $8,000 heat pump install or an emergency $450 drain snake, that money is yours. Card payments clear through the Stripe infrastructure directly into your business checking account — no middleman markups, no platform skim on top.',
            },
          )}
        </p>
        <div className={cm.grid({ cols: 3, gap: 'md' })}>
          {PAYMENT_TILES.map((tile) => (
            <div key={tile.label} className={cm.cn(cm.card(), cm.sp('p', 5), cm.stack(2))}>
              <p className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'font-mono')}>
                {tile.stat}
              </p>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{tile.label}</p>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{tile.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section data-mol-id="pricing-faq" className={cm.cn(cm.stack(4), cm.sp('mt', 12))}>
        <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'font-display')}>
          {t('pricing.faq.heading', {}, { defaultValue: 'Frequently Asked Questions' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'pricing.faq.blurb',
            {},
            { defaultValue: 'Straight answers for trade business operators. No legal jargon.' },
          )}
        </p>
        <div className={cm.stack(2)}>
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.q}
              className={cm.cn(
                cm.card(),
                cm.sp('px', 5),
                cm.sp('py', 3),
                'group open:border-primary',
              )}
            >
              <summary
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'cursor-pointer py-1 list-none [&::-webkit-details-marker]:hidden',
                )}
              >
                {item.q}
              </summary>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('pt', 2), 'text-on-surface-variant')}>
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section
        data-mol-id="pricing-monday-cta"
        className={cm.cn(
          cm.stack(3),
          cm.sp('mt', 12),
          cm.sp('p', 8),
          'bg-primary-container text-on-primary-container rounded-lg text-center',
        )}
      >
        <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'font-display')}>
          {t(
            'pricing.cta.heading',
            {},
            { defaultValue: 'Get your crew on the same page by Monday morning.' },
          )}
        </h2>
        <p className={cm.cn(cm.prose, 'mx-auto max-w-2xl')}>
          {t(
            'pricing.cta.body',
            {},
            {
              defaultValue:
                'No credit card required upfront. No high-pressure salespeople. Spin up your shop account now and test-drive live dispatch with your actual techs.',
            },
          )}
        </p>
        <div className={cm.flex({ justify: 'center', gap: 'sm', wrap: 'wrap' })}>
          <Link
            to="/signup"
            data-mol-id="pricing-cta-signup"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-md',
            )}
          >
            <span
              className="material-symbols-outlined text-base align-middle mr-1"
              aria-hidden="true"
            >
              bolt
            </span>
            {t('pricing.cta.signup', {}, { defaultValue: 'Start 14-Day Free Trial' })}
          </Link>
        </div>
      </section>
    </ContentPageShell>
  )
}

function SizingCard({ tier, trucks }: { tier: SizingTier; trucks: number }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <article
      data-mol-id={tier.dataMolId}
      className={cm.cn(
        cm.card(),
        cm.sp('p', 6),
        cm.stack(3),
        tier.highlight ? 'border-primary border-2' : '',
      )}
    >
      <div className={cm.stack(1)}>
        {tier.highlight ? (
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t(
              'pricing.calculator.mostPopular',
              {},
              { defaultValue: 'Most popular for growing shops' },
            )}
          </p>
        ) : null}
        <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'font-display')}>
          {tier.name}
        </h3>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{tier.blurb}</p>
      </div>
      <p>
        <span className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'font-mono')}>
          ${tier.price}
        </span>{' '}
        <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('pricing.calculator.perMonth', {}, { defaultValue: '/ month' })}
        </span>
      </p>
      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
        {t(
          'pricing.calculator.includes',
          { count: tier.includedTrucks, extra: tier.extraTruck },
          { defaultValue: 'Includes {{count}} trucks. Extra trucks +${{extra}}/mo each.' },
        )}
      </p>
      <ul className={cm.stack(2)}>
        {tier.features.map((f) => (
          <li key={f.key} className={cm.flex({ align: 'start', gap: 'sm' })}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.roundedFull,
                'h-5 w-5 shrink-0 bg-success-container text-on-success-container mt-0.5',
              )}
            >
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                check_circle
              </span>
            </span>
            <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(f.key, {}, { defaultValue: f.def })}
            </span>
          </li>
        ))}
      </ul>
      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant font-mono')}>
        {t(
          'pricing.calculator.estimateForTier',
          { amount: tierCost(tier, trucks).toLocaleString('en-US') },
          { defaultValue: '${{amount}}/mo at your current fleet size' },
        )}
      </p>
      <Link
        to="/signup"
        data-mol-id={`${tier.dataMolId}-cta`}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 2),
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          'rounded-md text-center',
          tier.highlight
            ? 'bg-primary text-on-primary'
            : 'border border-outline-variant hover:bg-surface-container',
        )}
      >
        {tier.cta}
      </Link>
    </article>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <th
      className={cm.cn(
        cm.sp('px', 5),
        cm.sp('py', 3),
        cm.textSize('xs'),
        cm.fontWeight('semibold'),
        'text-on-surface-variant uppercase tracking-wider',
      )}
    >
      {children}
    </th>
  )
}

const formatNum = (n: number): string => (n >= 999_999 ? '∞' : n.toLocaleString())

const read = (limits: unknown, key: string): never => {
  if (limits != null && typeof limits === 'object' && key in (limits as Record<string, unknown>)) {
    return (limits as Record<string, unknown>)[key] as never
  }
  return 0 as never
}

export default Pricing
