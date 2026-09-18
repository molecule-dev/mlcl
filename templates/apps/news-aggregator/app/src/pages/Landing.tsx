import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BiasIndicator } from '../components/BiasIndicator.js'
import { Footer } from '../components/Footer.js'
import { TopicChipsRow } from '../components/TopicChipsRow.js'

const FEATURES = [
  {
    key: 'multi_source',
    defaultTitle: 'One story, every angle',
    defaultBody:
      'Read the same headline through every outlet covering it. Compare framing side by side.',
    icon: 'groups',
    tint: 'text-primary',
  },
  {
    key: 'bias_aware',
    defaultTitle: 'Bias awareness',
    defaultBody:
      'Every source is rated on a transparent left-to-right spectrum so you know who you are reading.',
    icon: 'balance',
    tint: 'text-secondary',
  },
  {
    key: 'topical_grouping',
    defaultTitle: 'Topical grouping',
    defaultBody:
      'AI clusters related stories by topic — politics, tech, sports — so the day reads as one feed.',
    icon: 'category',
    tint: 'text-tertiary',
  },
  {
    key: 'curated',
    defaultTitle: 'Curated, not algorithmic',
    defaultBody: 'No infinite scroll. A finite, finished briefing you can actually finish reading.',
    icon: 'auto_awesome',
    tint: 'text-info',
  },
] as const

