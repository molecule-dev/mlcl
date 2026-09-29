import { useEffect } from 'react'

import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import LandingFooter from '../components/LandingFooter.js'
import LandingTopNavBar from '../components/LandingTopNavBar.js'
import { SafeLink } from '../components/SafeLink.js'

/** The editorial tier ladder (design: Apprentice / Independent Author /
 *  Publishing Guild) — the human-facing view of the same ladder the billing
 *  page component renders from `/api/billing/tiers` below. */
const EDITORIAL_TIERS = [
  {
    id: 'apprentice',
    nameKey: 'pricing.editorial.apprentice.name',
    nameDefault: 'Apprentice',
    priceKey: 'pricing.editorial.apprentice.price',
    priceDefault: '$0',
    periodKey: 'pricing.editorial.apprentice.period',
    periodDefault: '/ forever',
    audienceKey: 'pricing.editorial.apprentice.audience',
    audienceDefault:
      'For writers drafting their first serialized essays and gathering initial readers.',
  },
  {
    id: 'independent',
    nameKey: 'pricing.editorial.independent.name',
    nameDefault: 'Independent Author',
    priceKey: 'pricing.editorial.independent.price',
    priceDefault: '$24',
    periodKey: 'pricing.editorial.independent.period',
    periodDefault: '/ month',
    audienceKey: 'pricing.editorial.independent.audience',
    audienceDefault:
      'For writers generating sustainable patronage who refuse algorithmic compromises.',
  },
  {
    id: 'guild',
    nameKey: 'pricing.editorial.guild.name',
    nameDefault: 'Publishing Guild',
    priceKey: 'pricing.editorial.guild.price',
    priceDefault: '$65',
    periodKey: 'pricing.editorial.guild.period',
    periodDefault: '/ month',
    audienceKey: 'pricing.editorial.guild.audience',
    audienceDefault:
      'For multi-author mastheads, serialized fiction houses, and editorial collectives.',
  },
]

/** Feature matrix rows (design: Comprehensive Feature Matrix). */
const MATRIX_ROWS = [
  {
    id: 'subscribers',
    featureKey: 'pricing.matrix.subscribers.feature',
    featureDefault: 'Subscriber ceiling',
    apprenticeKey: 'pricing.matrix.subscribers.apprentice',
    apprenticeDefault: '1,000',
    independentKey: 'pricing.matrix.subscribers.independent',
    independentDefault: '25,000',
    guildKey: 'pricing.matrix.subscribers.guild',
    guildDefault: '100,000+ (headroom on request)',
  },
  {
    id: 'fee',
    featureKey: 'pricing.matrix.fee.feature',
    featureDefault: 'Platform fee on reader subscriptions',
    apprenticeKey: 'pricing.matrix.fee.apprentice',
    apprenticeDefault: '0%',
    independentKey: 'pricing.matrix.fee.independent',
    independentDefault: '0% (direct settlement)',
    guildKey: 'pricing.matrix.fee.guild',
    guildDefault: '0% (direct settlement)',
  },
  {
    id: 'domain',
    featureKey: 'pricing.matrix.domain.feature',
    featureDefault: 'Custom root domain (DKIM/DMARC)',
    apprenticeKey: 'pricing.matrix.domain.apprentice',
    apprenticeDefault: 'Subdomain only',
    independentKey: 'pricing.matrix.domain.independent',
    independentDefault: 'check',
    guildKey: 'pricing.matrix.domain.guild',
    guildDefault: 'check',
  },
  {
    id: 'ip',
    featureKey: 'pricing.matrix.ip.feature',
    featureDefault: 'Dedicated delivery IP warm-up',
    apprenticeKey: 'pricing.matrix.ip.apprentice',
    apprenticeDefault: '—',
    independentKey: 'pricing.matrix.ip.independent',
    independentDefault: '99.8% inbox placement',
    guildKey: 'pricing.matrix.ip.guild',
    guildDefault: 'Isolated Tier-1 pool',
  },
  {
    id: 'markdown',
    featureKey: 'pricing.matrix.markdown.feature',
    featureDefault: 'Markdown, footnotes & typesetting',
    apprenticeKey: 'pricing.matrix.markdown.apprentice',
    apprenticeDefault: 'check',
    independentKey: 'pricing.matrix.markdown.independent',
    independentDefault: 'check',
    guildKey: 'pricing.matrix.markdown.guild',
    guildDefault: 'check',
  },
  {
    id: 'audio',
    featureKey: 'pricing.matrix.audio.feature',
    featureDefault: 'Audio essay narration & podcast RSS',
    apprenticeKey: 'pricing.matrix.audio.apprentice',
    apprenticeDefault: '—',
    independentKey: 'pricing.matrix.audio.independent',
    independentDefault: 'check',
    guildKey: 'pricing.matrix.audio.guild',
    guildDefault: 'check',
  },
  {
    id: 'portability',
    featureKey: 'pricing.matrix.portability.feature',
    featureDefault: 'Data portability (JSON / CSV / mbox)',
    apprenticeKey: 'pricing.matrix.portability.apprentice',
    apprenticeDefault: 'CSV export',
    independentKey: 'pricing.matrix.portability.independent',
    independentDefault: 'Full multi-format export',
    guildKey: 'pricing.matrix.portability.guild',
    guildDefault: 'Full multi-format export',
  },
  {
    id: 'support',
    featureKey: 'pricing.matrix.support.feature',
    featureDefault: 'Migration concierge & support SLA',
    apprenticeKey: 'pricing.matrix.support.apprentice',
    apprenticeDefault: 'Community forum',
    independentKey: 'pricing.matrix.support.independent',
    independentDefault: '24-hr email desk',
    guildKey: 'pricing.matrix.support.guild',
    guildDefault: 'White-glove 4-hr SLA + phone',
  },
]

