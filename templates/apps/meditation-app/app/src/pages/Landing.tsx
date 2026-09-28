import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingNav } from '../components/LandingNav.js'
import { type CategoryTone, getCategoryAccent } from '../lib/categoryTone.js'

interface PracticeCard {
  tone: CategoryTone
  key: string
  defaultLabel: string
  sessions: number
  description: string
}

/**
 * "Find your practice" cards — Stitch landing design: tall bottom-aligned
 * cards with a soft quarter-circle wash in the category color and an
 * "Explore <category> →" affordance.
 */
const PRACTICE: PracticeCard[] = [
  {
    tone: 'sleep',
    key: 'sleep',
    defaultLabel: 'Sleep',
    sessions: 86,
    description: 'Drift off naturally with soundscapes and gentle guidance.',
  },
  {
    tone: 'focus',
    key: 'focus',
    defaultLabel: 'Focus',
    sessions: 58,
    description: 'Sharpen your mind and stay present in your daily tasks.',
  },
  {
    tone: 'stress',
    key: 'stress',
    defaultLabel: 'Stress',
    sessions: 72,
    description: 'Find relief through breathing exercises and letting go.',
  },
  {
    tone: 'mindfulness',
    key: 'mindfulness',
    defaultLabel: 'Mindfulness',
    sessions: 124,
    description: 'Stay present, one breath at a time.',
  },
]

