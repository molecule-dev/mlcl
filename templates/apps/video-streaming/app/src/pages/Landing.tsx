import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

const FEATURES = [
  {
    key: 'discover',
    defaultTitle: 'Endless discovery',
    defaultBody:
      'Curated trending feeds, channel recommendations, and rabbit-hole rails that learn what you love.',
    icon: 'movie',
    tone: 'text-[var(--spool-cta-from)] bg-[color-mix(in_srgb,var(--spool-cta-from)_12%,transparent)]',
  },
  {
    key: 'create',
    defaultTitle: 'Built for creators',
    defaultBody:
      'Upload, generate captions, mark chapters, and publish — everything a channel needs in one studio.',
    icon: 'videocam',
    tone: 'text-[var(--spool-cta-to)] bg-[color-mix(in_srgb,var(--spool-cta-to)_12%,transparent)]',
  },
  {
    key: 'live',
    defaultTitle: 'Live, premieres, replays',
    defaultBody:
      'Tune in to live streams with chat, schedule premieres, and rewatch anything on demand.',
    icon: 'sensors',
    tone: 'text-[var(--mol-color-warning)] bg-[color-mix(in_srgb,var(--mol-color-warning)_12%,transparent)]',
  },
  {
    key: 'social',
    defaultTitle: 'Watch with friends',
    defaultBody:
      'Comments, reactions, and shared playlists keep the conversation alive long after the credits.',
    icon: 'forum',
    tone: 'text-[var(--mol-color-info)] bg-[color-mix(in_srgb,var(--mol-color-info)_12%,transparent)]',
  },
] as const

const STATS = [
  { key: 'videos', defaultLabel: 'Videos', value: '120M+' },
  { key: 'creators', defaultLabel: 'Active creators', value: '4.8M' },
  { key: 'watching', defaultLabel: 'Hours watched', value: '2.3B' },
  { key: 'languages', defaultLabel: 'Languages', value: '90+' },
]

/** Hero mosaic tiles — decorative gradient thumbnails in the design's
 *  rotated 2×2 collage (LIVE badge, duration chips, progress bar). */
const MOSAIC = [
  {
    icon: 'sports_esports',
    live: true,
    duration: undefined as string | undefined,
    progress: undefined as number | undefined,
  },
  { icon: 'graphic_eq', live: false, duration: '14:20', progress: undefined },
  { icon: 'keyboard', live: false, duration: undefined, progress: 66 },
  { icon: 'travel_explore', live: false, duration: '08:45', progress: undefined },
]

const TRENDING = [
  {
    key: 'film',
    icon: 'movie_filter',
    gradient:
      'from-[var(--spool-cta-from)]/50 via-[var(--spool-cta-to)]/30 to-[var(--mol-color-info)]/40',
    titleKey: 'landing.sampleTitle',
    defaultTitle: 'How a film label fell in love with reels again',
    channelKey: 'landing.sampleChannel',
    defaultChannel: 'Northern Field Studio',
    viewsKey: 'landing.sampleViews',
    defaultViews: '{{count}} views',
    viewsValues: { count: '482K' },
    duration: '24:18',
    live: false,
    progress: 48,
  },
  {
    key: 'esports',
    icon: 'sports_esports',
    gradient: 'from-[var(--mol-color-info)]/40 to-[var(--spool-cta-from)]/50',
    titleKey: 'landing.trending.esports.title',
    defaultTitle: 'The Ultimate Championship Finals — Live',
    channelKey: 'landing.trending.esports.channel',
    defaultChannel: 'ProGamer Channel',
    viewsKey: 'landing.trending.esports.views',
    defaultViews: '{{count}} watching now',
    viewsValues: { count: '24K' },
    duration: 'LIVE',
    live: true,
    progress: undefined,
  },
  {
    key: 'dance',
    icon: 'music_note',
    gradient: 'from-[var(--spool-cta-to)]/50 to-[var(--mol-color-warning)]/40',
    titleKey: 'landing.trending.dance.title',
    defaultTitle: 'Neon Nights Choreography | Official Video',
    channelKey: 'landing.trending.dance.channel',
    defaultChannel: 'UrbanMoves',
    viewsKey: 'landing.trending.dance.views',
    defaultViews: '{{count}} views',
    viewsValues: { count: '8.4M' },
    duration: '03:45',
    live: false,
    progress: undefined,
  },
  {
    key: 'tokyo',
    icon: 'ramen_dining',
    gradient: 'from-[var(--mol-color-success)]/40 to-[var(--spool-cta-to)]/40',
    titleKey: 'landing.trending.tokyo.title',
    defaultTitle: 'Finding the Best Late Night Street Food in Tokyo',
    channelKey: 'landing.trending.tokyo.channel',
    defaultChannel: 'BiteSizedTravel',
    viewsKey: 'landing.trending.tokyo.views',
    defaultViews: '{{count}} views',
    viewsValues: { count: '2.1M' },
    duration: '18:30',
    live: false,
    progress: 80,
  },
] as const

