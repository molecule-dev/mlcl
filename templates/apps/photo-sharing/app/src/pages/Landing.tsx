import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { FeaturedPhotoHeroCard } from '../components/FeaturedPhotoHeroCard.js'
import { GalleryFeatureRow } from '../components/GalleryFeatureRow.js'
import { SAMPLE_GALLERIES, SAMPLE_PHOTOS } from '../lib/sample-photos.js'

const FEATURES = [
  {
    key: 'exif',
    defaultTitle: 'EXIF as a first-class citizen',
    defaultBody:
      'Camera, lens, focal length, aperture, shutter, ISO. Searchable, filterable, and never stripped.',
    icon: 'photo_camera',
    tint: 'text-primary',
  },
  {
    key: 'curated',
    defaultTitle: 'Editorial galleries',
    defaultBody:
      'Curators publish thematic collections. Discover photographers like you read a magazine.',
    icon: 'collections_bookmark',
    tint: 'text-secondary',
  },
  {
    key: 'masonry',
    defaultTitle: 'A canvas, not a feed',
    defaultBody:
      'Variable-height masonry, generous whitespace, no chrome. The photographs do the work.',
    icon: 'view_quilt',
    tint: 'text-warning',
  },
  {
    key: 'community',
    defaultTitle: 'Conversations that matter',
    defaultBody:
      'Threaded comments, hearted photos, and follows. Civil-by-default — moderated by humans.',
    icon: 'forum',
    tint: 'text-error',
  },
] as const