const STATS: { value: string; key: string; defaultLabel: string }[] = [
  { value: '320,000+', key: 'users', defaultLabel: 'mindful members' },
  { value: '8.6M+', key: 'minutes', defaultLabel: 'minutes meditated' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const mindfulness = getCategoryAccent('mindfulness')

  return (
    <div
      className={cm.cn(
        'bg-surface text-on-surface antialiased selection:bg-primary selection:text-on-primary',
      )}
    >
      <LandingNav />

      <main className={cm.cn('pb-16')}>
        {/* Hero — centered over a soft radial wash, concentric rings and a
           floating glass session card (Stitch landing design). */}
        <section
          className={cm.cn(
            'relative pt-20 pb-24 md:pt-28 md:pb-28 overflow-hidden flex flex-col items-center text-center',
            'bg-[image:linear-gradient(160deg,var(--color-background)_0%,color-mix(in_oklab,var(--color-accent)_8%,transparent)_100%)]',
          )}
        >
          <div className={cm.cn('max-w-3xl z-10 flex flex-col items-center gap-6')}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'inline-flex w-fit rounded-full bg-primary-container text-on-primary-container',
              )}
            >
              <span
                aria-hidden="true"
                className={cm.cn('material-symbols-outlined text-sm')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                spa
              </span>
              {t(
                'stillpoint.landing.hero.eyebrow',
                {},
                { defaultValue: 'A calmer 10 minutes a day' },
              )}
            </span>
            <h1
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-5xl md:text-7xl tracking-tight text-on-surface leading-[0.98]',
                'font-headline',
              )}
            >
              {t('stillpoint.landing.hero.title1', {}, { defaultValue: 'Find your' })}{' '}
              {t('stillpoint.landing.hero.title2', {}, { defaultValue: 'still center.' })}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('xl'),
                'text-on-surface-variant max-w-2xl leading-relaxed',
              )}
            >
              {t(
                'stillpoint.landing.hero.body',
                {},
                {
                  defaultValue:
                    'Daily guided meditations, breathwork, and sleep stories — paced by teachers who feel like a friend, not a coach.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'sm' }),
                'sm:flex-row sm:items-center',
              )}
            >
              <Link
                to="/signup"
                data-mol-id="landing-hero-start-free"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 3),
                  cm.fontWeight('medium'),
                  cm.textSize('lg'),
                  'bg-primary text-white rounded-full transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95',
                )}
              >
                {t(
                  'stillpoint.landing.hero.primary',
                  {},
                  { defaultValue: 'Start free — 7-day trial' },
                )}
              </Link>
              <a
                href="#featured"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                  cm.sp('px', 8),
                  cm.sp('py', 3),
                  cm.fontWeight('medium'),
                  cm.textSize('lg'),
                  'rounded-full text-primary bg-surface/60 border border-primary/20 hover:bg-surface transition-all hover:-translate-y-0.5 active:scale-95',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cm.cn('material-symbols-outlined')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  play_arrow
                </span>
                {t('stillpoint.landing.hero.secondary', {}, { defaultValue: 'See how it works' })}
              </a>
            </div>
          </div>

          {/* Concentric rings + floating glass session card. */}
          <div
            aria-hidden="true"
            className={cm.cn('relative mt-16 w-full max-w-4xl h-64 flex justify-center z-0')}
          >
            <div
              className={cm.cn(
                'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-primary/10 rounded-full',
              )}
            />
            <div
              className={cm.cn(
                'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] border border-primary/5 rounded-full',
              )}
            />
            <div
              className={cm.cn(
                'absolute top-8 rounded-xl p-4 shadow-xl flex gap-4 items-center w-80 text-left',
                '-rotate-2 hover:rotate-0 transition-transform duration-500',
                'bg-surface/70 backdrop-blur-md border border-surface-bright',
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'w-20 h-20 rounded shrink-0 text-white',
                )}
                style={{ backgroundColor: 'var(--color-cat-mindfulness)' }}
              >
                <span
                  aria-hidden="true"
                  className={cm.cn('material-symbols-outlined text-3xl opacity-90')}
                >
                  self_improvement
                </span>
              </div>
              <div className={cm.cn('min-w-0')}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.sp('mb', 1),
                    'inline-block rounded-full uppercase tracking-wider',
                  )}
                  style={{
                    color: mindfulness.fg,
                    backgroundColor: mindfulness.softBg,
                  }}
                >
                  {t('stillpoint.landing.sample.category', {}, { defaultValue: 'Stress relief' })}
                </span>
                <h3 className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface font-headline')}>
                  {t(
                    'stillpoint.landing.sample.title',
                    {},
                    { defaultValue: 'Letting go of tension' },
                  )}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('stillpoint.landing.sample.duration', {}, { defaultValue: '12 min' })}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Find your practice (Browse by mood) */}
        <section id="practice" className={cm.cn(cm.sp('px', 6), cm.sp('py', 20), 'bg-surface')}>
          <div className={cm.cn('max-w-7xl mx-auto')}>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-3xl md:text-4xl text-center text-on-surface mb-14 font-headline tracking-tight',
              )}
            >
              {t('stillpoint.landing.categories.heading', {}, { defaultValue: 'Browse by mood' })}
            </h2>
            <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8')}>
              {PRACTICE.map((c) => {
                const accent = getCategoryAccent(c.tone)
                return (
                  <Link
                    key={c.key}
                    to={`/library?category=${c.tone}`}
                    data-mol-id={`landing-practice-${c.key}`}
                    className={cm.cn(
                      'group block relative overflow-hidden rounded-2xl bg-background shadow-sm hover:shadow-lg transition-shadow duration-300 p-8 h-80 flex flex-col justify-end border border-outline/20',
                    )}
                  >
                    <div
                      aria-hidden="true"
                      className={cm.cn(
                        'absolute top-0 right-0 w-48 h-48 rounded-bl-[100px] transition-transform duration-500 group-hover:scale-110 origin-top-right',
                      )}
                      style={{
                        backgroundColor: `color-mix(in oklab, ${accent.fg} 10%, transparent)`,
                      }}
                    />
                    <div className={cm.cn('relative z-10')}>
                      <span
                        aria-hidden="true"
                        className={cm.cn('material-symbols-outlined text-4xl mb-4 inline-block')}
                        style={{
                          color: accent.fg,
                          fontVariationSettings: "'FILL' 1",
                        }}
                      >
                        {accent.icon}
                      </span>
                      <h3
                        className={cm.cn(
                          cm.textSize('2xl'),
                          cm.fontWeight('bold'),
                          'font-headline text-on-surface mb-2',
                        )}
                      >
                        {t(
                          `stillpoint.landing.categories.${c.key}`,
                          {},
                          { defaultValue: c.defaultLabel },
                        )}
                      </h3>
                      <p className={cm.cn('text-on-surface-variant mb-6')}>
                        {t(
                          `stillpoint.landing.categoryBody.${c.key}`,
                          {},
                          { defaultValue: c.description },
                        )}
                      </p>
                      <span
                        className={cm.cn(
                          cm.fontWeight('medium'),
                          cm.flex({ align: 'center', gap: 'xs' }),
                          'group-hover:gap-2 transition-all',
                        )}
                        style={{ color: accent.fg }}
                      >
                        {t(
                          `stillpoint.landing.practice.explore.${c.key}`,
                          {
                            category: t(
                              `stillpoint.landing.categories.${c.key}`,
                              {},
                              { defaultValue: c.defaultLabel },
                            ),
                          },
                          { defaultValue: 'Explore {{category}}' },
                        )}
                        <span
                          aria-hidden="true"
                          className={cm.cn('material-symbols-outlined text-sm')}
                        >
                          arrow_forward
                        </span>
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        {/* Today's featured session */}
        <section
          id="featured"
          className={cm.cn(cm.sp('px', 6), cm.sp('py', 20), 'bg-surface-secondary')}
        >
          <div className={cm.cn('max-w-4xl mx-auto')}>
            <div className={cm.cn(cm.sp('mb', 8), 'text-center md:text-left')}>
              <h2
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-3xl md:text-4xl text-on-surface font-headline tracking-tight',
                )}
              >
                {t(
                  'stillpoint.landing.featured.heading',
                  {},
                  { defaultValue: "Today's featured session" },
                )}
              </h2>
              <p className={cm.cn('text-on-surface-variant mt-2')}>
                {t(
                  'stillpoint.landing.featured.sub',
                  {},
                  { defaultValue: 'A hand-picked meditation to start your day.' },
                )}
              </p>
            </div>
            <Link
              to="/library"
              data-mol-id="landing-featured-card"
              className={cm.cn(
                'group bg-surface rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col md:flex-row md:h-64 border border-outline/20',
              )}
            >
              {/* CSS artwork (no photo assets in the template) — sunrise-wash
                 gradient stand-in for the design's photograph. */}
              <div className="md:w-1/2 h-48 md:h-full relative overflow-hidden bg-[image:linear-gradient(135deg,var(--color-cat-body)_0%,var(--color-accent)_55%,color-mix(in_oklab,var(--color-cat-mindfulness)_70%,white)_100%)]">
                <div
                  aria-hidden="true"
                  className={cm.cn('absolute inset-0 flex items-center justify-center opacity-90')}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-white text-7xl')}
                    style={{ fontVariationSettings: "'FILL' 0" }}
                  >
                    wb_twilight
                  </span>
                </div>
                <div
                  aria-hidden="true"
                  className={cm.cn(
                    'absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'w-16 h-16 bg-white/30 backdrop-blur-sm rounded-full',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-white text-3xl')}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      play_arrow
                    </span>
                  </div>
                </div>
                <div className={cm.cn('absolute top-4 left-4')}>
                  <span
                    className={cm.cn(
                      'bg-accent text-on-accent text-xs font-bold px-3 py-1.5 rounded-full tracking-wider uppercase shadow-sm',
                    )}
                  >
                    {t('stillpoint.landing.featured.badge', {}, { defaultValue: 'Body' })}
                  </span>
                </div>
              </div>
              {/* Content */}
              <div
                className={cm.cn(cm.sp('p', 8), 'md:w-1/2 flex flex-col justify-center text-left')}
              >
                <h3
                  className={cm.cn(
                    cm.textSize('2xl'),
                    cm.fontWeight('bold'),
                    'font-headline text-on-surface mb-2',
                  )}
                >
                  {t(
                    'stillpoint.landing.featured.title',
                    {},
                    { defaultValue: 'Morning grounding' },
                  )}
                </h3>
                <p className={cm.cn('text-on-surface-variant mb-6 grow')}>
                  {t(
                    'stillpoint.landing.featured.body',
                    {},
                    {
                      defaultValue:
                        'Set a calm, intentional tone for your day with this gentle body scan.',
                    },
                  )}
                </p>
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'mt-auto')}>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'w-10 h-10 rounded-full bg-primary-container text-primary text-xs font-bold shrink-0',
                      )}
                    >
                      MI
                    </div>
                    <div>
                      <p
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          'text-on-surface',
                        )}
                      >
                        {t(
                          'stillpoint.landing.sample.with',
                          {},
                          { defaultValue: 'with Maya Iyer' },
                        )}
                      </p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(
                          'stillpoint.landing.featured.instructor',
                          {},
                          { defaultValue: 'Instructor' },
                        )}
                      </p>
                    </div>
                  </div>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'text-on-surface-variant bg-background rounded-full',
                    )}
                  >
                    <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-lg')}>
                      schedule
                    </span>
                    {t('stillpoint.landing.featured.duration', {}, { defaultValue: '10 min' })}
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* Stats band */}
        <section className={cm.cn('bg-primary text-white py-14 border-y border-white/10')}>
          <div
            className={cm.cn(
              cm.sp('px', 6),
              'max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:divide-x divide-white/30',
            )}
          >
            {STATS.map((s) => (
              <div key={s.key} className={cm.cn('py-4 md:py-0')}>
                <p
                  className={cm.cn('text-4xl font-bold tabular-nums tracking-tight font-headline')}
                >
                  {s.value}
                </p>
                <p className={cm.cn('text-white/85 font-medium text-lg mt-2')}>
                  {t(`stillpoint.landing.stats.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                </p>
              </div>
            ))}
            <div className={cm.cn('py-4 md:py-0 flex flex-col items-center justify-center')}>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'text-accent mb-2')}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    aria-hidden="true"
                    className={cm.cn('material-symbols-outlined text-2xl')}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                ))}
              </div>
              <p className={cm.cn('text-white/85 font-medium text-lg')}>
                {t('stillpoint.landing.stats.rating', {}, { defaultValue: 'App Store rating' })}
              </p>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className={cm.cn(cm.sp('px', 6), cm.sp('py', 24), 'bg-surface text-center')}>
          <div
            className={cm.cn(
              cm.sp('p', 12),
              'max-w-2xl mx-auto bg-background rounded-[2rem] border border-primary/5 shadow-sm relative overflow-hidden',
            )}
          >
            <div
              className={cm.cn(
                'absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl',
              )}
              aria-hidden="true"
            />
            <div
              className={cm.cn(
                'absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl',
              )}
              aria-hidden="true"
            />
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'lg' }),
                'relative z-10 items-center',
              )}
            >
              <h2
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-4xl md:text-5xl text-on-surface tracking-tight font-headline',
                )}
              >
                {t(
                  'stillpoint.landing.cta.title',
                  {},
                  { defaultValue: 'Begin your stillness today' },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant max-w-md mx-auto')}>
                {t(
                  'stillpoint.landing.cta.body',
                  { app: APP_NAME, tagline: APP_TAGLINE },
                  {
                    defaultValue:
                      'Start with a 7-day free trial — no credit card needed. {{app}}: {{tagline}}.',
                  },
                )}
              </p>
              <div className={cm.cn(cm.flex({ justify: 'center', gap: 'sm' }))}>
                <Link
                  to="/signup"
                  data-mol-id="landing-cta-signup"
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                    cm.sp('px', 10),
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    cm.textSize('lg'),
                    'bg-accent text-on-accent rounded-full transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95',
                  )}
                >
                  {t(
                    'stillpoint.landing.cta.primary',
                    {},
                    { defaultValue: 'Create your free account' },
                  )}
                  <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                    arrow_forward
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
