import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ACCENT_COLOR, APP_NAME, APP_TAGLINE, BRAND_COLOR } from '../branding.js'
import { PostCard } from '../components/PostCard.js'
import { SAMPLE_HASHTAGS, SAMPLE_POSTS } from '../lib/sample-feed.js'

const FEATURES = [
  {
    key: 'stories',
    defaultTitle: 'Stories that stick',
    defaultBody:
      'Conic-gradient rings, snappy transitions, and one-tap replies. Stories that feel current — not noisy.',
    icon: 'auto_awesome',
    tint: 'text-primary',
  },
  {
    key: 'creators',
    defaultTitle: 'A canvas for creators',
    defaultBody:
      'High-resolution media, tight typography, no ads in the feed. Your portfolio, in full color.',
    icon: 'palette',
    tint: 'text-fuchsia-500',
  },
  {
    key: 'realtime',
    defaultTitle: 'Realtime, by default',
    defaultBody:
      'Live badges that pulse, online dots, optimistic likes. The feed moves the way conversation does.',
    icon: 'bolt',
    tint: 'text-warning',
  },
  {
    key: 'community',
    defaultTitle: 'A kinder comments section',
    defaultBody: 'Threaded replies, human moderation, opt-in private circles. Civil-by-default.',
    icon: 'group',
    tint: 'text-violet-500',
  },
] as const

const STATS = [
  { key: 'creators', defaultLabel: 'Creators', value: '2.4M' },
  { key: 'posts', defaultLabel: 'Posts shared', value: '184M' },
  { key: 'stories', defaultLabel: 'Daily stories', value: '6.1M' },
  { key: 'countries', defaultLabel: 'Countries', value: '120+' },
]

const HERO_GRADIENT = `linear-gradient(135deg, ${BRAND_COLOR} 0%, ${ACCENT_COLOR} 100%)`

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  const heroPost = SAMPLE_POSTS[0]
  const trending = SAMPLE_HASHTAGS.slice(0, 4)

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
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.textSize('xl'),
              cm.fontWeight('extrabold'),
              'tracking-tight',
            )}
            style={{ color: BRAND_COLOR }}
          >
            <span
              className={cm.cn(
                'inline-flex w-8 h-8 rounded-full items-center justify-center text-white shadow',
              )}
              style={{ background: HERO_GRADIENT }}
              aria-hidden="true"
            >
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
                'text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/feed"
                className={cm.cn(
                  cm.sp('px', 5),
                  'py-2 font-semibold text-sm rounded-full text-white hover:shadow-md transition-shadow',
                )}
                style={{ background: HERO_GRADIENT }}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn(
                    'text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 5),
                    'py-2 font-semibold text-sm rounded-full text-white hover:shadow-md transition-shadow',
                  )}
                  style={{ background: HERO_GRADIENT }}
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
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn('absolute inset-0 pointer-events-none')}
            style={{
              backgroundImage:
                `radial-gradient(circle at 18% 28%, ${BRAND_COLOR}33, transparent 50%),` +
                `radial-gradient(circle at 82% 64%, ${ACCENT_COLOR}33, transparent 45%)`,
            }}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'relative py-16 md:py-24 lg:py-28',
            )}
          >
            <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-12 items-center')}>
              <div className={cm.cn('lg:col-span-7')}>
                <p
                  className={cm.cn('text-sm font-bold uppercase tracking-widest text-primary mb-5')}
                >
                  {t('landing.eyebrow', {}, { defaultValue: 'Stories · Posts · Realtime feed' })}
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
                    { app: APP_NAME },
                    {
                      defaultValue:
                        '{{app}} is a creator-first social feed — vibrant stories, gallery-grade posts, and conversations that feel human. No infinite-scroll ad rivers, no algorithmic noise.',
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      'inline-flex items-center gap-2',
                      cm.sp('px', 8),
                      'py-4 font-semibold rounded-full text-white hover:shadow-lg transition-all',
                    )}
                    style={{ background: HERO_GRADIENT }}
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
                      'py-4 font-semibold rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors',
                    )}
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
                    'mt-8 text-xs text-on-surface-variant',
                  )}
                >
                  <span className={cm.cn('inline-flex items-center gap-2')}>
                    <span
                      className={cm.cn('w-2 h-2 rounded-full bg-emerald-500 animate-pulse')}
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

              <div className={cm.cn('lg:col-span-5')}>
                <PostCard post={heroPost} />
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
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-2xl text-center hover:shadow-lg transition-shadow border-l-4 border-primary',
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

        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 md:py-20')}>
          <h2
            className={cm.cn('mb-3 text-center text-3xl md:text-5xl font-extrabold tracking-tight')}
          >
            {t(
              'landing.featuresHeading',
              {},
              { defaultValue: 'Built for people who actually post' },
            )}
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
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-2xl hover:shadow-2xl hover:shadow-on-surface/5 transition-all group border border-outline-variant/40',
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

        <section className={cm.cn('border-t border-outline-variant/40')}>
          <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight mb-4')}>
              {t(
                'landing.ctaHeading',
                {},
                { defaultValue: 'Bring the vivid version of you online' },
              )}
            </h3>
            <p className={cm.cn('text-base text-on-surface-variant max-w-xl mx-auto mb-8')}>
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    "Free forever for the basics. Pro plans unlock long-form video and collaborator tools — start when you're ready.",
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                'inline-flex items-center gap-2',
                cm.sp('px', 10),
                'py-4 font-semibold rounded-full text-white hover:shadow-lg transition-all',
              )}
              style={{ background: HERO_GRADIENT }}
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
          cm.sp('py', 8),
          cm.textCenter,
          'text-sm bg-surface text-on-surface-variant border-t border-outline-variant',
        )}
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