/** The FAQ (design: Frequently Addressed Questions). */
const FAQS = [
  {
    id: 'migrate',
    qKey: 'pricing.faq.migrate.q',
    qDefault: 'Can I switch or migrate from another platform without downtime?',
    aKey: 'pricing.faq.migrate.a',
    aDefault:
      'Yes. The automated import tool ingests your complete subscriber roster, publication archives, draft revisions, and media files in minutes, and payment customer tokens transition seamlessly — your existing paying supporters won’t experience double billing or interrupted memberships.',
  },
  {
    id: 'fee',
    qKey: 'pricing.faq.fee.q',
    qDefault: 'Do you really take 0% of my paid subscriptions?',
    aKey: 'pricing.faq.fee.a',
    aDefault:
      'Really. You pay a flat software-tier fee; reader patronage settles directly into your own connected payment account. We never take a percentage of your intellectual labor.',
  },
  {
    id: 'leave',
    qKey: 'pricing.faq.leave.q',
    qDefault: 'What happens to my audience if I leave?',
    aKey: 'pricing.faq.leave.a',
    aDefault:
      'Nothing is held hostage. Export the full subscriber registry, every post as standard Markdown, and your media library in one click — the exit door is the same width as the entrance.',
  },
  {
    id: 'privacy',
    qKey: 'pricing.faq.privacy.q',
    qDefault: 'How do you measure opens without tracking readers?',
    aKey: 'pricing.faq.privacy.a',
    aDefault:
      'Open and click counts are computed from pseudonymous, per-send records — no invisible pixels, no device fingerprinting, and no cross-publication behavioral profiles. Reader privacy is architectural, not a settings toggle.',
  },
]

/**
 * Public pricing page. Renders the tier ladder declared in the API's
 * `tiers.ts` (Free / Pro / Team) with month-or-yearly variants and a
 * Stripe-Checkout-backed upgrade CTA.
 *
 * The limits object comes back from `/api/billing/tiers` typed as
 * `unknown` here — we read fields by name so this app-side page does
 * not have to import across the api/app stack boundary at compile time.
 *
 * The page is wrapped in the design's editorial economics sections: the
 * honesty statement, the savings math, the feature matrix, clarifications,
 * and the closing covenant CTA.
 *
 * @returns The rendered pricing page.
 */
