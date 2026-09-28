import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { PostCard } from '../components/PostCard.js'
import { SAMPLE_HASHTAGS, SAMPLE_POSTS, SAMPLE_STORIES, vividGradient } from '../lib/sample-feed.js'

const FEATURES = [
  {
    key: 'stories',
    defaultTitle: 'Stories that stick',
    defaultBody:
      'Conic-gradient rings, snappy transitions, and one-tap replies. Stories that feel current — not noisy.',
    icon: 'history_toggle_off',
    cardCls: 'bg-primary-light',
    badgeCls: 'landing-vivid-gradient text-white shadow-lg',
  },
  {
    key: 'creators',
    defaultTitle: 'A canvas for creators',
    defaultBody:
      'High-resolution media, tight typography, no ads in the feed. Your portfolio, in full color.',
    icon: 'palette',
    cardCls: 'bg-secondary-container',
    badgeCls: 'bg-vivid text-white shadow-lg',
  },
  {
    key: 'realtime',
    defaultTitle: 'Realtime, by default',
    defaultBody:
      'Live badges that pulse, online dots, optimistic likes. The feed moves the way conversation does.',
    icon: 'bolt',
    cardCls: 'bg-surface-container',
    badgeCls: 'bg-error text-white shadow-lg',
  },
  {
    key: 'community',
    defaultTitle: 'A kinder comments section',
    defaultBody: 'Threaded replies, human moderation, opt-in private circles. Civil-by-default.',
    icon: 'group',
    cardCls: 'bg-surface-container-low',
    badgeCls: 'bg-success text-white shadow-lg',
  },
] as const

