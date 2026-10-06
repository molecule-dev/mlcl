import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useHttpClient, useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { DestinationDiscoveryCard } from '../components/DestinationDiscoveryCard.js'
import { RoostHeroSearchCard } from '../components/RoostHeroSearchCard.js'
import { RoostListingCard } from '../components/RoostListingCard.js'
import { loadContent } from '../config.js'
import { unwrapList } from '../lib/unwrap.js'

const FEATURED_DESTINATIONS = [
  {
    id: 'd1',
    name: 'Big Sur, California',
    subtitle: 'Cliffside cabins, redwoods, and fog that rolls in by 4pm',
    thumbnail: 'https://picsum.photos/seed/roost-d1/1200/900',
    pill: 'Editor pick',
  },
  {
    id: 'd2',
    name: 'Marrakech, Morocco',
    subtitle: 'Riads with tiled courtyards, plunge pools, and rooftop breakfasts',
    thumbnail: 'https://picsum.photos/seed/roost-d2/1200/900',
    pill: 'Most loved',
  },
  {
    id: 'd3',
    name: 'Faroe Islands',
    subtitle: 'Glass cabins on basalt cliffs — aurora, sea, and complete quiet',
    thumbnail: 'https://picsum.photos/seed/roost-d3/1200/900',
    pill: 'Rare find',
  },
  {
    id: 'd4',
    name: 'Saint-Émilion, France',
    subtitle: 'Stone cottages on working vineyards — bicycles to the village',
    thumbnail: 'https://picsum.photos/seed/roost-d4/1200/900',
    pill: 'Slow travel',
  },
] as const

interface PreviewListing {
  id: string
  title: string
  city: string
  country: string
  rating: number
  review_count: number
  price_per_night_cents: number
  thumbnail_url?: string | null
  amenities?: string[]
  badges?: string[]
}

const FALLBACK_LISTINGS: PreviewListing[] = [
  {
    id: 'l1',
    title: 'Sunlit Cliffside Cabin',
    city: 'Big Sur',
    country: 'United States',
    rating: 4.94,
    review_count: 287,
    price_per_night_cents: 31800,
    thumbnail_url: 'https://picsum.photos/seed/roost-l1/800/600',
    amenities: ['Outdoor cedar tub', 'Ocean view', 'Pet friendly'],
    badges: ['superhost', 'instant_book'],
  },
  {
    id: 'l3',
    title: 'Riad with Tiled Courtyard',
    city: 'Marrakech',
    country: 'Morocco',
    rating: 4.97,
    review_count: 522,
    price_per_night_cents: 24500,
    thumbnail_url: 'https://picsum.photos/seed/roost-l3/800/600',
    amenities: ['Plunge pool', 'Rooftop terrace', 'Breakfast included'],
    badges: ['superhost', 'instant_book'],
  },
  {
    id: 'l6',
    title: 'Glass House on the Cliffs',
    city: 'Faroe Islands',
    country: 'Faroe Islands',
    rating: 4.99,
    review_count: 88,
    price_per_night_cents: 41200,
    thumbnail_url: 'https://picsum.photos/seed/roost-l6/800/600',
    amenities: ['Geothermal hot tub', 'Aurora wake-up', 'Sauna'],
    badges: ['superhost', 'rare_find'],
  },
]

