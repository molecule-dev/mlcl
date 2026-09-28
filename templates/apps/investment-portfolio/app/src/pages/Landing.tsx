import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { AssetAllocationDonut } from '../components/AssetAllocationDonut.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingTopNavBar } from '../components/LandingTopNavBar.js'
import { PortfolioHeroCard } from '../components/PortfolioHeroCard.js'

const FEATURES = [
  {
    key: 'unified',
    defaultTitle: 'One portfolio, all assets',
    defaultBody: 'Equities, ETFs, mutual funds, bonds — pulled from your brokerage in real time.',
    icon: 'pie_chart',
  },
  {
    key: 'rebalance',
    defaultTitle: 'Disciplined rebalancing',
    defaultBody:
      'Set target allocations and tolerance bands. {{appName}} flags drift and suggests trades to bring you back.',
    icon: 'balance',
  },
  {
    key: 'attribution',
    defaultTitle: 'Performance attribution',
    defaultBody:
      'Decompose returns by sector, region, and asset class. Compare against benchmarks across any window.',
    icon: 'bar_chart',
  },
  {
    key: 'tax',
    defaultTitle: 'Tax-document hygiene',
    defaultBody:
      'Realized/unrealized gains, dividends, and 1099 docs in one place. Wash-sale flags included.',
    icon: 'description',
  },
] as const

const SAMPLE_HISTORY = [
  { date: '2026-03-26', value_cents: 9420000 },
  { date: '2026-03-30', value_cents: 9512000 },
  { date: '2026-04-02', value_cents: 9684000 },
  { date: '2026-04-06', value_cents: 9821000 },
  { date: '2026-04-10', value_cents: 9942000 },
  { date: '2026-04-15', value_cents: 10092000 },
  { date: '2026-04-18', value_cents: 10184000 },
  { date: '2026-04-22', value_cents: 10248000 },
  { date: '2026-04-25', value_cents: 10342251 },
]

const SAMPLE_ALLOCATION = [
  { label: 'US Equity', value_cents: 5132598, pct: 49.6, color: '#0d9488' },
  { label: 'Fixed Income', value_cents: 2616477, pct: 25.3, color: '#6366f1' },
  { label: 'Intl Equity', value_cents: 1504524, pct: 14.5, color: '#f59e0b' },
  { label: 'Real Estate', value_cents: 629888, pct: 6.1, color: '#0ea5e9' },
  { label: 'Commodities', value_cents: 379764, pct: 3.7, color: '#a855f7' },
  { label: 'Cash', value_cents: 124800, pct: 1.2, color: '#94a3b8' },
]

const SOCIAL_PROOF = [
  { key: 'aum', defaultMetric: '$1.2B', defaultLabel: 'Assets tracked' },
  { key: 'accounts', defaultMetric: '14,000', defaultLabel: 'Connected brokerage accounts' },
  { key: 'firms', defaultMetric: '230+', defaultLabel: 'Independent advisor firms' },
] as const

/** The design highlights the headline's final word in brand teal over a
 *  soft teal underline block ("Your wealth, <mark>illuminated</mark>.").
 *  Splitting the translated string keeps the i18n contract intact. */
