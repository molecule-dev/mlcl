import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BookCover } from '../components/BookCover.js'
import { Footer } from '../components/Footer.js'
import { LandingNav } from '../components/LandingNav.js'

const FEATURES = [
  {
    key: 'shelves',
    defaultTitle: 'Shelves that stay honest',
    defaultBody:
      'Reading, want-to-read, read, did-not-finish. Every book exactly where you left it.',
    icon: 'auto_stories',
  },
  {
    key: 'progress',
    defaultTitle: 'Page-by-page progress',
    defaultBody: 'Log the page you stopped on. Watch the bar close — then the book with it.',
    icon: 'menu_book',
  },
  {
    key: 'challenge',
    defaultTitle: 'The yearly challenge',
    defaultBody: 'Pick a number. A pace indicator tells you weekly whether the ring still closes.',
    icon: 'emoji_events',
  },
  {
    key: 'reviews',
    defaultTitle: 'Reviews worth rereading',
    defaultBody: 'Star ratings and the two lines you will want to remember a book by, in one feed.',
    icon: 'rate_review',
  },
] as const

const STATS = [
  { key: 'challenge', defaultLabel: 'Reading challenges finished', value: '31k+' },
  { key: 'pages', defaultLabel: 'Pages logged', value: '9.2M' },
  { key: 'reviews', defaultLabel: 'Reviews written', value: '480k' },
  { key: 'rating', defaultLabel: 'Average member rating', value: '4.7★' },
]

