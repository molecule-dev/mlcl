import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { DestinationDiscoveryCard } from '../components/DestinationDiscoveryCard.js'
import { RoostHeroSearchCard } from '../components/RoostHeroSearchCard.js'
import { RoostListingCard } from '../components/RoostListingCard.js'
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
                'text-primary-dark tracking-tight',
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
              {t('landing.nav.search', {}, { defaultValue: 'Find a stay' })}
            </Link>
            <Link
              to="/host"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'hidden md:inline text-on-surface-variant hover:text-primary',
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
          <RoostHeroSearchCard />
        </section>

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
                  'leading-tight tracking-tight',
                )}
                style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
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
                  'leading-tight tracking-tight',
                )}
                style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
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
                // Inherits the band's text-on-primary (#111827, 4.74:1 on the teal).
                // No coral clears 4.5:1 there — pale coral tops out at 3.4:1 — and the
                // app already picked a dark on-primary for exactly this reason.
                'uppercase tracking-[0.25em]',
              )}
            >
              {t('landing.cta.eyebrow', {}, { defaultValue: 'For hosts' })}
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
                { defaultValue: 'Open your door. Earn what your home is worth.' },
              )}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mt', 4),
                cm.maxW('2xl'),
                cm.mxAuto,
                // white/85 was 3.13:1 on the bg-primary band (axe serious); the theme's
                // on-primary ink pair (#111827) gives 4.74:1
                'text-on-primary',
              )}
            >
              {t(
                'landing.cta.subheading',
                { appName: APP_NAME },
                {
                  defaultValue:
                    '{{appName}} takes care of payouts, taxes, and traveler vetting so you can focus on hosting. Most new hosts earn their first $1,000 within 30 days.',
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
                to="/host"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  'rounded-full bg-accent text-on-primary hover:bg-accent-hover transition-colors shadow-lg',
                )}
              >
                {t('landing.cta.host', {}, { defaultValue: 'Start hosting' })}
              </Link>
              <Link
                to="/search"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  // white was 3.74:1 on the bg-primary band (axe serious); on-primary = 4.74:1
                  'rounded-full border border-surface/40 text-on-primary hover:bg-surface/10 transition-colors',
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
                  'text-primary-dark tracking-tight',
                )}
                style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
              >
                {APP_NAME}
              </span>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                {t('landing.footer.tagline', {}, { defaultValue: 'Stay like you belong.' })}
              </p>
            </div>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), cm.textSize('sm'))}>
              <Link to="/search" className={'text-on-surface-variant hover:text-primary'}>
                {t('landing.footer.search', {}, { defaultValue: 'Find a stay' })}
              </Link>
              <Link to="/host" className={'text-on-surface-variant hover:text-primary'}>
                {t('landing.footer.host', {}, { defaultValue: 'Become a host' })}
              </Link>
              <Link to="/login" className={'text-on-surface-variant hover:text-primary'}>
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
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
