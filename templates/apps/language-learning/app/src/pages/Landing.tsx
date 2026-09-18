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

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      {/* Top navigation */}
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
          <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <span
              className={cm.cn(
                cm.w(8),
                cm.h(8),
                cm.flex({ align: 'center', justify: 'center' }),
                'rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-md shadow-primary/30',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-base')}
                aria-hidden="true"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                translate
              </span>
            </span>
            <span className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
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
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-full hover:bg-primary-dark transition-colors',
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
                    'bg-primary text-on-primary rounded-full hover:bg-primary-dark transition-colors',
                  )}
                >
                  {t('common.startFree', {}, { defaultValue: 'Start free' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — gradient panel with huge headline + sample streak card */}
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn(
              'absolute inset-0 bg-gradient-to-br from-primary-container via-surface to-surface pointer-events-none',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'py-20 md:py-28 lg:py-32 relative',
            )}
          >
            <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-12 items-center')}>
              <div className={cm.cn('lg:col-span-7')}>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mb', 4),
                    'font-bold uppercase tracking-widest text-primary',
                  )}
                >
                  {t(
                    'landing.eyebrow',
                    {},
                    { defaultValue: 'Daily language practice for grown-ups' },
                  )}
                </p>
                <h1
                  className={cm.cn(
                    cm.sp('mb', 6),
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95]',
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
                    {},
                    {
                      defaultValue:
                        'Five-minute lessons that fit on a coffee break. Drills, vocab, speaking — all wrapped in a streak you’ll actually keep.',
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      'font-semibold bg-gradient-to-r from-primary to-primary-dark text-on-primary rounded-full hover:shadow-xl hover:shadow-primary/30 transition-all inline-flex items-center gap-2',
                    )}
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Start a 7-day streak' })}
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
                      cm.sp('py', 4),
                      cm.fontWeight('semibold'),
                      'rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors',
                    )}
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>
                <div
                  className={cm.cn(
                    cm.sp('mt', 10),
                    cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
                    cm.textSize('sm'),
                    'text-on-surface-variant',
                  )}
                >
                  <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                    <span
                      className={cm.cn('material-symbols-outlined text-base text-secondary')}
                      aria-hidden="true"
                    >
                      verified
                    </span>
                    {t(
                      'landing.proof.users',
                      { count: '2.4M' },
                      { defaultValue: '{{count}} active learners' },
                    )}
                  </span>
                  <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                    <span
                      className={cm.cn('material-symbols-outlined text-base text-primary')}
                      aria-hidden="true"
                    >
                      stars
                    </span>
                    {t(
                      'landing.proof.rating',
                      { rating: '4.9' },
                      { defaultValue: 'App Store · {{rating}} stars' },
                    )}
                  </span>
                  <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                    <span
                      className={cm.cn('material-symbols-outlined text-base text-info')}
                      aria-hidden="true"
                    >
                      language
                    </span>
                    {t(
                      'landing.proof.languages',
                      { count: 14 },
                      { defaultValue: '{{count}} languages' },
                    )}
                  </span>
                </div>
              </div>

              {/* Sample streak card — same gradient as the auth'd Dashboard hero. */}
              <div className={cm.cn('lg:col-span-5')}>
                <div
                  className={cm.cn(
                    cm.flex({ direction: 'col', justify: 'between' }),
                    cm.sp('p', 8),
                    'min-h-[340px] bg-gradient-to-br from-primary via-primary-dark to-primary-light rounded-[2rem] text-white relative overflow-hidden shadow-2xl shadow-primary/30',
                  )}
                >
                  <div className={cm.cn('relative z-10')}>
                    <p
                      className={cm.cn(
                        'font-bold text-xs uppercase tracking-widest text-primary-fixed/90 mb-2',
                      )}
                    >
                      {t('landing.sampleEyebrow', {}, { defaultValue: 'Current streak' })}
                    </p>
                    <div className={cm.flex({ align: 'baseline', gap: 'sm' })}>
                      <span
                        className={cm.cn('text-7xl font-extrabold tracking-tighter tabular-nums')}
                      >
                        42
                      </span>
                      <span className={cm.cn('text-lg font-bold opacity-90')}>
                        {t('streakHeroCard.daysSuffix', {}, { defaultValue: 'days' })}
                      </span>
                      <span
                        className={cm.cn(
                          'px-3 py-1 rounded-full text-[11px] font-bold bg-surface/20 backdrop-blur-md inline-flex items-center gap-1',
                        )}
                      >
                        <span
                          className={cm.cn('material-symbols-outlined text-sm')}
                          aria-hidden="true"
                        >
                          local_fire_department
                        </span>
                        {t(
                          'streakHeroCard.xpToday',
                          { xp: 120 },
                          { defaultValue: '+{{xp}} XP today' },
                        )}
                      </span>
                    </div>
                    <p className={cm.cn('text-sm mt-3 opacity-80 max-w-md')}>
                      {t(
                        'landing.sampleTagline',
                        {},
                        {
                          defaultValue:
                            '8,420 XP earned. Keep the rhythm — three more days to your monthly badge.',
                        },
                      )}
                    </p>
                  </div>
                  <div className={cm.cn('relative z-10 mt-6')}>
                    <div className={cm.cn('flex justify-between items-center mb-2')}>
                      <span
                        className={cm.cn(
                          'text-[10px] font-bold uppercase tracking-widest text-primary-fixed/90',
                        )}
                      >
                        {t('streakHeroCard.goalLabel', {}, { defaultValue: "Today's goal" })}
                      </span>
                      <span className={cm.cn('text-sm font-bold tabular-nums')}>
                        {t(
                          'streakHeroCard.goalProgress',
                          { current: 120, goal: 150 },
                          { defaultValue: '{{current}} / {{goal}} XP' },
                        )}
                      </span>
                    </div>
                    <div
                      className={cm.cn(
                        'w-full h-3 rounded-full bg-surface/20 overflow-hidden backdrop-blur-md',
                      )}
                    >
                      <div
                        className={cm.cn(
                          'h-full rounded-full bg-gradient-to-r from-secondary to-secondary-light',
                        )}
                        style={{ width: '80%' }}
                      />
                    </div>
                  </div>
                  <div className={cm.cn('relative z-10 mt-6 h-16')}>
                    <svg
                      className={cm.cn('w-full h-full')}
                      viewBox="0 0 400 100"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M0,80 L60,70 L120,55 L180,60 L240,40 L300,30 L360,15 L400,10 L400,100 L0,100 Z"
                        fill="white"
                        opacity="0.3"
                      />
                      <path
                        d="M0,80 L60,70 L120,55 L180,60 L240,40 L300,30 L360,15 L400,10"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div
                    className={cm.cn(
                      'absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-surface/10 blur-3xl',
                    )}
                  />
                  <div
                    className={cm.cn(
                      'absolute right-8 top-8 w-16 h-16 rounded-full bg-secondary/40 blur-2xl',
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Languages strip */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16')}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
              cm.sp('mb', 8),
            )}
          >
            <p className={cm.cn('font-bold uppercase tracking-widest text-xs text-primary')}>
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

        {/* Feature grid */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <h2
            className={cm.cn(
              cm.sp('mb', 4),
              cm.textCenter,
              'text-3xl md:text-4xl font-extrabold tracking-tight',
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
                  'bg-surface-container-lowest rounded-2xl hover:shadow-2xl hover:shadow-on-surface/5 transition-all group border border-outline-variant/20',
                )}
              >
                <div
                  className={cm.cn(
                    cm.sp('p', 3),
                    'inline-flex bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
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
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
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
              className={cm.cn(
                cm.sp('px', 10),
                cm.sp('py', 4),
                'font-semibold bg-gradient-to-r from-primary to-primary-dark text-on-primary rounded-full hover:shadow-xl hover:shadow-primary/30 transition-all inline-flex items-center gap-2',
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
            { defaultValue: '© {{year}} {{app}}. Built for adult learners.' },
          )}
        </p>
      </footer>
    </div>
  )
}

export default Landing