const SAMPLE_TOPICS = [
  { slug: 'world', label: 'World', icon: 'public', tint: 'world' as const, storyCount: 24 },
  {
    slug: 'business',
    label: 'Business',
    icon: 'trending_up',
    tint: 'business' as const,
    storyCount: 18,
  },
  { slug: 'tech', label: 'Tech', icon: 'memory', tint: 'tech' as const, storyCount: 31 },
  { slug: 'science', label: 'Science', icon: 'science', tint: 'science' as const, storyCount: 9 },
  {
    slug: 'sports',
    label: 'Sports',
    icon: 'sports_basketball',
    tint: 'sports' as const,
    storyCount: 14,
  },
  {
    slug: 'culture',
    label: 'Culture',
    icon: 'theater_comedy',
    tint: 'culture' as const,
    storyCount: 11,
  },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      {/* Top navigation */}
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
          <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <span
              className={
                'w-9 h-9 rounded-full inline-flex items-center justify-center shadow-md shadow-primary/20'
              }
              style={{
                background:
                  'linear-gradient(135deg, var(--mol-color-primary), var(--color-primary-gradient-to))',
              }}
            >
              <span
                className={'material-symbols-outlined text-white text-lg'}
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                newspaper
              </span>
            </span>
            <span
              className={cm.cn(cm.textSize('xl'), 'font-headline font-extrabold tracking-tight')}
            >
              {APP_NAME}
            </span>
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {t('landing.pricingLink', {}, { defaultValue: 'Pricing' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/home"
                data-mol-id="nav-go-to-dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'rounded-full text-white transition-colors hover:opacity-90',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--mol-color-primary), var(--color-primary-gradient-to))',
                }}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    'rounded-full text-white transition-colors hover:opacity-90',
                  )}
                  style={{
                    background:
                      'linear-gradient(135deg, var(--mol-color-primary), var(--color-primary-gradient-to))',
                  }}
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Start reading' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — gradient panel with editorial wordmark + sample story card */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-br from-primary-container via-surface to-surface pointer-events-none"
          />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'py-20 md:py-28 lg:py-32 relative',
            )}
          >
            <div className={'grid grid-cols-1 lg:grid-cols-12 gap-12 items-center'}>
              <div className={'lg:col-span-7'}>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mb', 4),
                    'font-bold uppercase tracking-widest text-primary',
                  )}
                >
                  {t('landing.eyebrow', {}, { defaultValue: 'Curated multi-source headlines' })}
                </p>
                <h1
                  className={cm.cn(
                    cm.sp('mb', 6),
                    'font-headline text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95]',
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
                    cm.textSize('lg'),
                    cm.sp('mb', 10),
                    'text-on-surface-variant max-w-xl leading-relaxed',
                  )}
                >
                  {t(
                    'landing.heroSubtitle',
                    { appName: APP_NAME },
                    {
                      defaultValue:
                        'Read every angle of every story. {{appName}} groups headlines from across the political spectrum so you know not just what happened, but how it is being told.',
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      'font-semibold rounded-full text-white inline-flex items-center gap-2 transition-colors hover:opacity-90',
                    )}
                    style={{
                      background:
                        'linear-gradient(135deg, var(--mol-color-primary), var(--color-primary-gradient-to))',
                    }}
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Start reading free' })}
                    <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                      arrow_forward
                    </span>
                  </Link>
                  <Link
                    to="/login"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      cm.fontWeight('semibold'),
                      'rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors',
                    )}
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>
                {/* Social proof — count of sources & topics */}
                <div className={cm.cn(cm.flex({ gap: 'lg', wrap: 'wrap' }), cm.sp('mt', 10))}>
                  {[
                    { key: 'sources', n: '320+', defaultLabel: 'trusted sources' },
                    { key: 'topics', n: '24', defaultLabel: 'curated topics' },
                    { key: 'stories', n: '6k', defaultLabel: 'stories per day' },
                  ].map((stat) => (
                    <div key={stat.key}>
                      <p
                        className={cm.cn(
                          cm.textSize('2xl'),
                          'font-headline font-extrabold tabular-nums',
                        )}
                      >
                        {stat.n}
                      </p>
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-on-surface-variant uppercase tracking-widest font-bold',
                        )}
                      >
                        {t(`landing.stat.${stat.key}`, {}, { defaultValue: stat.defaultLabel })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sample story card — same gradient pattern as the auth'd hero */}
              <div className={'lg:col-span-5'}>
                <div
                  className={cm.cn(
                    cm.flex({ direction: 'col', justify: 'between' }),
                    cm.sp('p', 8),
                    'min-h-[340px] rounded-[2rem] text-white relative overflow-hidden shadow-2xl shadow-primary/20',
                  )}
                  style={{
                    background:
                      'linear-gradient(135deg, var(--mol-color-primary), var(--mol-color-primary-dark))',
                  }}
                >
                  <div className="relative z-10">
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 4))}>
                      <span
                        className={
                          'px-3 py-1 rounded-full bg-error text-white text-[10px] font-bold uppercase tracking-widest'
                        }
                      >
                        {t('landing.sampleEyebrow', {}, { defaultValue: 'Breaking' })}
                      </span>
                      <span
                        className={
                          'px-3 py-1 rounded-full bg-surface/20 backdrop-blur-md text-[10px] font-bold uppercase tracking-widest'
                        }
                      >
                        {t('home.world', {}, { defaultValue: 'World' })}
                      </span>
                    </div>
                    <h2
                      className={
                        'font-headline text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.05] mb-3'
                      }
                    >
                      {t(
                        'landing.sampleHeadline',
                        {},
                        {
                          defaultValue:
                            'Climate summit lands a deal — five outlets, five framings.',
                        },
                      )}
                    </h2>
                    <p className={'text-white/85 text-base leading-relaxed max-w-md line-clamp-3'}>
                      {t(
                        'landing.sampleExcerpt',
                        { appName: APP_NAME },
                        {
                          defaultValue:
                            'Reuters calls it a breakthrough. Fox calls it a giveaway. The Guardian calls it overdue. {{appName}} stacks them for you.',
                        },
                      )}
                    </p>
                  </div>
                  <div className={'relative z-10 mt-6 flex items-center gap-3 flex-wrap'}>
                    <span
                      className={
                        'px-3 py-1 rounded-full bg-surface/20 backdrop-blur-md text-xs font-bold inline-flex items-center gap-1'
                      }
                    >
                      <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                        groups
                      </span>
                      {t(
                        'landing.sampleSourceCount',
                        { count: 7 },
                        { defaultValue: '{{count}} sources covering' },
                      )}
                    </span>
                    <span className={'text-xs text-white/70 font-bold uppercase tracking-widest'}>
                      {t('landing.sampleAgo', {}, { defaultValue: '12m ago' })}
                    </span>
                  </div>
                  <div
                    className={
                      'absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-surface/10 blur-3xl'
                    }
                  />
                  <div
                    className={
                      'absolute right-8 top-8 w-16 h-16 rounded-full bg-secondary/30 blur-xl'
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Topic chips strip */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-12')}>
          <TopicChipsRow
            heading={t('landing.topicsHeading', {}, { defaultValue: 'Today across the spectrum' })}
            topics={SAMPLE_TOPICS}
          />
        </section>

        {/* Feature grid */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <h2
            className={cm.cn(
              cm.sp('mb', 12),
              cm.textCenter,
              'font-headline text-3xl md:text-4xl font-extrabold tracking-tight',
            )}
          >
            {t(
              'landing.featuresHeading',
              {},
              { defaultValue: 'A finished briefing, not an infinite scroll' },
            )}
          </h2>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-2xl hover:shadow-2xl hover:shadow-on-surface/5 transition-all group',
                )}
              >
                <div
                  className={cm.cn(
                    cm.sp('p', 3),
                    'inline-flex bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
                    f.tint,
                  )}
                >
                  <span className="material-symbols-outlined text-3xl" aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.sp('mt', 5),
                    cm.sp('mb', 2),
                    'font-bold font-headline',
                  )}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Bias spectrum demo strip — Vantage's signature feature */}
        <section className={'border-t border-outline-variant/40 bg-surface-container-lowest'}>
          <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                'font-bold uppercase tracking-widest text-orange-800 dark:text-secondary mb-3 text-center',
              )}
            >
              {t('landing.spectrumEyebrow', {}, { defaultValue: 'Bias awareness, built in' })}
            </p>
            <h2
              className={cm.cn(
                cm.sp('mb', 6),
                cm.textCenter,
                'font-headline text-3xl md:text-4xl font-extrabold tracking-tight',
              )}
            >
              {t(
                'landing.spectrumHeading',
                {},
                { defaultValue: 'Every source plotted. No mystery.' },
              )}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('base'),
                cm.sp('mb', 10),
                cm.textCenter,
                'text-on-surface-variant max-w-2xl mx-auto',
              )}
            >
              {t(
                'landing.spectrumBody',
                {},
                {
                  defaultValue:
                    'A transparent left-to-right scale shows where each outlet sits. The cursor below shows the average bias for the demo headline above.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.maxW('xl'),
                cm.mxAuto,
                cm.sp('p', 6),
                'bg-surface rounded-2xl border border-outline-variant/40 shadow-sm',
              )}
            >
              <BiasIndicator value={-0.2} variant="spectrum" />
            </div>
          </div>
        </section>

        {/* CTA strip */}
        <section className={'border-t border-outline-variant/40'}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3
              className={cm.cn(
                cm.textSize('3xl'),
                cm.sp('mb', 4),
                'font-headline font-extrabold tracking-tight',
              )}
            >
              {t('landing.ctaHeading', {}, { defaultValue: 'See the news from every angle' })}
            </h3>
            <p
              className={cm.cn(
                cm.textSize('base'),
                cm.sp('mb', 8),
                'text-on-surface-variant max-w-xl mx-auto',
              )}
            >
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'No paywall, no algorithm. Just transparent multi-source coverage of every story.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 10),
                cm.sp('py', 4),
                'font-semibold rounded-full text-white inline-flex items-center gap-2 transition-colors hover:opacity-90',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--mol-color-primary), var(--color-primary-gradient-to))',
              }}
            >
              {t('landing.heroCta', {}, { defaultValue: 'Start reading free' })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
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
          cm.textSize('sm'),
          'bg-surface text-on-surface-variant border-t border-outline-variant',
        )}
      >
        <Footer />
        <p className={cm.sp('mt', 4)}>
          {t(
            'landing.copyright',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '© {{year}} {{app}}. Read the spectrum.' },
          )}
        </p>
      </footer>
    </div>
  )
}
