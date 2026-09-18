import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ACCENT_COLOR, APP_NAME, APP_TAGLINE, BRAND_COLOR } from '../branding.js'

const FEATURES = [
  {
    key: 'discover',
    defaultTitle: 'Endless discovery',
    defaultBody:
      'Curated trending feeds, channel recommendations, and rabbit-hole rails that learn what you love.',
    icon: 'movie',
    tint: 'text-primary',
  },
  {
    key: 'create',
    defaultTitle: 'Built for creators',
    defaultBody:
      'Upload, generate captions, mark chapters, and publish — everything a channel needs in one studio.',
    icon: 'videocam',
    tint: 'text-error',
  },
  {
    key: 'live',
    defaultTitle: 'Live, premieres, replays',
    defaultBody:
      'Tune in to live streams with chat, schedule premieres, and rewatch anything on demand.',
    icon: 'sensors',
    tint: 'text-warning',
  },
  {
    key: 'social',
    defaultTitle: 'Watch with friends',
    defaultBody:
      'Comments, reactions, and shared playlists keep the conversation alive long after the credits.',
    icon: 'forum',
    tint: 'text-violet-500',
  },
] as const

const STATS = [
  { key: 'videos', defaultLabel: 'Videos', value: '120M+' },
  { key: 'creators', defaultLabel: 'Active creators', value: '4.8M' },
  { key: 'watching', defaultLabel: 'Hours watched', value: '2.3B' },
  { key: 'languages', defaultLabel: 'Languages', value: '90+' },
]

