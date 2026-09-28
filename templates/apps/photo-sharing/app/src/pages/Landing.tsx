import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { SAMPLE_PHOTOS } from '../lib/sample-photos.js'

/**
 * Landing — translated from reference/flagship-apps-designs/design-photo-sharing-landing.html
 * ("Obscura" editorial photography journal): fixed blurred-paper nav with an
 * italic-serif brand, a 4/8 hero split (italic Newsreader headline left, large
 * stage-toned "print" with a hover EXIF overlay right), a border-t "Featured
 * this week" trio with an italic pull-quote, a full-bleed primary sign-up
 * band, and a mono-uppercase footer. Sample photographs render as
 * stage-toned gradient stand-ins (the template ships no raster assets) —
 * see `.photo-tone-*` in theme.css.
 */

const FEATURED = [
  { photo: SAMPLE_PHOTOS[1], tone: 'photo-tone-warm' },
  { photo: SAMPLE_PHOTOS[2], tone: 'photo-tone-cool' },
  { photo: SAMPLE_PHOTOS[4], tone: 'photo-tone-stage' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  const heroPhoto = SAMPLE_PHOTOS[0]
  const year = new Date().getFullYear()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={
          'sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-outline-variant/60'
        }
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            'flex-wrap gap-x-6 gap-y-2',
            cm.mxAuto,
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'min-w-0')}>
            <Link
              to="/"
              className={
                'text-2xl italic font-light tracking-tight text-on-surface whitespace-nowrap'
              }
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {APP_NAME}
            </Link>
            <div className={cm.cn('hidden md:flex', cm.flex({ gap: 'lg' }))}>
              <Link
                to="/explore"
                className={
                  'text-primary border-b-2 border-primary pb-1 font-medium transition-all duration-200'
                }
              >
                {t('landing.navCurated', {}, { defaultValue: 'Curated' })}
              </Link>
              <Link
                to="/galleries"
                className={
                  'text-on-surface-variant hover:text-on-surface transition-opacity duration-300'
                }
              >
                {t('landing.navGalleries', {}, { defaultValue: 'Galleries' })}
              </Link>
              <Link
                to="/pricing"
                data-mol-id="nav-pricing"
                className={
                  'text-on-surface-variant hover:text-on-surface transition-opacity duration-300'
                }
              >
                {t('landing.pricingLink', {}, { defaultValue: 'Pricing' })}
              </Link>
            </div>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'min-w-0')}>
            {isAuthenticated ? (
              <Link
                to="/explore"
                className={
                  'whitespace-nowrap shrink-0 px-6 py-2 font-medium bg-primary text-on-primary rounded hover:bg-primary-hover transition-colors'
                }
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={
                    'whitespace-nowrap text-sm font-medium text-on-surface-variant hover:text-on-surface transition-opacity duration-300'
                  }
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={
                    'whitespace-nowrap shrink-0 px-6 py-2 font-medium bg-primary text-on-primary rounded hover:bg-primary-hover transition-colors'
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
        {/* Hero — 4/8 split: italic serif headline left, stage print with EXIF overlay right */}
        <section
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            'grid grid-cols-1 lg:grid-cols-12 gap-12 items-center py-16 lg:py-24',
          )}
        >
          <div className={'lg:col-span-4 space-y-8'}>
            <h1
              className={
                'text-5xl lg:text-6xl xl:text-7xl italic font-light leading-tight text-on-surface'
              }
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}' })}
            </h1>
            <p className={'text-lg text-on-surface-variant leading-relaxed'}>
              {t(
                'landing.heroSubtitle',
                { app: APP_NAME },
                {
                  defaultValue:
                    '{{app}} is a quiet, gallery-grade place for photographers. Share albums with intact metadata, browse curator-led editorial galleries, and let the photographs breathe.',
                },
              )}
            </p>
            <div className={'pt-4'}>
              <Link
                to="/signup"
                data-mol-id="hero-cta"
                className={
                  'inline-block border-b border-on-surface pb-1 text-on-surface font-medium hover:text-primary hover:border-primary transition-colors'
                }
              >
                {t('landing.heroCta', {}, { defaultValue: 'Start sharing' })}
              </Link>
            </div>
          </div>

          <div className={'lg:col-span-8 relative group'}>
            <div
              className={
                'photo-tone-warm w-full aspect-[3/2] rounded shadow-xl relative overflow-hidden'
              }
              role="img"
              aria-label={heroPhoto.title}
            >
              <span
                className={
                  'material-symbols-outlined absolute inset-0 m-auto w-fit h-fit text-8xl text-white/25 group-hover:scale-105 transition-transform duration-700'
                }
                aria-hidden="true"
              >
                image
              </span>
            </div>
            {/* EXIF overlay */}
            <div
              className={
                'absolute bottom-6 right-6 bg-stage/80 backdrop-blur-sm p-4 rounded text-white/90 font-mono text-xs shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300'
              }
            >
              <div className={'grid grid-cols-2 gap-x-6 gap-y-2 text-left'}>
                <span className={'text-exif'}>
                  {t('photo.exif.camera', {}, { defaultValue: 'Camera' })}
                </span>
                <span>{heroPhoto.exif.camera}</span>
                <span className={'text-exif'}>
                  {t('photo.exif.lens', {}, { defaultValue: 'Lens' })}
                </span>
                <span>{heroPhoto.exif.lens}</span>
                <span className={'text-exif'}>
                  {t('landing.exifSettings', {}, { defaultValue: 'Settings' })}
                </span>
                <span>
                  {heroPhoto.exif.aperture} · {heroPhoto.exif.shutter_speed} · {heroPhoto.exif.iso}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Featured this week — italic pull-quote + 3-up editorial grid */}
        <section
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            'py-20 border-t border-outline-variant/60',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ justify: 'between', align: 'end' }),
              'flex-col md:flex-row mb-12',
            )}
          >
            <div className={'max-w-xl'}>
              <h2
                className={'text-3xl text-on-surface mb-4'}
                style={{ fontFamily: 'var(--font-headline)' }}
              >
                {t('landing.featuredHeading', {}, { defaultValue: 'Featured this week' })}
              </h2>
              <p
                className={'italic text-xl text-on-surface-variant border-l-2 border-primary pl-4'}
                style={{ fontFamily: 'var(--font-headline)' }}
              >
                {t(
                  'landing.featuredQuote',
                  {},
                  {
                    defaultValue:
                      '"Photography takes an instant out of time, altering life by holding it still."',
                  },
                )}
              </p>
            </div>
          </div>
          <div className={'grid grid-cols-1 md:grid-cols-3 gap-8'}>
            {FEATURED.map(({ photo, tone }, i) => (
              <Link
                key={photo.id}
                to="/signup"
                data-mol-id={i === 0 ? 'featured-photo-card' : undefined}
                className={'group block cursor-pointer'}
              >
                <div
                  className={
                    'overflow-hidden rounded mb-4 bg-background-secondary aspect-[4/5] flex items-center justify-center'
                  }
                >
                  <div
                    className={cm.cn(
                      tone,
                      'w-full h-full group-hover:scale-105 transition-transform duration-700 flex items-center justify-center',
                    )}
                  >
                    <span
                      className={'material-symbols-outlined text-6xl text-white/25'}
                      aria-hidden="true"
                    >
                      image
                    </span>
                  </div>
                </div>
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <span
                    className={
                      'w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-mono uppercase shrink-0'
                    }
                    aria-hidden="true"
                  >
                    {photo.author.slice(0, 1)}
                  </span>
                  <div className={'min-w-0'}>
                    <h3
                      className={
                        'text-lg text-on-surface group-hover:text-primary transition-colors truncate'
                      }
                      style={{ fontFamily: 'var(--font-headline)' }}
                    >
                      {photo.title}
                    </h3>
                    <p className={'text-sm text-on-surface-variant truncate'}>{photo.author}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Sign-up band — full-bleed primary */}
        <section className={'bg-primary text-on-primary py-20 mt-12'}>
          <div className={cm.cn(cm.maxW('4xl'), cm.mxAuto, cm.sp('px', 6), 'text-center')}>
            <h2 className={'italic text-4xl mb-6'} style={{ fontFamily: 'var(--font-headline)' }}>
              {t('landing.joinHeading', { app: APP_NAME }, { defaultValue: 'Join {{app}}' })}
            </h2>
            <p className={'text-on-primary/80 mb-8 max-w-lg mx-auto text-lg'}>
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
              data-mol-id="cta-signup"
              className={
                'inline-block bg-surface text-primary px-8 py-3 rounded font-medium hover:bg-background-secondary transition-colors'
              }
            >
              {t('landing.ctaButton', {}, { defaultValue: 'Create your portfolio' })}
            </Link>
          </div>
        </section>
      </main>

      <footer className={'bg-background border-t border-outline-variant/60'}>
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            'flex flex-col md:flex-row justify-between items-center gap-8 py-12',
          )}
        >
          <div
            className={'italic text-lg text-on-surface'}
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {APP_NAME}
          </div>
          <div className={cm.cn(cm.flex({ gap: 'md' }), 'flex-wrap justify-center gap-6')}>
            <Link
              to="/galleries"
              className={
                'font-mono text-xs uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors'
              }
            >
              {t('landing.navGalleries', {}, { defaultValue: 'Galleries' })}
            </Link>
            <Link
              to="/privacy"
              className={
                'font-mono text-xs uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors'
              }
            >
              {t('landing.footerPrivacy', {}, { defaultValue: 'Privacy' })}
            </Link>
            <Link
              to="/terms"
              className={
                'font-mono text-xs uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors'
              }
            >
              {t('landing.footerTerms', {}, { defaultValue: 'Terms' })}
            </Link>
          </div>
          <div
            className={
              'font-mono text-xs uppercase tracking-widest text-on-surface-variant text-center'
            }
          >
            {/* App-scoped key: the shared `common.copyrightBuiltWithMolecule`
                already contains ". Built with Molecule.dev", which duplicated
                the sibling link below. */}
            {t(
              'landing.copyright',
              { year, app: APP_NAME },
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
          </div>
        </div>
      </footer>
    </div>
  )
}
