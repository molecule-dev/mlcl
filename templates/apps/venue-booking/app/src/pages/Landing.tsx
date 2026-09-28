import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AlcoveHeroSearchCard } from '../components/AlcoveHeroSearchCard.js'
import { CategoryTile } from '../components/CategoryTile.js'
import { type VenueListing, VenueListingCard } from '../components/VenueListingCard.js'
import { unwrapList } from '../lib/unwrap.js'

const CATEGORIES = [
  {
    id: 'studio',
    name: 'Studios',
    subtitle: 'Daylight studios with cycloramas + strobes',
    thumbnail: 'https://picsum.photos/seed/alcove-cat-studio/1200/900',
    count: 124,
  },
  {
    id: 'loft',
    name: 'Lofts',
    subtitle: 'Skylit, hardwood, freight elevator — ready to host',
    thumbnail: 'https://picsum.photos/seed/alcove-cat-loft/1200/900',
    count: 96,
  },
  {
    id: 'rooftop',
    name: 'Rooftops',
    subtitle: 'Skyline patios with retractable awnings + bars',
    thumbnail: 'https://picsum.photos/seed/alcove-cat-rooftop/1200/900',
    count: 41,
  },
  {
    id: 'garden',
    name: 'Gardens',
    subtitle: 'Walled gardens, willow canopies, golden-hour magic',
    thumbnail: 'https://picsum.photos/seed/alcove-cat-garden/1200/900',
    count: 28,
  },
  {
    id: 'banquet',
    name: 'Banquet Halls',
    subtitle: 'Restored halls and stained-glass ballrooms',
    thumbnail: 'https://picsum.photos/seed/alcove-cat-banquet/1200/900',
    count: 33,
  },
  {
    id: 'workshop',
    name: 'Workshops',
    subtitle: 'Industrial spaces with mezzanines + tooling',
    thumbnail: 'https://picsum.photos/seed/alcove-cat-workshop/1200/900',
    count: 19,
    href: '/search?type=loft',
  },
] as const

const EDITORIAL_PREVIEW_LIMIT = 3

