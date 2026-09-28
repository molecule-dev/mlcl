import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

const FEATURES = [
  {
    key: 'discover',
    defaultTitle: "Discover that doesn't suck",
    defaultBody:
      'Editor-curated lists, smart for-you, and human-tagged genres. No "podcast about podcasts" loops.',
    icon: 'explore',
    tint: 'text-primary',
  },
  {
    key: 'transcripts',
    defaultTitle: 'Transcripts on every show',
    defaultBody:
      'Auto-generated transcripts, searchable, scrubbable. Click a paragraph to jump there.',
    icon: 'description',
    tint: 'text-violet-500',
  },
  {
    key: 'chapters',
    defaultTitle: 'Chapter navigation',
    defaultBody: 'Jump straight to the segment you want. Long shows become short again.',
    icon: 'bookmarks',
    tint: 'text-warning',
  },
  {
    key: 'sync',
    defaultTitle: 'Position synced across devices',
    defaultBody: 'Start on phone, finish on laptop. Position resumes to the second.',
    icon: 'sync',
    tint: 'text-success',
  },
] as const

const STATS = [
  { key: 'shows', defaultLabel: 'Shows', value: '4.2M' },
  { key: 'episodes', defaultLabel: 'Episodes', value: '180M' },
  { key: 'languages', defaultLabel: 'Languages', value: '92' },
  { key: 'listeners', defaultLabel: 'Active listeners', value: '38M' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

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
            cm.mxAuto,
          )}
        >
          <Link to="/" className={'text-xl font-extrabold tracking-tight'}>
            {APP_NAME}
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <Link
              to="/pricing"
              className={
                'hidden md:inline text-sm font-medium text-on-surface-variant hover:text-on-surface'
              }
            >
              {t('landing.nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/discover"
                data-mol-id="nav-go-to-dashboard"
                className={
                  'px-5 py-2 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors'
                }
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={'text-sm font-medium text-on-surface-variant hover:text-on-surface'}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={
                    'px-5 py-2 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors'
                  }
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Try free' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — warm-paper background with cinematic episode card on the right */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 25% 30%, rgba(232, 84, 10, 0.20), transparent 50%),' +
                'radial-gradient(circle at 78% 60%, rgba(124, 58, 237, 0.15), transparent 45%)',
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
                <p className={'text-sm font-bold uppercase tracking-widest text-primary mb-4'}>
                  {t(
                    'landing.eyebrow',
                    {},
                    { defaultValue: 'Podcast platform · transcripts everywhere' },
                  )}
                </p>
                <h1
                  className={
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] mb-6'
                  }
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
                    {},
                    {
                      defaultValue:
                        'Four million shows, transcripts on every episode, and chapter navigation that respects your time. The podcast app for people who actually listen.',
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
                    {t('landing.heroCta', {}, { defaultValue: 'Start listening — free' })}
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

              {/* Sample episode card */}
              <div className={'lg:col-span-5'}>
                <div
                  className={
                    'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-primary/20'
                  }
                  style={{
                    background: 'linear-gradient(135deg, #e8540a 0%, #f97316 50%, #eab308 100%)',
                    minHeight: '420px',
                  }}
                >
                  <div
                    className={
                      'absolute -right-16 -bottom-16 w-56 h-56 rounded-full bg-surface/15 blur-3xl'
                    }
                  />
                  <div
                    className={
                      'absolute right-8 top-8 w-16 h-16 rounded-full bg-foreground/10 blur-xl'
                    }
                  />

                  <div className={'relative z-10 p-7 flex flex-col justify-between min-h-[420px]'}>
                    <div>
                      <span
                        className={
                          'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface/20 backdrop-blur-md'
                        }
                      >
                        {t('landing.nowPlayingBadge', {}, { defaultValue: 'Now Playing' })}
                      </span>
                      <p
                        className={
                          'text-[11px] font-bold uppercase tracking-widest text-white/80 mt-3'
                        }
                      >
                        Edge Cases · Cortex Media
                      </p>
                      <h3
                        className={
                          'text-2xl md:text-3xl font-extrabold tracking-tight leading-tight mt-1'
                        }
                      >
                        When clock skew broke our payment processor
                      </h3>
                    </div>

                    <div className={'flex items-center justify-center my-4'}>
                      <div
                        className={
                          'w-32 h-32 rounded-2xl shadow-2xl shadow-black/30 flex items-center justify-center'
                        }
                        style={{
                          background: 'rgba(255, 255, 255, 0.15)',
                          backdropFilter: 'blur(8px)',
                        }}
                      >
                        <span className="material-symbols-outlined text-[64px] text-white/90">
                          graphic_eq
                        </span>
                      </div>
                    </div>

                    <div>
                      <div
                        className={
                          'flex items-center gap-2 text-[11px] font-mono tabular-nums text-white/80'
                        }
                      >
                        <span>30:40</span>
                        <div className={'flex-1 h-1.5 rounded-full bg-surface/25 overflow-hidden'}>
                          <div
                            className={'h-full bg-surface rounded-full'}
                            style={{ width: '57%' }}
                          />
                        </div>
                        <span>53:34</span>
                      </div>
                      <div className={'flex items-center justify-center gap-4 mt-3'}>
                        <span
                          className={
                            'w-10 h-10 rounded-full flex items-center justify-center text-white/90'
                          }
                          aria-hidden="true"
                        >
                          <span className="material-symbols-outlined">replay_30</span>
                        </span>
                        <span
                          className={
                            'w-14 h-14 rounded-full bg-surface text-on-surface flex items-center justify-center shadow-xl'
                          }
                          aria-hidden="true"
                        >
                          <span className="material-symbols-outlined text-3xl">pause</span>
                        </span>
                        <span
                          className={
                            'w-10 h-10 rounded-full flex items-center justify-center text-white/90'
                          }
                          aria-hidden="true"
                        >
                          <span className="material-symbols-outlined">forward_30</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-12')}>
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 md:grid-cols-4')}>
            {STATS.map((s) => (
              <div
                key={s.key}
                className={
                  'bg-surface-container-lowest rounded-2xl p-6 text-center hover:shadow-lg transition-shadow'
                }
              >
                <p
                  className={
                    'text-3xl md:text-4xl font-extrabold tracking-tight text-primary tabular-nums'
                  }
                >
                  {s.value}
                </p>
                <p
                  className={
                    'text-xs font-bold uppercase tracking-widest text-on-surface-variant mt-2'
                  }
                >
                  {t(`landing.stat.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Feature grid */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <h2 className={'mb-12 text-center text-3xl md:text-4xl font-extrabold tracking-tight'}>
            {t(
              'landing.featuresHeading',
              {},
              { defaultValue: 'A podcast app for people who actually listen' },
            )}
          </h2>
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
                <h3 className={'text-lg font-bold mt-5 mb-2'}>
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={'text-sm text-on-surface-variant leading-relaxed'}>
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={'border-t border-outline-variant/40'}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3 className={'text-3xl font-extrabold tracking-tight mb-4'}>
              {t('landing.ctaHeading', {}, { defaultValue: 'Find your next favorite show' })}
            </h3>
            <p className={'text-base text-on-surface-variant max-w-xl mx-auto mb-8'}>
              {t(
                'landing.ctaBody',
                {},
                { defaultValue: 'Free to listen. No ads. Subscribe to support shows you love.' },
              )}
            </p>
            <Link
              to="/signup"
              className={
                'inline-flex items-center gap-2 px-10 py-4 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors'
              }
            >
              {t('landing.heroCta', {}, { defaultValue: 'Start listening — free' })}
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
        <nav
          aria-label={t('landing.footerNavLabel', {}, { defaultValue: 'Footer' })}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'lg' }),
            cm.sp('mb', 4),
          )}
        >
          <Link to="/about" className={'hover:text-on-surface transition-colors'}>
            {t('about.eyebrow', {}, { defaultValue: 'About' })}
          </Link>
          <Link to="/pricing" className={'hover:text-on-surface transition-colors'}>
            {t('landing.nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          <Link to="/terms" className={'hover:text-on-surface transition-colors'}>
            {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
          </Link>
          <Link to="/privacy" className={'hover:text-on-surface transition-colors'}>
            {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
          </Link>
        </nav>
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
