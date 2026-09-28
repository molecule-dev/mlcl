import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { KpiStatCard } from '../components/KpiStatCard.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingTopNavBar } from '../components/LandingTopNavBar.js'
import { NpsDistributionBar } from '../components/NpsDistributionBar.js'
import { ResponsesHeroCard } from '../components/ResponsesHeroCard.js'

const SAMPLE_NPS_COUNTS = [2, 1, 1, 3, 5, 8, 12, 18, 24, 32, 40]

// Mirrors api/src/tiers.ts (getPricingTiers + FREE/PRO/TEAM_LIMITS) exactly —
// keep prices + limits in sync with the API so Landing and /settings agree.
interface PricingPlan {
  key: string
  nameKey: string
  name: string
  price: string
  yearlyKey?: string
  yearly?: string
  featureKeys: Array<{ key: string; text: string }>
  ctaKey: string
  cta: string
  highlighted: boolean
}

const PRICING_PLANS: PricingPlan[] = [
  {
    key: 'free',
    nameKey: 'landing.pricing.free.name',
    name: 'Free',
    price: '$0',
    featureKeys: [
      { key: 'landing.pricing.free.f1', text: 'Up to 5 surveys' },
      { key: 'landing.pricing.free.f2', text: '5 questions & 5 responses per survey' },
      { key: 'landing.pricing.free.f3', text: '90-day response retention' },
    ],
    ctaKey: 'landing.pricing.free.cta',
    cta: 'Start free',
    highlighted: false,
  },
  {
    key: 'pro',
    nameKey: 'landing.pricing.pro.name',
    name: 'Pro',
    price: '$15',
    yearlyKey: 'landing.pricing.pro.yearly',
    yearly: 'or $150/yr',
    featureKeys: [
      { key: 'landing.pricing.pro.f1', text: 'Up to 500 surveys' },
      { key: 'landing.pricing.pro.f2', text: '500 questions & 500 responses per survey' },
      { key: 'landing.pricing.pro.f3', text: 'CSV export & advanced analytics' },
      { key: 'landing.pricing.pro.f4', text: '1-year response retention' },
    ],
    ctaKey: 'landing.pricing.pro.cta',
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    key: 'team',
    nameKey: 'landing.pricing.team.name',
    name: 'Team',
    price: '$49',
    yearlyKey: 'landing.pricing.team.yearly',
    yearly: 'or $490/yr',
    featureKeys: [
      { key: 'landing.pricing.team.f1', text: 'Unlimited surveys, questions & responses' },
      { key: 'landing.pricing.team.f2', text: 'CSV export & advanced analytics' },
      { key: 'landing.pricing.team.f3', text: 'Unlimited response retention' },
    ],
    ctaKey: 'landing.pricing.team.cta',
    cta: 'Start free trial',
    highlighted: false,
  },
]

/** Splits the headline so the last word gets the design's gradient treatment
 * ("Every voice," + "amplified."). Works for any locale's translation. */
function splitHeadlineAccent(title: string): { lead: string; accent: string } {
  // Prefer the full trailing phrase after the last comma ("Every second," +
  // "accounted for."); fall back to the final word.
  const comma = title.lastIndexOf(',')
  if (comma >= 0 && comma < title.length - 1) {
    return { lead: title.slice(0, comma + 1), accent: title.slice(comma + 1).trim() }
  }
  const idx = title.lastIndexOf(' ')
  if (idx <= 0) return { lead: title, accent: '' }
  return { lead: title.slice(0, idx), accent: title.slice(idx + 1) }
}

/**
 * The design's "Eloquent Void" hero mockup — a single conversational survey
 * question card (progress whisper, question, asymmetric options, controls).
 * Purely decorative: role="img" so screen readers get one label, not a fake
 * form.
 */
