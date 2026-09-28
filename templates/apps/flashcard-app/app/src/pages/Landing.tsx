/**
 * Landing — Engram marketing home (Stitch design).
 *
 * Flow: top nav → hero with tactile flashcard stack → amber streak banner →
 * "Built for serious learners" bento grid → footer. The flashcard faces and
 * the brand wordmark render in Source Serif 4 (--mol-font-serif).
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_TAGLINE } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { LandingTopNavBar } from '../components/LandingTopNavBar.js'

/** Spaced-repetition grade chips on the card back (design palette). */
const GRADES = [
  { key: 'again', label: 'Again', bg: 'var(--color-error-container)', fg: 'var(--color-error)' },
  {
    key: 'hard',
    label: 'Hard',
    bg: 'var(--color-secondary-container)',
    fg: 'var(--color-secondary)',
  },
  {
    key: 'good',
    label: 'Good',
    bg: 'var(--color-tertiary-container)',
    fg: 'var(--color-tertiary)',
  },
  { key: 'easy', label: 'Easy', bg: 'var(--color-primary-container)', fg: 'var(--color-primary)' },
]

/** 21-day habit heatmap — violet intensity per cell (0 = missed day). */
const HEATMAP: number[] = [
  0, 25, 45, 70, 85, 70, 0, 25, 70, 85, 100, 70, 45, 25, 70, 85, 100, 55, 85, 70, 0,
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  // Squiggle goes under the tagline's last word ("…sticks.").
  const lastSpace = APP_TAGLINE.lastIndexOf(' ')
  const taglineHead = APP_TAGLINE.slice(0, lastSpace + 1)
  const taglineTail = APP_TAGLINE.slice(lastSpace + 1)

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface antialiased')}>
      <LandingTopNavBar />

      <main className={cm.sp('pt', 6)}>
        {/* Hero + flashcard preview */}
        <section
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            'grid grid-cols-1 lg:grid-cols-2 gap-16 items-center pt-12 md:pt-20',
          )}
        >
          <div className="text-center lg:text-left">
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs', justify: 'center' }),
                'inline-flex px-3 py-1 rounded-full text-sm font-medium mb-6 border',
                'lg:justify-start',
              )}
              style={{
                backgroundColor: 'var(--color-surface-secondary)',
                color: 'var(--color-primary)',
                borderColor: 'var(--color-primary-container)',
              }}
            >
              <span className="material-symbols-outlined text-sm" aria-hidden="true">
                psychology
              </span>
              {t('landing.eyebrow', {}, { defaultValue: 'Master any subject' })}
            </span>
            <h1
              className={cm.cn(
                cm.fontWeight('extrabold'),
                'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[1.1] mb-6 text-on-surface',
              )}
            >
              {t('landing.heroTitle', {}, { defaultValue: taglineHead })}
              <span className="relative inline-block">
                {t('landing.heroTitleTail', {}, { defaultValue: taglineTail + '.' })}
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3"
                  preserveAspectRatio="none"
                  viewBox="0 0 100 10"
                  aria-hidden="true"
                >
                  <path
                    d="M0 5 Q 50 10 100 5"
                    fill="transparent"
                    stroke="var(--color-streak)"
                    strokeWidth="4"
                    opacity="0.35"
                  />
                </svg>
              </span>
            </h1>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                'text-on-surface-variant mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed',
              )}
            >
              {t(
                'landing.heroSubtitle',
                {},
                {
                  defaultValue:
                    'Build an unbreakable memory with optimized spaced repetition. Engram schedules your reviews precisely when your brain is about to forget, saving you hours of study time.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
                'sm:flex-row justify-center lg:justify-start',
              )}
            >
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('medium'),
                  'w-full sm:w-auto rounded-xl bg-primary text-on-primary text-center shadow-lg hover:-translate-y-0.5 transition-transform',
                )}
                data-mol-id="hero-cta-primary"
              >
                {t('landing.heroCta', {}, { defaultValue: 'Start studying free' })}
              </Link>
              <a
                href="#features"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('medium'),
                  'w-full sm:w-auto rounded-xl text-on-surface-variant transition-colors hover:bg-surface-container',
                )}
                style={{ backgroundColor: 'var(--color-surface-container-low)' }}
                data-mol-id="hero-cta-secondary"
              >
                <span className="material-symbols-outlined text-xl" aria-hidden="true">
                  play_circle
                </span>
                {t('landing.heroSecondary', {}, { defaultValue: 'See how it works' })}
              </a>
            </div>
          </div>

          {/* Tactile flashcard stack */}
          <div className="w-full max-w-md mx-auto relative" aria-hidden="true">
            {/* Back card (answer side) */}
            <div
              className={cm.cn(
                'absolute inset-0 bg-surface rounded-xl border shadow-sm opacity-60 p-8',
                'flex flex-col justify-between rotate-3 translate-x-4 translate-y-4',
              )}
              style={{ borderColor: 'var(--color-outline-variant)' }}
            >
              <div className="text-center">
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'uppercase tracking-wider mb-4',
                  )}
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  {t('landing.sample.answerLabel', {}, { defaultValue: 'Answer' })}
                </p>
                <h3
                  className={cm.cn(cm.textSize('4xl'), 'text-on-surface')}
                  style={{ fontFamily: 'var(--mol-font-serif)' }}
                >
                  {t('landing.sample.answer', {}, { defaultValue: 'Paris' })}
                </h3>
                <p
                  className={cm.cn('text-lg mt-4 italic')}
                  style={{
                    fontFamily: 'var(--mol-font-serif)',
                    color: 'var(--color-on-surface-variant)',
                  }}
                >
                  {t(
                    'landing.sample.answerHint',
                    {},
                    { defaultValue: 'The city of light, located on the Seine River.' },
                  )}
                </p>
              </div>
              <div className={cm.cn(cm.grid({ cols: 4, gap: 'xs' }), 'mt-8')}>
                {GRADES.map((g) => (
                  <div
                    key={g.key}
                    className={cm.cn(
                      'h-10 rounded-xl flex items-center justify-center text-xs font-semibold',
                    )}
                    style={{ backgroundColor: g.bg, color: g.fg }}
                  >
                    {t(`landing.sample.grade.${g.key}`, {}, { defaultValue: g.label })}
                  </div>
                ))}
              </div>
            </div>
            {/* Front card (question side) */}
            <div
              className={cm.cn(
                'relative bg-surface rounded-xl border-2 shadow-xl p-8 aspect-[4/3] z-10',
                'flex flex-col justify-center items-center text-center',
                'transition-transform duration-300 hover:-translate-y-2 hover:rotate-1',
              )}
              style={{
                borderColor: 'var(--color-primary-container)',
                backgroundImage:
                  'linear-gradient(to bottom, var(--color-surface), color-mix(in srgb, var(--color-surface-secondary) 30%, var(--color-surface)))',
              }}
              data-mol-id="hero-flashcard"
            >
              <span
                className="absolute top-4 right-4 material-symbols-outlined"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                bookmark_border
              </span>
              <h2
                className={cm.cn('text-3xl md:text-4xl text-on-surface leading-snug')}
                style={{ fontFamily: 'var(--mol-font-serif)' }}
              >
                {t(
                  'landing.sample.question',
                  {},
                  { defaultValue: 'What is the capital of France?' },
                )}
              </h2>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'absolute bottom-6 text-sm',
                )}
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                <span className="material-symbols-outlined text-lg" aria-hidden="true">
                  touch_app
                </span>
                <span>{t('landing.sample.tapToFlip', {}, { defaultValue: 'Tap to flip' })}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Streak banner */}
        <section className="mt-24 w-full" style={{ backgroundColor: 'var(--color-secondary)' }}>
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              cm.sp('py', 4),
              cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
              'text-white font-medium text-base md:text-lg',
            )}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              local_fire_department
            </span>
            <span>
              {t(
                'landing.streakBanner',
                { days: 340 },
                { defaultValue: 'Students review {{days}} days in a row on average' },
              )}
            </span>
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              local_fire_department
            </span>
          </div>
        </section>

        {/* Features bento */}
        <section
          id="features"
          className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-24')}
        >
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 12))}>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-3xl md:text-4xl text-on-surface mb-4 tracking-tight',
              )}
            >
              {t('landing.featuresHeading', {}, { defaultValue: 'Built for serious learners' })}
            </h2>
            <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant max-w-2xl mx-auto')}>
              {t(
                'landing.featuresSubheading',
                {},
                {
                  defaultValue:
                    'Everything you need to memorize facts, languages, and concepts effectively, packaged in a beautifully calm interface.',
                },
              )}
            </p>
          </div>
          <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-6 md:auto-rows-[280px]')}>
            {/* Spaced repetition — large card */}
            <div
              className={cm.cn(
                'md:col-span-2 rounded-xl border p-8 flex flex-col justify-between relative overflow-hidden group',
              )}
              style={{
                borderColor: 'var(--color-outline-variant)',
                backgroundImage:
                  'linear-gradient(to bottom right, var(--color-surface-container-low), var(--color-surface-secondary))',
              }}
            >
              <div
                className="absolute right-0 top-0 w-64 h-64 rounded-full blur-3xl -mr-16 -mt-16"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-primary) 5%, transparent)',
                }}
                aria-hidden="true"
              />
              <div className="relative">
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-12 h-12 bg-surface rounded-xl shadow-sm border mb-6',
                  )}
                  style={{ borderColor: 'var(--color-outline-variant)' }}
                  aria-hidden="true"
                >
                  <span
                    className="material-symbols-outlined text-primary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    update
                  </span>
                </div>
                <h3
                  className={cm.cn(
                    cm.textSize('2xl'),
                    cm.fontWeight('bold'),
                    'text-on-surface mb-2',
                  )}
                >
                  {t('landing.feature.spaced.title', {}, { defaultValue: 'Spaced repetition' })}
                </h3>
                <p className={cm.cn('text-on-surface-variant max-w-md')}>
                  {t(
                    'landing.feature.spaced.body',
                    {},
                    {
                      defaultValue:
                        "Our algorithm predicts exactly when you'll forget a card and prompts you to review it just in time. Maximum retention, minimum effort.",
                    },
                  )}
                </p>
              </div>
              {/* Decorative review-load graphic */}
              <div
                className="self-end w-3/4 h-24 rounded-t-xl border border-b-0 shadow-sm relative overflow-hidden mt-6"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-surface) 50%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--color-surface) 60%, transparent)',
                  backdropFilter: 'blur(4px)',
                }}
                aria-hidden="true"
              >
                <div
                  className="absolute bottom-0 left-0 w-full h-1"
                  style={{ backgroundColor: 'var(--color-surface-container-high)' }}
                />
                <div
                  className="absolute bottom-0 left-0 w-1/3 h-1"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                />
              </div>
            </div>

            {/* Deck sharing */}
            <div
              className={cm.cn(
                'bg-surface border shadow-sm rounded-xl p-8 flex flex-col relative group transition-colors hover:border-primary',
              )}
              style={{ borderColor: 'var(--color-outline-variant)' }}
            >
              <div
                className={
                  cm.flex({
                    align: 'center',
                    justify: 'center',
                  }) + ' w-12 h-12 rounded-xl mb-6'
                }
                style={{ backgroundColor: 'var(--color-primary-container)' }}
                aria-hidden="true"
              >
                <span className="material-symbols-outlined text-primary">folder_shared</span>
              </div>
              <h3
                className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface mb-2')}
              >
                {t('landing.feature.sharing.title', {}, { defaultValue: 'Deck sharing' })}
              </h3>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                {t(
                  'landing.feature.sharing.body',
                  {},
                  {
                    defaultValue:
                      'Collaborate with classmates or download pre-made decks from top students worldwide. Import Anki .apkg or CSV anytime — your data, no lock-in.',
                  },
                )}
              </p>
            </div>

            {/* Study anywhere */}
            <div
              className={cm.cn(
                'bg-surface border shadow-sm rounded-xl p-8 flex flex-col relative group transition-colors hover:border-secondary',
              )}
              style={{ borderColor: 'var(--color-outline-variant)' }}
            >
              <div
                className={
                  cm.flex({
                    align: 'center',
                    justify: 'center',
                  }) + ' w-12 h-12 rounded-xl mb-6'
                }
                style={{ backgroundColor: 'var(--color-secondary-container)' }}
                aria-hidden="true"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ color: 'var(--color-secondary)' }}
                >
                  devices
                </span>
              </div>
              <h3
                className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface mb-2')}
              >
                {t('landing.feature.anywhere.title', {}, { defaultValue: 'Study anywhere' })}
              </h3>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                {t(
                  'landing.feature.anywhere.body',
                  {},
                  {
                    defaultValue:
                      'Seamlessly sync across all your devices. Review on your phone while commuting, create on your laptop.',
                  },
                )}
              </p>
            </div>

            {/* Habit heatmap — dark card */}
            <div
              className={cm.cn(
                'md:col-span-2 rounded-xl p-8 flex flex-col justify-center relative overflow-hidden',
              )}
              style={{
                backgroundColor: 'var(--color-inverse-surface)',
                color: 'var(--color-inverse-on-surface)',
              }}
            >
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: 'radial-gradient(var(--color-primary) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
                aria-hidden="true"
              />
              <div
                className={cm.cn(
                  cm.flex({ direction: 'col', align: 'center', gap: 'lg' }),
                  'relative z-10 md:flex-row',
                )}
              >
                <div className="flex-1">
                  <h3 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'mb-2')}>
                    {t(
                      'landing.feature.habit.title',
                      {},
                      { defaultValue: 'Build a resilient habit' },
                    )}
                  </h3>
                  <p className={cm.cn(cm.textSize('sm'), 'opacity-70')}>
                    {t(
                      'landing.feature.habit.body',
                      {},
                      {
                        defaultValue:
                          'Visualizing your daily progress turns studying into an addictive game. Never break the chain.',
                      },
                    )}
                  </p>
                </div>
                {/* Abstract heatmap */}
                <div
                  className={cm.cn(
                    cm.grid({ gap: 'xs' }),
                    'grid-cols-7 p-3 rounded-xl border shrink-0',
                  )}
                  style={{
                    backgroundColor:
                      'color-mix(in srgb, var(--color-inverse-on-surface) 6%, transparent)',
                    borderColor:
                      'color-mix(in srgb, var(--color-inverse-on-surface) 15%, transparent)',
                  }}
                  aria-hidden="true"
                >
                  {HEATMAP.map((level, i) => (
                    <span
                      key={i}
                      className="w-4 h-4 rounded-sm"
                      style={
                        level === 100
                          ? {
                              backgroundColor: 'var(--color-primary)',
                              boxShadow:
                                '0 0 8px color-mix(in srgb, var(--color-primary) 80%, transparent)',
                            }
                          : level === 0
                            ? {
                                backgroundColor:
                                  'color-mix(in srgb, var(--color-inverse-on-surface) 15%, transparent)',
                              }
                            : {
                                backgroundColor: `color-mix(in srgb, var(--color-primary) ${level}%, var(--color-inverse-surface))`,
                              }
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