function HeadlineWithMark({ text }: { text: string }) {
  const idx = text.lastIndexOf(' ')
  if (idx <= 0) return <>{text}</>
  const head = text.slice(0, idx)
  const tail = text.slice(idx + 1)
  const trailing = tail.endsWith('.') ? '.' : ''
  const word = trailing ? tail.slice(0, -1) : tail
  return (
    <>
      {head}{' '}
      <span className="relative inline-block whitespace-nowrap">
        <span className="relative z-10 text-primary">{word}</span>
        <span aria-hidden="true" className="absolute bottom-1 left-0 h-3 w-full bg-primary/15" />
      </span>
      {trailing}
    </>
  )
}

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <LandingTopNavBar />

      <main>
        {/* Marketing editorial hero — radial teal wash from the top right
            (design: from-teal-50 via-white). */}
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            aria-hidden="true"
            className={cm.cn('absolute inset-0 opacity-70')}
            style={{
              background:
                'radial-gradient(ellipse at top right, color-mix(in oklab, var(--color-primary) 12%, transparent) 0%, transparent 60%)',
            }}
          />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.sp('px', 6),
              'pt-20 pb-16',
              cm.mxAuto,
              'relative z-10',
            )}
          >
            <div className={cm.cn('max-w-3xl')}>
              <p
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  cm.sp('mb', 4),
                  'uppercase tracking-widest text-primary',
                )}
              >
                {t(
                  'landing.eyebrow',
                  { appName: APP_NAME },
                  { defaultValue: '{{appName}} · A wealth-tooling platform' },
                )}
              </p>
              <h1
                className={cm.cn(
                  'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight mb-6',
                )}
              >
                <HeadlineWithMark
                  text={t(
                    'landing.heroTitle',
                    { tagline: APP_TAGLINE },
                    { defaultValue: '{{tagline}}.' },
                  )}
                />
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.sp('mb', 8),
                  'text-on-surface-variant max-w-2xl leading-relaxed',
                )}
              >
                {t(
                  'landing.heroSubtitle',
                  {},
                  {
                    defaultValue:
                      'A portfolio dashboard for individual investors and advisors who want disciplined rebalancing, sharp performance attribution, and tax-doc hygiene — without the noise.',
                  },
                )}
              </p>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'flex-wrap')}>
                <Link
                  to="/signup"
                  data-mol-id="landing-hero-open-account"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    cm.fontWeight('semibold'),
                    'bg-primary text-on-primary rounded-lg shadow-sm inline-flex items-center gap-2 transition-all hover:bg-primary-dark active:scale-95',
                  )}
                >
                  {t('landing.heroCta', {}, { defaultValue: 'Start free for 30 days' })}
                </Link>
                <Link
                  to="/pricing"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    cm.fontWeight('semibold'),
                    'border border-outline bg-surface rounded-lg inline-flex items-center gap-2 transition-colors hover:bg-surface-container',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-primary')}
                    aria-hidden="true"
                  >
                    play_circle
                  </span>
                  {t('landing.heroSecondaryCta', {}, { defaultValue: 'See pricing' })}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Sample portfolio teaser — mirrors the auth'd hero */}
        <section className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), 'pb-20', cm.mxAuto)}>
          <div className={cm.cn(cm.grid({ cols: 12, gap: 'lg' }))}>
            <div className={cm.cn('col-span-12 lg:col-span-7')}>
              <PortfolioHeroCard
                totalValueCents={SAMPLE_HISTORY[SAMPLE_HISTORY.length - 1].value_cents}
                dayChangeCents={28412}
                dayChangePct={0.28}
                totalPnlCents={2076051}
                totalPnlPct={25.12}
                history={SAMPLE_HISTORY}
              />
            </div>
            <div className={cm.cn('col-span-12 lg:col-span-5')}>
              <AssetAllocationDonut slices={SAMPLE_ALLOCATION} totalCents={10342251} />
            </div>
          </div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mt', 4),
              'text-on-surface-variant text-center uppercase tracking-widest',
            )}
          >
            {t(
              'landing.sampleCaption',
              {},
              { defaultValue: 'A live preview from a representative portfolio' },
            )}
          </p>
        </section>

        {/* Trust strip — slate band, grayscale wordmarks (design). Names are
            fictional advisory firms standing in for the design's press
            logos. */}
        <section className={cm.cn('bg-surface-container/30 border-y border-outline-variant/40')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 10), cm.mxAuto)}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                cm.sp('mb', 6),
                'text-center uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('landing.trustedBy', {}, { defaultValue: 'Trusted by industry leaders' })}
            </p>
            <div
              className={cm.cn(
                cm.flex({ wrap: 'wrap', justify: 'center', align: 'center', gap: 'xl' }),
                'opacity-60 grayscale',
              )}
            >
              {[
                { key: 'northline', label: 'Northline Capital', serif: true },
                { key: 'meridian', label: 'Meridian Wealth', serif: true },
                { key: 'atlas', label: 'Atlas Advisory', serif: false },
                { key: 'beacon', label: 'Beacon Partners', serif: true },
                { key: 'summit', label: 'Summit Fiduciary', serif: false },
              ].map((brand) => (
                <span
                  key={brand.key}
                  className={cm.cn(
                    cm.textSize('xl'),
                    cm.fontWeight('bold'),
                    brand.serif ? 'font-serif tracking-normal' : 'tracking-tight',
                    'text-on-surface',
                  )}
                >
                  {t(`landing.trust.${brand.key}`, {}, { defaultValue: brand.label })}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Feature quad */}
        <section>
          <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 20), cm.mxAuto)}>
            <div className={cm.cn('max-w-2xl mb-12')}>
              <p
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  cm.sp('mb', 3),
                  'uppercase tracking-widest text-primary-dark',
                )}
              >
                {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
              </p>
              <h2
                className={cm.cn(
                  'text-3xl md:text-4xl font-extrabold tracking-tight leading-tight',
                )}
              >
                {t(
                  'landing.features.heading',
                  {},
                  { defaultValue: 'Everything an advisor would build for themselves.' },
                )}
              </h2>
            </div>
            <div
              className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4')}
            >
              {FEATURES.map((f) => (
                <article
                  key={f.key}
                  className={cm.cn(
                    cm.sp('p', 6),
                    'bg-surface rounded-2xl border border-outline-variant/40 hover:-translate-y-1 transition-transform',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.w(12),
                      cm.h(12),
                      cm.roundedFull,
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.sp('mb', 4),
                      'bg-primary/10 text-primary',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-2xl')}
                      aria-hidden="true"
                    >
                      {f.icon}
                    </span>
                  </div>
                  <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
                    {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                  </h3>
                  <p
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}
                  >
                    {t(
                      `landing.feature.${f.key}.body`,
                      { appName: APP_NAME },
                      { defaultValue: f.defaultBody },
                    )}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Social proof strip */}
        <section className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 16), cm.mxAuto)}>
          <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3 text-center')}>
            {SOCIAL_PROOF.map((p) => (
              <div key={p.key}>
                <p
                  className={cm.cn(
                    'text-5xl font-extrabold tracking-tight tabular-nums text-primary',
                  )}
                >
                  {t(`landing.social.${p.key}.metric`, {}, { defaultValue: p.defaultMetric })}
                </p>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mt', 2),
                    'text-on-surface-variant uppercase tracking-widest font-semibold',
                  )}
                >
                  {t(`landing.social.${p.key}.label`, {}, { defaultValue: p.defaultLabel })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn(
              cm.maxW('5xl'),
              cm.sp('px', 6),
              cm.sp('py', 20),
              cm.mxAuto,
              'text-center',
            )}
          >
            <h2 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight mb-4')}>
              {t(
                'landing.finalCta.heading',
                {},
                { defaultValue: 'Bring discipline back to your portfolio.' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('lg'), cm.sp('mb', 8), 'text-on-surface-variant')}>
              {t(
                'landing.finalCta.body',
                { appName: APP_NAME },
                {
                  defaultValue: 'Connect your brokerage in two clicks. {{appName}} does the rest.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 10),
                cm.sp('py', 4),
                cm.fontWeight('bold'),
                'bg-primary text-on-primary rounded-lg shadow-sm inline-flex items-center gap-2 transition-all hover:bg-primary-dark active:scale-95',
              )}
            >
              {t(
                'landing.finalCta.cta',
                { appName: APP_NAME },
                { defaultValue: 'Open your {{appName}} account' },
              )}
              <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
