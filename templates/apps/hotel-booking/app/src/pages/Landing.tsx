import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useHttpClient, useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { DestinationDiscoveryCard } from '../components/DestinationDiscoveryCard.js'
import { PropertyListingCard } from '../components/PropertyListingCard.js'
import { SojournHeroSearchCard } from '../components/SojournHeroSearchCard.js'
import { loadContent } from '../config.js'
import { unwrapList } from '../lib/unwrap.js'

// Destination names must match cities/countries that exist in the seeded
// property data so each card's /search?q= link returns real results.
const FEATURED_DESTINATIONS = [
  {
    id: 'd1',
    name: 'Tokyo, Japan',
    subtitle: 'Garden pavilions and quiet ryokan mornings',
    thumbnail: 'https://picsum.photos/seed/sojourn-d1/1200/900',
    pill: 'Editor pick',
  },
  {
    id: 'd2',
    name: 'Lisbon, Portugal',
    subtitle: 'Hilltop miradouros and pastel facades',
    thumbnail: 'https://picsum.photos/seed/sojourn-d2/1200/900',
    pill: 'Trending',
  },
  {
    id: 'd3',
    name: 'Bellagio, Italy',
    subtitle: 'Lakeside villas and slow Lake Como mornings',
    thumbnail: 'https://picsum.photos/seed/sojourn-d3/1200/900',
    pill: 'Lakefront',
  },
  {
    id: 'd4',
    name: 'Marrakech, Morocco',
    subtitle: 'Riads, souks, and rooftop terraces',
    thumbnail: 'https://picsum.photos/seed/sojourn-d4/1200/900',
    pill: 'Riads',
  },
] as const

interface PreviewProperty {
  id: string
  name: string
  city: string
  country: string
  rating: number
  review_count: number
  price_per_night_cents: number
  thumbnail_url?: string | null
  amenities?: string[]
  badges?: string[]
}

const EDITORIAL = [
  {
    id: 'e1',
    tag: "Editor's pick",
    title: '12 boutique hotels for slow weekends',
    read: '8 min read',
    thumbnail: 'https://picsum.photos/seed/sojourn-e1/800/600',
  },
  {
    id: 'e2',
    tag: 'Trending',
    title: 'Mountain retreats with morning saunas',
    read: '6 min read',
    thumbnail: 'https://picsum.photos/seed/sojourn-e2/800/600',
  },
  {
    id: 'e3',
    tag: 'New',
    title: 'Hidden coastal stays for shoulder season',
    read: '5 min read',
    thumbnail: 'https://picsum.photos/seed/sojourn-e3/800/600',
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const isAuthenticated = useIsAuthenticated()
  const [previewProperties, setPreviewProperties] = useState<PreviewProperty[]>([])

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/properties')
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<PreviewProperty>(res)
        setPreviewProperties(list.slice(0, 3))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [http])

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      {/* Top nav band */}
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
              className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'text-primary')}
              style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
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
            <LanguagePicker display="icon" />
            {isAuthenticated ? (
              <Link
                to="/trips"
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
        {/* Hero */}
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

        {/* Featured destinations */}
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
                  cm.fontWeight('bold'),
                  cm.sp('mt', 2),
                  'leading-tight',
                )}
                style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
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

        {/* Stay-the-app preview — three real properties styled exactly
            like the in-app PropertyListingCard so visitors see the app
            from the inside. */}
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
                    cm.fontWeight('bold'),
                    cm.sp('mt', 2),
                    'leading-tight',
                  )}
                  style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
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
                        'Every property on {{appName}} is personally vetted by our editorial team — no aggregator inventory, no bait-and-switch listings.',
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
              {previewProperties.length > 0
                ? previewProperties.map((p) => <PropertyListingCard key={p.id} property={p} />)
                : Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className={cm.cn(
                        'aspect-[4/3] rounded-2xl bg-surface-container animate-pulse',
                      )}
                    />
                  ))}
            </div>
          </div>
        </section>

        {/* Editorial / journal */}
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
                  cm.fontWeight('bold'),
                  cm.sp('mt', 2),
                  'leading-tight',
                )}
                style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
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
                      'uppercase tracking-[0.25em] text-accent-ink',
                    )}
                  >
                    {item.tag}
                  </p>
                  <h3
                    className={cm.cn(
                      cm.textSize('xl'),
                      cm.fontWeight('semibold'),
                      cm.sp('mt', 2),
                      'leading-snug',
                    )}
                    style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
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

        {/* CTA band */}
        <section className={cm.cn('bg-primary text-on-primary relative overflow-hidden')}>
          <div
            className={cm.cn(
              cm.w(96),
              cm.h(96),
              cm.roundedFull,
              'absolute -right-24 -bottom-24 bg-accent/30 blur-3xl',
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
                /* On the red band, amber tops out ~3.5:1 — white passes (4.98:1). */
                'uppercase tracking-[0.25em] text-on-primary',
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
                cm.fontWeight('bold'),
                cm.sp('mt', 3),
                'leading-[0.95]',
              )}
              style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
            >
              {t(
                'landing.cta.heading',
                {},
                { defaultValue: 'Members-only rates. Every booking, every time.' },
              )}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mt', 4),
                cm.maxW('2xl'),
                cm.mxAuto,
                'text-white', // was text-white/85 — 3.96:1 on the #d32f2f loyalty band; solid white = 5.0:1
              )}
            >
              {t(
                'landing.cta.subheading',
                {},
                {
                  defaultValue:
                    'Earn loyalty points on every stay, unlock late checkouts and room upgrades, and get first access to new properties before they list publicly.',
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
                  /* amber-700 (#b45309) = 5.02:1 with white text; the raw accent
                     #ffb300 was 1.79:1 (axe serious). Same stop as the card badge. */
                  'rounded-full bg-amber-700 text-on-primary hover:bg-amber-800 transition-colors shadow-lg',
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

      {/* Footer */}
      <footer className={cm.cn('bg-surface border-t border-outline-variant/40')}>
        <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 12), cm.mxAuto)}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
            )}
          >
            <div>
              <span
                className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'text-primary')}
                style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
              >
                {APP_NAME}
              </span>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                {t('landing.footer.tagline', {}, { defaultValue: 'Stay somewhere extraordinary.' })}
              </p>
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
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
              <LegalModalLinks
                linkClassName={'text-on-surface-variant hover:text-primary'}
                appName={APP_NAME}
                loadContent={loadContent}
                privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
                termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
              />
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