const EDITORIAL = [
  {
    id: 'e1',
    tag: "Editor's pick",
    title: 'Photoshoot lofts that flatter every brand palette',
    read: '8 min read',
    thumbnail: 'https://picsum.photos/seed/alcove-ed-1/800/600',
  },
  {
    id: 'e2',
    tag: 'How-to',
    title: 'Booking a workshop venue that scales 10 → 100',
    read: '6 min read',
    thumbnail: 'https://picsum.photos/seed/alcove-ed-2/800/600',
  },
  {
    id: 'e3',
    tag: 'New',
    title: 'Five rare-find rooftops we just added this season',
    read: '5 min read',
    thumbnail: 'https://picsum.photos/seed/alcove-ed-3/800/600',
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const isAuthenticated = useIsAuthenticated()
  const [previewVenues, setPreviewVenues] = useState<VenueListing[]>([])

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/venues')
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<VenueListing>(res.data)
        setPreviewVenues(list.slice(0, EDITORIAL_PREVIEW_LIMIT))
      })
      .catch(() => {
        // Silent fallback — Landing renders without preview rows if the
        // venue catalog hasn't seeded yet.
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
                cm.fontWeight('bold'),
                'text-primary font-headline tracking-tight',
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
              {t('landing.nav.search', {}, { defaultValue: 'Browse spaces' })}
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
          <AlcoveHeroSearchCard />
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('pb', 20), cm.mxAuto)}>
          <div className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 8))}>
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-[0.25em] text-primary',
                )}
              >
                {t('landing.categories.eyebrow', {}, { defaultValue: 'Browse by space' })}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('4xl'),
                  cm.fontWeight('extrabold'),
                  cm.sp('mt', 2),
                  'leading-tight font-headline tracking-tight',
                )}
              >
                {t(
                  'landing.categories.heading',
                  {},
                  { defaultValue: 'Every kind of space, every kind of event' },
                )}
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
              {t('landing.categories.seeAll', {}, { defaultValue: 'See every category' })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
          {/* 1/2/3 columns — the tile's top-right count pill needs vertical
              room to clear the bottom-left title; six-across shrank every tile
              until the pill sat on the title text (WAVE-3 contrast fix). */}
          <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5')}>
            {CATEGORIES.map((c) => (
              <CategoryTile key={c.id} category={c} />
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
                    'leading-tight font-headline tracking-tight',
                  )}
                >
                  {t(
                    'landing.preview.heading',
                    {},
                    { defaultValue: 'Hand-picked spaces this month' },
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
                        'Every venue on {{appName}} is personally walked through by our editorial team. No aggregator inventory, no bait-and-switch listings.',
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
            {previewVenues.length > 0 ? (
              <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6')}>
                {previewVenues.map((v) => (
                  <VenueListingCard key={v.id} venue={v} />
                ))}
              </div>
            ) : (
              <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6')}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={cm.cn(
                      'rounded-2xl bg-surface shadow-sm overflow-hidden animate-pulse',
                    )}
                  >
                    <div className="aspect-[4/3] bg-surface-variant" />
                    <div className={cm.sp('p', 5)}>
                      <div className={cm.cn(cm.h(4), cm.w('3/4'), 'bg-surface-variant rounded')} />
                      <div
                        className={cm.cn(
                          cm.h(3),
                          cm.w('1/2'),
                          cm.sp('mt', 3),
                          'bg-surface-variant rounded',
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                  'leading-tight font-headline tracking-tight',
                )}
              >
                {t('landing.journal.heading', {}, { defaultValue: 'Stories worth booking for' })}
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
                    alt={item.title}
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
                      'leading-snug font-headline tracking-tight',
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
              cm.w(80),
              cm.h(80),
              cm.roundedFull,
              'absolute -left-20 -top-20 bg-surface/10 blur-3xl',
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
                'uppercase tracking-[0.25em] text-accent-bright',
              )}
            >
              {t('landing.cta.eyebrow', {}, { defaultValue: 'Become a host' })}
            </p>
            <h2
              className={cm.cn(
                cm.textSize('5xl'),
                cm.fontWeight('extrabold'),
                cm.sp('mt', 3),
                'leading-[0.95] font-headline tracking-tight',
              )}
            >
              {t('landing.cta.heading', {}, { defaultValue: 'Your space deserves an audience.' })}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mt', 4),
                cm.maxW('2xl'),
                cm.mxAuto,
                /* /95 — /85 composites to 4.17:1 on the #2b7a6f CTA band
                   (axe color-contrast serious); /95 composites to 4.77:1. */
                'text-on-primary/95',
              )}
            >
              {t(
                'landing.cta.subheading',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'List on {{appName}} in 20 minutes. We bring the editorial photography, transparent pricing, and a calendar that protects your downtime.',
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
                  'rounded-full bg-accent text-on-primary hover:bg-accent/90 transition-colors shadow-lg',
                )}
              >
                {t('landing.cta.signup', {}, { defaultValue: 'List your space' })}
              </Link>
              <Link
                to="/search"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  'rounded-full border border-surface/40 text-on-primary hover:bg-surface/10 transition-colors',
                )}
              >
                {t('landing.cta.explore', {}, { defaultValue: 'Browse spaces first' })}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className={cm.cn('border-t border-outline-variant/40 bg-surface-container-low')}>
        <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), 'pt-12 pb-8', cm.mxAuto)}>
          <div className={cm.cn('grid grid-cols-1 gap-10 md:grid-cols-4')}>
            <div>
              <span
                className={cm.cn(
                  cm.textSize('2xl'),
                  cm.fontWeight('bold'),
                  'text-primary font-headline tracking-tight',
                )}
              >
                {APP_NAME}
              </span>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 3), 'text-on-surface-variant')}>
                {t('landing.footer.tagline', {}, { defaultValue: 'Every space, a story.' })}
              </p>
            </div>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'sm' }),
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              <Link to="/search" className={'hover:text-accent hover:underline transition-colors'}>
                {t('landing.footer.search', {}, { defaultValue: 'Browse' })}
              </Link>
              <Link to="/pricing" className={'hover:text-accent hover:underline transition-colors'}>
                {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
              </Link>
            </div>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'sm' }),
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              <Link to="/privacy" className={'hover:text-accent hover:underline transition-colors'}>
                {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              </Link>
              <Link to="/terms" className={'hover:text-accent hover:underline transition-colors'}>
                {t('nav.terms', {}, { defaultValue: 'Terms' })}
              </Link>
            </div>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'sm' }),
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              <Link to="/login" className={'hover:text-accent hover:underline transition-colors'}>
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link to="/signup" className={'hover:text-accent hover:underline transition-colors'}>
                {t('landing.footer.signUp', {}, { defaultValue: 'Join' })}
              </Link>
              <Link to="/host" className={'hover:text-accent hover:underline transition-colors'}>
                {t('landing.nav.host', {}, { defaultValue: 'Become a host' })}
              </Link>
            </div>
          </div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              'mt-10 border-t border-outline-variant/40 pt-6 text-center',
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