const STATS = [
  { key: 'creators', defaultLabel: 'Creators', value: '2.4M' },
  { key: 'posts', defaultLabel: 'Posts shared', value: '184M' },
  { key: 'stories', defaultLabel: 'Daily stories', value: '6.1M' },
  { key: 'countries', defaultLabel: 'Countries', value: '120+' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  const heroPost = SAMPLE_POSTS[0]
  const trending = SAMPLE_HASHTAGS.slice(0, 4)
  const stories = SAMPLE_STORIES.slice(0, 8)

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
          <span
            data-mol-id="nav-brand"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.textSize('xl'),
              cm.fontWeight('extrabold'),
              'tracking-tight text-primary',
            )}
          >
            <span
              className={cm.cn(
                'inline-flex w-8 h-8 rounded-full items-center justify-center',
                'landing-vivid-gradient text-white shadow',
              )}
              aria-hidden="true"
            >
              {/* Tile owns the sizing/centering — never the glyph span. */}
              <span
                className={cm.cn('material-symbols-outlined text-[18px]')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                bolt
              </span>
            </span>
            {APP_NAME}
          </span>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <Link
              to="/pricing"
              className={cm.cn(
                'text-sm font-medium text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/feed"
                data-mol-id="nav-feed-cta"
                className={cm.cn(
                  cm.sp('px', 5),
                  'py-2.5 font-semibold text-sm rounded-xl landing-vivid-gradient text-white hover:shadow-md transition-shadow',
                )}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  data-mol-id="nav-signin"
                  className={cm.cn(
                    'text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  data-mol-id="nav-signup-cta"
                  className={cm.cn(
                    cm.sp('px', 5),
                    'py-2.5 font-semibold text-sm rounded-xl landing-vivid-gradient text-white hover:shadow-md transition-shadow',
                  )}
                >
                  {t(
                    'landing.getStarted',
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
        {/* Hero — split copy / phone-framed live post over soft corner washes */}
        <section className={cm.cn('relative overflow-hidden')}>
          <div aria-hidden="true" className={cm.cn('absolute inset-0 pointer-events-none')}>
            <div
              className={cm.cn(
                'absolute top-0 right-0 w-1/2 h-full rounded-bl-full',
                'bg-gradient-to-bl from-primary-light/60 to-transparent',
              )}
            />
            <div
              className={cm.cn(
                'absolute bottom-0 left-0 w-1/2 h-full rounded-tr-full',
                'bg-gradient-to-tr from-secondary-container/60 to-transparent',
              )}
            />
          </div>
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'relative pt-16 pb-24 md:pt-20 lg:pt-24',
            )}
          >
            <div className={cm.cn('grid grid-cols-1 lg:grid-cols-2 gap-16 items-center')}>
              <div className={cm.cn(cm.textCenter, 'lg:text-left')}>
                <span
                  className={cm.cn(
                    'inline-block py-1.5 px-4 rounded-full text-xs font-bold tracking-widest uppercase',
                    'bg-primary-light text-primary',
                    cm.sp('mb', 6),
                  )}
                >
                  {t('landing.eyebrow', {}, { defaultValue: 'Share in full color' })}
                </span>
                <h1
                  className={cm.cn(
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight',
                    cm.sp('mb', 6),
                  )}
                >
                  {t('landing.heroTitle', {}, { defaultValue: 'Life is louder' })}
                  <br />
                  <span className="landing-vivid-text">
                    {t(
                      'landing.heroTitleAccent',
                      { appName: APP_NAME },
                      { defaultValue: 'in {{appName}}.' },
                    )}
                  </span>
                </h1>
                <p
                  className={cm.cn(
                    cm.textSize('xl'),
                    'text-on-surface-variant max-w-2xl leading-relaxed',
                    cm.sp('mb', 8),
                    cm.mxAuto,
                    'lg:mx-0',
                  )}
                >
                  {t(
                    'landing.heroSubtitle',
                    { app: APP_NAME },
                    {
                      defaultValue:
                        '{{app}} is a creator-first social feed — vibrant stories, gallery-grade posts, and conversations that feel human. No infinite-scroll ad rivers, no algorithmic noise.',
                    },
                  )}
                </p>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
                    cm.sp('pt', 4),
                    cm.textCenter,
                    'lg:justify-start justify-center',
                  )}
                >
                  <Link
                    to="/signup"
                    data-mol-id="landing-hero-cta"
                    className={cm.cn(
                      cm.sp('px', 8),
                      'py-4 font-bold rounded-xl',
                      'landing-vivid-gradient text-white hover:shadow-lg transition-all inline-flex items-center gap-2 justify-center',
                    )}
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Start sharing' })}
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
                      cm.sp('px', 8),
                      'py-4 font-semibold rounded-xl border border-outline-variant hover:bg-surface-container-low transition-colors',
                    )}
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
                    'mt-8 text-xs text-on-surface-variant justify-center lg:justify-start',
                  )}
                >
                  <span className={cm.cn('inline-flex items-center gap-2')}>
                    <span
                      className={cm.cn('w-2 h-2 rounded-full bg-success animate-pulse')}
                      aria-hidden="true"
                    />
                    {t('landing.online', {}, { defaultValue: '2.4M creators online today' })}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{t('landing.noAds', {}, { defaultValue: 'No ads in the feed' })}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {t(
                      'landing.noTraining',
                      {},
                      { defaultValue: 'No model training on your posts' },
                    )}
                  </span>
                </div>
              </div>

              {/* Phone-framed live post — the design's tilted product shot,
                  running the app's real PostCard instead of a static image. */}
              <div
                className={cm.cn(
                  'relative w-full max-w-md mx-auto flex justify-center items-center py-6',
                )}
              >
                <div
                  aria-hidden="true"
                  className={cm.cn(
                    'absolute w-[260px] h-[440px] rounded-[2rem] landing-vivid-gradient opacity-30 blur-sm',
                    'right-0 lg:right-6 top-0 rotate-[10deg]',
                  )}
                />
                <div
                  className={cm.cn(
                    'relative w-[280px] rounded-[2.5rem] bg-zinc-900 border-8 border-zinc-900 shadow-2xl',
                    'overflow-hidden -rotate-3 hover:rotate-0 transition-transform duration-500 z-10',
                  )}
                >
                  <PostCard post={heroPost} compact />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stories row — conic rainbow rings over gradient avatars */}
        <section
          data-mol-id="landing-stories-row"
          className={cm.cn(
            'py-12 bg-surface-container-low border-y border-outline-variant/40 overflow-x-auto',
          )}
        >
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6))}>
            <ul className={cm.cn(cm.flex({ gap: 'md' }), 'w-max')}>
              {stories.map((story) => (
                <li
                  key={story.id}
                  className={cm.cn(
                    cm.flex({ direction: 'col', align: 'center', gap: 'xs' }),
                    'group',
                  )}
                >
                  <div
                    className={cm.cn(
                      story.unread ? 'story-ring' : 'bg-outline-variant p-[3px]',
                      'rounded-full w-[86px] h-[86px] group-hover:scale-105 transition-transform duration-200',
                    )}
                  >
                    <div
                      className={cm.cn(
                        'w-full h-full rounded-full border-4 border-surface flex items-center justify-center',
                        cm.fontWeight('bold'),
                        'text-white text-xl',
                      )}
                      style={{ background: vividGradient(story.cover_index) }}
                      aria-hidden="true"
                    >
                      {story.author.display_name.slice(0, 1)}
                    </div>
                  </div>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {story.author.handle}
                  </span>
                </li>
              ))}
              <li className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'xs' }))}>
                <div
                  className={cm.cn(
                    'rounded-full w-[86px] h-[86px] flex items-center justify-center border-4 border-surface',
                    'bg-surface-container-high',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-on-surface-variant text-3xl')}
                    aria-hidden="true"
                  >
                    add
                  </span>
                </div>
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'text-on-surface-variant',
                  )}
                >
                  {t('landing.storiesMore', {}, { defaultValue: 'More' })}
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* Stats — app content the design lacks; kept in the design's flat tone */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-12')}>
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 md:grid-cols-4')}>
            {STATS.map((s) => (
              <div
                key={s.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-2xl text-center hover:shadow-lg transition-shadow',
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
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mt-2',
                  )}
                >
                  {t(`landing.stat.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Feature grid — design's tinted cards with circular icon badges */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 md:py-20')}>
          <h2
            className={cm.cn('mb-3 text-center text-3xl md:text-5xl font-extrabold tracking-tight')}
          >
            {t('landing.featuresHeading', {}, { defaultValue: 'Express yourself fully' })}
          </h2>
          <p
            className={cm.cn(
              'mb-12 text-center text-base text-on-surface-variant max-w-2xl mx-auto',
            )}
          >
            {t(
              'landing.featuresSubheading',
              {},
              {
                defaultValue:
                  "A creator-first feed with the polish of a magazine and the speed of a chat. Make things, share them, talk to people — that's it.",
              },
            )}
          </p>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 8),
                  cm.flex({ direction: 'col', align: 'center' }),
                  cm.textCenter,
                  'rounded-xl hover:-translate-y-2 transition-transform duration-300',
                  f.cardCls,
                )}
              >
                {/* Icon badge: circular tile element with a bare glyph child. */}
                <div
                  className={cm.cn(
                    'w-16 h-16 rounded-full flex items-center justify-center',
                    cm.sp('mb', 6),
                    f.badgeCls,
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-3xl')} aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3 className={cm.cn('text-xl font-bold mb-3')}>
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn('text-sm text-on-surface-variant leading-relaxed')}>
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Trending — app content the design lacks; kept */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-12')}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
              cm.sp('mb', 6),
            )}
          >
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-primary mb-1',
                )}
              >
                {t('landing.trendingEyebrow', {}, { defaultValue: 'Trending right now' })}
              </p>
              <h2
                className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight md:text-3xl')}
              >
                {t('landing.trendingHeading', {}, { defaultValue: 'Hashtags surging today' })}
              </h2>
            </div>
            <Link
              to="/explore"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('landing.exploreCta', {}, { defaultValue: 'Open Explore' })} →
            </Link>
          </div>
          <ul
            className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {trending.map((h) => (
              <li
                key={h.tag}
                className={cm.cn(
                  cm.sp('p', 5),
                  'bg-surface-container-lowest rounded-2xl border border-outline-variant/40 hover:shadow-md transition-shadow',
                )}
              >
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-black',
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  #{h.tag}
                </p>
                <p
                  className={cm.cn(
                    'text-3xl font-extrabold tracking-tight text-primary mt-2 tabular-nums',
                  )}
                >
                  {h.post_count.toLocaleString()}
                </p>
                <p
                  className={cm.cn(
                    'text-[11px] font-black uppercase tracking-widest text-success mt-1 tabular-nums inline-flex items-center gap-1',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[14px]')}
                    aria-hidden="true"
                  >
                    trending_up
                  </span>
                  +{h.delta_pct}%
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Download band — gradient wash + dot texture + white CTA */}
        <section className={cm.cn(cm.sp('py', 24), cm.sp('px', 6), 'relative overflow-hidden')}>
          <div aria-hidden="true" className={cm.cn('landing-download-band absolute inset-0')} />
          <div
            aria-hidden="true"
            className={cm.cn('landing-dot-texture absolute inset-0 opacity-20')}
          />
          <div className={cm.cn(cm.maxW('4xl'), cm.mxAuto, 'relative z-10 text-center text-white')}>
            <h2
              className={cm.cn(
                'text-4xl md:text-5xl font-extrabold tracking-tight',
                cm.sp('mb', 6),
              )}
            >
              {t('landing.ctaHeading', {}, { defaultValue: 'Ready to turn up the volume?' })}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('xl'),
                cm.sp('mb', 10),
                cm.maxW('2xl'),
                cm.mxAuto,
                'text-white/90',
              )}
            >
              {t(
                'landing.ctaBody',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'Join thousands of creators sharing their world in full color on {{appName}}.',
                },
              )}
            </p>
            <Link
              to="/signup"
              data-mol-id="landing-cta-band-button"
              className={cm.cn(
                cm.sp('px', 8),
                'py-4 rounded-xl bg-surface text-on-surface font-bold hover:shadow-xl transition-all inline-flex items-center gap-2 justify-center',
              )}
            >
              {t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn(
          'bg-surface-container-low border-t border-outline-variant/40',
          cm.sp('py', 12),
          cm.sp('px', 6),
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.flex({ direction: 'col', align: 'center', gap: 'lg' }),
            'md:flex-row md:justify-between md:items-start',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
              'md:items-start',
            )}
          >
            <span
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('extrabold'),
                'tracking-tight text-primary',
              )}
            >
              {APP_NAME}
            </span>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'landing.copyright',
                { year: new Date().getFullYear(), app: APP_NAME },
                { defaultValue: '© {{year}} {{app}}. Expressive, vibrant, creator-centric.' },
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
          {/* div, not nav — the footer landmark already covers these legal
              links; a second <nav> makes page.locator('nav') ambiguous. */}
          <div className={cm.cn(cm.flex({ gap: 'md', wrap: 'wrap' }), cm.textSize('sm'))}>
            <Link to="/pricing" className={cm.cn('text-on-surface-variant hover:text-primary')}>
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            <Link to="/privacy" className={cm.cn('text-on-surface-variant hover:text-primary')}>
              {t('landing.privacyLink', {}, { defaultValue: 'Privacy' })}
            </Link>
            <Link to="/terms" className={cm.cn('text-on-surface-variant hover:text-primary')}>
              {t('landing.termsLink', {}, { defaultValue: 'Terms' })}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
