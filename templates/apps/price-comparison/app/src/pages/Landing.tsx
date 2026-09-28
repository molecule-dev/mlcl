import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingNav } from '../components/LandingNav.js'
import { ProductPriceCard, type ProductPriceCardProduct } from '../components/ProductPriceCard.js'

/**
 * Landing — translated from reference/flagship-apps-designs/design-price-comparison-landing.html
 * ("Sift"): warm-paper precision-shopping identity. Centered hero with a
 * radial wash, a DM Sans "Never overpay again." headline, a pill search bar
 * with a gradient submit button (routes to /search), a verified-retailers
 * line, a "Trending Price Drops" card row, "The {{appName}} Methodology"
 * three medallions with a connecting rule, a "Built for Precision" bento
 * (price-history bars, smart-alert card, coverage, trust), a dark
 * inverse-surface stats band, and a rounded final-CTA card with a top
 * gradient bar and an email form that hands off to /signup.
 */

const DEMO_PRODUCTS: ProductPriceCardProduct[] = [
  {
    id: 'demo-001',
    name: 'Sony WH-1000XM5 Wireless Noise-Cancelling Headphones',
    brand: 'Sony',
    category: 'Headphones',
    best_price_cents: 32999,
    list_price_cents: 39999,
    retailer_count: 11,
    drop_pct: 18,
    in_stock: true,
  },
  {
    id: 'demo-002',
    name: 'Apple MacBook Air 13" M3 — 16GB / 512GB',
    brand: 'Apple',
    category: 'Laptops',
    best_price_cents: 119900,
    list_price_cents: 149900,
    retailer_count: 7,
    drop_pct: 20,
    in_stock: true,
  },
  {
    id: 'demo-003',
    name: 'Dyson V15 Detect Cordless Vacuum',
    brand: 'Dyson',
    category: 'Home',
    best_price_cents: 59999,
    list_price_cents: 74999,
    retailer_count: 9,
    drop_pct: 20,
    in_stock: true,
  },
  {
    id: 'demo-004',
    name: 'Nintendo Switch OLED — Neon Edition',
    brand: 'Nintendo',
    category: 'Gaming',
    best_price_cents: 31499,
    list_price_cents: 34999,
    retailer_count: 6,
    drop_pct: 10,
    in_stock: true,
  },
] as const

const METHODOLOGY = [
  {
    key: 'search',
    icon: 'manage_search',
    tint: 'bg-primary/10 text-primary',
    defaultBody:
      'Enter any product name or paste a URL. We immediately scan our database of millions of active listings.',
  },
  {
    key: 'compare',
    icon: 'compare_arrows',
    tint: 'bg-primary/10 text-primary',
    defaultBody:
      'We normalize prices, factoring in shipping costs and hidden fees to give you the true bottom-line comparison.',
  },
  {
    key: 'save',
    icon: 'savings',
    tint: 'bg-secondary/10 text-secondary',
    defaultBody:
      'Buy instantly at the lowest price, or set a smart alert to be notified the second it drops further.',
  },
] as const

const STATS = [
  { key: 'products', value: '1.2M', label: 'Products tracked', tint: 'text-primary-fixed-dim' },
  { key: 'saved', value: '$42M', label: 'Saved this year', tint: 'text-secondary-fixed-dim' },
  { key: 'rating', value: '4.9', label: 'Avg rating', tint: 'text-inverse-primary' },
  { key: 'accuracy', value: '98%', label: 'Accuracy', tint: 'text-tertiary-fixed-dim' },
] as const

