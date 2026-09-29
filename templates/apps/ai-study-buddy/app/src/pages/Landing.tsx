import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
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
          'sticky top-0 z-40 bg-surface-container-low/90 backdrop-blur-md',
        )}
      >
        <div className={cm.flex({ align: 'center', gap: 'lg' })}>
          <SafeLink
            to="/"
            data-mol-id="landing-logo"
            className={cm.flex({ align: 'center', gap: 'xs' })}
          >
            <BrandWordmark as="span" />
          </SafeLink>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.hiddenBelow('md'))}>
            <a
              href="#features"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'tracking-wide text-on-surface-variant hover:text-primary hover:bg-surface-container-lowest/60 transition-all rounded-lg px-3 py-2',
              )}
            >
              {t('nav.features', {}, { defaultValue: 'Features' })}
            </a>
            <SafeLink
              to="/pricing"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'tracking-wide text-on-surface-variant hover:text-primary hover:bg-surface-container-lowest/60 transition-all rounded-lg px-3 py-2',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </SafeLink>
            <SafeLink
              to="/about"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'tracking-wide text-on-surface-variant hover:text-primary hover:bg-surface-container-lowest/60 transition-all rounded-lg px-3 py-2',
              )}
            >
              {t('nav.about', {}, { defaultValue: 'About' })}
            </SafeLink>
          </div>
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
                  'serif-text text-[1.375rem] leading-relaxed text-on-surface-variant',
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
                    'rounded-lg bg-gradient-to-br from-primary to-primary-container text-on-primary text-center hover:opacity-90 transition-opacity shadow-[0_12px_40px_rgba(0,106,97,0.15)]',
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
                    'rounded-lg border border-outline-variant bg-surface-container-lowest text-primary hover:bg-surface-container-low transition-colors shadow-sm',
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

            {/* Hero card — white bordered frame, editorial visual, floating tutor bubble */}
            <div className={'relative hidden lg:block'}>
              <div
                className={
                  'aspect-square w-full rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-6 shadow-ambient relative overflow-visible'
                }
              >
                {/* Editorial visual area (stands in for the design's photo) */}
                <div
                  className={
                    'h-full w-full rounded-lg bg-gradient-to-br from-primary-container/20 via-surface-container-low to-secondary-fixed/30 relative overflow-hidden'
                  }
                >
                  {/* Decorative orbs inside the visual */}
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

                {/* Floating tutor bubble — overlaps the card's left edge */}
                <div
                  className={
                    'absolute -left-12 top-1/4 bg-surface-container-lowest/90 backdrop-blur-[24px] p-4 rounded-lg shadow-[0_12px_40px_rgba(0,106,97,0.1)] border border-outline-variant/20 flex items-start gap-4 max-w-xs'
                  }
                >
                  <div
                    className={cm.cn(
                      cm.w(10),
                      cm.h(10),
                      cm.roundedFull,
                      'bg-primary-container/20 flex items-center justify-center shrink-0',
                    )}
                  >
                    <span className="material-symbols-outlined text-primary" aria-hidden="true">
                      auto_awesome
                    </span>
                  </div>
                  <div>
                    <p
                      className={cm.cn(
                        'serif-text text-sm leading-relaxed text-on-surface-variant',
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
                </div>

                {/* Glass mastery card */}
                <div
                  className={
                    'absolute inset-x-6 bottom-6 rounded-lg bg-surface-container-lowest/90 backdrop-blur-[24px] border border-outline-variant/20 p-4 shadow-sm'
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
              </div>
            </div>
          </div>
          <div
            className={
              'pointer-events-none absolute -mt-40 -mr-40 top-0 right-0 z-0 w-[800px] h-[800px] rounded-full bg-primary-container/5 blur-3xl'
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
                    'group rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm transition-shadow hover:shadow-md',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.w(12),
                      cm.h(12),
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.sp('mb', 6),
                      'rounded-lg transition-colors',
                      f.tone === 'secondary'
                        ? 'bg-secondary-container/10 text-secondary-container group-hover:bg-secondary-container/20'
                        : 'bg-primary-container/10 text-primary group-hover:bg-primary-container/20',
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
