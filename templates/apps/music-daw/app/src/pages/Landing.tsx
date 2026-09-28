import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE, BRAND_ACCENT_COLOR, BRAND_COLOR } from '../branding.js'
import { PublicNav } from '../components/PublicNav.js'

const FEATURES = [
  {
    key: 'tracks',
    defaultTitle: 'Unlimited tracks',
    defaultBody:
      'Layer audio, MIDI, and instrument lanes. Mute, solo, and arm with single keystrokes.',
    icon: 'view_stream',
    tint: 'text-violet-400',
  },
  {
    key: 'samples',
    defaultTitle: '20k royalty-free samples',
    defaultBody:
      'Loops, one-shots, vocals, foley. Tag by key and BPM, drag straight onto the timeline.',
    icon: 'library_music',
    tint: 'text-pink-400',
  },
  {
    key: 'mixer',
    defaultTitle: 'Studio-grade mixer',
    defaultBody:
      'Channel strips, send routing, FX racks, and meter visualisation that updates at 60 Hz.',
    icon: 'tune',
    tint: 'text-cyan-400',
  },
  {
    key: 'collab',
    defaultTitle: 'Live collaboration',
    defaultBody: 'Co-write in real time. See cursors, hear edits, never overwrite a take.',
    icon: 'group',
    tint: 'text-emerald-400',
  },
] as const

const STATS = [
  { key: 'producers', defaultLabel: 'Producers', value: '120k' },
  { key: 'samples', defaultLabel: 'Samples', value: '20k+' },
  { key: 'projects', defaultLabel: 'Tracks shipped', value: '4.7M' },
  { key: 'plugins', defaultLabel: 'Built-in FX', value: '60' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <PublicNav />

      <main>
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn('absolute inset-0 pointer-events-none')}
            style={{
              backgroundImage:
                `radial-gradient(circle at 25% 30%, ${BRAND_COLOR}40, transparent 50%),` +
                `radial-gradient(circle at 78% 60%, ${BRAND_ACCENT_COLOR}33, transparent 45%)`,
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
                  className={cm.cn('text-sm font-black uppercase tracking-widest mb-4')}
                  style={{ color: BRAND_COLOR }}
                >
                  {t(
                    'landing.eyebrow',
                    {},
                    { defaultValue: 'Browser DAW · multi-track · sample library' },
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
                    { defaultValue: '{{tagline}}.' },
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
                        'A studio-grade browser DAW. Layer audio, MIDI, and FX without leaving the tab — every edit non-destructive, every render in the cloud.',
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      'inline-flex items-center gap-2 px-8 py-4 font-semibold whitespace-nowrap text-white rounded-full transition-colors shadow-xl',
                    )}
                    style={{
                      background: `linear-gradient(135deg, ${BRAND_COLOR}, ${BRAND_ACCENT_COLOR})`,
                      boxShadow: `0 12px 32px ${BRAND_COLOR}40`,
                    }}
                  >
                    {t(
                      'landing.heroCta',
                      {},
                      { defaultValue: 'Start producing — free for 14 days' },
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
                  className={cm.cn('relative overflow-hidden rounded-[2rem] text-white shadow-2xl')}
                  style={{
                    background: `linear-gradient(135deg, ${BRAND_COLOR} 0%, #6d28d9 50%, ${BRAND_ACCENT_COLOR} 100%)`,
                    minHeight: '460px',
                    boxShadow: `0 24px 64px ${BRAND_COLOR}40`,
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
                      'relative z-10 p-7 flex flex-col justify-between min-h-[460px]',
                    )}
                  >
                    <div>
                      <span
                        className={cm.cn(
                          'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-surface/20 backdrop-blur-md',
                        )}
                      >
                        {t(
                          'landing.sampleEyebrow',
                          {},
                          { defaultValue: 'Live session · 8 tracks · 124 BPM' },
                        )}
                      </span>
                      <h3
                        className={cm.cn(
                          'text-2xl md:text-3xl font-extrabold tracking-tight leading-tight mt-3',
                        )}
                      >
                        {t('landing.sampleTrack', {}, { defaultValue: 'Midnight Bass — Demo' })}
                      </h3>
                      <p
                        className={cm.cn(
                          'text-[11px] font-black uppercase tracking-widest text-white/80 mt-1',
                        )}
                      >
                        {t(
                          'landing.sampleAlbum',
                          {},
                          { defaultValue: 'Auto-saved · 3 collaborators' },
                        )}
                      </p>
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
                        >
                          graphic_eq
                        </span>
                      </div>
                    </div>

                    <div>
                      <div
                        className={cm.cn(
                          'flex items-center gap-2 text-[11px] font-mono tabular-nums text-white/85',
                        )}
                      >
                        <span>00:01:42</span>
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
                        <span>00:03:31</span>
                      </div>
                      <div
                        className={cm.cn('flex items-center justify-center gap-3 mt-3')}
                        aria-hidden="true"
                      >
                        <span
                          className={cm.cn(
                            'w-9 h-9 rounded-full flex items-center justify-center text-white/90',
                          )}
                        >
                          <span className={cm.cn('material-symbols-outlined')}>skip_previous</span>
                        </span>
                        <span
                          className={cm.cn(
                            'w-12 h-12 rounded-full bg-surface text-on-surface flex items-center justify-center shadow-xl',
                          )}
                        >
                          <span className={cm.cn('material-symbols-outlined text-3xl')}>pause</span>
                        </span>
                        <span
                          className={cm.cn(
                            'w-9 h-9 rounded-full flex items-center justify-center text-white/90',
                          )}
                        >
                          <span className={cm.cn('material-symbols-outlined')}>skip_next</span>
                        </span>
                        <span
                          className={cm.cn('w-9 h-9 rounded-full flex items-center justify-center')}
                          style={{ color: 'var(--daw-warning)' }}
                        >
                          <span
                            className={cm.cn('material-symbols-outlined')}
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            fiber_manual_record
                          </span>
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
                  'bg-surface-container-lowest rounded-2xl p-6 text-center hover:shadow-lg transition-shadow border-l-4',
                )}
                style={{ borderColor: BRAND_COLOR }}
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
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mt-2',
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
              { defaultValue: 'Built for producers who actually finish' },
            )}
          </h2>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  'bg-surface-container-lowest rounded-2xl p-6 hover:shadow-2xl hover:shadow-on-surface/5 hover:-translate-y-0.5 transition-all group',
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
              {t('landing.ctaHeading', {}, { defaultValue: 'Hit play on your next track' })}
            </h3>
            <p className={cm.cn('text-base text-on-surface-variant max-w-xl mx-auto mb-8')}>
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    '14 days free. No credit card. Export every project, no watermarks.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                'inline-flex items-center gap-2 px-10 py-4 font-semibold whitespace-nowrap text-white rounded-full transition-colors',
              )}
              style={{
                background: `linear-gradient(135deg, ${BRAND_COLOR}, ${BRAND_ACCENT_COLOR})`,
              }}
            >
              {t('landing.heroCta', {}, { defaultValue: 'Start producing — free for 14 days' })}
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
        <nav
          aria-label={t('footer.legalNavLabel', {}, { defaultValue: 'Footer' })}
          className={cm.cn('flex items-center justify-center gap-6 mb-3')}
        >
          <Link to="/about" className={cm.cn('hover:text-on-surface transition-colors')}>
            {t('footer.about', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
          </Link>
          <Link to="/privacy" className={cm.cn('hover:text-on-surface transition-colors')}>
            {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
          </Link>
          <Link to="/terms" className={cm.cn('hover:text-on-surface transition-colors')}>
            {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
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
