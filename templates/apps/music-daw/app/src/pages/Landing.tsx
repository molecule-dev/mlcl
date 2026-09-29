import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
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
  { key: 'producers', defaultLabel: 'Producers', value: '120k', tint: 'text-on-surface' },
  {
    key: 'projects',
    defaultLabel: 'Tracks shipped',
    value: '4.7M',
    tint: 'text-[var(--daw-track-audio)]',
  },
  {
    key: 'plugins',
    defaultLabel: 'Built-in FX',
    value: '60',
    tint: 'text-[var(--daw-secondary-hover)]',
  },
]

/** Hero mockup tracks — colored clips echoing the editor timeline (decorative). */
const MOCKUP_TRACKS = [
  {
    name: 'Synth',
    tint: 'text-[var(--daw-primary-hover)]',
    clips: [
      {
        left: 'left-4',
        width: 'w-32',
        tint: 'bg-[var(--daw-primary)]/40 border-[var(--daw-primary)]/50',
      },
      {
        left: 'left-40',
        width: 'w-48',
        tint: 'bg-[var(--daw-primary)]/40 border-[var(--daw-primary)]/50',
      },
    ],
  },
  {
    name: 'Bass',
    tint: 'text-[var(--daw-track-audio)]',
    clips: [
      {
        left: 'left-10',
        width: 'w-64',
        tint: 'bg-[var(--daw-track-audio)]/40 border-[var(--daw-track-audio)]/50',
      },
    ],
  },
  {
    name: 'Drums',
    tint: 'text-orange-400',
    clips: [
      { left: 'left-4', width: 'w-16', tint: 'bg-orange-400/40 border-orange-400/50' },
      { left: 'left-24', width: 'w-16', tint: 'bg-orange-400/40 border-orange-400/50' },
      { left: 'left-44', width: 'w-16', tint: 'bg-orange-400/40 border-orange-400/50' },
    ],
  },
  {
    name: 'Vocals',
    tint: 'text-emerald-400',
    clips: [{ left: 'left-48', width: 'w-40', tint: 'bg-emerald-400/40 border-emerald-400/50' }],
  },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <PublicNav />

      <main>
        {/* Hero — violet grid wash over the ink gradient, split copy/mockup */}
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn(
              'absolute inset-0 bg-gradient-to-b from-[var(--fugue-bg)] to-[var(--fugue-surface)]',
            )}
            aria-hidden="true"
          />
          <div className={cm.cn('absolute inset-0 fugue-hero-grid')} aria-hidden="true" />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'relative pt-20 pb-24 md:pt-24 md:pb-32',
            )}
          >
            <div className={cm.cn('grid grid-cols-1 lg:grid-cols-2 gap-16 items-center')}>
              <div className={cm.cn('space-y-8')}>
                <div
                  className={cm.cn(
                    'inline-flex items-center gap-2 px-3 py-1 rounded-full',
                    'bg-[color-mix(in_oklab,var(--daw-primary)_12%,transparent)]',
                    'text-[var(--daw-primary-hover)] text-sm font-medium',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                    graphic_eq
                  </span>
                  {t(
                    'landing.eyebrow',
                    {},
                    { defaultValue: 'Browser DAW · multi-track · sample library' },
                  )}
                </div>
                <h1
                  className={cm.cn(
                    'text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-tight',
                  )}
                >
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--daw-primary-hover)] to-[var(--daw-secondary-hover)]">
                    {t('landing.heroTitleLead', {}, { defaultValue: 'Layer' })}
                  </span>{' '}
                  {t('landing.heroTitleRest', {}, { defaultValue: 'everything, lose nothing.' })}
                </h1>
                <p
                  className={cm.cn(
                    'text-lg md:text-xl text-on-surface-variant max-w-lg leading-relaxed',
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
                    data-mol-id="landing-hero-cta"
                    className={cm.cn(
                      'inline-flex items-center gap-2 px-8 py-4 font-bold whitespace-nowrap rounded-full transition-all',
                      'bg-[var(--daw-primary)] text-[var(--color-on-primary)]',
                      'shadow-[0_0_20px_color-mix(in_oklab,var(--daw-primary)_50%,transparent)]',
                      'hover:bg-[var(--daw-primary-hover)]',
                    )}
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
                      'px-8 py-4 font-bold rounded-full transition-all',
                      'text-on-surface-variant hover:text-on-surface',
                      'hover:bg-[color-mix(in_oklab,var(--color-on-surface)_5%,transparent)]',
                      'inline-flex items-center gap-2',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      play_circle
                    </span>
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'lg' }),
                    'pt-4 text-sm text-on-surface-variant',
                  )}
                >
                  <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <span
                      className={cm.cn('material-symbols-outlined text-[var(--daw-primary)]')}
                      aria-hidden="true"
                    >
                      check_circle
                    </span>
                    {t('landing.heroCheckWebAudio', {}, { defaultValue: 'Web Audio API' })}
                  </div>
                  <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <span
                      className={cm.cn('material-symbols-outlined text-[var(--daw-secondary)]')}
                      aria-hidden="true"
                    >
                      sync
                    </span>
                    {t('landing.heroCheckSync', {}, { defaultValue: 'Real-time sync' })}
                  </div>
                </div>
              </div>

              {/* DAW window mockup — toolbar, colored track clips, glowing playhead */}
              <div className={cm.cn('relative')} aria-hidden="true">
                <div
                  className={cm.cn(
                    'rounded-xl overflow-hidden border border-white/5 shadow-2xl',
                    'bg-[var(--fugue-panel)]',
                    'shadow-[0_20px_50px_color-mix(in_oklab,black_50%,transparent)]',
                  )}
                >
                  <div
                    className={cm.cn(
                      'h-12 flex items-center justify-between px-4 border-b border-white/5',
                      'bg-[var(--fugue-bg)]',
                    )}
                  >
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/20" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
                      <div className="w-3 h-3 rounded-full bg-green-500/20" />
                    </div>
                    <div className="font-mono text-sm font-bold tracking-widest text-[var(--daw-track-audio)]">
                      00:42.16
                    </div>
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'sm' }),
                        'text-on-surface-variant',
                      )}
                    >
                      <span className="material-symbols-outlined text-lg">play_arrow</span>
                      <span className="material-symbols-outlined text-lg">stop</span>
                      <span className="material-symbols-outlined text-lg text-red-500">
                        fiber_manual_record
                      </span>
                    </div>
                  </div>
                  <div className={cm.cn('relative p-4 space-y-2')}>
                    {/* Playhead */}
                    <div
                      className={cm.cn(
                        'absolute top-0 bottom-0 left-[40%] w-px bg-[var(--daw-track-audio)] z-10',
                        'shadow-[0_0_8px_color-mix(in_oklab,var(--daw-track-audio)_80%,transparent)]',
                      )}
                    >
                      <div className="absolute -top-1 -left-1.5 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[var(--daw-track-audio)]" />
                    </div>
                    {MOCKUP_TRACKS.map((track) => (
                      <div
                        key={track.name}
                        className="flex h-16 bg-white/5 rounded-md overflow-hidden"
                      >
                        <div className="w-24 bg-white/5 p-2 flex flex-col justify-center border-r border-white/5">
                          <span className={cm.cn('text-xs font-bold', track.tint)}>
                            {track.name}
                          </span>
                        </div>
                        <div className="flex-1 relative p-2">
                          {track.clips.map((clip, i) => (
                            <div
                              key={i}
                              className={cm.cn(
                                'absolute h-10 rounded border',
                                clip.left,
                                clip.width,
                                clip.tint,
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats band — divided, mono values per the Stitch design */}
        <section
          className={cm.cn('relative border-y border-outline-variant/40 bg-[var(--fugue-bg)]')}
        >
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              cm.sp('py', 12),
              'grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-outline-variant/40',
            )}
          >
            {STATS.map((s) => (
              <div key={s.key} className="py-4">
                <p
                  className={cm.cn(
                    'font-mono text-4xl font-bold tracking-tight tabular-nums mb-2',
                    s.tint,
                  )}
                >
                  {s.value}
                </p>
                <p className={cm.cn('text-sm uppercase tracking-wide text-on-surface-variant')}>
                  {t(`landing.stat.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <h2 className={cm.cn('mb-12 text-center text-3xl md:text-4xl font-black tracking-tight')}>
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
                  'rounded-2xl p-6 border border-white/5 hover:-translate-y-0.5 transition-all group',
                  'bg-[var(--fugue-panel)]',
                )}
              >
                <div
                  className={cm.cn(
                    'inline-flex p-3 rounded-xl shadow-sm group-hover:scale-110 transition-transform',
                    'bg-[color-mix(in_oklab,var(--color-on-surface)_5%,transparent)]',
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

        {/* Final CTA — radial violet glow, gradient headline, white pill */}
        <section className={cm.cn('relative overflow-hidden bg-[var(--fugue-surface)]')}>
          <div className={cm.cn('absolute inset-0 fugue-cta-glow')} aria-hidden="true" />
          <div
            className={cm.cn(
              cm.maxW('4xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'relative py-24 md:py-32 text-center',
            )}
          >
            <h3
              className={cm.cn(
                'text-4xl md:text-5xl font-black tracking-tight mb-8',
                'text-transparent bg-clip-text bg-gradient-to-r from-[var(--daw-secondary-hover)] to-[var(--daw-primary)]',
              )}
            >
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
              data-mol-id="landing-final-cta"
              className={cm.cn(
                'inline-flex items-center gap-2 px-10 py-5 font-bold text-lg whitespace-nowrap rounded-full transition-colors',
                'bg-[var(--color-on-surface)] text-[var(--color-surface)]',
                'shadow-[0_0_30px_color-mix(in_oklab,var(--color-on-surface)_20%,transparent)]',
                'hover:opacity-90',
              )}
            >
              {t('landing.heroCta', {}, { defaultValue: 'Start producing — free for 14 days' })}
            </Link>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn('border-t border-white/5 bg-[var(--fugue-bg)] text-on-surface-variant')}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 8),
            'py-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm',
          )}
        >
          <div>
            <div className={cm.cn('mb-4')}>
              <BrandWordmark as="span" size="sm" footer />
            </div>
            <p>
              {t(
                'landing.footer.copyright',
                { year: new Date().getFullYear(), app: APP_NAME },
                { defaultValue: '© {{year}} {{app}}. Built for the web.' },
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
          <div>
            <h3 className={cm.cn('text-on-surface font-bold mb-4 text-sm')}>
              {t('landing.footer.productHeading', {}, { defaultValue: 'Product' })}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/signup"
                  className={cm.cn('hover:text-[var(--daw-secondary-hover)] transition-colors')}
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Open the studio' })}
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className={cm.cn('hover:text-[var(--daw-secondary-hover)] transition-colors')}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
              </li>
              <li>
                <Link
                  to="/samples"
                  className={cm.cn('hover:text-[var(--daw-secondary-hover)] transition-colors')}
                >
                  {t('landing.footer.samplesLink', {}, { defaultValue: 'Sample library' })}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className={cm.cn('text-on-surface font-bold mb-4 text-sm')}>
              {t('landing.footer.legalHeading', {}, { defaultValue: 'Legal' })}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/about"
                  aria-label={t(
                    'footer.about',
                    { appName: APP_NAME },
                    { defaultValue: 'About {{appName}}' },
                  )}
                  className={cm.cn('hover:text-[var(--daw-secondary-hover)] transition-colors')}
                >
                  {t('footer.about', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className={cm.cn('hover:text-[var(--daw-secondary-hover)] transition-colors')}
                >
                  {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className={cm.cn('hover:text-[var(--daw-secondary-hover)] transition-colors')}
                >
                  {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