function SurveyCardMockup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const options = [
    {
      key: 'o1',
      label: t('landing.mockup.option1', {}, { defaultValue: 'It’s incredibly intuitive' }),
      selected: false,
    },
    {
      key: 'o2',
      label: t('landing.mockup.option2', {}, { defaultValue: 'Powerful, but needs learning' }),
      selected: true,
    },
    {
      key: 'o3',
      label: t('landing.mockup.option3', {}, { defaultValue: 'A bit overwhelming' }),
      selected: false,
    },
  ]
  return (
    <div
      role="img"
      aria-label={t(
        'landing.mockup.label',
        {},
        { defaultValue: 'Preview of a conversational survey question' },
      )}
      data-testid="landing-mockup"
      className={cm.cn(
        'ambient-shadow relative w-full max-w-md rounded-[24px] bg-surface-container-lowest/90 p-8 backdrop-blur-md',
      )}
    >
      {/* Progress whisper */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 overflow-hidden rounded-t-[24px] bg-surface-container-high"
      >
        <div className="h-full w-1/3 bg-tertiary" />
      </div>
      <div className="space-y-6 pt-4">
        <div className="space-y-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
            {t('landing.mockup.progress', {}, { defaultValue: 'Question 2 of 6' })}
          </span>
          <h3 className="text-2xl font-semibold leading-tight tracking-tight text-on-surface">
            {t(
              'landing.mockup.question',
              {},
              { defaultValue: 'How would you describe the feeling of using our product?' },
            )}
          </h3>
        </div>
        {/* Options — the selected middle row carries the ghost border */}
        <div className="space-y-3 pl-4">
          {options.map((option) => (
            <div
              key={option.key}
              className={cm.cn(
                'flex items-center rounded-xl p-4',
                option.selected
                  ? 'border-2 border-primary/25 bg-surface-container-lowest'
                  : 'bg-surface-container-low',
              )}
            >
              <span
                aria-hidden="true"
                className={cm.cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                  option.selected
                    ? 'border-primary bg-primary'
                    : 'border-outline-variant bg-surface',
                )}
              >
                {option.selected && <span className="block h-2 w-2 rounded-full bg-on-primary" />}
              </span>
              <span
                className={cm.cn(
                  'ml-4 text-sm font-medium',
                  option.selected ? 'text-primary' : 'text-on-surface',
                )}
              >
                {option.label}
              </span>
              {option.selected && (
                <span
                  className="material-symbols-outlined ml-auto text-primary"
                  style={{ fontSize: 20 }}
                  aria-hidden="true"
                >
                  check_circle
                </span>
              )}
            </div>
          ))}
        </div>
        {/* Controls */}
        <div className="flex items-center justify-between pt-2">
          <span className="flex items-center gap-1 text-sm font-medium text-on-surface-variant">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">
              keyboard_backspace
            </span>
            {t('common.back', {}, { defaultValue: 'Back' })}
          </span>
          <span className="flex items-center gap-2 rounded-full bg-surface-container-highest px-6 py-2.5 text-sm font-semibold text-on-surface">
            {t('common.continue', {}, { defaultValue: 'Continue' })}
            <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">
              arrow_forward
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const headline = splitHeadlineAccent(t('landing.hero.title', {}, { defaultValue: APP_TAGLINE }))

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface')}>
      <LandingTopNavBar variant="fixed" />

      <main className="pt-24 pb-24 lg:pt-32">
        {/* Hero — the conversational entry: copy left, survey-card mockup right */}
        <section
          className={cm.cn('relative mx-auto w-full max-w-7xl px-6 pb-24 pt-16 lg:px-8 lg:pt-20')}
        >
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            <div className="z-10 space-y-8">
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  'w-fit rounded-full bg-surface-container-low px-4 py-2 text-xs font-semibold tracking-wide text-primary',
                )}
              >
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-tertiary" />
                {/* Badge copy is load-bearing: e2e/root.spec.ts 'hero badge and
                    tagline are rendered' asserts /surveys.*nps.*feedback|nps at
                    scale/i against the landing — keep the wording matching. */}
                {t(
                  'landing.hero.badge',
                  {},
                  { defaultValue: 'Surveys, NPS & feedback in one place' },
                )}
              </div>
              <h1 className="text-5xl font-bold leading-[1.1] tracking-tight lg:text-7xl">
                {headline.lead}
                {headline.accent && (
                  <>
                    <br />
                    <span className="bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent">
                      {headline.accent}
                    </span>
                  </>
                )}
              </h1>
              <p className="max-w-lg text-xl leading-relaxed text-on-surface-variant">
                {t(
                  'landing.hero.subtitle',
                  { app: APP_NAME },
                  {
                    defaultValue:
                      'Turn data collection into a dialogue. {{app}} creates surveys that feel like a conversation, not a form — deeper insights, higher completion rates.',
                  },
                )}
              </p>
              <div className="flex flex-col gap-4 pt-4 sm:flex-row">
                <Link
                  to="/signup"
                  data-mol-id="landing-hero-cta"
                  className={cm.cn(
                    'ambient-shadow w-fit rounded-xl bg-gradient-to-br from-primary to-secondary px-8 py-4 text-base font-semibold text-on-primary transition-opacity hover:opacity-90',
                  )}
                >
                  {t('landing.hero.ctaPrimary', {}, { defaultValue: 'Start a dialogue' })}
                </Link>
                <a
                  href="#product"
                  className={cm.cn(
                    'w-fit rounded-xl px-8 py-4 text-base font-semibold text-primary transition-colors hover:bg-surface-container-low',
                  )}
                >
                  {t('landing.hero.ctaSecondary', {}, { defaultValue: 'See how it works' })}
                </a>
              </div>
            </div>
            <div className="relative flex items-center justify-center lg:h-[600px]">
              {/* Background decorative shape */}
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 rotate-3 scale-105 rounded-[40px] bg-primary-fixed-dim/20"
              />
              <SurveyCardMockup />
            </div>
          </div>
        </section>

        <section id="product" className={cm.cn(cm.maxW('6xl'), cm.mxAuto, cm.sp('px', 6))}>
          <ResponsesHeroCard
            responsesThisWeek={3214}
            changeLabel={t('landing.preview.heroChange', {}, { defaultValue: '+18% vs last week' })}
            npsAverage={62}
            avgCompletion={t('landing.preview.completion', {}, { defaultValue: '2m 41s' })}
          />
          <div className={cm.cn(cm.grid({ cols: 1, gap: 4 }), cm.sp('mt', 6), 'sm:grid-cols-3')}>
            <KpiStatCard
              label={t('landing.preview.kpiActive', {}, { defaultValue: 'Active surveys' })}
              value="14"
              trend={t(
                'landing.preview.kpiActiveTrend',
                {},
                { defaultValue: '3 launched this week' },
              )}
              icon="poll"
              accent="primary"
              trendTone="up"
            />
            <KpiStatCard
              label={t('landing.preview.kpiCompletion', {}, { defaultValue: 'Completion rate' })}
              value="76%"
              trend={t('landing.preview.kpiCompletionTrend', {}, { defaultValue: '+4 pts vs Q3' })}
              icon="task_alt"
              accent="success"
              trendTone="up"
            />
            <KpiStatCard
              label={t('landing.preview.kpiPromoter', {}, { defaultValue: 'Promoter share' })}
              value="71%"
              trend={t(
                'landing.preview.kpiPromoterTrend',
                {},
                { defaultValue: 'Detractors trending down' },
              )}
              icon="thumb_up"
              accent="secondary"
              trendTone="up"
            />
          </div>
        </section>

        <section
          id="templates"
          className={cm.cn(
            cm.maxW('5xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('pt', 20),
            cm.sp('pb', 20),
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 6 }),
              cm.sp('p', 8),
              'ambient-shadow rounded-[24px] border border-outline-variant bg-surface',
            )}
          >
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-primary',
                )}
              >
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-tertiary" />
                {t('landing.sample.eyebrow', {}, { defaultValue: 'NPS at a glance' })}
              </span>
              <h2 className={cm.cn(cm.textSize('2xl'), 'font-bold tracking-tight')}>
                {t(
                  'landing.sample.title',
                  {},
                  { defaultValue: 'Detractors, passives, promoters — instantly readable.' },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xl')}>
                {t(
                  'landing.sample.description',
                  { app: APP_NAME },
                  {
                    defaultValue:
                      'Live distribution of 146 sample responses, scored 0 to 10. {{app}} shades each cell so you spot the shift the moment it happens.',
                  },
                )}
              </p>
            </div>
            <NpsDistributionBar counts={SAMPLE_NPS_COUNTS} />
          </div>
        </section>

        <section
          id="pricing"
          className={cm.cn(cm.maxW('6xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('pb', 24))}
        >
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 2 }),
              cm.sp('mb', 10),
              'text-center',
            )}
          >
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-primary',
              )}
            >
              {t('landing.pricing.eyebrow', {}, { defaultValue: 'Pricing' })}
            </span>
            <h2 className={cm.cn(cm.textSize('3xl'), 'font-bold tracking-tight')}>
              {t('landing.pricing.title', {}, { defaultValue: 'Start free, scale when you do.' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), cm.maxW('xl'), 'text-on-surface-variant')}>
              {t(
                'landing.pricing.subtitle',
                {},
                {
                  defaultValue:
                    'Every plan includes the survey builder, public share links, and NPS analytics. No credit card required to start.',
                },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 6 }), 'sm:grid-cols-3 items-start')}>
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.key}
                data-testid={`pricing-plan-${plan.key}`}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 5 }),
                  cm.sp('p', 8),
                  cm.h('full'),
                  'rounded-[24px] bg-surface transition-all',
                  plan.highlighted
                    ? 'ambient-shadow border-2 border-primary'
                    : 'border border-outline-variant',
                )}
              >
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
                  <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 2 }))}>
                    <span
                      className={cm.cn(
                        cm.textSize('lg'),
                        'font-bold tracking-tight text-on-surface',
                      )}
                    >
                      {t(plan.nameKey, {}, { defaultValue: plan.name })}
                    </span>
                    {plan.highlighted && (
                      <span
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.fontWeight('bold'),
                          cm.roundedFull,
                          'bg-primary-fixed py-1 text-[10px] uppercase tracking-widest text-primary',
                        )}
                      >
                        {t('landing.pricing.popular', {}, { defaultValue: 'Most popular' })}
                      </span>
                    )}
                  </div>
                  <div className={cm.cn(cm.flex({ align: 'baseline', gap: 1 }))}>
                    <span className={cm.cn('text-4xl font-bold tracking-tight text-on-surface')}>
                      {plan.price}
                    </span>
                    <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {t('landing.pricing.perMonth', {}, { defaultValue: '/mo' })}
                    </span>
                  </div>
                  {plan.yearly && plan.yearlyKey && (
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(plan.yearlyKey, {}, { defaultValue: plan.yearly })}
                    </span>
                  )}
                </div>
                <ul className={cm.cn(cm.flex({ direction: 'col', gap: 3 }), cm.flex1)}>
                  {plan.featureKeys.map((feature) => (
                    <li key={feature.key} className={cm.cn(cm.flex({ align: 'start', gap: 2 }))}>
                      <span
                        className="material-symbols-outlined text-primary"
                        style={{ fontSize: 18 }}
                        aria-hidden="true"
                      >
                        check_circle
                      </span>
                      <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                        {t(feature.key, {}, { defaultValue: feature.text })}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  data-testid={`pricing-cta-${plan.key}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'rounded-full transition-all',
                    plan.highlighted
                      ? 'bg-gradient-to-br from-primary to-secondary text-on-primary shadow-md hover:opacity-90'
                      : 'border border-outline-variant text-on-surface hover:bg-surface-container-low',
                  )}
                >
                  {t(plan.ctaKey, {}, { defaultValue: plan.cta })}
                </Link>
              </div>
            ))}
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}

export default Landing
