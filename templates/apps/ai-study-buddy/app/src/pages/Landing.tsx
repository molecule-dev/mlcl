import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { SafeLink } from '../components/SafeLink.js'
import { StreakBadge } from '../components/StreakBadge.js'

interface FeatureSpec {
  icon: string
  titleKey: string
  defaultTitle: string
  bodyKey: string
  defaultBody: string
  tone: 'primary' | 'secondary'
}

const FEATURES: ReadonlyArray<FeatureSpec> = [
  {
    icon: 'school',
    titleKey: 'landing.feature.tutor.title',
    defaultTitle: 'AI Tutor',
    bodyKey: 'landing.feature.tutor.body',
    defaultBody: 'Ask any question about any subject. Get patient, tailored explanations.',
    tone: 'primary',
  },
  {
    icon: 'style',
    titleKey: 'landing.feature.flashcards.title',
    defaultTitle: 'Smart Flashcards',
    bodyKey: 'landing.feature.flashcards.body',
    defaultBody: 'Spaced repetition that adapts to your pace for optimal memory retention.',
    tone: 'primary',
  },
  {
    icon: 'quiz',
    titleKey: 'landing.feature.quiz.title',
    defaultTitle: 'Practice Quizzes',
    bodyKey: 'landing.feature.quiz.body',
    defaultBody: 'Instant feedback with detailed explanations to correct misconceptions early.',
    tone: 'primary',
  },
  {
    icon: 'timeline',
    titleKey: 'landing.feature.progress.title',
    defaultTitle: 'Progress Tracking',
    bodyKey: 'landing.feature.progress.body',
    defaultBody: 'See your mastery grow over time with detailed, visual insights.',
    tone: 'secondary',
  },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  return (
    <div
      data-mol-id="page-landing"
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-surface text-on-surface antialiased',
      )}
    >
      {/* Top nav */}
      <nav
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          cm.sp('py', 4),
          cm.maxW('7xl'),
          cm.mxAuto,
          cm.w('full'),
          'sticky top-0 z-40 bg-surface/80 backdrop-blur-md',
        )}
      >
        <div className={cm.flex({ align: 'center', gap: 'lg' })}>
          <SafeLink
            to="/"
            data-mol-id="landing-logo"
            className={cm.flex({ align: 'center', gap: 'xs' })}
          >
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              lightbulb
            </span>
            <span
              className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tighter text-primary')}
            >
              {APP_NAME}
            </span>
          </SafeLink>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              data-mol-id="landing-go-to-dashboard"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                cm.sp('px', 6),
                cm.sp('py', 2),
                'rounded-lg bg-gradient-to-br from-primary to-primary-container text-on-primary hover:opacity-90 transition-opacity',
              )}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                data-mol-id="landing-signin"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-lg text-primary hover:bg-surface-container-low transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                data-mol-id="landing-signup"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  cm.sp('px', 6),
                  cm.sp('py', 2),
                  'rounded-lg bg-gradient-to-br from-primary to-primary-container text-on-primary hover:opacity-90 transition-opacity',
                )}
              >
                {t('landing.startLearning', {}, { defaultValue: 'Start learning free' })}
              </Link>
            </>
          )}
        </div>
      </nav>

      <main className={cm.flex1}>
        {/* Hero */}
        <section className={cm.cn(cm.sp('px', 6), 'relative overflow-hidden pt-20 pb-24')}>
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              'relative z-10 grid grid-cols-1 items-center gap-16 lg:grid-cols-2',
            )}
          >
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
              <h1
                className={
                  'text-5xl md:text-6xl font-extrabold leading-tight tracking-tighter text-on-surface'
                }
              >
                {t('landing.heroLead', {}, { defaultValue: 'Question everything,' })}
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-primary to-primary-container">
                  {t('landing.heroAccent', {}, { defaultValue: 'master anything' })}
                </span>
              </h1>
              <p
                className={cm.cn(
                  cm.maxW('xl'),
                  'serif-text text-lg leading-relaxed text-on-surface-variant',
                )}
              >
                {t(
                  'landing.heroBody',
                  { tagline: APP_TAGLINE },
                  {
                    defaultValue:
                      'Your patient, highly knowledgeable AI tutor. Build deep understanding through Socratic dialogue, spaced repetition, and adaptive practice.',
                  },
                )}
              </p>
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), 'sm:flex-row pt-2')}>
                <Link
                  to="/signup"
                  data-mol-id="landing-cta-primary"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    cm.textSize('lg'),
                    cm.fontWeight('semibold'),
                    'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary text-center hover:opacity-90 transition-opacity shadow-ambient',
                  )}
                >
                  {t('common.startFree', {}, { defaultValue: 'Start free' })}
                </Link>
                <Link
                  to="/dashboard"
                  data-mol-id="landing-cta-secondary"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    cm.textSize('lg'),
                    cm.fontWeight('semibold'),
                    cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                    'rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-primary hover:bg-surface-container-low transition-colors shadow-sm',
                  )}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    play_circle
                  </span>
                  {t('landing.heroCtaSecondary', {}, { defaultValue: 'Watch demo' })}
                </Link>
              </div>
              <div className={cm.sp('pt', 4)}>
                <StreakBadge days={42} active />
              </div>
            </div>

            {/* Hero card */}
            <div className={'relative hidden lg:block'}>
              <div
                className={
                  'aspect-square w-full rounded-[2rem] bg-gradient-to-br from-primary-container/30 via-surface-container-low to-secondary-fixed/20 p-10 shadow-ambient relative overflow-hidden'
                }
              >
                <div
                  className={
                    'absolute inset-x-10 top-10 rounded-2xl bg-surface-container-lowest p-6 shadow-sm'
                  }
                >
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.sp('mb', 2),
                      'uppercase tracking-widest text-primary font-bold',
                    )}
                  >
                    {t('landing.heroCardLabel', {}, { defaultValue: 'AI tutor session' })}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('lg'),
                      'serif-text leading-relaxed text-on-surface',
                    )}
                  >
                    {t(
                      'landing.heroCardQuote',
                      {},
                      {
                        defaultValue:
                          '"Let\'s break down that formula again — think about what happens when x approaches zero."',
                      },
                    )}
                  </p>
                </div>

                <div
                  className={
                    'absolute inset-x-10 bottom-10 rounded-2xl bg-surface-container-lowest p-6 shadow-sm'
                  }
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.sp('mb', 2),
                    )}
                  >
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        'uppercase tracking-widest font-bold text-secondary',
                      )}
                    >
                      {t('landing.heroCardMastery', {}, { defaultValue: 'Calculus II — mastery' })}
                    </p>
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        'font-extrabold tabular-nums text-primary',
                      )}
                    >
                      72%
                    </span>
                  </div>
                  <div
                    className={
                      'h-2 w-full overflow-hidden rounded-full bg-surface-container-highest'
                    }
                  >
                    <div
                      className={
                        'h-full w-[72%] rounded-full bg-gradient-to-r from-primary to-inverse-primary'
                      }
                    />
                  </div>
                </div>

                {/* Decorative orbs */}
                <div
                  className={
                    'pointer-events-none absolute -right-12 -bottom-16 w-72 h-72 rounded-full bg-primary-container/30 blur-3xl'
                  }
                  aria-hidden="true"
                />
                <div
                  className={
                    'pointer-events-none absolute -left-10 -top-8 w-40 h-40 rounded-full bg-secondary-fixed/40 blur-2xl'
                  }
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
          <div
            className={
              'pointer-events-none absolute -mt-40 -mr-40 top-0 right-0 z-0 w-[700px] h-[700px] rounded-full bg-primary-container/10 blur-3xl'
            }
            aria-hidden="true"
          />
        </section>

        {/* Streak banner */}
        <section
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 4),
            'border-y border-outline-variant/20 bg-secondary-fixed-dim/20',
          )}
        >
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            )}
          >
            <span
              className="material-symbols-outlined text-secondary"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              local_fire_department
            </span>
            <p
              className={cm.cn(
                cm.fontWeight('semibold'),
                'text-on-surface tracking-wide text-center',
              )}
            >
              {t(
                'landing.streakBannerLead',
                {},
                {
                  defaultValue: 'Join 50,000+ students on a streak — average ',
                },
              )}
              <span className="text-secondary font-extrabold text-glow-secondary">
                {t('landing.streakBannerMid', {}, { defaultValue: '42-day' })}
              </span>
              {t('landing.streakBannerTail', {}, { defaultValue: ' streak' })}
            </p>
          </div>
        </section>

        {/* Feature cards */}
        <section className={cm.cn(cm.sp('px', 6), cm.sp('py', 24), 'bg-surface-container-low')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto)}>
            <div
              className={cm.cn(
                cm.textCenter,
                cm.sp('mb', 16),
                cm.flex({ direction: 'col', gap: 'md' }),
              )}
            >
              <h2 className={cm.cn(cm.textSize('3xl'), 'font-extrabold text-on-surface')}>
                {t('landing.featuresHeading', {}, { defaultValue: 'Deep focus, better results' })}
              </h2>
              <p
                className={cm.cn(
                  cm.maxW('2xl'),
                  cm.mxAuto,
                  'serif-text text-lg text-on-surface-variant',
                )}
              >
                {t(
                  'landing.featuresBody',
                  {},
                  {
                    defaultValue:
                      'Tools designed to eliminate distraction and build lasting comprehension.',
                  },
                )}
              </p>
            </div>
            <div className={'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4'}>
              {FEATURES.map((f) => (
                <article
                  key={f.titleKey}
                  className={cm.cn(
                    cm.sp('p', 8),
                    'group rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm transition-shadow hover:shadow-md',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.w(12),
                      cm.h(12),
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.sp('mb', 6),
                      'rounded-xl transition-colors',
                      f.tone === 'secondary'
                        ? 'bg-secondary-fixed-dim/20 text-secondary group-hover:bg-secondary-fixed-dim/40'
                        : 'bg-primary-container/15 text-primary group-hover:bg-primary-container/30',
                    )}
                  >
                    <span className={'material-symbols-outlined text-2xl'} aria-hidden="true">
                      {f.icon}
                    </span>
                  </div>
                  <h3
                    className={cm.cn(
                      cm.textSize('lg'),
                      cm.fontWeight('bold'),
                      cm.sp('mb', 3),
                      'text-on-surface',
                    )}
                  >
                    {t(f.titleKey, {}, { defaultValue: f.defaultTitle })}
                  </h3>
                  <p className={cm.cn('serif-text leading-relaxed text-on-surface-variant')}>
                    {t(f.bodyKey, {}, { defaultValue: f.defaultBody })}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
