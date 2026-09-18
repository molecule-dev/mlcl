import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingNav } from '../components/LandingNav.js'
import { ProductPriceCard, type ProductPriceCardProduct } from '../components/ProductPriceCard.js'
import { SavingsHeroCard } from '../components/SavingsHeroCard.js'

const FEATURES = [
  {
    key: 'compare',
    icon: 'compare_arrows',
    defaultTitle: 'Every retailer, one screen',
    defaultBody:
      'Search a product once and {{appName}} fans out across Amazon, Best Buy, Target, Walmart, and 30+ stores — sorted by total delivered cost.',
  },
  {
    key: 'history',
    icon: 'show_chart',
    defaultTitle: 'See the real price history',
    defaultBody:
      'A retailer says "lowest in 90 days"? Verify it. Our 12-month history chart shows exactly when (and how often) the price has been lower.',
  },
  {
    key: 'alerts',
    icon: 'notifications_active',
    defaultTitle: 'Wait for the perfect drop',
    defaultBody:
      'Set a target — we ping you the second the watchlist hits it. No noisy daily emails, no fake "deal of the day" coupons.',
  },
  {
    key: 'savings',
    icon: 'savings',
    defaultTitle: 'Track every dollar saved',
    defaultBody:
      'Lifetime savings, average wait time per drop, top-saving retailers — all on one Dashboard so you know {{appName}} earns its keep.',
  },
] as const

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

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        'bg-gradient-to-b from-background via-surface to-surface-container-low text-on-surface antialiased',
      )}
    >
      <LandingNav />

      <main>
        <section className={cm.cn(cm.sp('py', 16), cm.sp('px', 6), 'lg:py-24')}>
          <div
            className={cm.cn(
              cm.maxW('xl'),
              cm.mxAuto,
              cm.grid({ cols: 12, gap: 'lg' }),
              'max-w-screen-xl items-center',
            )}
          >
            <div className={cm.cn('col-span-12 lg:col-span-7 space-y-6')}>
              <p
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'text-[10px] font-black uppercase tracking-widest text-primary',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cm.cn('h-2 w-2 rounded-full bg-primary animate-pulse')}
                />
                {t('landing.eyebrow', {}, { defaultValue: '4,800+ price drops detected today' })}
              </p>
              <h1
                className={cm.cn(
                  'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] text-on-surface',
                )}
              >
                {t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}.' })}
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.maxW('xl'),
                  'text-on-surface-variant leading-relaxed',
                )}
              >
                {t(
                  'landing.heroSubtitle',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      'Search a product once. {{appName}} compares every retailer, charts the price history, and pings you the moment your target drops — so you stop overpaying without thinking about it.',
                  },
                )}
              </p>
              <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    cm.fontWeight('bold'),
                    cm.textSize('base'),
                    'rounded-full bg-primary text-on-primary hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20',
                  )}
                >
                  {t('landing.heroCta', {}, { defaultValue: 'Start saving free' })}
                  <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
                    arrow_forward
                  </span>
                </Link>
                <Link
                  to="/deals"
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 4),
                    cm.fontWeight('semibold'),
                    cm.textSize('base'),
                    'rounded-full border border-outline-variant text-on-surface hover:bg-surface-container transition-colors',
                  )}
                >
                  {t('landing.browseCta', {}, { defaultValue: 'Browse trending drops' })}
                </Link>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
                  cm.sp('pt', 4),
                  cm.textSize('sm'),
                  'text-on-surface-variant',
                )}
              >
                {[
                  { glyph: 'star', label: '4.8 / 5 in the App Store' },
                  { glyph: 'storefront', label: '30+ retailers compared' },
                  { glyph: 'verified', label: 'No affiliate bias' },
                ].map((proof) => (
                  <span
                    key={proof.glyph}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.fontWeight('medium'),
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cm.cn('material-symbols-outlined text-base text-secondary')}
                    >
                      {proof.glyph}
                    </span>
                    {t(`landing.socialProof.${proof.glyph}`, {}, { defaultValue: proof.label })}
                  </span>
                ))}
              </div>
            </div>

            <div className={cm.cn('col-span-12 lg:col-span-5')}>
              <SavingsHeroCard
                totalSavingsCents={184220}
                watchingCount={28}
                weekDropCount={6}
                eyebrow={t('landing.heroPreviewEyebrow', {}, { defaultValue: 'Sample dashboard' })}
              />
            </div>
          </div>
        </section>

        <section
          className={cm.cn(
            cm.maxW('xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 12),
            'max-w-screen-xl',
          )}
        >
          <header
            className={cm.cn(
              cm.flex({ align: 'end', justify: 'between', gap: 'md' }),
              cm.sp('mb', 8),
            )}
          >
            <div>
              <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
                {t('landing.trendingEyebrow', {}, { defaultValue: 'Trending today' })}
              </p>
              <h2
                className={cm.cn(
                  'mt-1 text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface',
                )}
              >
                {t('landing.trendingHeading', {}, { defaultValue: 'Hot drops worth jumping on' })}
              </h2>
            </div>
            <Link
              to="/deals"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'text-primary hover:underline',
              )}
            >
              {t('landing.viewAll', {}, { defaultValue: 'View all deals' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </header>
          <div
            className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {DEMO_PRODUCTS.map((product) => (
              <ProductPriceCard key={product.id} product={product} linked={false} />
            ))}
          </div>
        </section>

        <section
          className={cm.cn(
            cm.maxW('xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 16),
            'max-w-screen-xl',
          )}
        >
          <p
            className={cm.cn(
              cm.textCenter,
              'text-[10px] font-black uppercase tracking-widest text-primary',
            )}
          >
            {t(
              'landing.featuresEyebrow',
              { appName: APP_NAME },
              { defaultValue: 'Why {{appName}}' },
            )}
          </p>
          <h2
            className={cm.cn(
              cm.textCenter,
              cm.sp('mt', 2),
              cm.sp('mb', 12),
              'text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t(
              'landing.featuresHeading',
              {},
              { defaultValue: 'Built for shoppers who hate overpaying.' },
            )}
          </h2>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <article
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm transition-all hover:-translate-y-1 hover:shadow-md',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-12 w-12 rounded-xl bg-primary/15 text-primary',
                  )}
                  aria-hidden="true"
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-2xl')}
                    style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}
                  >
                    {f.icon}
                  </span>
                </span>
                <h3
                  className={cm.cn(
                    cm.sp('mt', 4),
                    cm.textSize('lg'),
                    cm.fontWeight('extrabold'),
                    'text-on-surface tracking-tight',
                  )}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p
                  className={cm.cn(
                    cm.sp('mt', 2),
                    cm.textSize('sm'),
                    'text-on-surface-variant leading-relaxed',
                  )}
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
        </section>

        <section className={cm.cn(cm.sp('px', 6), cm.sp('py', 16), 'relative overflow-hidden')}>
          <div
            className={cm.cn(
              cm.maxW('xl'),
              cm.mxAuto,
              cm.sp('p', 12),
              'relative max-w-screen-xl rounded-[2rem] bg-gradient-to-br from-primary to-primary-container text-on-primary text-center overflow-hidden',
            )}
          >
            <div
              aria-hidden="true"
              className={cm.cn(
                'absolute -right-20 -top-20 h-72 w-72 rounded-full bg-surface/10 blur-3xl pointer-events-none',
              )}
            />
            <div
              aria-hidden="true"
              className={cm.cn(
                'absolute -left-12 -bottom-20 h-64 w-64 rounded-full bg-secondary/30 blur-3xl pointer-events-none',
              )}
            />
            <h2
              className={cm.cn(
                'relative text-3xl md:text-5xl font-extrabold tracking-tight leading-tight',
              )}
            >
              {t('landing.ctaHeading', {}, { defaultValue: 'Stop overpaying. Start saving.' })}
            </h2>
            <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 4), 'relative text-on-primary/85')}>
              {t(
                'landing.ctaSubheading',
                {},
                { defaultValue: 'Free forever. Watch unlimited products on the Team plan.' },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('mt', 8),
                cm.sp('px', 8),
                cm.sp('py', 4),
                cm.fontWeight('bold'),
                cm.textSize('base'),
                'relative inline-flex rounded-full bg-surface text-primary hover:opacity-95 active:scale-95 transition-all',
              )}
            >
              {t('landing.ctaButton', {}, { defaultValue: 'Create my free account' })}
              <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
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
