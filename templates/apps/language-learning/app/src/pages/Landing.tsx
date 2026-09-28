import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { Footer } from '../components/Footer.js'

const FEATURES = [
  {
    key: 'daily_lessons',
    defaultTitle: 'Daily lessons',
    defaultBody:
      'Five-minute drills built around your goal — spaced repetition keeps every word in earshot.',
    icon: 'today',
    tint: 'text-primary',
  },
  {
    key: 'speaking',
    defaultTitle: 'Speaking practice',
    defaultBody:
      'Native-quality TTS plus speech-recognition pronunciation checks for every new phrase.',
    icon: 'mic',
    tint: 'text-secondary',
  },
  {
    key: 'vocabulary',
    defaultTitle: 'Living vocabulary',
    defaultBody:
      'Words you stumble on come back tomorrow, then next week, then never — until you choose them.',
    icon: 'menu_book',
    tint: 'text-tertiary',
  },
  {
    key: 'community',
    defaultTitle: 'Friends leaderboard',
    defaultBody:
      'Weekly XP race with the people you care about. Streaks reward consistency, not cramming.',
    icon: 'emoji_events',
    tint: 'text-info',
  },
] as const

const LANGUAGES = [
  { code: 'es', flag: '🇪🇸', name: 'Spanish' },
  { code: 'fr', flag: '🇫🇷', name: 'French' },
  { code: 'ja', flag: '🇯🇵', name: 'Japanese' },
  { code: 'ko', flag: '🇰🇷', name: 'Korean' },
  { code: 'de', flag: '🇩🇪', name: 'German' },
  { code: 'it', flag: '🇮🇹', name: 'Italian' },
  { code: 'pt', flag: '🇵🇹', name: 'Portuguese' },
  { code: 'zh', flag: '🇨🇳', name: 'Mandarin' },
  { code: 'ru', flag: '🇷🇺', name: 'Russian' },
  { code: 'ar', flag: '🇸🇦', name: 'Arabic' },
  { code: 'hi', flag: '🇮🇳', name: 'Hindi' },
  { code: 'nl', flag: '🇳🇱', name: 'Dutch' },
  { code: 'sv', flag: '🇸🇪', name: 'Swedish' },
  { code: 'tr', flag: '🇹🇷', name: 'Turkish' },
] as const

const STATS = [
  { key: 'learners', value: '2M+', defaultLabel: 'Active learners' },
  { key: 'languages', value: '50+', defaultLabel: 'Languages' },
  { key: 'improvement', value: '98%', defaultLabel: 'See improvement' },
  { key: 'minutes', value: '15m', defaultLabel: 'A day needed' },
] as const

