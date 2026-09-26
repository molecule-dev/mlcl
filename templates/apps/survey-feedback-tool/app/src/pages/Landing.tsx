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

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface-secondary text-on-surface')}>
      <LandingTopNavBar />

      <section
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 6 }),
          cm.sp('px', 6),
          cm.sp('py', 16),
          cm.maxW('5xl'),
          cm.mxAuto,
          'text-center',
        )}
      >
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.roundedFull,
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest bg-primary/15 text-primary',
          )}
        >
          {t('landing.hero.badge', {}, { defaultValue: 'Surveys, NPS & feedback in one place' })}
        </span>
        <h1
          className={cm.cn(
            'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] font-extrabold',
          )}
        >
          {t('landing.hero.title', {}, { defaultValue: APP_TAGLINE })}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('lg'),
            cm.maxW('2xl'),
            'text-on-surface-variant leading-relaxed',
          )}
        >
          {t(
            'landing.hero.subtitle',
            {},
            {
              defaultValue:
                'Build beautiful surveys, capture NPS at scale, and turn open feedback into the next product decision — all without the spreadsheets.',
            },
          )}
        </p>
        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 3 }), 'flex-wrap')}
        >
          <Link
            to="/signup"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'rounded-md bg-gradient-to-r from-primary to-secondary text-white shadow-md hover:shadow-lg transition-all',
            )}
          >
            {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
          </Link>
          <a
            href="#templates"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'rounded-md text-primary hover:bg-primary/10 transition-colors',
            )}
          >
            {t('common.browseTemplates', {}, { defaultValue: 'Browse templates' })}
            <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">
              arrow_forward
            </span>
          </a>
        </div>
      </section>

      <section
        id="product"
        className={cm.cn(cm.maxW('6xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('pb', 12))}
      >
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
        className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('pb', 20))}
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 6 }),
            cm.sp('p', 8),
            'bg-surface rounded-[1.5rem] shadow-sm border border-[color:var(--color-border)]',
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-primary',
              )}
            >
              {t('landing.sample.eyebrow', {}, { defaultValue: 'NPS at a glance' })}
            </span>
            <h2 className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight')}>
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
          <h2 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}>
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
                'rounded-[1.5rem] bg-surface shadow-sm transition-all',
                plan.highlighted
                  ? 'border-2 border-primary shadow-md'
                  : 'border border-[color:var(--color-border)]',
              )}
            >
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 2 }))}>
                  <span
                    className={cm.cn(
                      cm.textSize('lg'),
                      'font-extrabold tracking-tight text-on-surface',
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
                        'py-1 text-[10px] uppercase tracking-widest bg-primary/15 text-primary',
                      )}
                    >
                      {t('landing.pricing.popular', {}, { defaultValue: 'Most popular' })}
                    </span>
                  )}
                </div>
                <div className={cm.cn(cm.flex({ align: 'baseline', gap: 1 }))}>
                  <span className={cm.cn('text-4xl font-extrabold tracking-tight text-on-surface')}>
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
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-md transition-all',
                  plan.highlighted
                    ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-md hover:shadow-lg'
                    : 'border border-[color:var(--color-border)] text-on-surface hover:bg-surface-secondary',
                )}
              >
                {t(plan.ctaKey, {}, { defaultValue: plan.cta })}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}

export default Landing
