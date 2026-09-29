import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Link } from 'react-router'

import { APP_NAME } from '../branding.js'

/**
 * Public pricing page. Renders the tier ladder declared in the API's
 * `tiers.ts` (Free / Pro / Team) with month-or-yearly variants and a
 * Stripe-Checkout-backed upgrade CTA, followed by the design's seat-tax
 * explainer, a plain-language tier guide, the FAQ, and the closing CTA.
 *
 * The limits object comes back from `/api/billing/tiers` typed as
 * `unknown` here — we read fields by name so this app-side page does
 * not have to import across the api/app stack boundary at compile time.
 *
 * @returns The rendered pricing page.
 */
export function Pricing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const heading = t(
    'pricing.headingTemplate',
    { appName: APP_NAME },
    { defaultValue: `Choose your ${APP_NAME} plan` },
  )
  const h2 = cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tracking-tight')
  const h3 = cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))
  const body = cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'leading-relaxed')

  const tierGuide = [
    {
      key: 'pricing.tierGuide.trade.title',
      def: 'Subcontractor / Trade Tier',
      mapKey: 'pricing.tierGuide.trade.map',
      mapDef: 'Free — forever, for every trade partner',
      bodyKey: 'pricing.tierGuide.trade.body',
      bodyDef:
        'Trade subcontractors get full access to the sheets, logs, punch items, and RFI threads of the jobsites they are invited to. No seat fee, no card, no expiry.',
    },
    {
      key: 'pricing.tierGuide.trailer.title',
      def: 'Job Trailer Pro',
      mapKey: 'pricing.tierGuide.trailer.map',
      mapDef: 'Pro — one active jobsite run properly',
      bodyKey: 'pricing.tierGuide.trailer.body',
      bodyDef:
        'For a single active jobsite: the full field workflow — daily logs, punch, RFIs, and the subcontractor directory — with photo documentation and extended log retention.',
    },
    {
      key: 'pricing.tierGuide.gc.title',
      def: 'GC Enterprise',
      mapKey: 'pricing.tierGuide.gc.map',
      mapDef: 'Team — the whole portfolio',
      bodyKey: 'pricing.tierGuide.gc.body',
      bodyDef:
        'For general contractors running several jobsites: every project in one place, unlimited trade seats across all of them, advanced RFI-aging and cost reports, and the longest retention window.',
    },
  ]

  const faqs = [
    {
      qKey: 'pricing.faq.seats.q',
      qDef: 'Are trade subcontractor seats really free?',
      aKey: 'pricing.faq.seats.a',
      aDef: 'Yes. You pay for the platform, not per person. Invite every sub, inspector, and architect on the job — the invoice never moves because of it.',
    },
    {
      qKey: 'pricing.faq.changes.q',
      qDef: 'What happens to my projects if I change plans?',
      aKey: 'pricing.faq.changes.a',
      aDef: 'Nothing is lost. Plan changes apply immediately to limits going forward; existing projects, logs, punch items, and RFI threads stay exactly as they are.',
    },
    {
      qKey: 'pricing.faq.billing.q',
      qDef: 'How is billing calculated?',
      aKey: 'pricing.faq.billing.a',
      aDef: 'In integer cents on a master subscription per account, with an itemized invoice per jobsite and period — no per-seat math to audit.',
    },
  ]

  return (
    <ContentPageShell bare containerSize="xl">
      <div className="space-y-16">
        <PricingPage
          period="month"
          headlineFontFamily="var(--font-headline)"
          headingDefault={heading}
          renderLimits={(limits) => (
            <LimitsList>
              <LimitsItem>
                {t(
                  'pricing.projectsCount',
                  { count: formatNum(read(limits, 'maxProjects')) },
                  { defaultValue: '{{count}} projects' },
                )}
              </LimitsItem>
              <LimitsItem>
                {t(
                  'pricing.rfisCount',
                  { count: formatNum(read(limits, 'maxRfis')) },
                  { defaultValue: '{{count}} RFIs' },
                )}
              </LimitsItem>
              <LimitsItem>
                {t(
                  'pricing.punchCount',
                  { count: formatNum(read(limits, 'maxPunchItems')) },
                  { defaultValue: '{{count}} punch-list items' },
                )}
              </LimitsItem>
              <LimitsItem>
                {t(
                  'pricing.subsCount',
                  { count: formatNum(read(limits, 'maxSubcontractors')) },
                  { defaultValue: '{{count}} subcontractors' },
                )}
              </LimitsItem>
              <LimitsItem>
                {t(
                  'pricing.photoDocumentation',
                  { value: read(limits, 'photoDocumentation') ? '✓' : '—' },
                  { defaultValue: 'Punch-list photos: {{value}}' },
                )}
              </LimitsItem>
              <LimitsItem>
                {t(
                  'pricing.advancedReports',
                  { value: read(limits, 'advancedReports') ? '✓' : '—' },
                  { defaultValue: 'RFI aging + cost reports: {{value}}' },
                )}
              </LimitsItem>
              <LimitsItem>
                {t(
                  'pricing.logRetention',
                  { days: formatNum(read(limits, 'dailyLogRetentionDays')) },
                  { defaultValue: '{{days}}-day daily-log retention' },
                )}
              </LimitsItem>
            </LimitsList>
          )}
        />

        {/* Seat-tax explainer */}
        <section
          data-mol-id="pricing-seat-tax"
          className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'lg:grid-cols-2 items-start')}
        >
          <div className="space-y-4">
            <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'tracking-tight')}>
              {t(
                'pricing.seatTax.headline',
                {},
                { defaultValue: 'Predictable software costs. Zero seat tax on trade subs.' },
              )}
            </p>
            <h2 className={h2}>
              {t(
                'pricing.seatTax.title',
                {},
                { defaultValue: 'Why Groundwork eliminates the legacy software seat tax' },
              )}
            </h2>
            <p className={body}>
              {t(
                'pricing.seatTax.p1',
                {},
                {
                  defaultValue:
                    'Legacy construction software penalizes general contractors for collaborating with trades. A drawing set is only useful when everyone on the deck can read it — so per-seat pricing does not just cost money, it costs scope-of-work accuracy. Every plan here includes unlimited trade subcontractor access.',
                },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-4')}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('pricing.seatTax.compare', {}, { defaultValue: 'The difference at a glance' })}
            </p>
            <div className={cm.flex({ justify: 'between', gap: 'md' })}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {t('pricing.seatTax.us', {}, { defaultValue: 'Trade subcontractor seats' })}
              </span>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-tertiary')}>
                {t('pricing.seatTax.usValue', {}, { defaultValue: 'Unlimited on every plan' })}
              </span>
            </div>
            <div className={cm.flex({ justify: 'between', gap: 'md' })}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {t('pricing.seatTax.legacy', {}, { defaultValue: 'Legacy per-seat SaaS' })}
              </span>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-error')}>
                {t('pricing.seatTax.legacyValue', {}, { defaultValue: '$100+ per sub, per month' })}
              </span>
            </div>
            <p className={body}>
              {t(
                'pricing.seatTax.note',
                {},
                {
                  defaultValue:
                    'A super should never choose between the budget and the pipefitting foreman seeing the current revision.',
                },
              )}
            </p>
          </div>
        </section>

        {/* Tier guide */}
        <section data-mol-id="pricing-tier-guide" className="space-y-6">
          <h2 className={h2}>
            {t('pricing.tierGuide.title', {}, { defaultValue: 'Which tier fits your crew' })}
          </h2>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-3')}>
            {tierGuide.map((tier) => (
              <div key={tier.key} className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-2')}>
                <h3 className={h3}>{t(tier.key, {}, { defaultValue: tier.def })}</h3>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'text-primary uppercase tracking-wider',
                  )}
                >
                  {t(tier.mapKey, {}, { defaultValue: tier.mapDef })}
                </p>
                <p className={body}>{t(tier.bodyKey, {}, { defaultValue: tier.bodyDef })}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section data-mol-id="pricing-faq" className="space-y-6">
          <h2 className={h2}>
            {t('pricing.faq.title', {}, { defaultValue: 'Clear answers. No fine print.' })}
          </h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.qKey} className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-1')}>
                <h3 className={h3}>{t(faq.qKey, {}, { defaultValue: faq.qDef })}</h3>
                <p className={body}>{t(faq.aKey, {}, { defaultValue: faq.aDef })}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section
          data-mol-id="pricing-cta"
          className={cm.cn(
            cm.sp('p', 8),
            'rounded-2xl text-center brand-gradient text-on-primary space-y-3',
          )}
        >
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t(
              'pricing.cta.title',
              {},
              { defaultValue: 'Ready to cut trailer paperwork and eliminate seat taxes?' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'max-w-2xl mx-auto')}>
            {t(
              'pricing.cta.body',
              {},
              {
                defaultValue:
                  'Create a free account and start a project in minutes — unlimited trade seats included on every plan.',
              },
            )}
          </p>
          <Link
            to="/signup"
            data-mol-id="pricing-cta-start"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'inline-flex items-center gap-2 rounded-lg bg-surface text-on-surface hover:bg-surface-container transition-colors',
            )}
          >
            {t('pricing.cta.start', {}, { defaultValue: 'Start free' })}
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}
            >
              arrow_forward
            </span>
          </Link>
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

export default Pricing