const SOCIAL_PROOF = [
  { value: '61k+', label: 'Readers tracking' },
  { value: '4.8★', label: 'iOS App Store rating' },
  { value: '88%', label: 'Hit their goal' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <LandingNav />

      <main>
        <section className={cm.cn(cm.sp('py', 24), 'relative overflow-hidden')}>
          <div
            className={cm.cn(
              'absolute -top-40 -right-40 w-[28rem] h-[28rem] rounded-full blur-3xl',
            )}
            style={{ background: 'color-mix(in srgb, var(--color-primary) 18%, transparent)' }}
          />
          <div
            className={cm.cn(
              'absolute -bottom-40 -left-40 w-[28rem] h-[28rem] rounded-full blur-3xl',
            )}
            style={{ background: 'color-mix(in srgb, var(--color-secondary) 18%, transparent)' }}
          />
          <div
            className={cm.cn(
              cm.maxW('5xl'),
              cm.sp('px', 6),
              cm.mxAuto,
              cm.textCenter,
              'relative z-10',
            )}
          >
            <span
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.sp('mb', 6),
                cm.fontWeight('bold'),
                'inline-flex items-center gap-2 rounded-full text-xs uppercase tracking-widest text-on-surface',
              )}
              style={{ backgroundColor: 'rgba(217, 119, 6, 0.12)', color: 'var(--color-flame)' }}
            >
              <span
                className={cm.cn('material-symbols-outlined text-base')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_stories
              </span>
              {t('landing.eyebrow', {}, { defaultValue: 'Every book. Every page. One shelf.' })}
            </span>
            <h1
              className={cm.cn(
                'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] font-extrabold',
              )}
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}' })}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('xl'),
                cm.sp('mt', 6),
                cm.sp('mb', 8),
                'text-on-surface-variant',
                cm.maxW('2xl'),
                cm.mxAuto,
              )}
            >
              {t(
                'landing.heroSubtitle',
                {},
                {
                  defaultValue:
                    'Shelve what you are reading, log the page you stopped on, rate it when it is done — and watch the yearly challenge ring close, book by book.',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'md' }))}>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('bold'),
                  cm.textSize('base'),
                  'text-on-primary rounded-full shadow-lg hover:shadow-xl transition-shadow inline-flex items-center gap-2',
                )}
                style={{
                  background:
                    'linear-gradient(90deg, var(--color-gradient-hero-start), var(--color-gradient-hero-end))',
                }}
              >
                {t('landing.heroCta', {}, { defaultValue: 'Start your library' })}
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 4),
                  cm.fontWeight('semibold'),
                  cm.textSize('base'),
                  'rounded-full border-2 border-outline-variant hover:border-primary hover:bg-primary-container/30 transition-colors',
                )}
              >
                {t('landing.heroCtaSecondary', {}, { defaultValue: 'See it live' })}
              </Link>
            </div>
            <div
              className={cm.cn(
                cm.sp('mt', 12),
                cm.flex({ align: 'center', justify: 'center', gap: 'lg' }),
                'flex-wrap',
              )}
            >
              {SOCIAL_PROOF.map((s) => (
                <div key={s.label} className={cm.cn(cm.flex({ align: 'baseline', gap: 'xs' }))}>
                  <span className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>{s.value}</span>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('medium'),
                      'text-on-surface-variant uppercase tracking-widest',
                    )}
                  >
                    {t(`landing.proof.${s.label}`, {}, { defaultValue: s.label })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sample shelf — a peek at the covers the app renders */}
        <section className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('pb', 16), cm.mxAuto)}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 3),
              'uppercase tracking-widest text-on-surface-variant text-center',
            )}
          >
            {t(
              'landing.previewLabel',
              { appName: APP_NAME },
              { defaultValue: 'A peek inside {{appName}}' },
            )}
          </p>
          <div
            className={cm.cn(
              'bg-surface-container-lowest rounded-2xl shadow-sm border-t-4 border-primary',
              cm.sp('p', 8),
              cm.flex({ align: 'end', justify: 'center', gap: 'lg' }),
            )}
          >
            <BookCover
              title="The Left Hand of Darkness"
              author="Ursula K. Le Guin"
              coverStyle="indigo"
              size="lg"
            />
            <BookCover title="Piranesi" author="Susanna Clarke" coverStyle="teal" size="lg" />
            <BookCover
              title="Braiding Sweetgrass"
              author="Robin Wall Kimmerer"
              coverStyle="forest"
              size="lg"
            />
            <BookCover title="Babel" author="R. F. Kuang" coverStyle="plum" size="lg" />
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
          <div className={cm.grid({ cols: 4, gap: 'md' })}>
            {STATS.map((s) => (
              <div
                key={s.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-2xl shadow-sm border-l-4 border-primary text-center hover:-translate-y-0.5 transition-transform',
                )}
              >
                <p
                  className={cm.cn('text-4xl font-extrabold tracking-tight')}
                  style={{ color: 'var(--mol-color-primary)' }}
                >
                  {s.value}
                </p>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.sp('mt', 2),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(`landing.stat.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 16), cm.mxAuto)}>
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 12))}>
            <h2
              className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight')}
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {t(
                'landing.featuresTitle',
                {},
                { defaultValue: 'Built for people who finish books' },
              )}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mt', 3),
                'text-on-surface-variant',
                cm.maxW('2xl'),
                cm.mxAuto,
              )}
            >
              {t(
                'landing.featuresBody',
                {},
                {
                  defaultValue:
                    'Shelves, progress, challenge, reviews — the four things a reading habit needs and nothing it does not.',
                },
              )}
            </p>
          </div>
          <div className={cm.grid({ cols: 4, gap: 'md' })}>
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-2xl shadow-sm border-t-4 border-secondary hover:-translate-y-0.5 transition-transform',
                )}
              >
                <span
                  className="material-symbols-outlined text-3xl"
                  aria-hidden="true"
                  style={{ color: 'var(--mol-color-primary)', fontVariationSettings: "'FILL' 1" }}
                >
                  {f.icon}
                </span>
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mt', 3))}>
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 16), cm.mxAuto)}>
          <div
            className={cm.cn(
              cm.sp('p', 12),
              cm.textCenter,
              'rounded-[2rem] text-white relative overflow-hidden',
            )}
            style={{
              background:
                'linear-gradient(135deg, var(--color-gradient-hero-start) 0%, var(--color-gradient-hero-end) 100%)',
            }}
          >
            <div
              className={cm.cn(
                'absolute -right-20 -top-20 w-64 h-64 rounded-full bg-surface/10 blur-3xl',
              )}
            />
            <div
              className={cm.cn('absolute -left-20 -bottom-20 w-64 h-64 rounded-full blur-3xl')}
              style={{ background: 'rgba(217, 119, 6, 0.3)' }}
            />
            <h2
              className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight relative z-10')}
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {t('landing.ctaTitle', {}, { defaultValue: 'One page tonight. Then another.' })}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mt', 4),
                'text-white/85 relative z-10',
                cm.maxW('xl'),
                cm.mxAuto,
              )}
            >
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'Free forever for up to five books. Pro unlocks unlimited shelves, full yearly stats, and exports.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 8),
                cm.sp('py', 4),
                cm.sp('mt', 8),
                cm.fontWeight('bold'),
                'inline-flex items-center gap-2 rounded-full bg-surface text-primary shadow-lg hover:shadow-xl transition-shadow relative z-10',
              )}
            >
              {t('landing.ctaButton', {}, { defaultValue: 'Start your library' })}
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