export function Pricing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const pageTitle = t('pricing.pageTitle', {}, { defaultValue: `${APP_NAME} Pricing` })
  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])
  // Matrix cells hold either a plain value or a `check` marker.
  const renderCell = (value: string): string =>
    value === 'check'
      ? `✓ ${t('pricing.matrix.included', {}, { defaultValue: 'Included' })}`
      : value
  return (
    <ContentPageShell
      bare
      containerSize="xl"
      header={<LandingTopNavBar />}
      footer={<LandingFooter />}
    >
      {/* The honesty statement (design lead) */}
      <section
        data-mol-id="pricing-statement"
        className="max-w-3xl mx-auto px-6 pt-14 pb-4 text-center"
      >
        <span
          className={
            cm.textSize('xs') + ' uppercase tracking-wider text-primary font-semibold mb-3 block'
          }
        >
          {t('pricing.statementKicker', {}, { defaultValue: 'Honest Mathematical Truth' })}
        </span>
        <h2 className="font-headline text-2xl md:text-3xl text-on-background">
          {t(
            'pricing.statement',
            {},
            {
              defaultValue: 'Never pay a percentage of your intellectual labor to a venture fund.',
            },
          )}
        </h2>
        <p className={cm.cn(cm.textSize('base'), cm.sp('mt', 3), 'text-on-surface-variant')}>
          {t(
            'pricing.statementBody',
            { appName: APP_NAME },
            {
              defaultValue:
                'Infrastructure costs on {{appName}} stay flat no matter how large your readership grows. The ladder below is the same one the billing page charges against.',
            },
          )}
        </p>
      </section>

      {/* The live billing ladder (Free / Pro / Team, Stripe-Checkout backed) */}
      <PricingPage
        period="month"
        headlineFontFamily="var(--font-display)"
        headingDefault={`Choose your ${APP_NAME} plan`}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>{formatNum(read(limits, 'maxIssues'))} issues</LimitsItem>
            <LimitsItem>{formatNum(read(limits, 'maxSubscribers'))} subscribers</LimitsItem>
            <LimitsItem>
              Schedule future issues: {read(limits, 'canScheduleIssues') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>Paid tiers: {read(limits, 'paidTiers') ? '✓' : '—'}</LimitsItem>
            <LimitsItem>
              Advanced analytics: {read(limits, 'advancedAnalytics') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>Export subscriber list: {read(limits, 'canExport') ? '✓' : '—'}</LimitsItem>
          </LimitsList>
        )}
      />

      {/* Savings math (design: See how much you save vs Substack and Ghost) */}
      <section data-mol-id="pricing-savings" className="max-w-4xl mx-auto px-6 py-14 w-full">
        <h2 className="font-headline text-2xl md:text-3xl text-on-background mb-3">
          {t(
            'pricing.savings.title',
            {},
            { defaultValue: 'See how much you save vs Substack and Ghost' },
          )}
        </h2>
        <p className={cm.cn(cm.textSize('base'), cm.sp('mb', 8), 'text-on-surface-variant')}>
          {t(
            'pricing.savings.intro',
            {},
            {
              defaultValue:
                'Platforms taking 10% tax your creative output forever. The example below is a publication with 2,500 paying subscribers at $8 a month — run your own numbers and the shape never changes.',
            },
          )}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            data-mol-id="pricing-savings-gross"
            className={cm.cn(
              cm.stack(1),
              cm.sp('p', 6),
              'rounded-xl bg-surface-container-lowest border border-surface-container-highest',
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('pricing.savings.gross', {}, { defaultValue: 'Gross monthly income' })}
            </p>
            <p
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                "font-['Newsreader'] text-on-surface",
              )}
            >
              $20,000
            </p>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('pricing.savings.grossBody', {}, { defaultValue: 'From direct paid readers' })}
            </p>
          </div>
          <div
            data-mol-id="pricing-savings-tax"
            className={cm.cn(
              cm.stack(1),
              cm.sp('p', 6),
              'rounded-xl bg-surface-container-lowest border border-surface-container-highest',
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('pricing.savings.tax', {}, { defaultValue: 'A 10% platform cut' })}
            </p>
            <p
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                "font-['Newsreader'] text-error",
              )}
            >
              −$2,000/mo
            </p>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'pricing.savings.taxBody',
                {},
                { defaultValue: 'Siphoned from your earnings, forever' },
              )}
            </p>
          </div>
          <div
            data-mol-id="pricing-savings-kept"
            className={cm.cn(
              cm.stack(1),
              cm.sp('p', 6),
              'rounded-xl bg-primary-fixed border border-outline-variant/40',
            )}
          >
            <p className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest text-primary')}>
              {t(
                'pricing.savings.kept',
                { appName: APP_NAME },
                { defaultValue: `Kept on ${APP_NAME}` },
              )}
            </p>
            <p
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                "font-['Newsreader'] text-on-surface",
              )}
            >
              $19,971/mo
            </p>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'pricing.savings.keptBody',
                {},
                {
                  defaultValue:
                    'A flat $29/mo tier fee only — that is $23,652 a year back in your account',
                },
              )}
            </p>
          </div>
        </div>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 6), 'italic text-tertiary text-center')}>
          {t(
            'pricing.savings.quote',
            {},
            {
              defaultValue:
                '“A writer’s revenue belongs to the writer. We are an infrastructure tool, not your business partner.”',
            },
          )}
        </p>
      </section>

      {/* Feature matrix (design: Comprehensive Feature Matrix) */}
      <section data-mol-id="pricing-matrix" className="max-w-4xl mx-auto px-6 pb-14 w-full">
        <h2 className="font-headline text-2xl md:text-3xl text-on-background mb-3">
          {t('pricing.matrix.title', {}, { defaultValue: 'Comprehensive Feature Matrix' })}
        </h2>
        <p className={cm.cn(cm.textSize('base'), cm.sp('mb', 8), 'text-on-surface-variant')}>
          {t(
            'pricing.matrix.intro',
            { appName: APP_NAME },
            {
              defaultValue:
                'Every plan includes high-fidelity typography and absolute data sovereignty.',
            },
          )}
        </p>
        <div className="overflow-x-auto rounded-lg border border-surface-container-highest bg-surface-container-lowest">
          <table className={cm.cn('w-full text-left', cm.textSize('sm'))}>
            <thead>
              <tr className="text-on-surface-variant border-b border-surface-container-highest">
                <th scope="col" className="px-5 py-4 font-medium">
                  {t('pricing.matrix.capability', {}, { defaultValue: 'Core capability' })}
                </th>
                {EDITORIAL_TIERS.map((tier) => (
                  <th key={tier.id} scope="col" className="px-5 py-4 font-medium text-on-surface">
                    {t(tier.nameKey, {}, { defaultValue: tier.nameDefault })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX_ROWS.map((row) => (
                <tr
                  key={row.id}
                  data-mol-id={`pricing-matrix-${row.id}`}
                  className="border-t border-surface-container-highest align-top"
                >
                  <th scope="row" className="px-5 py-4 font-medium text-on-surface">
                    {t(row.featureKey, {}, { defaultValue: row.featureDefault })}
                  </th>
                  <td className="px-5 py-4 text-on-surface-variant">
                    {renderCell(t(row.apprenticeKey, {}, { defaultValue: row.apprenticeDefault }))}
                  </td>
                  <td className="px-5 py-4 text-on-surface">
                    {renderCell(
                      t(row.independentKey, {}, { defaultValue: row.independentDefault }),
                    )}
                  </td>
                  <td className="px-5 py-4 text-on-surface">
                    {renderCell(t(row.guildKey, {}, { defaultValue: row.guildDefault }))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'sm:grid-cols-3', cm.sp('mt', 8))}>
          {EDITORIAL_TIERS.map((tier) => (
            <li
              key={tier.id}
              data-mol-id={`pricing-editorial-${tier.id}`}
              className={cm.cn(
                cm.stack(1),
                cm.sp('p', 5),
                'rounded-xl bg-surface-container-lowest border border-surface-container-highest',
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3
                  className={cm.cn(
                    cm.textSize('base'),
                    cm.fontWeight('semibold'),
                    'text-on-surface',
                  )}
                >
                  {t(tier.nameKey, {}, { defaultValue: tier.nameDefault })}
                </h3>
                <p>
                  <span
                    className={cm.cn(
                      cm.textSize('lg'),
                      cm.fontWeight('bold'),
                      "font-['Newsreader'] text-on-surface",
                    )}
                  >
                    {t(tier.priceKey, {}, { defaultValue: tier.priceDefault })}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {' '}
                    {t(tier.periodKey, {}, { defaultValue: tier.periodDefault })}
                  </span>
                </p>
              </div>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(tier.audienceKey, {}, { defaultValue: tier.audienceDefault })}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Clarifications (design: Frequently Addressed Questions) */}
      <section data-mol-id="pricing-faq" className="max-w-3xl mx-auto px-6 pb-14 w-full">
        <h2 className="font-headline text-2xl md:text-3xl text-on-background mb-8">
          {t('pricing.faq.title', {}, { defaultValue: 'Frequently Addressed Questions' })}
        </h2>
        <div className={cm.stack(6)}>
          {FAQS.map((faq) => (
            <div key={faq.id} data-mol-id={`pricing-faq-${faq.id}`} className={cm.stack(2)}>
              <h3
                className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'text-on-surface')}
              >
                {t(faq.qKey, {}, { defaultValue: faq.qDefault })}
              </h3>
              <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                {t(faq.aKey, {}, { defaultValue: faq.aDefault })}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing covenant CTA (design: Ready to own your audience…) */}
      <section
        data-mol-id="pricing-cta"
        className="max-w-3xl mx-auto px-6 pb-20 w-full text-center"
      >
        <div
          className={cm.cn(
            cm.sp('p', 8),
            'rounded-xl bg-surface-container-lowest border border-surface-container-highest',
          )}
        >
          <h2 className="font-headline text-2xl text-on-background mb-3">
            {t(
              'pricing.cta.title',
              {},
              { defaultValue: 'Ready to own your audience with quiet confidence?' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('base'), cm.sp('mb', 6), 'text-on-surface-variant')}>
            {t(
              'pricing.cta.body',
              {},
              {
                defaultValue:
                  'Start free on the Apprentice tier and upgrade when your patronage arrives — your pricing never changes underneath you.',
              },
            )}
          </p>
          <SafeLink
            data-mol-id="pricing-cta-button"
            to="/signup"
            className={cm.cn(
              'inline-flex items-center gap-2 rounded-full bg-primary text-on-primary px-6 py-3',
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
            )}
          >
            {t('pricing.cta.button', {}, { defaultValue: 'Start Writing Free' })}
          </SafeLink>
        </div>
      </section>
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