/** Renders the tagline with every word on its own line, the last word carrying
 *  the violet→rose gradient — matching the Stitch hero ("Unwind. / Watch. /
 *  Create.") while staying fully translatable. */
function StackedHeadline({ text }: { text: string }) {
  const words = text.trim().split(/\s+/)
  return (
    <>
      {words.map((w, i) =>
        i === words.length - 1 ? (
          <span
            key={i}
            className="block bg-clip-text text-transparent bg-gradient-to-r from-[var(--spool-cta-to)] to-[var(--spool-cta-from)]"
          >
            {w}
          </span>
        ) : (
          <span key={i} className="block">
            {w}
          </span>
        ),
      )}
    </>
  )
}

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  const ctaGradient =
    'bg-gradient-to-r from-[var(--spool-cta-from)] to-[var(--spool-cta-to)] text-white rounded-full hover:opacity-90 transition-opacity'

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        'bg-background text-on-surface antialiased selection:bg-[var(--spool-cta-from)]',
      )}
    >
      <nav
        className={cm.cn(
          'sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.flex({ align: 'center', justify: 'between' }),
            cm.mxAuto,
          )}
        >
          <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <span
              className={cm.cn(
                cm.w(9),
                cm.h(9),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'shadow',
                ctaGradient,
              )}
              aria-hidden="true"
            >
              <span
                className={cm.cn('material-symbols-outlined text-[18px] text-white')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                play_arrow
              </span>
            </span>
            <span className={cm.cn('text-2xl font-black tracking-tighter italic')}>{APP_NAME}</span>
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/home"
                data-mol-id="landing-nav-dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  ctaGradient,
                )}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  data-mol-id="landing-nav-login"
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'text-on-surface-variant hover:text-[var(--spool-cta-from)] transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  data-mol-id="landing-nav-signup"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    ctaGradient,
                  )}
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Start watching' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — text left, rotated thumbnail mosaic right (Stitch layout) */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 lg:py-24')}>
          <div className={cm.cn('grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center')}>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
              <h1
                className={cm.cn(
                  'text-5xl lg:text-7xl font-black tracking-tighter leading-[1.05]',
                  '[font-family:var(--font-headline)]',
                )}
              >
                <StackedHeadline
                  text={t(
                    'landing.heroTitle',
                    { tagline: APP_TAGLINE },
                    { defaultValue: '{{tagline}}' },
                  )}
                />
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  'text-on-surface-variant max-w-md leading-relaxed',
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
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }))}>
                <Link
                  to="/signup"
                  data-mol-id="landing-hero-cta"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 2 }),
                    'px-7',
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    'shadow-[0_0_20px_color-mix(in_srgb,var(--spool-cta-from)_40%,transparent)]',
                    ctaGradient,
                  )}
                >
                  {t(
                    'landing.heroCta',
                    { appName: APP_NAME },
                    { defaultValue: 'Get a free {{appName}} account' },
                  )}
                  <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                    arrow_forward
                  </span>
                </Link>
                <Link
                  to="/login"
                  className={cm.cn(
                    'px-7',
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    'rounded-full bg-surface-container-high border border-outline-variant hover:bg-surface-container-highest transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
              </div>

              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
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

            {/* Rotated 2×2 thumbnail collage */}
            <div className={cm.cn('relative w-full max-w-[520px] mx-auto lg:mx-0')}>
              <div
                className={cm.cn(
                  'grid grid-cols-2 gap-4 -rotate-3 hover:rotate-0 transition-transform duration-700 ease-out',
                )}
              >
                {MOSAIC.map((tile, i) => (
                  <div
                    key={tile.icon}
                    className={cm.cn(
                      'relative rounded-xl overflow-hidden bg-surface border border-outline-variant aspect-square',
                      i === 1 && 'mt-8',
                      i === 2 && '-mt-4',
                      i === 3 && 'mt-4',
                    )}
                    aria-hidden="true"
                  >
                    <div
                      className={cm.cn(
                        'flex h-full w-full items-center justify-center bg-gradient-to-br',
                        i === 0 && 'from-[var(--spool-cta-from)]/50 to-[var(--spool-cta-to)]/40',
                        i === 1 && 'from-[var(--mol-color-info)]/40 to-[var(--spool-cta-from)]/40',
                        i === 2 && 'from-[var(--spool-cta-to)]/40 to-[var(--mol-color-warning)]/40',
                        i === 3 &&
                          'from-[var(--mol-color-success)]/40 to-[var(--spool-cta-from)]/40',
                      )}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-5xl text-white/80')}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {tile.icon}
                      </span>
                    </div>
                    {tile.live && (
                      <div
                        className={cm.cn(
                          'absolute top-2 left-2 flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase text-white bg-[var(--spool-live-badge)]',
                        )}
                      >
                        <span
                          className={cm.cn('h-1.5 w-1.5 rounded-full bg-white animate-pulse')}
                        />
                        {t('landing.mosaic.live', {}, { defaultValue: 'Live' })}
                      </div>
                    )}
                    {tile.duration && (
                      <div
                        className={cm.cn(
                          'absolute bottom-2 right-2 rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white bg-black/80',
                        )}
                      >
                        {tile.duration}
                      </div>
                    )}
                    {typeof tile.progress === 'number' && (
                      <div className={cm.cn('absolute bottom-0 left-0 h-[3px] w-full bg-white/20')}>
                        <div
                          className={cm.cn('h-full bg-[var(--spool-cta-from)]')}
                          style={{ width: `${tile.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Trending row (Stitch section) */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-12')}>
          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              cm.flex({ gap: 2, align: 'center' }),
              'mb-8',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-[var(--spool-cta-to)]')}
              aria-hidden="true"
            >
              local_fire_department
            </span>
            {t('landing.trending.heading', {}, { defaultValue: 'Trending this week' })}
          </h2>
          <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10')}>
            {TRENDING.map((card) => (
              <div key={card.key} className={cm.cn('group')}>
                <div
                  className={cm.cn(
                    'relative aspect-video rounded-xl overflow-hidden bg-surface border border-outline-variant mb-3',
                  )}
                >
                  <div
                    className={cm.cn(
                      'flex h-full w-full items-center justify-center bg-gradient-to-br transition-transform duration-500 group-hover:scale-105',
                      card.gradient,
                    )}
                    aria-hidden="true"
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-5xl text-white/80')}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {card.icon}
                    </span>
                  </div>
                  {card.live ? (
                    <div
                      className={cm.cn(
                        'absolute top-2 left-2 flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase text-white bg-[var(--spool-live-badge)]',
                      )}
                    >
                      <span className={cm.cn('h-1.5 w-1.5 rounded-full bg-white animate-pulse')} />
                      {t('landing.mosaic.live', {}, { defaultValue: 'Live' })}
                    </div>
                  ) : (
                    <div
                      className={cm.cn(
                        'absolute bottom-2 right-2 rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white bg-black/80',
                      )}
                    >
                      {card.duration}
                    </div>
                  )}
                  {typeof card.progress === 'number' && (
                    <div className={cm.cn('absolute bottom-0 left-0 h-[3px] w-full bg-white/20')}>
                      <div
                        className={cm.cn('h-full bg-[var(--spool-cta-from)]')}
                        style={{ width: `${card.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
                  <span
                    className={cm.cn(
                      'h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-[var(--spool-cta-from)] to-[var(--spool-cta-to)] text-white text-xs font-bold flex items-center justify-center',
                    )}
                    aria-hidden="true"
                  >
                    {t(card.channelKey, {}, { defaultValue: card.defaultChannel })
                      .trim()
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                  <div>
                    <h3
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('bold'),
                        'leading-tight line-clamp-2 group-hover:text-[var(--spool-cta-from)] transition-colors',
                      )}
                    >
                      {t(card.titleKey, {}, { defaultValue: card.defaultTitle })}
                    </h3>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant mt-1')}>
                      {t(card.channelKey, {}, { defaultValue: card.defaultChannel })}
                    </p>
                    <p
                      className={cm.cn(
                        'text-[11px] text-on-surface-variant/80 tabular-nums mt-0.5',
                        card.live && 'font-medium text-[var(--spool-live)]',
                      )}
                    >
                      {t(card.viewsKey, card.viewsValues, { defaultValue: card.defaultViews })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-12')}>
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 md:grid-cols-4')}>
            {STATS.map((s) => (
              // stat accent, NOT --spool-cta-from: the 11px eyebrow label reads it as text and
              // #7c3aed on the black tile is 3.68:1 (axe fail); this token is 4.96:1 dark / 7.1:1 light
              <div
                key={s.key}
                className={cm.cn(
                  'bg-surface-container-lowest rounded-2xl p-6 text-center hover:shadow-lg transition-shadow',
                  cm.accentCard({ tone: 'custom' }),
                )}
                style={{ ['--mol-accent' as string]: 'var(--spool-stat-accent)' }}
              >
                <p
                  className={cm.cn(
                    'text-3xl md:text-4xl font-extrabold tracking-tight tabular-nums text-[var(--spool-stat-accent)]',
                  )}
                >
                  {s.value}
                </p>
                <p className={cm.cn(cm.accentCardLabel({ tone: 'custom' }), cm.sp('mt', 2))}>
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
                    'inline-flex p-3 rounded-xl group-hover:scale-110 transition-transform',
                    f.tone,
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
              data-mol-id="landing-footer-cta"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 2 }),
                cm.sp('px', 8),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                'inline-flex shadow-lg',
                ctaGradient,
              )}
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
          'py-10 text-sm bg-background text-on-surface-variant border-t border-outline-variant',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
          )}
        >
          <div className={cm.cn('text-lg font-black tracking-tighter italic text-on-surface')}>
            {APP_NAME}
          </div>
          <div className={cm.cn(cm.flex({ gap: 'lg', wrap: 'wrap' }), cm.textSize('sm'))}>
            <Link to="/about" className="hover:text-[var(--spool-cta-to)] transition-colors">
              {t('footer.about', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
            </Link>
            <Link to="/pricing" className="hover:text-[var(--spool-cta-to)] transition-colors">
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            <Link to="/privacy" className="hover:text-[var(--spool-cta-to)] transition-colors">
              {t('landing.footer.privacy', {}, { defaultValue: 'Privacy' })}
            </Link>
            <Link to="/terms" className="hover:text-[var(--spool-cta-to)] transition-colors">
              {t('landing.footer.terms', {}, { defaultValue: 'Terms' })}
            </Link>
          </div>
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
        </div>
      </footer>
    </div>
  )
}

export default Landing