const STATS = [
  { key: 'photographers', defaultLabel: 'Photographers', value: '184K' },
  { key: 'photos', defaultLabel: 'Frames shared', value: '4.2M' },
  { key: 'galleries', defaultLabel: 'Curated galleries', value: '380' },
  { key: 'countries', defaultLabel: 'Countries', value: '92' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  const heroPhoto = SAMPLE_PHOTOS[0]
  const featuredGalleries = SAMPLE_GALLERIES.filter((g) => g.is_featured)
    .concat(SAMPLE_GALLERIES.filter((g) => !g.is_featured))
    .slice(0, 3)

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={
          'sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/40'
        }
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            'flex-wrap gap-x-4 gap-y-2',
            cm.mxAuto,
          )}
        >
          <Link
            to="/"
            className={'min-w-0 whitespace-nowrap shrink-0 text-2xl font-extrabold tracking-tight'}
            style={{
              fontFamily: 'Playfair Display, Georgia, serif',
              color: 'var(--color-primary)',
            }}
          >
            {APP_NAME}
          </Link>
          <div
            className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'min-w-0 whitespace-nowrap')}
          >
            <Link
              to="/pricing"
              data-mol-id="nav-pricing"
              className={
                'hidden sm:inline text-sm font-medium text-on-surface-variant hover:text-on-surface'
              }
            >
              {t('landing.pricingLink', {}, { defaultValue: 'Pricing' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/explore"
                className={
                  'whitespace-nowrap shrink-0 px-5 py-2 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors'
                }
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={
                    'whitespace-nowrap text-sm font-medium text-on-surface-variant hover:text-on-surface'
                  }
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={
                    'whitespace-nowrap shrink-0 px-5 py-2 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors'
                  }
                >
                  {t('landing.getStarted', { app: APP_NAME }, { defaultValue: 'Join {{app}}' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 22% 30%, color-mix(in srgb, var(--color-primary) 20%, transparent), transparent 50%),' +
                'radial-gradient(circle at 78% 60%, color-mix(in srgb, var(--color-secondary) 18%, transparent), transparent 45%)',
            }}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'relative py-20 md:py-28 lg:py-32',
            )}
          >
            <div className={'grid grid-cols-1 lg:grid-cols-12 gap-12 items-center'}>
              <div className={'lg:col-span-7'}>
                <p className={'text-sm font-bold uppercase tracking-widest text-primary mb-5'}>
                  {t(
                    'landing.eyebrow',
                    {},
                    { defaultValue: 'Photo sharing · curated galleries · gallery-grade EXIF' },
                  )}
                </p>
                <h1
                  className={
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] mb-6'
                  }
                  style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
                >
                  {t(
                    'landing.heroTitle',
                    { tagline: APP_TAGLINE },
                    { defaultValue: '{{tagline}}' },
                  )}
                </h1>
                <p className={'text-lg text-on-surface-variant max-w-xl leading-relaxed mb-10'}>
                  {t(
                    'landing.heroSubtitle',
                    { app: APP_NAME },
                    {
                      defaultValue:
                        '{{app}} is a quiet, gallery-grade place for photographers. Share albums with intact metadata, browse curator-led editorial galleries, and let the photographs breathe.',
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    className={
                      'inline-flex items-center gap-2 px-8 py-4 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors'
                    }
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Start sharing' })}
                    <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                      arrow_forward
                    </span>
                  </Link>
                  <Link
                    to="/login"
                    className={
                      'px-8 py-4 font-semibold rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors'
                    }
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>
              </div>

              <div className={'lg:col-span-5'}>
                <FeaturedPhotoHeroCard
                  photo={heroPhoto}
                  eyebrow={t(
                    'landing.sampleEyebrow',
                    {},
                    { defaultValue: "Today's editorial pick" },
                  )}
                  primaryHref="/signup"
                  primaryLabel={t('landing.sampleOpenInApp', {}, { defaultValue: 'Join to view' })}
                  secondaryHref="/login"
                  secondaryLabel={t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                />
              </div>
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-12')}>
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 md:grid-cols-4')}>
            {STATS.map((s) => (
              <div
                key={s.key}
                className={
                  'bg-surface-container-lowest rounded-2xl p-6 text-center hover:shadow-lg transition-shadow border-l-4 border-primary'
                }
              >
                <p
                  className={
                    'text-3xl md:text-4xl font-extrabold tracking-tight text-primary tabular-nums'
                  }
                  style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
                >
                  {s.value}
                </p>
                <p
                  className={
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mt-2'
                  }
                >
                  {t(`landing.stat.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <h2
            className={'mb-3 text-center text-3xl md:text-5xl font-extrabold tracking-tight'}
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            {t(
              'landing.featuresHeading',
              {},
              { defaultValue: 'Built for people who actually look' },
            )}
          </h2>
          <p className={'mb-12 text-center text-base text-on-surface-variant max-w-2xl mx-auto'}>
            {t(
              'landing.featuresSubheading',
              {},
              {
                defaultValue:
                  'No infinite-scroll dopamine loops. No ads in your portfolio. Just the photographs and the people behind them.',
              },
            )}
          </p>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={
                  'bg-surface-container-lowest rounded-2xl p-6 hover:shadow-2xl hover:shadow-on-surface/5 transition-all group'
                }
              >
                <div
                  className={cm.cn(
                    'inline-flex p-3 bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
                    f.tint,
                  )}
                >
                  <span className="material-symbols-outlined text-3xl" aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={'text-lg font-bold mt-5 mb-2'}
                  style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={'text-sm text-on-surface-variant leading-relaxed'}>
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-12')}>
          <GalleryFeatureRow
            galleries={featuredGalleries}
            eyebrow={t(
              'landing.galleriesEyebrow',
              { app: APP_NAME },
              { defaultValue: 'This week, on {{app}}' },
            )}
            title={t('landing.galleriesHeading', {}, { defaultValue: 'Curated galleries' })}
            seeAllHref="/signup"
            buildCardHref={() => '/signup'}
          />
        </section>

        <section className={'border-t border-outline-variant/40'}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3
              className={'text-3xl md:text-4xl font-extrabold tracking-tight mb-4'}
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              {t('landing.ctaHeading', {}, { defaultValue: 'Bring your portfolio home' })}
            </h3>
            <p className={'text-base text-on-surface-variant max-w-xl mx-auto mb-8'}>
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'Free for your first 5 photos and 5 albums. Pro plans start at $15/month. No ad networks, no model training, no surprises.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={
                'inline-flex items-center gap-2 px-10 py-4 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors'
              }
            >
              {t('landing.ctaButton', {}, { defaultValue: 'Create your portfolio' })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer
        className={
          'py-8 text-center text-sm bg-surface text-on-surface-variant border-t border-outline-variant'
        }
      >
        <p>
          {t(
            'common.copyrightBuiltWithMolecule',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '© {{year}} {{app}}' },
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
