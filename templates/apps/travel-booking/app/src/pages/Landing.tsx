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
                'text-primary tracking-tight font-headline',
              )}
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
                  'rounded-lg bg-accent text-on-accent hover:bg-accent-hover transition-colors',
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
                    'rounded-lg bg-accent text-on-accent hover:bg-accent-hover transition-colors shadow-sm',
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
        <SojournHeroSearchCard />

        <section
          className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), 'pt-16', cm.sp('pb', 20), cm.mxAuto)}
        >
          <div className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 8))}>
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
                  'leading-tight tracking-tight font-headline',
                )}
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
          </div>
          <div
            className={cm.cn(
              'flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory',
              '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            )}
          >
            {FEATURED_DESTINATIONS.map((d) => (
              <div key={d.id} className={cm.cn('w-72 shrink-0 snap-start')}>
                <DestinationDiscoveryCard destination={d} />
              </div>
            ))}
          </div>
        </section>

        <section className={cm.cn('bg-surface-container-low')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 20), cm.mxAuto)}>
            <div className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 8))}>
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
                    'leading-tight tracking-tight font-headline',
                  )}
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
            </div>
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6')}>
              {PREVIEW_PROPERTIES.map((p) => (
                <PropertyListingCard key={p.id} property={p} />
              ))}
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 20), cm.mxAuto)}>
          <div className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 8))}>
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
                  'leading-tight tracking-tight font-headline',
                )}
              >
                {t('landing.journal.heading', {}, { defaultValue: 'Stories worth packing for' })}
              </h2>
            </div>
          </div>
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
                      'leading-snug font-headline',
                    )}
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

        <section className={cm.cn('bg-surface-container-low')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 20), cm.mxAuto)}>
            <h2
              className={cm.cn(
                cm.textSize('4xl'),
                cm.fontWeight('extrabold'),
                cm.sp('mb', 8),
                cm.textCenter,
                'leading-tight tracking-tight font-headline',
              )}
            >
              {t('landing.testimonials.heading', {}, { defaultValue: "Wanderers' words" })}
            </h2>
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-8')}>
              {[
                {
                  quote: t(
                    'landing.testimonials.quote1',
                    {},
                    {
                      defaultValue:
                        'The villa matched the photos down to the espresso cups. Booking took three minutes and cancellation terms were printed right on the listing.',
                    },
                  ),
                  author: t('landing.testimonials.author1', {}, { defaultValue: 'Marta R.' }),
                },
                {
                  quote: t(
                    'landing.testimonials.quote2',
                    {},
                    {
                      defaultValue:
                        'I found a turf-roofed cabin in the Faroes that was on no other platform — and the host answered within the hour.',
                    },
                  ),
                  author: t('landing.testimonials.author2', {}, { defaultValue: 'Devon K.' }),
                },
                {
                  quote: t(
                    'landing.testimonials.quote3',
                    {},
                    {
                      defaultValue:
                        'Our flight was cancelled and support rebooked us before we even finished the airline form. That is the whole product for me.',
                    },
                  ),
                  author: t('landing.testimonials.author3', {}, { defaultValue: 'Ines P.' }),
                },
              ].map((item) => (
                <figure
                  key={item.author}
                  className={cm.cn(
                    'bg-surface rounded-lg p-6 shadow-sm text-center',
                    cm.flex({ direction: 'col', gap: 'md' }),
                  )}
                >
                  <blockquote
                    className={cm.cn(cm.textSize('base'), 'italic text-on-surface-variant')}
                  >
                    “{item.quote}”
                  </blockquote>
                  <figcaption
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                      'font-headline text-on-surface',
                    )}
                  >
                    {item.author}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className={cm.cn('bg-primary text-on-primary relative overflow-hidden')}>
          <div
            className={cm.cn(
              cm.w(96),
              cm.h(96),
              cm.roundedFull,
              'absolute -right-24 -bottom-24 bg-coral/40 blur-3xl',
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
                'uppercase tracking-[0.25em]',
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
                'leading-[0.95] tracking-tight font-headline',
              )}
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
                  'rounded-full bg-accent text-on-accent hover:bg-accent-hover transition-colors shadow-lg',
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

      <footer className={cm.cn('bg-surface-container-low border-t border-outline-variant/40')}>
        <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), 'pt-12 pb-8', cm.mxAuto)}>
          <div className={cm.cn('grid grid-cols-1 md:grid-cols-4 gap-10')}>
            <div>
              <span
                className={cm.cn(
                  cm.textSize('2xl'),
                  cm.fontWeight('extrabold'),
                  'text-primary tracking-tight font-headline',
                )}
              >
                {APP_NAME}
              </span>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('mt', 3),
                  'leading-relaxed text-on-surface-variant',
                )}
              >
                {t('landing.footer.tagline', {}, { defaultValue: 'Wander without worry.' })}
              </p>
            </div>
            <div>
              <h4
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.sp('mb', 3),
                  'font-headline text-on-surface',
                )}
              >
                {t('landing.footer.company', {}, { defaultValue: 'Company' })}
              </h4>
              <ul
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'sm' }),
                  cm.textSize('sm'),
                  'text-on-surface-variant',
                )}
              >
                <li>
                  <Link to="/about" className={'hover:text-accent transition-colors'}>
                    {t('nav.about', {}, { defaultValue: 'About' })}
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className={'hover:text-accent transition-colors'}>
                    {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.sp('mb', 3),
                  'font-headline text-on-surface',
                )}
              >
                {t('landing.footer.explore', {}, { defaultValue: 'Explore' })}
              </h4>
              <ul
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'sm' }),
                  cm.textSize('sm'),
                  'text-on-surface-variant',
                )}
              >
                <li>
                  <Link to="/search" className={'hover:text-accent transition-colors'}>
                    {t('common.search', {}, { defaultValue: 'Search' })}
                  </Link>
                </li>
                <li>
                  <Link to="/login" className={'hover:text-accent transition-colors'}>
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </li>
                <li>
                  <Link to="/signup" className={'hover:text-accent transition-colors'}>
                    {t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.sp('mb', 3),
                  'font-headline text-on-surface',
                )}
              >
                {t('landing.footer.legal', {}, { defaultValue: 'Legal' })}
              </h4>
              <ul
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'sm' }),
                  cm.textSize('sm'),
                  'text-on-surface-variant',
                )}
              >
                <li>
                  <Link to="/privacy" className={'hover:text-accent transition-colors'}>
                    {t('nav.privacy', {}, { defaultValue: 'Privacy Policy' })}
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className={'hover:text-accent transition-colors'}>
                    {t('nav.terms', {}, { defaultValue: 'Terms of Service' })}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mt', 10),
              cm.textCenter,
              'text-on-surface-variant',
            )}
          >
            {t(
              'landing.copyright',
              { year: new Date().getFullYear(), app: APP_NAME },
              { defaultValue: '© {{year}} {{app}}' },
            )}{' '}
            — Built with{' '}
            <a
              href="https://molecule.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline font-medium"
            >
              Molecule.dev
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
