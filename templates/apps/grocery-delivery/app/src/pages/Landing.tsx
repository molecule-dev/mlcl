import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { BushelHero } from '../components/BushelHero.js'
import { FeaturedProductsGrid } from '../components/FeaturedProductsGrid.js'

const FEATURED_CATEGORIES = [
  { key: 'produce', defaultLabel: 'Produce', icon: 'eco' },
  { key: 'dairy', defaultLabel: 'Dairy & eggs', icon: 'icecream' },
  { key: 'bakery', defaultLabel: 'Bakery', icon: 'bakery_dining' },
  { key: 'meat', defaultLabel: 'Meat & seafood', icon: 'set_meal' },
  { key: 'pantry', defaultLabel: 'Pantry', icon: 'kitchen' },
  { key: 'frozen', defaultLabel: 'Frozen', icon: 'ac_unit' },
  { key: 'beverages', defaultLabel: 'Beverages', icon: 'local_drink' },
  { key: 'household', defaultLabel: 'Household', icon: 'cleaning_services' },
] as const

const STEPS = [
  {
    key: 'shop',
    icon: 'storefront',
    defaultTitle: 'Shop',
    defaultBody: 'Browse thousands of fresh items from local stores.',
  },
  {
    key: 'pick',
    icon: 'event',
    defaultTitle: 'Pick a slot',
    defaultBody: 'Choose a same-day or scheduled delivery window.',
  },
  {
    key: 'enjoy',
    icon: 'home',
    defaultTitle: 'Unpack',
    defaultBody: 'Your shopper hand-picks and delivers in hours.',
  },
] as const

