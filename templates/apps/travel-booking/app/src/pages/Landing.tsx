import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { DestinationDiscoveryCard } from '../components/DestinationDiscoveryCard.js'
import { PropertyListingCard } from '../components/PropertyListingCard.js'
import { SojournHeroSearchCard } from '../components/SojournHeroSearchCard.js'

const FEATURED_DESTINATIONS = [
  {
    id: 'd1',
    name: 'Oaxaca, Mexico',
    subtitle: 'Cloud forests, mezcal cellars, and hand-carved villas',
    thumbnail: 'https://picsum.photos/seed/sojourn-tb-d1/1200/900',
    pill: 'Editor pick',
  },
  {
    id: 'd2',
    name: 'Faroe Islands',
    subtitle: 'Turf-roofed cabins on basalt cliffs, aurora at midnight',
    thumbnail: 'https://picsum.photos/seed/sojourn-tb-d2/1200/900',
    pill: 'Rare find',
  },
  {
    id: 'd3',
    name: 'Cinque Terre, Italy',
    subtitle: 'Lighthouse suites, swimming coves, and villages by boat',
    thumbnail: 'https://picsum.photos/seed/sojourn-tb-d3/1200/900',
    pill: 'Coastal',
  },
  {
    id: 'd4',
    name: 'Patagonia, Argentina',
    subtitle: 'Working ranches, glacier hikes, and open-fire dinners',
    thumbnail: 'https://picsum.photos/seed/sojourn-tb-d4/1200/900',
    pill: 'Adventure',
  },
] as const

const PREVIEW_PROPERTIES = [
  {
    id: 'casa-mirador-oaxaca',
    name: 'Casa Mirador Oaxaca',
    city: 'Oaxaca',
    country: 'Mexico',
    rating: 4.9,
    review_count: 348,
    price_per_night_cents: 26900,
    thumbnail_url: 'https://picsum.photos/seed/sojourn-tb-p1/800/600',
    amenities: ['Plunge pool', 'Mezcal cellar', 'Mountain trails'],
    badges: ['editor_pick', 'rare_find'],
  },
  {
    id: 'the-faroe-hideaway',
    name: 'The Faroe Hideaway',
    city: 'Tórshavn',
    country: 'Faroe Islands',
    rating: 4.9,
    review_count: 142,
    price_per_night_cents: 41200,
    thumbnail_url: 'https://picsum.photos/seed/sojourn-tb-p3/800/600',
    amenities: ['Aurora viewing', 'Hot tub', 'Sea kayaks'],
    badges: ['new'],
  },
  {
    id: 'lighthouse-suites-cinque-terre',
    name: 'Lighthouse Suites Cinque Terre',
    city: 'Vernazza',
    country: 'Italy',
    rating: 4.8,
    review_count: 305,
    price_per_night_cents: 38900,
    thumbnail_url: 'https://picsum.photos/seed/sojourn-tb-p7/800/600',
    amenities: ['Sea access', 'Private boat', 'Pool'],
    badges: ['rare_find'],
  },
]

