import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
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
          <Link to="/" className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span
              className={
                'inline-flex items-center justify-center w-9 h-9 rounded-full text-white shadow-md'
              }
              style={{
                background:
                  'linear-gradient(135deg, var(--color-gradient-mid), var(--color-gradient-end))',
              }}
              aria-hidden="true"
            >
              <span
                className={'material-symbols-outlined text-xl'}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                eco
              </span>
            </span>
            <span
              className={cm.cn(cm.textSize('xl'), 'font-black tracking-tight')}
              style={{ fontFamily: 'DM Sans, sans-serif', color: 'var(--color-primary)' }}
            >
              {APP_NAME}
            </span>
          </Link>
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
        <section className="text-center max-w-3xl mx-auto">
          <p
            className={cm.cn(
              cm.textSize('xs'),
              'font-black uppercase tracking-widest text-primary-dark mb-4',
            )}
          >
            {t('landing.eyebrow', {}, { defaultValue: 'Same-day grocery delivery' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('5xl'),
              'md:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95]',
            )}
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            {t('landing.heroTitle', {}, { defaultValue: 'Freshness at your door, in hours.' })}
          </h1>
          <p
            className={cm.cn(cm.textSize('lg'), cm.sp('mt', 6), cm.textMuted, 'max-w-2xl mx-auto')}
          >
            {t(
              'landing.heroSubtitle',
              {},
              {
                defaultValue:
                  'Schedule weekly deliveries with smart reorder of staples and live driver tracking.',
              },
            )}
          </p>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'md', wrap: 'wrap' }),
              cm.sp('mt', 8),
            )}
          >
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 8),
                cm.fontWeight('bold'),
                'py-3.5 inline-flex items-center gap-2 text-white rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--color-gradient-mid), var(--color-gradient-end))',
              }}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                shopping_cart
              </span>
              {t('landing.heroCta', {}, { defaultValue: 'Start shopping free' })}
            </Link>
            <Link
              to="/shop"
              className={cm.cn(
                cm.sp('px', 8),
                cm.fontWeight('bold'),
                'py-3.5 inline-flex items-center gap-2 border-2 border-primary text-primary-dark rounded-full hover:bg-primary/5 transition-colors',
              )}
            >
              {t('landing.heroSecondary', {}, { defaultValue: 'Browse the aisles' })}
            </Link>
          </div>
        </section>

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

        <section>
          <header
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
                className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}
                style={{ fontFamily: 'DM Sans, sans-serif' }}
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
          </header>
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
          <header className={cm.sp('mb', 6)}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-primary-dark mb-1',
              )}
            >
              {t('landing.featuredEyebrow', {}, { defaultValue: "Editor's picks" })}
            </p>
            <h2
              className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {t('landing.featuredHeading', {}, { defaultValue: 'Fresh today' })}
            </h2>
          </header>
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
              className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}
              style={{ fontFamily: 'DM Sans, sans-serif' }}
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
                <h3
                  className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight mb-2')}
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
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
            <h2
              className={'text-4xl md:text-5xl font-black tracking-tight'}
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
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
        </p>
      </footer>
    </div>
  )
}