const SAMPLE_CARD = {
  eyebrow: 'Continue watching',
  channel: 'Northern Field Studio',
  title: 'How a film label fell in love with reels again',
  duration: '24:18',
  views: '482K',
}

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
          <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <span
              className={cm.cn(
                cm.w(8),
                cm.h(8),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'shadow',
              )}
              style={{ background: `linear-gradient(135deg, ${BRAND_COLOR}, ${ACCENT_COLOR})` }}
              aria-hidden="true"
            >
              <span
                className={cm.cn('material-symbols-outlined text-[18px] text-white')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                play_circle
              </span>
            </span>
            <span className={cm.cn('text-xl font-extrabold tracking-tighter')}>{APP_NAME}</span>
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/home"
                data-mol-id="landing-nav-dashboard"
                className={cm.cn(
                  'px-5 py-2 font-semibold text-white rounded-full hover:opacity-90 transition-opacity',
                )}
                style={{ background: `linear-gradient(135deg, ${BRAND_COLOR}, ${ACCENT_COLOR})` }}
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
                    'px-5 py-2 font-semibold text-white rounded-full hover:opacity-90 transition-opacity',
                  )}
                  style={{ background: `linear-gradient(135deg, ${BRAND_COLOR}, ${ACCENT_COLOR})` }}
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Start watching' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn('absolute inset-0 pointer-events-none')}
            style={{
              backgroundImage:
                `radial-gradient(circle at 22% 32%, ${BRAND_COLOR}33, transparent 50%),` +
                `radial-gradient(circle at 78% 60%, ${ACCENT_COLOR}26, transparent 45%)`,
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
                    { defaultValue: 'Streaming · creators · live · communities' },
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
                        'A streaming home for the people you actually watch. No bot-fueled feeds, no autoplay rabbit traps — just videos worth your time.',
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      'inline-flex items-center gap-2 px-8 py-4 font-semibold text-white rounded-full hover:opacity-90 transition-opacity shadow-lg',
                    )}
                    style={{
                      background: `linear-gradient(135deg, ${BRAND_COLOR}, ${ACCENT_COLOR})`,
                    }}
                  >
                    {t(
                      'landing.heroCta',
                      { appName: APP_NAME },
                      { defaultValue: 'Get a free {{appName}} account' },
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

                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'md' }),
                    cm.sp('mt', 8),
                    'text-xs text-on-surface-variant',
                  )}
                >
                  <span className={cm.cn('inline-flex items-center gap-1.5')}>
                    <span
                      className={cm.cn('material-symbols-outlined text-base text-success')}
                      aria-hidden="true"
                    >
                      verified
                    </span>
                    {t('landing.proofAdFree', {}, { defaultValue: 'No ads on every plan' })}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className={cm.cn('inline-flex items-center gap-1.5')}>
                    <span
                      className={cm.cn('material-symbols-outlined text-base text-success')}
                      aria-hidden="true"
                    >
                      cancel
                    </span>
                    {t('landing.proofCancelAnytime', {}, { defaultValue: 'Cancel anytime' })}
                  </span>
                </div>
              </div>

              <div className={cm.cn('lg:col-span-5')}>
                <div
                  className={cm.cn(
                    'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-primary/20',
                  )}
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-container, #6d28d9) 50%, var(--color-tertiary, #be185d) 100%)',
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
                        {t('landing.sampleEyebrow', {}, { defaultValue: SAMPLE_CARD.eyebrow })}
                      </span>
                      <p
                        className={cm.cn(
                          'text-[11px] font-bold uppercase tracking-widest text-white/80 mt-3',
                        )}
                      >
                        {t('landing.sampleChannel', {}, { defaultValue: SAMPLE_CARD.channel })}
                      </p>
                      <h3
                        className={cm.cn(
                          'text-2xl md:text-3xl font-extrabold tracking-tight leading-tight mt-1',
                        )}
                      >
                        {t('landing.sampleTitle', {}, { defaultValue: SAMPLE_CARD.title })}
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
                        <span
                          className={cm.cn('material-symbols-outlined text-[64px] text-white/90')}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          play_circle
                        </span>
                      </div>
                    </div>

                    <div>
                      <div
                        className={cm.cn(
                          'flex items-center gap-2 text-[11px] font-mono tabular-nums text-white/80',
                        )}
                      >
                        <span>11:42</span>
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
                        <span>{SAMPLE_CARD.duration}</span>
                      </div>
                      <div
                        className={cm.cn(
                          'flex items-center justify-between gap-4 mt-3 text-[11px] text-white/80',
                        )}
                      >
                        <span className={cm.cn('tabular-nums')}>
                          {t(
                            'landing.sampleViews',
                            { count: SAMPLE_CARD.views },
                            { defaultValue: '{{count}} views' },
                          )}
                        </span>
                        <div className={cm.cn('flex items-center gap-3')} aria-hidden="true">
                          <span
                            className={cm.cn(
                              'w-9 h-9 rounded-full flex items-center justify-center text-white/90',
                            )}
                          >
                            <span className={cm.cn('material-symbols-outlined text-[18px]')}>
                              skip_previous
                            </span>
                          </span>
                          <span
                            className={cm.cn(
                              'w-12 h-12 rounded-full bg-surface text-on-surface flex items-center justify-center shadow-xl',
                            )}
                          >
                            <span
                              className={cm.cn('material-symbols-outlined text-2xl')}
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              pause
                            </span>
                          </span>
                          <span
                            className={cm.cn(
                              'w-9 h-9 rounded-full flex items-center justify-center text-white/90',
                            )}
                          >
                            <span className={cm.cn('material-symbols-outlined text-[18px]')}>
                              skip_next
                            </span>
                          </span>
                        </div>
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
                  'bg-surface-container-lowest rounded-2xl p-6 text-center hover:shadow-lg transition-shadow border-l-4',
                )}
                style={{ borderLeftColor: BRAND_COLOR }}
              >
                <p
                  className={cm.cn(
                    'text-3xl md:text-4xl font-extrabold tracking-tight tabular-nums',
                  )}
                  style={{ color: BRAND_COLOR }}
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
              { defaultValue: 'Built for the way you actually watch' },
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
                  <span className={cm.cn('material-symbols-outlined text-3xl')} aria-hidden="true">
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
              {t('landing.ctaHeading', {}, { defaultValue: 'Press play on something better' })}
            </h3>
            <p className={cm.cn('text-base text-on-surface-variant max-w-xl mx-auto mb-8')}>
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'Free forever. No ads. Pro plan unlocks 4K, captions, and creator analytics.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                'inline-flex items-center gap-2 px-10 py-4 font-semibold text-white rounded-full hover:opacity-90 transition-opacity shadow-lg',
              )}
              style={{ background: `linear-gradient(135deg, ${BRAND_COLOR}, ${ACCENT_COLOR})` }}
            >
              {t('landing.ctaCta', {}, { defaultValue: 'Get started — it\u2019s free' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn(
          'py-8 text-center text-sm bg-surface text-on-surface-variant border-t border-outline-variant',
        )}
      >
        <p>
          {t(
            'common.copyrightBuiltWithMolecule',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '© {{year}} {{app}}. Built with Molecule.' },
          )}
        </p>
      </footer>
    </div>
  )
}