const EDITORIAL = [
  {
    id: 'e1',
    tag: 'Field guide',
    title: 'How to plan a slow week in Oaxaca',
    read: '7 min read',
    thumbnail: 'https://picsum.photos/seed/sojourn-tb-e1/800/600',
  },
  {
    id: 'e2',
    tag: 'Worth the trip',
    title: 'Six remote retreats with private hot tubs',
    read: '5 min read',
    thumbnail: 'https://picsum.photos/seed/sojourn-tb-e2/800/600',
  },
  {
    id: 'e3',
    tag: 'New',
    title: 'Booking Patagonia: shoulder seasons that pay off',
    read: '6 min read',
    thumbnail: 'https://picsum.photos/seed/sojourn-tb-e3/800/600',
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) navigate('/search', { replace: true })
  }, [isAuthenticated, navigate])

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={cm.cn(
          'sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-outline-variant/40',
        )}
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
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('extrabold'),
                'text-primary tracking-tight',
              )}
              style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
            >
              {APP_NAME}
            </span>
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'lg' })}>
            <Link
              to="/search"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'hidden md:inline text-on-surface-variant hover:text-primary',
              )}
            >
              {t('landing.nav.search', {}, { defaultValue: 'Search stays' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/search"
                data-mol-id="nav-go-to-dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors',
                )}
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
                    'hidden md:inline text-on-surface hover:text-primary',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors',
                  )}
                >
                  {t(
                    'landing.nav.join',
                    { appName: APP_NAME },
                    { defaultValue: 'Join {{appName}}' },
                  )}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        <section
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('pt', 10),
            cm.sp('pb', 16),
            cm.mxAuto,
          )}
        >
          <SojournHeroSearchCard />
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('pb', 20), cm.mxAuto)}>
          <header className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 8))}>
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-[0.25em] text-primary',
                )}
              >
                {t('landing.destinations.eyebrow', {}, { defaultValue: 'Where to next' })}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('4xl'),
                  cm.fontWeight('extrabold'),
                  cm.sp('mt', 2),
                  'leading-tight tracking-tight',
                )}
                style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
              >
                {t('landing.destinations.heading', {}, { defaultValue: 'Featured destinations' })}
              </h2>
            </div>
            <Link
              to="/search"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-primary hover:underline hidden md:inline-flex items-center gap-1',
              )}
            >
              {t('landing.destinations.seeAll', {}, { defaultValue: 'See all destinations' })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </header>
          <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5')}>
            {FEATURED_DESTINATIONS.map((d) => (
              <DestinationDiscoveryCard key={d.id} destination={d} />
            ))}
          </div>
        </section>

        <section className={cm.cn('bg-surface-container-low')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 20), cm.mxAuto)}>
            <header
              className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 8))}
            >
              <div>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-[0.25em] text-primary',
                  )}
                >
                  {t('landing.preview.eyebrow', {}, { defaultValue: 'A peek inside' })}
                </p>
                <h2
                  className={cm.cn(
                    cm.textSize('4xl'),
                    cm.fontWeight('extrabold'),
                    cm.sp('mt', 2),
                    'leading-tight tracking-tight',
                  )}
                  style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
                >
                  {t(
                    'landing.preview.heading',
                    {},
                    { defaultValue: 'Hand-picked stays this month' },
                  )}
                </h2>
                <p
                  className={cm.cn(
                    cm.textSize('base'),
                    cm.sp('mt', 2),
                    cm.maxW('xl'),
                    'text-on-surface-variant',
                  )}
                >
                  {t(
                    'landing.preview.subheading',
                    { appName: APP_NAME },
                    {
                      defaultValue:
                        'Every property on {{appName}} is personally vetted by our editorial team — no aggregator inventory, no bait-and-switch listings, and free cancellation on every itinerary.',
                    },
                  )}
                </p>
              </div>
              <Link
                to="/search"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-primary hover:underline hidden md:inline-flex items-center gap-1',
                )}
              >
                {t('landing.preview.browseAll', {}, { defaultValue: 'Browse the full collection' })}
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            </header>
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6')}>
              {PREVIEW_PROPERTIES.map((p) => (
                <PropertyListingCard key={p.id} property={p} />
              ))}
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 20), cm.mxAuto)}>
          <header className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 8))}>
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-[0.25em] text-primary',
                )}
              >
                {t('landing.journal.eyebrow', {}, { defaultValue: 'From the journal' })}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('4xl'),
                  cm.fontWeight('extrabold'),
                  cm.sp('mt', 2),
                  'leading-tight tracking-tight',
                )}
                style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
              >
                {t('landing.journal.heading', {}, { defaultValue: 'Stories worth packing for' })}
              </h2>
            </div>
          </header>
          <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-6')}>
            {EDITORIAL.map((item) => (
              <article
                key={item.id}
                className={cm.cn(
                  'group bg-surface rounded-2xl shadow-sm hover:shadow-lg transition-all overflow-hidden',
                )}
              >
                <div className="aspect-[4/3] bg-surface-variant overflow-hidden">
                  <img
                    src={item.thumbnail}
                    alt=""
                    className={cm.cn(
                      cm.w('full'),
                      cm.h('full'),
                      'object-cover transition-transform duration-500 group-hover:scale-105',
                    )}
                  />
                </div>
                <div className={cm.sp('p', 5)}>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-[0.25em] text-accent',
                    )}
                  >
                    {item.tag}
                  </p>
                  <h3
                    className={cm.cn(
                      cm.textSize('xl'),
                      cm.fontWeight('bold'),
                      cm.sp('mt', 2),
                      'leading-snug',
                    )}
                    style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className={cm.cn(cm.textSize('xs'), cm.sp('mt', 3), 'text-on-surface-variant')}
                  >
                    {item.read}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={cm.cn('bg-primary text-on-primary relative overflow-hidden')}>
          <div
            className={cm.cn(
              cm.w(96),
              cm.h(96),
              cm.roundedFull,
              'absolute -right-24 -bottom-24 bg-accent/40 blur-3xl',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.maxW('5xl'),
              cm.sp('px', 6),
              cm.sp('py', 20),
              cm.textCenter,
              cm.mxAuto,
              'relative z-10',
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-[0.25em] text-accent',
              )}
            >
              {t(
                'landing.cta.eyebrow',
                { appName: APP_NAME },
                { defaultValue: '{{appName}} members' },
              )}
            </p>
            <h2
              className={cm.cn(
                cm.textSize('5xl'),
                cm.fontWeight('extrabold'),
                cm.sp('mt', 3),
                'leading-[0.95] tracking-tight',
              )}
              style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
            >
              {t(
                'landing.cta.heading',
                {},
                { defaultValue: 'Wander without worry. Every itinerary, every time.' },
              )}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mt', 4),
                cm.maxW('2xl'),
                cm.mxAuto,
                // white/85 was 4.1:1 on the teal CTA band (axe fail); solid white = 5.04:1
                'text-white',
              )}
            >
              {t(
                'landing.cta.subheading',
                {},
                {
                  defaultValue:
                    'Free cancellation, members-only rates, and a 24/7 trip concierge — earn miles on every booking and unlock first access to new properties.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md', justify: 'center' }),
                cm.sp('mt', 8),
              )}
            >
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  'rounded-full bg-accent text-on-primary hover:bg-accent-hover transition-colors shadow-lg',
                )}
              >
                {t('landing.cta.signup', {}, { defaultValue: 'Create free account' })}
              </Link>
              <Link
                to="/search"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  'rounded-full border border-surface/40 text-white hover:bg-surface/10 transition-colors',
                )}
              >
                {t('nav.browseStays', {}, { defaultValue: 'Browse stays' })}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className={cm.cn('bg-surface border-t border-outline-variant/40')}>
        <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 12), cm.mxAuto)}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
            )}
          >
            <div>
              <span
                className={cm.cn(
                  cm.textSize('2xl'),
                  cm.fontWeight('extrabold'),
                  'text-primary tracking-tight',
                )}
                style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
              >
                {APP_NAME}
              </span>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                {t('landing.footer.tagline', {}, { defaultValue: 'Wander without worry.' })}
              </p>
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
                cm.textSize('sm'),
              )}
            >
              <Link to="/about" className={'text-on-surface-variant hover:text-primary'}>
                {t('nav.about', {}, { defaultValue: 'About' })}
              </Link>
              <Link to="/pricing" className={'text-on-surface-variant hover:text-primary'}>
                {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
              </Link>
              <Link to="/search" className={'text-on-surface-variant hover:text-primary'}>
                {t('common.search', {}, { defaultValue: 'Search' })}
              </Link>
              <Link to="/login" className={'text-on-surface-variant hover:text-primary'}>
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link to="/signup" className={'text-on-surface-variant hover:text-primary'}>
                {t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
              </Link>
            </div>
          </div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mt', 8),
              cm.textCenter,
              'text-on-surface-variant',
            )}
          >
            {t(
              'common.copyrightAllRightsReserved',
              { year: new Date().getFullYear(), app: APP_NAME },
              { defaultValue: '© {{year}} {{app}}. All rights reserved.' },
            )}
          </p>
        </div>
      </footer>
    </div>
  )
}