const SAMPLE_PRODUCTS = [
  {
    id: 'p-1',
    name: 'Hass Avocados',
    brand: 'Bushel Farms',
    category: 'produce',
    size: '4 ct',
    price_cents: 599,
    badges: ['organic', 'local'] as const,
  },
  {
    id: 'p-2',
    name: 'Sourdough Boule',
    brand: 'Hearth Bakery',
    category: 'bakery',
    size: '24 oz',
    price_cents: 649,
    badges: ['new'] as const,
  },
  {
    id: 'p-3',
    name: 'Whole Milk',
    brand: 'Pasture Dairy',
    category: 'dairy',
    size: '1 gal',
    price_cents: 549,
    badges: ['local'] as const,
  },
  {
    id: 'p-4',
    name: 'Free-Range Eggs',
    brand: 'Fjord Farms',
    category: 'dairy',
    size: '12 ct',
    price_cents: 699,
    badges: ['organic'] as const,
  },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={cm.cn('sticky top-0 z-50 backdrop-blur-md border-b border-outline-variant/30')}
        style={{ background: 'color-mix(in srgb, var(--color-surface) 85%, transparent)' }}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            cm.mxAuto,
          )}
        >
          <BrandWordmark />
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/shop"
                data-mol-id="nav-go-to-dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'text-white rounded-full shadow-md hover:shadow-lg transition-shadow',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-gradient-mid), var(--color-gradient-end))',
                }}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'hover:text-primary transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'text-white rounded-full shadow-md hover:shadow-lg transition-shadow',
                  )}
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-gradient-mid), var(--color-gradient-end))',
                  }}
                >
                  {t('common.getStarted', {}, { defaultValue: 'Get started' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main
        className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 12), cm.mxAuto, 'space-y-16')}
      >
        {/* Hero — left copy + ZIP gate, right live-bushel preview (design split) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'font-bold uppercase tracking-widest text-primary-dark mb-1',
              )}
            >
              {t('landing.eyebrow', {}, { defaultValue: 'Same-day grocery delivery' })}
            </p>
            <h1
              className={cm.cn(
                cm.textSize('5xl'),
                'md:text-6xl font-bold tracking-tight leading-tight text-on-surface [font-family:var(--font-headline)]',
              )}
            >
              {t('landing.heroTitle', {}, { defaultValue: 'Freshness at your door, in hours.' })}
            </h1>
            <p className={cm.cn(cm.textSize('lg'), cm.textMuted, 'max-w-lg')}>
              {t(
                'landing.heroSubtitle',
                {},
                {
                  defaultValue:
                    'Schedule weekly deliveries with smart reorder of staples and live driver tracking.',
                },
              )}
            </p>
            {/* ZIP gate → store browsing */}
            <div
              className={cm.cn(cm.flex({ align: 'stretch', gap: 'sm' }), 'flex-col sm:flex-row')}
            >
              <div className="relative flex-grow max-w-sm">
                <span
                  className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
                  aria-hidden="true"
                >
                  location_on
                </span>
                <input
                  type="text"
                  aria-label={t(
                    'landing.zipPlaceholder',
                    {},
                    { defaultValue: 'Enter your ZIP code' },
                  )}
                  placeholder={t(
                    'landing.zipPlaceholder',
                    {},
                    { defaultValue: 'Enter your ZIP code' },
                  )}
                  className={
                    'w-full h-full pl-12 pr-4 py-4 rounded-lg border border-outline-variant bg-surface shadow-sm placeholder:text-on-surface-variant text-base focus:outline-none focus:border-primary'
                  }
                />
              </div>
              <Link
                to="/shop"
                data-mol-id="landing-hero-see-options"
                className={cm.cn(
                  cm.sp('px', 8),
                  'py-4 inline-flex items-center justify-center font-medium bg-primary text-on-primary rounded-lg hover:bg-primary-dark transition-colors shadow-sm shrink-0',
                )}
              >
                {t('landing.seeDeliveryOptions', {}, { defaultValue: 'See delivery options' })}
              </Link>
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
                'pt-4 border-t border-outline-variant/40',
              )}
            >
              {[
                { icon: 'storefront', key: 'localStores', default: 'Local stores' },
                { icon: 'verified', key: 'freshness', default: '100% freshness' },
                { icon: 'local_shipping', key: 'sameDay', default: 'Same-day' },
              ].map((chip) => (
                <span key={chip.key} className={cm.flex({ align: 'center', gap: 'xs' })}>
                  <span
                    className="material-symbols-outlined text-primary text-[20px]"
                    aria-hidden="true"
                  >
                    {chip.icon}
                  </span>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                    {t(`landing.trust.${chip.key}`, {}, { defaultValue: chip.default })}
                  </span>
                </span>
              ))}
            </div>
          </div>

          <BushelHero
            itemsInStock={4823}
            averageDeliveryMins="58"
            freshDealsCount={42}
            deliverToLabel="Springfield, OR"
            headlineKey="landing.previewHeadline"
            headlineDefault="Tonight's bushel: 4,800+ items, ready to deliver."
            subtitleKey="landing.previewSubtitle"
            subtitleDefault="Pick a slot and we'll have your essentials at the door before sunset."
            primaryCta={{
              to: '/signup',
              key: 'landing.previewCta',
              defaultLabel: 'Get started',
              icon: 'arrow_forward',
            }}
            secondaryCta={{
              to: '/shop',
              key: 'landing.previewSecondary',
              defaultLabel: 'Browse',
              icon: 'storefront',
            }}
          />
        </section>

        {/* Delivery promise strip (design: categoryBanner band) */}
        <section className="-mx-6 bg-[var(--color-promise-band)] border-y border-outline-variant/40">
          <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), 'py-8')}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { icon: 'timer', key: 'promise60', default: 'Delivered in 60 min' },
                { icon: 'calendar_today', key: 'promiseSlots', default: 'Same-day slots' },
                { icon: 'thumb_up', key: 'promiseFresh', default: 'Fresh or refund' },
                { icon: 'local_mall', key: 'promiseFree', default: 'Free over $35' },
              ].map((p) => (
                <div
                  key={p.key}
                  className={cm.flex({ direction: 'col', align: 'center', gap: 'sm' })}
                >
                  <span
                    className={
                      'w-12 h-12 rounded-full bg-surface flex items-center justify-center text-primary shadow-sm'
                    }
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined">{p.icon}</span>
                  </span>
                  <span className="font-semibold text-on-surface [font-family:var(--font-headline)]">
                    {t(`landing.promise.${p.key}`, {}, { defaultValue: p.default })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div
            className={cm.cn(
              cm.flex({ align: 'end', justify: 'between', wrap: 'wrap' }),
              cm.sp('mb', 6),
              'gap-3',
            )}
          >
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-black uppercase tracking-widest text-primary-dark mb-1',
                )}
              >
                {t('landing.categoriesEyebrow', {}, { defaultValue: 'Aisles' })}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('3xl'),
                  'font-extrabold tracking-tight [font-family:var(--font-headline)]',
                )}
              >
                {t('landing.categoriesHeading', {}, { defaultValue: 'Shop by category' })}
              </h2>
            </div>
            <Link
              to="/shop"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'inline-flex items-center gap-1 text-primary-dark hover:underline',
              )}
            >
              {t('common.viewAll', {}, { defaultValue: 'View all' })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
          <div className={cm.grid({ cols: 4, gap: 'md' })}>
            {FEATURED_CATEGORIES.map((cat) => (
              <Link
                key={cat.key}
                to={`/shop?category=${cat.key}`}
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
                  'bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all',
                )}
              >
                <span
                  className={
                    'inline-flex items-center justify-center w-12 h-12 rounded-xl text-primary-dark'
                  }
                  style={{
                    background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                  }}
                  aria-hidden="true"
                >
                  <span className={'material-symbols-outlined text-2xl'}>{cat.icon}</span>
                </span>
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                  {t(`landing.category.${cat.key}`, {}, { defaultValue: cat.defaultLabel })}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className={cm.sp('mb', 6)}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-primary-dark mb-1',
              )}
            >
              {t('landing.featuredEyebrow', {}, { defaultValue: "Editor's picks" })}
            </p>
            <h2
              className={cm.cn(
                cm.textSize('3xl'),
                'font-extrabold tracking-tight [font-family:var(--font-headline)]',
              )}
            >
              {t('landing.featuredHeading', {}, { defaultValue: 'Fresh today' })}
            </h2>
          </div>
          <FeaturedProductsGrid products={SAMPLE_PRODUCTS} cols="2-3-4" />
        </section>

        <section className={'rounded-3xl p-10 lg:p-14 bg-surface-container'}>
          <div className="text-center mb-10">
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-primary-dark mb-2',
              )}
            >
              {t('landing.howEyebrow', {}, { defaultValue: 'Three steps' })}
            </p>
            <h2
              className={cm.cn(
                cm.textSize('3xl'),
                'font-extrabold tracking-tight [font-family:var(--font-headline)]',
              )}
            >
              {t(
                'landing.howItWorksHeading',
                { app: APP_NAME },
                { defaultValue: 'How {{app}} works' },
              )}
            </h2>
          </div>
          <div className={cm.grid({ cols: 3, gap: 'lg' })}>
            {STEPS.map((step, idx) => (
              <div
                key={step.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'relative bg-surface-container-lowest rounded-2xl shadow-sm',
                )}
              >
                <span
                  className={
                    'absolute -top-3 -left-3 inline-flex items-center justify-center w-8 h-8 rounded-full text-on-primary text-xs font-black shadow-md'
                  }
                  style={{ background: 'var(--color-primary)' }}
                >
                  {idx + 1}
                </span>
                <span
                  className={
                    'inline-flex items-center justify-center w-12 h-12 rounded-xl text-primary-dark mb-4'
                  }
                  style={{
                    background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                  }}
                  aria-hidden="true"
                >
                  <span className={'material-symbols-outlined text-2xl'}>{step.icon}</span>
                </span>
                <h3 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight mb-2')}>
                  {t(`landing.step.${step.key}.title`, {}, { defaultValue: step.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                  {t(`landing.step.${step.key}.body`, {}, { defaultValue: step.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          className={
            'relative overflow-hidden rounded-[2rem] p-10 lg:p-14 text-center text-white shadow-xl'
          }
          style={{
            background:
              'linear-gradient(135deg, var(--color-gradient-start) 0%, var(--color-gradient-mid) 50%, var(--color-gradient-end) 100%)',
          }}
        >
          <div
            className={
              'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl pointer-events-none'
            }
            aria-hidden="true"
          />
          <div
            className={
              'absolute -left-20 -top-20 w-56 h-56 rounded-full bg-lime-300/30 blur-3xl pointer-events-none'
            }
            aria-hidden="true"
          />
          <div className="relative z-10">
            <p className={'text-[11px] font-black uppercase tracking-widest text-white/85 mb-3'}>
              {t('landing.ctaEyebrow', {}, { defaultValue: 'Ready when you are' })}
            </p>
            <h2 className={'text-4xl md:text-5xl font-black tracking-tight'}>
              {t('landing.ctaHeadline', {}, { defaultValue: 'Your first delivery is on us.' })}
            </h2>
            <p className={'text-base md:text-lg text-white/90 mt-4 max-w-xl mx-auto'}>
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'Sign up and skip the delivery fee on your first bushel — no minimum order.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={
                'inline-flex items-center gap-2 mt-6 px-8 py-3.5 font-bold bg-surface text-primary-dark rounded-full shadow-lg hover:shadow-xl transition-shadow'
              }
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                add_shopping_cart
              </span>
              {t('landing.ctaButton', {}, { defaultValue: 'Claim your free delivery' })}
            </Link>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn(
          cm.sp('py', 10),
          cm.textCenter,
          cm.textSize('sm'),
          'bg-surface-container text-on-surface-variant',
        )}
      >
        <p>
          {t(
            'common.copyrightAllRightsReserved',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '© {{year}} {{app}}. All rights reserved.' },
          )}
          {' — Built with '}
          <a
            href="https://molecule.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline font-medium"
          >
            Molecule.dev
          </a>
        </p>
      </footer>
    </div>
  )
}