// Sparkline bars for the price-history card (design: six bars, last in green).
const HISTORY_BARS = [
  { h: 'h-[40%]', tint: 'bg-primary/20' },
  { h: 'h-[60%]', tint: 'bg-primary/30' },
  { h: 'h-[80%]', tint: 'bg-primary/40' },
  { h: 'h-[30%]', tint: 'bg-primary/20' },
  { h: 'h-[90%]', tint: 'bg-primary/50' },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [email, setEmail] = useState('')

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <LandingNav />

      <main>
        {/* Hero — centered, radial wash, pill search bar */}
        <section className="relative px-6 py-24 md:py-32">
          <div
            className={
              'absolute inset-0 -z-10 bg-gradient-to-b from-surface-container-high/40 via-background to-background'
            }
            aria-hidden="true"
          />
          <div
            className={cm.cn(cm.maxW('7xl'), cm.mxAuto, 'flex flex-col items-center text-center')}
          >
            <h1 className={cnHeroH1()} style={{ fontFamily: 'var(--font-headline)' }}>
              {t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}' })}
            </h1>
            <p className={cnHeroSub()}>
              {t(
                'landing.heroSubtitle',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'The precision curator for savvy shoppers. {{appName}} monitors millions of products across thousands of retailers to ensure you always get the lowest price.',
                },
              )}
            </p>

            {/* Pill search bar */}
            <form
              className={cnSearchWrap()}
              onSubmit={(e) => {
                e.preventDefault()
                navigate(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : '/deals')
              }}
            >
              <div
                className={
                  'absolute -inset-1 bg-gradient-to-r from-primary/20 to-tertiary/20 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-500'
                }
                aria-hidden="true"
              />
              <div className={cnSearchBar()}>
                <span
                  className={cnSearchIcon()}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  search
                </span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t(
                    'landing.searchPlaceholder',
                    {},
                    { defaultValue: 'Search for a product, brand, or URL...' },
                  )}
                  aria-label={t(
                    'landing.searchPlaceholder',
                    {},
                    { defaultValue: 'Search for a product, brand, or URL...' },
                  )}
                  className={cnSearchInput()}
                />
                <button type="submit" data-mol-id="hero-search" className={cnSearchButton()}>
                  {t('landing.searchButton', { app: APP_NAME }, { defaultValue: '{{app}} it' })}
                </button>
              </div>
            </form>

            <div className={cnVerifiedRow()}>
              <span
                className={'material-symbols-outlined text-secondary text-base'}
                aria-hidden="true"
              >
                verified
              </span>
              {t(
                'landing.retailerProof',
                {},
                { defaultValue: 'Compared across 1,200+ retailers in real-time' },
              )}
            </div>
          </div>
        </section>

        {/* Trending price drops */}
        <section className="py-16 bg-surface-container-low/50">
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6))}>
            <div className={cm.cn(cm.flex({ justify: 'between', align: 'end' }), cm.sp('mb', 8))}>
              <div>
                <h2 className={cnH2()} style={{ fontFamily: 'var(--font-headline)' }}>
                  {t('landing.trendingHeading', {}, { defaultValue: 'Trending Price Drops' })}
                </h2>
                <p className={cnSub()}>
                  {t(
                    'landing.trendingSub',
                    {},
                    { defaultValue: 'Curated deals verified in the last hour.' },
                  )}
                </p>
              </div>
              <Link to="/deals" className={cnViewAll()}>
                {t('landing.viewAll', {}, { defaultValue: 'View all' })}
                <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            </div>
            <div
              className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
            >
              {DEMO_PRODUCTS.map((product) => (
                <ProductPriceCard key={product.id} product={product} linked={false} />
              ))}
            </div>
          </div>
        </section>

        {/* Methodology — three medallions + connecting rule */}
        <section className={cnMethodSection()}>
          <div className={cnMethodHead()}>
            <h2 className={cnH2Big()} style={{ fontFamily: 'var(--font-headline)' }}>
              {t(
                'landing.methodologyHeading',
                { app: APP_NAME },
                { defaultValue: 'The {{app}} Methodology' },
              )}
            </h2>
            <p className={cnSub()}>
              {t(
                'landing.methodologySub',
                {},
                { defaultValue: 'Three steps to guarantee you never miss a price drop.' },
              )}
            </p>
          </div>
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12">
            <div
              className={
                'hidden md:block absolute top-12 left-1/6 right-1/6 h-px bg-surface-variant opacity-50 z-0'
              }
              aria-hidden="true"
            />
            {METHODOLOGY.map((step, i) => (
              <div
                key={step.key}
                className={'relative z-10 flex flex-col items-center text-center'}
              >
                <div
                  className={
                    'w-24 h-24 rounded-full bg-surface-container-lowest shadow-[0_8px_32px_var(--shadow-tint)] flex items-center justify-center mb-6'
                  }
                  aria-hidden="true"
                >
                  <div
                    className={cm.cn(
                      'w-16 h-16 rounded-full flex items-center justify-center',
                      step.tint,
                    )}
                  >
                    <span
                      className={'material-symbols-outlined text-3xl'}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {step.icon}
                    </span>
                  </div>
                </div>
                <h3 className={cnH3()} style={{ fontFamily: 'var(--font-headline)' }}>
                  {t(
                    `landing.method.${step.key}.title`,
                    {},
                    {
                      defaultValue: `${i + 1}. ${step.key.charAt(0).toUpperCase()}${step.key.slice(1)}`,
                    },
                  )}
                </h3>
                <p className={cnBody()}>
                  {t(`landing.method.${step.key}.body`, {}, { defaultValue: step.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Built for precision bento */}
        <section className="py-24 bg-surface-container-low">
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6))}>
            <div className={cm.sp('mb', 12)}>
              <h2 className={cnH2Big()} style={{ fontFamily: 'var(--font-headline)' }}>
                {t('landing.precisionHeading', {}, { defaultValue: 'Built for Precision' })}
              </h2>
              <p className={cnSub()}>
                {t(
                  'landing.precisionSub',
                  {},
                  { defaultValue: 'Advanced tools disguised as a simple interface.' },
                )}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Historical price graphs */}
              <div className={cnBentoCard()}>
                <div className={cnBentoIcon()}>
                  <span className={'material-symbols-outlined'} aria-hidden="true">
                    monitoring
                  </span>
                </div>
                <h3 className={cnH3()} style={{ fontFamily: 'var(--font-headline)' }}>
                  {t(
                    'landing.precision.history.title',
                    {},
                    {
                      defaultValue: 'Historical Price Graphs',
                    },
                  )}
                </h3>
                <p className={cm.cn(cnBody(), cm.sp('mb', 6))}>
                  {t(
                    'landing.precision.history.body',
                    {},
                    {
                      defaultValue:
                        'Never buy at the peak. View up to 12 months of pricing history to understand if a "sale" is genuinely a deal or just a marketing tactic.',
                    },
                  )}
                </p>
                <div
                  className={
                    'h-32 bg-surface-container rounded-lg relative overflow-hidden flex items-end px-4 pb-4'
                  }
                  aria-hidden="true"
                >
                  <div className={'w-full flex items-end gap-1 h-full pt-8'}>
                    {HISTORY_BARS.map((bar, i) => (
                      <div key={i} className={cm.cn('w-1/6 rounded-t', bar.h, bar.tint)} />
                    ))}
                    <div className={'w-1/6 bg-secondary/80 rounded-t h-[20%] relative'}>
                      <div
                        className={
                          'absolute -top-3 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-secondary'
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Smart alerts */}
              <div className={cnBentoCard()}>
                <div className={cnBentoIcon()}>
                  <span className={'material-symbols-outlined'} aria-hidden="true">
                    notifications_active
                  </span>
                </div>
                <h3 className={cnH3()} style={{ fontFamily: 'var(--font-headline)' }}>
                  {t('landing.precision.alerts.title', {}, { defaultValue: 'Smart Alerts' })}
                </h3>
                <p className={cm.cn(cnBody(), cm.sp('mb', 6))}>
                  {t(
                    'landing.precision.alerts.body',
                    {},
                    {
                      defaultValue:
                        "Set target prices and walk away. We'll ping your inbox the moment the price hits your threshold.",
                    },
                  )}
                </p>
                <div className={'bg-surface-container rounded-lg p-4 flex items-center gap-4'}>
                  <div
                    className={
                      'w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center shrink-0'
                    }
                    aria-hidden="true"
                  >
                    <span className={'material-symbols-outlined text-tertiary'}>mail</span>
                  </div>
                  <div className={'flex-1 min-w-0'}>
                    <div className={cnAlertTitle()}>
                      {t(
                        'landing.precision.alerts.rowTitle',
                        {},
                        {
                          defaultValue: 'Target Reached: Sony WH-1000XM5',
                        },
                      )}
                    </div>
                    <div className={cnAlertSub()}>
                      {t(
                        'landing.precision.alerts.rowBody',
                        {},
                        {
                          defaultValue: 'Price dropped to $298 (Your target: $300)',
                        },
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Coverage */}
              <div className={cnBentoCard()}>
                <div className={cnBentoIcon()}>
                  <span className={'material-symbols-outlined'} aria-hidden="true">
                    travel_explore
                  </span>
                </div>
                <h3 className={cnH3()} style={{ fontFamily: 'var(--font-headline)' }}>
                  {t(
                    'landing.precision.coverage.title',
                    {},
                    {
                      defaultValue: 'Massive Retailer Coverage',
                    },
                  )}
                </h3>
                <p className={cnBody()}>
                  {t(
                    'landing.precision.coverage.body',
                    {},
                    {
                      defaultValue:
                        'We index over 1,200 verified retailers globally. From the massive marketplaces to niche specialist stores, we ensure no deal slips through the cracks.',
                    },
                  )}
                </p>
              </div>

              {/* Trust */}
              <div className={cnBentoCard()}>
                <div className={cnBentoIcon()}>
                  <span className={'material-symbols-outlined'} aria-hidden="true">
                    shield
                  </span>
                </div>
                <h3 className={cnH3()} style={{ fontFamily: 'var(--font-headline)' }}>
                  {t('landing.precision.trust.title', {}, { defaultValue: 'Trust Signals' })}
                </h3>
                <p className={cnBody()}>
                  {t(
                    'landing.precision.trust.body',
                    {},
                    {
                      defaultValue:
                        "Cheap isn't good if it's a scam. We aggregate seller ratings and highlight authorized dealers so you can buy with confidence.",
                    },
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats band */}
        <section className="py-20 bg-inverse-surface text-inverse-on-surface">
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6))}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:divide-x md:divide-inverse-on-surface/10">
              {STATS.map((stat) => (
                <div key={stat.key} className={'flex flex-col items-center text-center px-4'}>
                  <div
                    className={cnStatValue(stat.tint)}
                    style={{ fontFamily: 'var(--font-headline)' }}
                  >
                    {stat.value}
                  </div>
                  <div className={cnStatLabel()}>
                    {t(`landing.stat.${stat.key}`, {}, { defaultValue: stat.label })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA — white card, top gradient bar, email hand-off */}
        <section className={cnCtaSection()}>
          <div className={cnCtaCard()}>
            <div
              className={
                'absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-deep to-primary'
              }
              aria-hidden="true"
            />
            <h2 className={cnH2Big()} style={{ fontFamily: 'var(--font-headline)' }}>
              {t('landing.ctaHeading', {}, { defaultValue: 'Stop overpaying today.' })}
            </h2>
            <p className={cnCtaSub()}>
              {t(
                'landing.ctaSubheading',
                {},
                {
                  defaultValue:
                    'Join 200,000+ savvy shoppers who get our weekly digest of the biggest verified price drops.',
                },
              )}
            </p>
            <form
              className={cnCtaForm()}
              onSubmit={(e) => {
                e.preventDefault()
                navigate('/signup')
              }}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t(
                  'landing.ctaEmailPlaceholder',
                  {},
                  {
                    defaultValue: 'Enter your email address',
                  },
                )}
                aria-label={t(
                  'landing.ctaEmailPlaceholder',
                  {},
                  {
                    defaultValue: 'Enter your email address',
                  },
                )}
                className={cnCtaInput()}
              />
              <button type="submit" data-mol-id="cta-signup" className={cnCtaButton()}>
                {t('landing.ctaButton', {}, { defaultValue: 'Subscribe Now' })}
              </button>
            </form>
            <p className={cnCtaNote()}>
              {t('landing.ctaNote', {}, { defaultValue: 'No spam. Unsubscribe anytime.' })}
            </p>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}

/* — class strings (kept as named constants to stay under Tailwind's scanner) — */

const cnHeroH1 = () =>
  'text-5xl md:text-7xl font-bold tracking-tight text-on-surface mb-6 leading-tight'
const cnHeroSub = () => 'text-on-surface-variant text-lg md:text-xl max-w-2xl mb-12 leading-relaxed'
const cnSearchWrap = () => 'w-full max-w-3xl relative group'
const cnSearchBar = () =>
  'relative bg-surface-container-lowest rounded-full p-2 flex items-center shadow-[0_8px_32px_var(--shadow-tint)] focus-within:bg-surface-bright focus-within:ring-2 focus-within:ring-primary/30 transition-all'
const cnSearchIcon = () => 'material-symbols-outlined text-primary ml-4 mr-2'
const cnSearchInput = () =>
  'flex-1 min-w-0 bg-transparent outline-none border-none text-on-background text-lg py-3 placeholder:text-on-surface-variant/60'
const cnSearchButton = () =>
  'bg-gradient-to-br from-primary-deep to-primary text-on-primary px-6 sm:px-8 py-3 rounded-full font-medium hover:shadow-md transition-shadow shrink-0'
const cnVerifiedRow = () =>
  'mt-10 flex items-center gap-2 text-sm text-on-surface-variant font-medium'
const cnH2 = () => 'text-2xl font-bold text-on-surface'
const cnH2Big = () => 'text-3xl md:text-4xl font-bold text-on-surface mb-4'
const cnSub = () => 'text-on-surface-variant mt-1'
const cnViewAll = () =>
  'text-tertiary font-medium hover:text-primary transition-colors flex items-center gap-1'
const cnMethodSection = () => 'py-24 max-w-7xl mx-auto px-6'
const cnMethodHead = () => 'text-center mb-16'
const cnH3 = () => 'text-xl font-bold text-on-surface mb-3'
const cnBody = () => 'text-on-surface-variant leading-relaxed'
const cnBentoCard = () =>
  'bg-surface-container-lowest rounded-xl p-8 shadow-[0_4px_24px_var(--shadow-tint-soft)] hover:shadow-[0_8px_32px_var(--shadow-tint)] transition-shadow duration-300'
const cnBentoIcon = () =>
  'w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-on-surface mb-6'
const cnAlertTitle = () => 'text-sm font-bold text-on-surface truncate'
const cnAlertSub = () => 'text-xs text-on-surface-variant mt-1 truncate'
const cnStatValue = (tint: string) => `text-4xl md:text-5xl font-bold tabular-nums mb-2 ${tint}`
const cnStatLabel = () => 'text-sm text-inverse-on-surface/70 font-medium tracking-wide uppercase'
const cnCtaSection = () => 'py-32 px-6'
const cnCtaCard = () =>
  'max-w-3xl mx-auto bg-surface-container-lowest rounded-3xl p-10 md:p-16 text-center shadow-[0_8px_32px_var(--shadow-tint)] relative overflow-hidden'
const cnCtaSub = () => 'text-on-surface-variant mb-10 text-lg'
const cnCtaForm = () => 'flex flex-col sm:flex-row gap-4 max-w-xl mx-auto'
const cnCtaInput = () =>
  'flex-1 min-w-0 bg-surface-container-highest rounded-xl px-6 py-4 text-on-surface outline-none focus:ring-2 focus:ring-primary/50 transition-shadow'
const cnCtaButton = () =>
  'bg-gradient-to-br from-primary-deep to-primary text-on-primary px-8 py-4 rounded-xl font-bold hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 whitespace-nowrap'
const cnCtaNote = () => 'text-xs text-on-surface-variant mt-4'

export default Landing