// Quiz-card answer options for the hero composition (design copy). The
// second option renders in the "correct" state with a check badge.
const QUIZ_OPTIONS = [
  { key: 'perro', label: 'El perro', correct: false },
  { key: 'gato', label: 'El gato', correct: true },
  { key: 'bebe', label: 'bebe', correct: false },
  { key: 'leche', label: 'leche', correct: false },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      {/* Top navigation — frosted bar (design: white/80 blur, h-16) */}
      <nav
        className={cm.cn(
          'sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 shadow-sm',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.flex({ align: 'center', justify: 'between' }),
            'mx-auto h-16',
          )}
        >
          <Link
            to="/"
            className={cm.cn(
              cm.textSize('xl'),
              'font-black tracking-tight text-primary transition-opacity hover:opacity-80',
            )}
          >
            {APP_NAME}
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'hidden text-on-surface-variant transition-colors hover:text-primary sm:inline-flex',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-mol-id="nav-go-to-dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2.5),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-full shadow-sm transition-all hover:bg-primary-hover hover:shadow-md',
                )}
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
                    'hidden text-on-surface-variant transition-colors hover:text-primary sm:inline-flex',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  data-mol-id="nav-start-free"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2.5),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'bg-primary text-on-primary rounded-full shadow-sm transition-all hover:bg-primary-hover hover:shadow-md active:scale-95',
                  )}
                >
                  {t('common.startFree', {}, { defaultValue: 'Start free' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className={cm.sp('pb', 16)}>
        {/* Hero split — headline with squiggle accent + floating quiz card */}
        <section
          className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-12 md:py-20 lg:py-24')}
        >
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'lg' }),
              'lg:flex-row lg:items-center lg:gap-16',
            )}
          >
            {/* Left content — 55% */}
            <div
              className={cm.cn(
                cm.stack(8),
                'relative z-10 w-full text-center lg:w-[55%] lg:text-left',
              )}
            >
              <h1
                className={cm.cn(
                  'text-5xl font-extrabold tracking-tight leading-[1.1] md:text-6xl lg:text-7xl',
                )}
              >
                {t('landing.heroTitleLeading', {}, { defaultValue: 'Speak the world' })}{' '}
                <span className={cm.cn('relative inline-block text-primary')}>
                  {t('landing.heroTitleAccent', {}, { defaultValue: 'fluently' })}
                  <svg
                    className={cm.cn(
                      'absolute -bottom-2 left-0 h-3 w-full text-secondary md:-bottom-4 md:h-5',
                    )}
                    preserveAspectRatio="none"
                    viewBox="0 0 200 20"
                    aria-hidden="true"
                  >
                    <path
                      d="M0,10 Q100,20 200,0"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="8"
                    />
                  </svg>
                </span>
              </h1>
              <p
                className={cm.cn(
                  cm.mxAuto,
                  cm.maxW('2xl'),
                  'text-lg leading-relaxed text-on-surface-variant md:text-xl lg:mx-0',
                )}
              >
                {t(
                  'landing.heroSubtitle',
                  {},
                  {
                    defaultValue:
                      'Playful, encouraging, and rhythmic language learning. Master a new language in just 15 minutes a day with our proven, gamified method.',
                  },
                )}
              </p>
              <div
                className={cm.cn(
                  cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
                  'sm:flex-row lg:justify-start',
                )}
              >
                <Link
                  to="/signup"
                  data-mol-id="hero-start-learning"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    'inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary text-lg font-bold text-on-primary shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-xl active:scale-95 sm:w-auto',
                  )}
                >
                  {t('landing.heroCta', {}, { defaultValue: 'Start a 7-day streak' })}
                  <span
                    className={cm.cn(
                      'material-symbols-outlined text-xl transition-transform group-hover:rotate-12',
                    )}
                    aria-hidden="true"
                  >
                    auto_awesome
                  </span>
                </Link>
                <a
                  href="#how-it-works"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    'inline-flex w-full items-center justify-center gap-2 rounded-full bg-surface-container-lowest text-lg font-semibold text-on-surface transition-all hover:bg-surface-secondary hover:text-primary active:scale-95 sm:w-auto',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
                    play_circle
                  </span>
                  {t('landing.heroHow', {}, { defaultValue: 'See how it works' })}
                </a>
              </div>
              {/* Social proof — learner stack + rating */}
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'md' }),
                  'pt-6 lg:justify-start',
                )}
              >
                <div className={cm.cn('flex -space-x-3')}>
                  {/* Deliberate non-replication: the design hotlinks portrait
                      photos; we render initial tiles instead. */}
                  {['AM', 'JK', 'RS'].map((initials) => (
                    <span
                      key={initials}
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'h-10 w-10 rounded-full border-2 border-surface bg-primary-container text-[11px] font-bold text-on-primary-container shadow-sm',
                      )}
                      aria-hidden="true"
                    >
                      {initials}
                    </span>
                  ))}
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'h-10 w-10 rounded-full border-2 border-surface bg-surface-secondary text-xs font-bold text-primary shadow-sm',
                    )}
                    aria-hidden="true"
                  >
                    2M+
                  </span>
                </div>
                <div className={cm.cn(cm.flex({ direction: 'col' }), cm.textSize('sm'))}>
                  <div className={cm.cn(cm.flex({ gap: 'xs' }), 'text-secondary')}>
                    {['star', 'star', 'star', 'star', 'star_half'].map((icon, i) => (
                      <span
                        key={i}
                        className={cm.cn('material-symbols-outlined text-base')}
                        aria-hidden="true"
                      >
                        {icon}
                      </span>
                    ))}
                  </div>
                  <span className={cm.cn(cm.fontWeight('medium'), 'text-on-surface-variant')}>
                    {t(
                      'landing.proof.stars',
                      { rating: '4.9' },
                      { defaultValue: '{{rating}} stars from learners' },
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Right content — floating quiz composition */}
            <div
              className={cm.cn(
                'relative flex h-[400px] w-full items-center justify-center md:h-[500px] lg:h-[600px] lg:w-[45%]',
              )}
              aria-hidden="true"
            >
              {/* Background blobs */}
              <div
                className={cm.cn(
                  'absolute inset-0 rounded-full bg-gradient-to-tr from-surface-secondary to-primary-light opacity-40 blur-3xl',
                )}
              />
              {/* Main floating quiz card */}
              <div
                className={cm.cn(
                  cm.sp('p', 6),
                  'relative z-20 w-72 rotate-[-2deg] rounded-2xl border border-outline-variant/30 bg-surface shadow-2xl transition-transform duration-500 hover:rotate-0 md:w-80',
                )}
              >
                <div
                  className={cm.cn(
                    cm.sp('mb', 6),
                    cm.flex({ justify: 'between', align: 'center' }),
                  )}
                >
                  <span className={cm.cn('h-2 w-8 rounded-full bg-surface-container-high')} />
                  <span className={cm.cn('material-symbols-outlined text-on-surface-variant')}>
                    close
                  </span>
                </div>
                <div className={cm.cn(cm.textCenter, cm.sp('mb', 6))}>
                  <h3 className={cm.cn(cm.sp('mb', 2), cm.textSize('xl'), cm.fontWeight('bold'))}>
                    {t('landing.quiz.prompt', {}, { defaultValue: 'Translate this sentence' })}
                  </h3>
                  <div
                    className={cm.cn(cm.sp('p', 4), 'inline-block rounded-xl bg-surface-secondary')}
                  >
                    <span
                      className={cm.cn(cm.textSize('lg'), cm.fontWeight('medium'), 'text-primary')}
                    >
                      {t('landing.quiz.sentence', {}, { defaultValue: '“The cat drinks milk”' })}
                    </span>
                  </div>
                </div>
                <div className={cm.cn(cm.sp('mb', 6), 'grid grid-cols-2 gap-3')}>
                  {QUIZ_OPTIONS.map((option) =>
                    option.correct ? (
                      <span
                        key={option.key}
                        className={cm.cn(
                          cm.sp('p', 3),
                          cm.textCenter,
                          'relative -translate-y-0.5 rounded-xl border-2 border-success bg-success/10 font-bold text-success shadow-[0_4px_0_0_var(--mol-color-success)]',
                        )}
                      >
                        {t(`landing.quiz.option.${option.key}`, {}, { defaultValue: option.label })}
                        <span
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'center' }),
                            'absolute -top-3 -right-3 h-6 w-6 rounded-full bg-success text-surface shadow-md',
                          )}
                        >
                          <span className={cm.cn('material-symbols-outlined text-sm font-bold')}>
                            check
                          </span>
                        </span>
                      </span>
                    ) : (
                      <span
                        key={option.key}
                        className={cm.cn(
                          cm.sp('p', 3),
                          cm.textCenter,
                          cm.fontWeight('medium'),
                          'rounded-xl border-2 border-outline-variant/40 text-on-surface-variant',
                        )}
                      >
                        {t(`landing.quiz.option.${option.key}`, {}, { defaultValue: option.label })}
                      </span>
                    ),
                  )}
                </div>
                <div
                  className={cm.cn('h-2 w-full overflow-hidden rounded-full bg-surface-container')}
                >
                  <div className={cm.cn('h-full w-3/4 rounded-full bg-success')} />
                </div>
              </div>
              {/* Floating decorative elements */}
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'absolute top-1/4 -left-2 z-30 animate-bounce rounded-full border border-outline-variant/30 bg-surface px-4 py-2 shadow-lg md:-left-6',
                  '[animation-duration:3s]',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[var(--parlance-xp)]')}>
                  bolt
                </span>
                <span className={cm.cn(cm.fontWeight('bold'), 'text-[var(--parlance-xp)]')}>
                  {t('landing.quiz.xpPill', {}, { defaultValue: '+10 XP' })}
                </span>
              </div>
              <div
                className={cm.cn(
                  'absolute bottom-1/4 -right-2 z-10 animate-pulse rounded-full border border-outline-variant/30 bg-surface p-3 text-2xl shadow-xl md:-right-4',
                  '[animation-duration:4s]',
                )}
              >
                🇪🇸
              </div>
              <div
                className={cm.cn(
                  'absolute top-1/3 right-0 h-12 w-12 rounded-full bg-secondary opacity-20 blur-xl md:right-8',
                )}
              />
              <div
                className={cm.cn(
                  'absolute bottom-1/3 left-4 h-16 w-16 rounded-full bg-primary opacity-20 blur-xl md:left-12',
                )}
              />
            </div>
          </div>
        </section>

        {/* Stats band — purple gradient strip with white numerals */}
        <section
          className={cm.cn(
            'relative overflow-hidden bg-gradient-to-r from-primary to-primary-light py-12',
          )}
        >
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'relative z-10')}>
            <div
              className={cm.cn('grid grid-cols-2 gap-8 text-center text-on-primary md:grid-cols-4')}
            >
              {STATS.map((stat) => (
                <div key={stat.key}>
                  <div
                    className={cm.cn(
                      cm.sp('mb', 2),
                      'text-4xl font-black tracking-tight md:text-5xl',
                    )}
                  >
                    {stat.value}
                  </div>
                  <div
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'uppercase tracking-wider text-primary-fixed',
                    )}
                  >
                    {t(`landing.stat.${stat.key}`, {}, { defaultValue: stat.defaultLabel })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Languages strip — kept from the app surface (e2e-covered) */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16')}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
              cm.sp('mb', 8),
            )}
          >
            <p className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}>
              {t('landing.languagesEyebrow', {}, { defaultValue: 'Pick a language' })}
            </p>
            <h2
              className={cm.cn(cm.textSize('3xl'), cm.textCenter, 'font-extrabold tracking-tight')}
            >
              {t(
                'landing.languagesHeading',
                {},
                { defaultValue: 'Fourteen languages, one daily habit' },
              )}
            </h2>
          </div>
          <div
            className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-7')}
          >
            {LANGUAGES.map((lang) => (
              <div
                key={lang.code}
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.flex({ direction: 'col', align: 'center', gap: 'xs' }),
                  'bg-surface-container-lowest rounded-2xl border border-outline-variant/20 hover:border-primary hover:-translate-y-0.5 transition-all',
                )}
              >
                <span className={cm.cn('text-3xl')} aria-hidden="true">
                  {lang.flag}
                </span>
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                  {t(`landing.language.${lang.code}`, {}, { defaultValue: lang.name })}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Feature grid — kept from the app surface; anchors the hero's
            "See how it works" CTA. */}
        <section
          id="how-it-works"
          className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}
        >
          <h2
            className={cm.cn(
              cm.sp('mb', 4),
              cm.textCenter,
              'text-3xl font-extrabold tracking-tight md:text-4xl',
            )}
          >
            {t(
              'landing.featuresHeading',
              {},
              { defaultValue: 'A practice loop that respects your time' },
            )}
          </h2>
          <p
            className={cm.cn(
              cm.textSize('lg'),
              cm.textCenter,
              cm.sp('mb', 12),
              'text-on-surface-variant max-w-2xl mx-auto',
            )}
          >
            {t(
              'landing.featuresSubheading',
              {},
              {
                defaultValue:
                  'Designed for adults with thirty minutes a day, not thirty hours a week.',
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
                  'group border border-outline-variant/20 bg-surface-container-lowest rounded-2xl transition-all hover:shadow-2xl hover:shadow-on-surface/5',
                )}
              >
                <div
                  className={cm.cn(
                    cm.sp('p', 3),
                    'inline-flex rounded-xl bg-surface shadow-sm transition-transform group-hover:scale-110',
                    f.tint,
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-3xl')} aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn(cm.textSize('lg'), cm.sp('mt', 5), cm.sp('mb', 2), 'font-bold')}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed text-on-surface-variant')}>
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA strip */}
        <section
          className={cm.cn(
            'border-t border-outline-variant/40 bg-gradient-to-br from-surface to-primary-container/40',
          )}
        >
          <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('px', 6), 'py-20 text-center')}>
            <h3
              className={cm.cn(cm.textSize('4xl'), cm.sp('mb', 4), 'font-extrabold tracking-tight')}
            >
              {t('landing.ctaHeading', {}, { defaultValue: 'Ready to find your accent?' })}
            </h3>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mb', 8),
                'text-on-surface-variant max-w-xl mx-auto',
              )}
            >
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue: 'No card needed. Drop your email, pick a language, start tomorrow.',
                },
              )}
            </p>
            <Link
              to="/signup"
              data-mol-id="cta-start-streak"
              className={cm.cn(
                cm.sp('px', 10),
                cm.sp('py', 4),
                'inline-flex items-center gap-2 rounded-full bg-primary font-semibold text-on-primary shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-xl active:scale-95',
              )}
            >
              {t('landing.heroCta', {}, { defaultValue: 'Start a 7-day streak' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer — rounded-top tinted panel (design: rounded-t-[32px] #f5f3ff) */}
      <footer
        className={cm.cn(
          'relative z-10 rounded-t-[2rem] border-t border-outline-variant/30 bg-surface-secondary text-on-surface-variant',
        )}
      >
        <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('pt', 8))}>
          <p className={cm.cn(cm.sp('pb', 6), cm.textCenter, cm.textSize('sm'), 'font-medium')}>
            {APP_NAME} — {APP_TAGLINE}
          </p>
          <Footer className="bg-surface-secondary!" />
          <p className={cm.cn(cm.sp('mt', 4), cm.sp('pb', 8), cm.textCenter, cm.textSize('sm'))}>
            {t(
              'landing.copyright',
              { year: new Date().getFullYear(), app: APP_NAME },
              { defaultValue: '© {{year}} {{app}}. Built for adult learners.' },
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