const EDITORIAL = [
  {
    id: 'e1',
    tag: 'Field guide',
    title: 'Five cabins where you can hear the ocean from bed',
    read: '6 min read',
    thumbnail: 'https://picsum.photos/seed/roost-e1/800/600',
  },
  {
    id: 'e2',
    tag: 'Worth the trip',
    title: 'How to plan a Marrakech week the locals do',
    read: '8 min read',
    thumbnail: 'https://picsum.photos/seed/roost-e2/800/600',
  },
  {
    id: 'e3',
    tag: 'Hosting',
    title: 'What it takes to earn the Superhost badge',
    read: '5 min read',
    thumbnail: 'https://picsum.photos/seed/roost-e3/800/600',
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const isAuthenticated = useIsAuthenticated()
  const [previews, setPreviews] = useState<PreviewListing[]>(FALLBACK_LISTINGS)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/listings?limit=6')
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<PreviewListing>(res.data)
        if (list.length > 0) setPreviews(list.slice(0, 3))
      })
      .catch(() => {
        /* keep fallback */
      })
    return () => {
      cancelled = true
    }
  }, [http])

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav className={cm.cn('absolute top-0 left-0 right-0 z-40')}>
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            cm.mxAuto,
          )}
        >
          <BrandWordmark size="lg" invert />
          <div className={cm.flex({ align: 'center', gap: 'lg' })}>
            <Link
              to="/search"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'hidden md:inline text-white hover:text-primary-fixed transition-colors',
              )}
            >
              {t('landing.nav.search', {}, { defaultValue: 'Find a stay' })}
            </Link>
            <Link
              to="/host"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'hidden md:inline text-white hover:text-primary-fixed transition-colors',
              )}
            >
              {t('landing.nav.host', {}, { defaultValue: 'Become a host' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/search"
                data-mol-id="landing-nav-dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  // text-white was 3.66:1 on the teal (axe serious); the theme's
                  // dark on-primary ink clears 4.5:1 on the brand teal.
                  'rounded-full bg-primary text-on-primary hover:bg-primary-dark transition-colors',
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
                    cm.fontWeight('medium'),
                    'hidden md:inline text-white hover:text-primary-fixed transition-colors',
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
                    cm.fontWeight('medium'),
                    // dark on-primary ink on the teal pill (see the dashboard CTA note)
                    'rounded-full bg-primary text-on-primary hover:bg-primary-dark transition-colors',
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
        {/* Full-bleed image hero with the design's search pill */}
        <RoostHeroSearchCard />

        <section className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('pb', 20), cm.mxAuto)}>
          <div className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 8))}>
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-[0.25em] text-primary-dark',
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
                {t(
                  'landing.destinations.heading',
                  {},
                  { defaultValue: 'Destinations our hosts love' },
                )}
              </h2>
            </div>
            <Link
              to="/search"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-primary-dark hover:underline hidden md:inline-flex items-center gap-1',
              )}
            >
              {t('landing.destinations.seeAll', {}, { defaultValue: 'See all destinations' })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
          <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5')}>
            {FEATURED_DESTINATIONS.map((d) => (
              <DestinationDiscoveryCard key={d.id} destination={d} />
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
                    'uppercase tracking-[0.25em] text-primary-dark',
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
                        'Every {{appName}} listing is hosted by a real person — verified, reviewed, and free to cancel up to 48 hours before check-in.',
                    },
                  )}
                </p>
              </div>
              <Link
                to="/search"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-primary-dark hover:underline hidden md:inline-flex items-center gap-1',
                )}
              >
                {t('landing.preview.browseAll', {}, { defaultValue: 'Browse the full collection' })}
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            </div>
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6')}>
              {previews.map((p) => (
                <RoostListingCard key={p.id} listing={p} />
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
                  'uppercase tracking-[0.25em] text-primary-dark',
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
                {t('landing.journal.heading', {}, { defaultValue: 'Stories from the road' })}
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
                      'uppercase tracking-[0.25em] text-accent-on-surface',
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

        {/* Why travelers choose Roost — trust pillars */}
        <section className={cm.cn('bg-surface-container-low/50')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 20), cm.mxAuto)}>
            <h2
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                cm.sp('mb', 12),
                cm.textCenter,
                'font-headline',
              )}
            >
              {t(
                'landing.why.heading',
                { appName: APP_NAME },
                { defaultValue: 'Why travelers choose {{appName}}' },
              )}
            </h2>
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-10')}>
              {[
                {
                  key: 'vetted',
                  icon: 'verified_user',
                  title: 'Vetted Hosts',
                  body: 'Every host passes a rigorous background check and identity verification process to ensure your safety and comfort.',
                },
                {
                  key: 'support',
                  icon: 'support_agent',
                  title: '24/7 Global Support',
                  body: 'Our dedicated team is always on standby, ready to assist you anywhere, anytime during your stay.',
                },
                {
                  key: 'quality',
                  icon: 'diamond',
                  title: 'Premium Quality',
                  body: 'Look for the Superhost gold badge for guaranteed exceptional hospitality, cleanliness, and amenities.',
                },
              ].map((f) => (
                <div
                  key={f.key}
                  className={cm.cn(cm.flex({ direction: 'col', align: 'center' }), cm.textCenter)}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.sp('mb', 6),
                      'w-16 h-16 bg-surface rounded-full shadow-sm text-primary border border-primary/15',
                    )}
                    aria-hidden="true"
                  >
                    <span className={cm.cn('material-symbols-outlined text-3xl')}>{f.icon}</span>
                  </div>
                  <h3
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.textSize('xl'),
                      cm.sp('mb', 3),
                      'font-headline',
                    )}
                  >
                    {t(`landing.why.${f.key}.title`, {}, { defaultValue: f.title })}
                  </h3>
                  <p
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}
                  >
                    {t(`landing.why.${f.key}.body`, {}, { defaultValue: f.body })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Host banner — dark card with polaroid collage */}
        <section className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 20), cm.mxAuto)}>
          <div
            className={cm.cn(
              'bg-on-primary rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative',
            )}
            data-mol-id="host-banner"
          >
            <div
              className={cm.cn(
                'md:w-[60%] flex flex-col justify-center relative z-10',
                cm.sp('p', 10),
                'md:p-16',
              )}
            >
              <h2
                className={cm.cn(
                  cm.textSize('4xl'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 6),
                  'text-white font-headline',
                )}
              >
                {t('landing.cta.heading', {}, { defaultValue: 'Become a host' })}
              </h2>
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.sp('mb', 8),
                  cm.maxW('md'),
                  'text-white/75 leading-relaxed',
                )}
              >
                {t(
                  'landing.cta.subheading',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      'Turn your extra space into extra income. Join thousands of {{appName}} hosts earning money while sharing their local culture.',
                  },
                )}
              </p>
              <div>
                <Link
                  to="/host"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    'rounded-full bg-accent text-on-primary hover:bg-accent-hover transition-colors shadow-lg shadow-accent/30 inline-block',
                  )}
                >
                  {t('landing.cta.host', {}, { defaultValue: 'Start hosting' })}
                </Link>
              </div>
            </div>
            <div
              className={cm.cn(
                'md:w-[40%] relative min-h-[300px] bg-primary-dark overflow-hidden flex items-center justify-center p-6',
              )}
            >
              {/* Polaroid styled images */}
              <div
                className={cm.cn(
                  'relative w-full max-w-xs aspect-square rotate-3 shadow-xl bg-surface p-3 pb-12 rounded-sm z-10',
                )}
              >
                <img
                  src="https://picsum.photos/seed/roost-host-1/800/800"
                  alt={t(
                    'landing.hostBanner.polaroid1Alt',
                    {},
                    { defaultValue: 'Host home interior' },
                  )}
                  className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
                />
              </div>
              <div
                className={cm.cn(
                  'absolute w-full max-w-xs aspect-square -rotate-6 shadow-xl bg-surface p-3 pb-12 rounded-sm right-4 top-8 opacity-90',
                )}
              >
                <img
                  src="https://picsum.photos/seed/roost-host-2/800/800"
                  alt={t('landing.hostBanner.polaroid2Alt', {}, { defaultValue: 'Host apartment' })}
                  className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={cm.cn('bg-surface-container-low border-t border-outline-variant/40')}>
        <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 12), cm.mxAuto)}>
          <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-2 md:grid-cols-4')}>
            <div className="col-span-2 md:col-span-1">
              <div className={cm.cn(cm.sp('mb', 4))}>
                <BrandWordmark as="span" footer />
              </div>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('mb', 6),
                  cm.maxW('xs'),
                  'text-on-surface-variant',
                )}
              >
                {t(
                  'landing.footer.tagline',
                  {},
                  {
                    defaultValue:
                      'Connecting travelers with unique homes and unforgettable experiences around the world.',
                  },
                )}
              </p>
            </div>
            <div>
              <h4
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.sp('mb', 4),
                  'uppercase text-xs tracking-wider text-on-surface',
                )}
              >
                {t('landing.footer.exploreLabel', {}, { defaultValue: 'Explore' })}
              </h4>
              <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.textSize('sm'))}>
                <li>
                  <Link
                    className="text-on-surface-variant hover:text-primary underline"
                    to="/search"
                  >
                    {t('landing.footer.search', {}, { defaultValue: 'Find a stay' })}
                  </Link>
                </li>
                <li>
                  <Link className="text-on-surface-variant hover:text-primary underline" to="/host">
                    {t('landing.footer.host', {}, { defaultValue: 'Become a host' })}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.sp('mb', 4),
                  'uppercase text-xs tracking-wider text-on-surface',
                )}
              >
                {t('landing.footer.companyLabel', {}, { defaultValue: 'Company' })}
              </h4>
              <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.textSize('sm'))}>
                <li>
                  <Link
                    className="text-on-surface-variant hover:text-primary underline"
                    to="/about"
                  >
                    {t('landing.footer.about', {}, { defaultValue: 'About' })}
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-on-surface-variant hover:text-primary underline"
                    to="/pricing"
                  >
                    {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.sp('mb', 4),
                  'uppercase text-xs tracking-wider text-on-surface',
                )}
              >
                {t('landing.footer.legalLabel', {}, { defaultValue: 'Legal' })}
              </h4>
              <div
                className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'items-start text-sm')}
              >
                <LegalModalLinks
                  linkClassName="text-on-surface-variant hover:text-primary underline"
                  appName={APP_NAME}
                  loadContent={loadContent}
                  privacyLabel={t('landing.footer.privacyPolicy', {}, { defaultValue: 'Privacy' })}
                  termsLabel={t('landing.footer.terms', {}, { defaultValue: 'Terms' })}
                />
              </div>
            </div>
          </div>
          <div
            className={cm.cn(
              'border-t border-outline-variant/40',
              cm.sp('mt', 8),
              cm.sp('pt', 6),
              cm.flex({ direction: 'col', gap: 'sm' }),
              'md:flex-row md:items-center md:justify-between',
            )}
          >
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
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
          </div>
        </div>
      </footer>
    </div>
  )
}
