import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_TAGLINE } from '../branding.js'
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
    meta: 'Reading · Want to read · DNF with dignity',
  },
  {
    key: 'progress',
    defaultTitle: 'Page-by-page progress',
    defaultBody: 'Log the page you stopped on. Watch the bar close — then the book with it.',
    icon: 'menu_book',
    meta: 'Exact page · Gentle pace · No overdue alerts',
  },
  {
    key: 'challenge',
    defaultTitle: 'The yearly challenge',
    defaultBody: 'Pick a number. A pace indicator tells you weekly whether the ring still closes.',
    icon: 'emoji_events',
    meta: 'Pick a number · Weekly pulse · Guilt-free pauses',
  },
  {
    key: 'reviews',
    defaultTitle: 'Reviews worth rereading',
    defaultBody: 'Star ratings and the two lines you will want to remember a book by, in one feed.',
    icon: 'rate_review',
    meta: 'Star ratings · Margin notes · One quiet feed',
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
                'inline-flex items-center gap-2 rounded-full bg-surface-container border border-outline-variant text-secondary text-[11px] font-semibold uppercase tracking-wider',
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" aria-hidden="true" />
              {t('landing.eyebrow', {}, { defaultValue: 'Every book. Every page. One shelf.' })}
            </span>
            <h1
              className={cm.cn(
                'text-4xl md:text-5xl font-normal tracking-[-0.02em] leading-[1.15] text-primary max-w-4xl mx-auto',
              )}
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}.' })}
              <br className="hidden md:block" />
              <span className="italic text-secondary">
                {t(
                  'landing.heroTitleAccent',
                  {},
                  { defaultValue: 'Build a reading life worth remembering.' },
                )}
              </span>
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
                  cm.sp('px', 6),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'py-3.5 text-on-primary rounded hover:opacity-90 transition-all inline-flex items-center gap-2 shadow-sm',
                )}
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {t('landing.heroCta', {}, { defaultValue: 'Start your library' })}
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'py-3.5 rounded border border-outline text-on-surface hover:bg-surface-container transition-colors',
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

        {/* Desk-library showcase — the active shelf with status chips */}
        <section className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('pb', 16), cm.mxAuto)}>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6 md:p-8">
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
                'border-b border-outline-variant pb-5 mb-8 text-left',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
                <div className="p-2 rounded bg-surface-container-low text-primary">
                  <span className="material-symbols-outlined" aria-hidden="true">
                    menu_book
                  </span>
                </div>
                <div>
                  <h2
                    className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-primary')}
                    style={{ fontFamily: 'var(--font-headline)' }}
                  >
                    {t('landing.shelfTitle', {}, { defaultValue: 'Desk library · late autumn' })}
                  </h2>
                  <p className="text-[12px] font-semibold tracking-wide text-on-surface-variant">
                    {t(
                      'landing.shelfSubtitle',
                      {},
                      { defaultValue: 'The current stacks on your table' },
                    )}
                  </p>
                </div>
              </div>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
                <span className="px-2.5 py-1 rounded bg-secondary-container text-on-secondary-fixed text-[11px] font-semibold">
                  {t('landing.shelfChipInProgress', {}, { defaultValue: '3 in progress' })}
                </span>
                <span className="px-2.5 py-1 rounded bg-surface-container text-on-surface-variant text-[11px] font-semibold">
                  {t('landing.shelfChipPaused', {}, { defaultValue: '1 paused guilt-free' })}
                </span>
              </div>
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'end', justify: 'center', gap: 'lg' }),
                // Four lg covers overflow a 390px viewport — wrap like a real
                // shelf instead of widening the page.
                'flex-wrap',
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
            {/* Margin-note strip */}
            <div className="mt-8 pt-6 border-t border-outline-variant flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-surface-container-low p-4 rounded-lg text-left">
              <div className={cm.cn(cm.flex({ align: 'start', gap: 3 }))}>
                <span
                  className="material-symbols-outlined text-secondary mt-0.5"
                  aria-hidden="true"
                >
                  edit_note
                </span>
                <div>
                  <p
                    className={cm.cn(cm.textSize('base'), 'text-primary italic')}
                    style={{ fontFamily: 'var(--font-headline)' }}
                  >
                    {t(
                      'landing.marginQuote',
                      {},
                      {
                        defaultValue:
                          'There is no great feeling like picking up a volume you laid aside four months ago, and sliding in as though it were yesterday.',
                      },
                    )}
                  </p>
                  <span className="text-[11px] font-semibold tracking-wide uppercase text-on-surface-variant mt-1 block">
                    {t(
                      'landing.marginSource',
                      {},
                      { defaultValue: 'Margin log · autumn notebook' },
                    )}
                  </span>
                </div>
              </div>
              <a
                href="#features"
                className="shrink-0 text-[12px] font-semibold text-secondary hover:text-primary flex items-center gap-1"
              >
                {t('landing.marginLink', {}, { defaultValue: 'View your margin notes' })}
                <span className="material-symbols-outlined text-sm" aria-hidden="true">
                  chevron_right
                </span>
              </a>
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
          <div className={cm.grid({ cols: 4, gap: 'md' })}>
            {STATS.map((s) => (
              <div
                key={s.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant text-center hover:-translate-y-0.5 transition-transform',
                )}
              >
                <p
                  className={cm.cn('text-3xl font-medium tracking-tight')}
                  style={{ fontFamily: 'var(--font-headline)', color: 'var(--color-primary)' }}
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
            <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary mb-2">
              {t('landing.featuresEyebrow', {}, { defaultValue: 'The core principles' })}
            </p>
            <h2
              className={cm.cn('text-3xl md:text-4xl font-medium tracking-[-0.01em] text-primary')}
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
                  'bg-surface-container-lowest rounded-xl border border-outline-variant text-left flex flex-col',
                )}
              >
                <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary mb-6">
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), cm.sp('mb', 2))}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mb', 4),
                    'text-on-surface-variant leading-relaxed flex-grow',
                  )}
                >
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
                <div className="pt-4 border-t border-outline-variant text-[11px] font-semibold text-secondary">
                  {t(`landing.feature.${f.key}.meta`, {}, { defaultValue: f.meta })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 16), cm.mxAuto)}>
          <div
            className={cm.cn(
              cm.sp('p', 12),
              cm.textCenter,
              'rounded-2xl text-on-primary relative overflow-hidden shadow-lg',
            )}
            style={{ backgroundColor: 'var(--color-primary)' }}
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
            <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary-fixed relative z-10 mb-3">
              {t('landing.ctaEyebrow', {}, { defaultValue: 'Sanctuary awaits' })}
            </p>
            <h2
              className={cm.cn('text-3xl md:text-4xl font-medium tracking-[-0.01em] relative z-10')}
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
                cm.sp('px', 6),
                cm.sp('mt', 8),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'py-3.5 inline-flex items-center gap-2 rounded bg-surface-container-lowest text-on-surface shadow-sm hover:bg-surface transition-colors relative z-10',
              )}
            >
              {t('landing.ctaButton', {}, { defaultValue: 'Start your library' })}
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
            <div
              className={cm.cn(
                cm.sp('mt', 6),
                cm.flex({ align: 'center', justify: 'center', gap: 'md', wrap: 'wrap' }),
                'relative z-10 text-xs text-surface-container-high',
              )}
            >
              {[
                'No credit card required',
                'Free tier with generous limits',
                'Import your Goodreads CSV',
              ].map((chip) => (
                <span key={chip} className={cm.cn(cm.flex({ align: 'center', gap: 1.5 }))}>
                  <span
                    className="material-symbols-outlined text-sm text-secondary-fixed"
                    aria-hidden="true"
                  >
                    check_circle
                  </span>
                  {t(`landing.ctaChip.${chip}`, {}, { defaultValue: chip })}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
