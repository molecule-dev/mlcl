import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE, BRAND_COLOR } from '../branding.js'
import { Footer } from '../components/Footer.js'

const FEATURES = [
  {
    key: 'library',
    defaultTitle: '50 million songs',
    defaultBody:
      'Major labels, indies, and global imports. The catalog you actually want, ad-free.',
    icon: 'library_music',
    tint: 'text-primary',
  },
  {
    key: 'curated',
    defaultTitle: 'Curated for your week',
    defaultBody: 'Daily Mix, Discover Weekly, Release Radar. Your taste, learned every day.',
    icon: 'auto_awesome',
    tint: 'text-violet-500',
  },
  {
    key: 'lossless',
    defaultTitle: 'Lossless audio',
    defaultBody: 'FLAC quality on every device. Spatial audio in supported tracks.',
    icon: 'graphic_eq',
    tint: 'text-warning',
  },
  {
    key: 'social',
    defaultTitle: 'Listen together',
    defaultBody: "Live-sync your queue with friends. See what they're hearing right now.",
    icon: 'group',
    tint: 'text-error',
  },
] as const

const STATS = [
  { key: 'songs', defaultLabel: 'Songs', value: '50M+' },
  { key: 'playlists', defaultLabel: 'Playlists made', value: '4.2B' },
  { key: 'listeners', defaultLabel: 'Active listeners', value: '180M' },
  { key: 'genres', defaultLabel: 'Genres covered', value: '700+' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={cm.cn(
          'sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/40',
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
          <span className={cm.cn('text-xl font-extrabold tracking-tight')}>{APP_NAME}</span>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <Link
              to="/pricing"
              className={cm.cn('text-sm font-medium text-on-surface-variant hover:text-on-surface')}
            >
              {t('landing.pricingLink', {}, { defaultValue: 'Pricing' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/home"
                className={cm.cn(
                  'px-5 py-2 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors',
                )}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn(
                    'text-sm font-medium text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    'px-5 py-2 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors',
                  )}
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Try free' })}
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
                `radial-gradient(circle at 25% 30%, ${BRAND_COLOR}33, transparent 50%),` +
                'radial-gradient(circle at 78% 60%, rgba(236, 72, 153, 0.18), transparent 45%)',
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
            <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-12 items-center')}>
              <div className={cm.cn('lg:col-span-7')}>
                <p
                  className={cm.cn('text-sm font-bold uppercase tracking-widest text-primary mb-4')}
                >
                  {t(
                    'landing.eyebrow',
                    {},
                    { defaultValue: 'Streaming · curated playlists · lossless audio' },
                  )}
                </p>
                <h1
                  className={cm.cn(
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] mb-6',
                  )}
                >
                  {t(
                    'landing.heroTitle',
                    { tagline: APP_TAGLINE },
                    { defaultValue: '{{tagline}}' },
                  )}
                </h1>
                <p
                  className={cm.cn(
                    'text-lg text-on-surface-variant max-w-xl leading-relaxed mb-10',
                  )}
                >
                  {t(
                    'landing.heroSubtitle',
                    {},
                    {
                      defaultValue:
                        'Fifty million tracks, the smartest recommendations on the internet, and zero ads. The way music streaming should be.',
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      'inline-flex items-center gap-2 px-8 py-4 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors',
                    )}
                  >
                    {t(
                      'landing.heroCta',
                      {},
                      { defaultValue: 'Start listening — free for 30 days' },
                    )}
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      arrow_forward
                    </span>
                  </Link>
                  <Link
                    to="/login"
                    className={cm.cn(
                      'px-8 py-4 font-semibold rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors',
                    )}
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>
              </div>

              <div className={cm.cn('lg:col-span-5')}>
                <div
                  className={cm.cn(
                    'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-primary/20',
                  )}
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 50%, #be185d 100%)',
                    minHeight: '420px',
                  }}
                >
                  <div
                    className={cm.cn(
                      'absolute -right-16 -bottom-16 w-56 h-56 rounded-full bg-surface/15 blur-3xl',
                    )}
                    aria-hidden="true"
                  />
                  <div
                    className={cm.cn(
                      'absolute right-8 top-8 w-16 h-16 rounded-full bg-foreground/10 blur-xl',
                    )}
                    aria-hidden="true"
                  />

                  <div
                    className={cm.cn(
                      'relative z-10 p-7 flex flex-col justify-between min-h-[420px]',
                    )}
                  >
                    <div>
                      <span
                        className={cm.cn(
                          'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface/20 backdrop-blur-md',
                        )}
                      >
                        {t('landing.sampleNowPlaying', {}, { defaultValue: 'Now playing' })}
                      </span>
                      <p
                        className={cm.cn(
                          'text-[11px] font-bold uppercase tracking-widest text-white/80 mt-3',
                        )}
                      >
                        {t(
                          'landing.sampleAlbum',
                          {},
                          { defaultValue: 'Hello, Stranger · Tessa Mira' },
                        )}
                      </p>
                      <h3
                        className={cm.cn(
                          'text-2xl md:text-3xl font-extrabold tracking-tight leading-tight mt-1',
                        )}
                      >
                        {t('landing.sampleTrack', {}, { defaultValue: 'When You Said' })}
                      </h3>
                    </div>

                    <div className={cm.cn('flex items-center justify-center my-4')}>
                      <div
                        className={cm.cn(
                          'w-32 h-32 rounded-2xl shadow-2xl shadow-black/30 flex items-center justify-center',
                        )}
                        style={{
                          background: 'rgba(255, 255, 255, 0.15)',
                          backdropFilter: 'blur(8px)',
                        }}
                        aria-hidden="true"
                      >
                        <span className="material-symbols-outlined text-[64px] text-white/90">
                          graphic_eq
                        </span>
                      </div>
                    </div>

                    <div>
                      <div
                        className={cm.cn(
                          'flex items-center gap-2 text-[11px] font-mono tabular-nums text-white/80',
                        )}
                      >
                        <span>1:42</span>
                        <div
                          className={cm.cn(
                            'flex-1 h-1.5 rounded-full bg-surface/25 overflow-hidden',
                          )}
                        >
                          <div
                            className={cm.cn('h-full bg-surface rounded-full')}
                            style={{ width: '48%' }}
                            aria-hidden="true"
                          />
                        </div>
                        <span>3:31</span>
                      </div>
                      <div
                        className={cm.cn('flex items-center justify-center gap-4 mt-3')}
                        aria-hidden="true"
                      >
                        <span
                          className={cm.cn(
                            'w-10 h-10 rounded-full flex items-center justify-center text-white/90',
                          )}
                        >
                          <span className="material-symbols-outlined">skip_previous</span>
                        </span>
                        <span
                          className={cm.cn(
                            'w-14 h-14 rounded-full bg-surface text-on-surface flex items-center justify-center shadow-xl',
                          )}
                        >
                          <span className="material-symbols-outlined text-3xl">pause</span>
                        </span>
                        <span
                          className={cm.cn(
                            'w-10 h-10 rounded-full flex items-center justify-center text-white/90',
                          )}
                        >
                          <span className="material-symbols-outlined">skip_next</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-12')}>
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 md:grid-cols-4')}>
            {STATS.map((s) => (
              <div
                key={s.key}
                className={cm.cn(
                  'bg-surface-container-lowest rounded-2xl p-6 text-center hover:shadow-lg transition-shadow',
                )}
              >
                <p
                  className={cm.cn(
                    'text-3xl md:text-4xl font-extrabold tracking-tight text-primary tabular-nums',
                  )}
                >
                  {s.value}
                </p>
                <p
                  className={cm.cn(
                    'text-xs font-bold uppercase tracking-widest text-on-surface-variant mt-2',
                  )}
                >
                  {t(`landing.stat.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <h2
            className={cm.cn(
              'mb-12 text-center text-3xl md:text-4xl font-extrabold tracking-tight',
            )}
          >
            {t(
              'landing.featuresHeading',
              {},
              { defaultValue: 'Built for people who actually listen' },
            )}
          </h2>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  'bg-surface-container-lowest rounded-2xl p-6 hover:shadow-2xl hover:shadow-on-surface/5 transition-all group',
                )}
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
                <h3 className={cm.cn('text-lg font-bold mt-5 mb-2')}>
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn('text-sm text-on-surface-variant leading-relaxed')}>
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={cm.cn('border-t border-outline-variant/40')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3 className={cm.cn('text-3xl font-extrabold tracking-tight mb-4')}>
              {t('landing.ctaHeading', {}, { defaultValue: 'Find your next favorite track' })}
            </h3>
            <p className={cm.cn('text-base text-on-surface-variant max-w-xl mx-auto mb-8')}>
              {t(
                'landing.ctaBody',
                {},
                { defaultValue: 'Free for 30 days. No ads. Cancel anytime.' },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                'inline-flex items-center gap-2 px-10 py-4 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors',
              )}
            >
              {t('landing.heroCta', {}, { defaultValue: 'Start listening — free for 30 days' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
