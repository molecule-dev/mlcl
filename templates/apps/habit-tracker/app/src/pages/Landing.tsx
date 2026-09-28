import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { LandingNav } from '../components/LandingNav.js'
import { StreakHeroCard } from '../components/StreakHeroCard.js'

const FEATURES = [
  {
    key: 'streaks',
    defaultTitle: 'Streaks that motivate',
    defaultBody: 'Daily fire counters that reset on miss. Loss aversion is a hell of a teacher.',
    icon: 'local_fire_department',
  },
  {
    key: 'heatmap',
    defaultTitle: 'Year-at-a-glance heatmap',
    defaultBody: 'GitHub-style consistency grid. Watch your year fill in green, one day at a time.',
    icon: 'grid_on',
  },
  {
    key: 'achievements',
    defaultTitle: 'Milestone trophies',
    defaultBody: '7, 30, 90, 180, 365-day badges. Unlock new ones; never lose what you’ve earned.',
    icon: 'emoji_events',
  },
  {
    key: 'recover',
    defaultTitle: 'Streak freezes',
    defaultBody:
      'One free freeze per week. Life happens. Habits don’t need to be perfect — only persistent.',
    icon: 'ac_unit',
  },
] as const

const STATS = [
  { key: 'avgStreak', defaultLabel: 'Average streak', value: '47 days' },
  { key: 'completion', defaultLabel: 'Daily completion', value: '78%' },
  { key: 'unlocked', defaultLabel: 'Achievements held', value: '14' },
  { key: 'best', defaultLabel: 'Best streak ever', value: '189 days' },
]

const SOCIAL_PROOF = [
  { value: '47k+', label: 'Streaks alive today', icon: 'task_alt' },
  { value: '4.8★', label: 'iOS App Store rating', icon: 'star' },
  { value: '92%', label: 'Renew month-over-month', icon: 'trending_up' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  // Design composition: the headline splits over two lines and the FINAL word
  // carries the momentum gradient (the design accents "rhythm."). Splitting the
  // translated tagline at its last space keeps any locale whole — the accent is
  // always the payoff word.
  const tagline = t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}' })
  const splitAt = tagline.lastIndexOf(' ')
  const headlineHead = splitAt === -1 ? tagline : tagline.slice(0, splitAt)
  const headlineAccent = splitAt === -1 ? '' : tagline.slice(splitAt + 1)

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <LandingNav />

      <main>
        {/* Hero — design: surface-container-low band, two-column grid, copy left
            and the giant streak-count momentum card right. */}
        <section
          className={cm.cn('pt-20 pb-32', 'relative overflow-hidden bg-surface-container-low')}
        >
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.sp('px', 6),
              cm.mxAuto,
              'grid items-center gap-16 grid-cols-1 lg:grid-cols-2 relative z-10',
            )}
          >
            {/* Left — headline, subtitle, CTAs, trust row */}
            <div className={cm.cn('py-10 space-y-10')}>
              <div className="space-y-6">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]">
                  {headlineHead} <br />
                  <span className="text-momentum">{headlineAccent}</span>
                </h1>
                <p
                  className={cm.cn(
                    cm.textSize('xl'),
                    'text-on-surface-variant max-w-lg leading-relaxed',
                  )}
                >
                  {t(
                    'landing.heroSubtitle',
                    {},
                    {
                      defaultValue:
                        'Daily habits, visible streaks, lasting change. Small commitments, kept one day at a time.',
                    },
                  )}
                </p>
              </div>
              <div className={cm.cn(cm.flex({ direction: 'col' }), 'sm:flex-row gap-4')}>
                <Link
                  to="/signup"
                  data-mol-id="landing-hero-cta-primary"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    cm.fontWeight('bold'),
                    cm.textSize('lg'),
                    'bg-momentum text-on-gradient rounded-xl shadow-[0_4px_24px_-8px] shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 inline-flex items-center justify-center gap-2',
                  )}
                >
                  {t('landing.heroCta', {}, { defaultValue: 'Start your first streak' })}
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
                <Link
                  to="/login"
                  data-mol-id="landing-hero-cta-secondary"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    cm.fontWeight('bold'),
                    cm.textSize('lg'),
                    'text-on-surface rounded-xl border border-outline-variant hover:bg-surface-container-highest transition-colors inline-flex items-center justify-center',
                  )}
                >
                  {t('landing.heroCtaSecondary', {}, { defaultValue: 'See it live' })}
                </Link>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('pt', 4),
                  'flex-wrap text-sm font-medium text-on-surface-variant',
                )}
              >
                {SOCIAL_PROOF.map((s, i) => (
                  <div key={s.label} className={cm.cn('flex items-center', i > 0 && 'ml-1')}>
                    {i > 0 && (
                      <span
                        aria-hidden="true"
                        className={cm.cn(cm.sp('mx', 3), 'w-1 h-1 rounded-full bg-outline-variant')}
                      />
                    )}
                    <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-lg text-tertiary"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {s.icon}
                      </span>
                      <span className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                        {s.value}
                      </span>
                      <span>{t(`landing.proof.${s.label}`, {}, { defaultValue: s.label })}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — the streak hero banner: flame badge, giant count, label,
                progress rail, over a frosted-glass backdrop */}
            <div className={cm.cn('relative w-full max-w-md mx-auto lg:ml-auto')}>
              <div
                aria-hidden="true"
                className={cm.cn('absolute -inset-4 bg-surface/40 rounded-[2rem] blur-xl z-0')}
              />
              <div
                data-mol-id="landing-hero-streak-banner"
                className={cm.cn(
                  'bg-momentum rounded-3xl relative z-10 text-on-gradient flex flex-col items-center justify-center space-y-6 aspect-[4/5] hover:scale-[1.02] transition-transform duration-500',
                  cm.sp('p', 10),
                  'shadow-[0_20px_40px_-15px] shadow-primary/30',
                )}
              >
                <div className="w-20 h-20 rounded-full bg-surface/20 flex items-center justify-center backdrop-blur-md">
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-5xl!"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    local_fire_department
                  </span>
                </div>
                <div className={cm.cn(cm.textCenter)}>
                  <div className="text-8xl md:text-[8rem] font-black leading-none tracking-tighter tabular-nums drop-shadow-lg">
                    127
                  </div>
                  <div
                    className={cm.cn(
                      cm.textSize('lg'),
                      cm.fontWeight('medium'),
                      cm.sp('mt', 2),
                      'tracking-widest uppercase opacity-90',
                    )}
                  >
                    {t('landing.heroStreakLabel', {}, { defaultValue: 'Days streak' })}
                  </div>
                </div>
                <div
                  aria-hidden="true"
                  className="w-full bg-surface/20 h-2 rounded-full overflow-hidden"
                >
                  <div className="bg-surface w-11/12 h-full rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sample auth'd hero — mirrors the Dashboard StreakHeroCard */}
        <section
          id="how-it-works"
          className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 16), cm.mxAuto)}
        >
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
          <StreakHeroCard
            longestActive={47}
            activeStreaks={9}
            freezesAvailable={1}
            motivationalMessage={t(
              'landing.previewMotivation',
              {},
              { defaultValue: 'Nine streaks alive. Keep them all warm.' },
            )}
          />
        </section>

        <section
          id="stats"
          className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}
        >
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
                  style={{ color: 'var(--color-primary)' }}
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

        <section
          id="features"
          className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 16), cm.mxAuto)}
        >
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 12))}>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              {t('landing.featuresTitle', {}, { defaultValue: 'Designed to make you finish' })}
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
                    'Streaks, freezes, and milestones — engineered to keep one more day on the chain.',
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
                  aria-hidden="true"
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-12 h-12 rounded-xl bg-secondary-container',
                  )}
                >
                  <span
                    className="material-symbols-outlined text-2xl text-on-secondary-container"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {f.icon}
                  </span>
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
              'bg-momentum rounded-[2rem] text-on-gradient relative overflow-hidden shadow-[0_20px_40px_-15px] shadow-primary/30',
            )}
          >
            <div
              aria-hidden="true"
              className={cm.cn(
                'absolute -right-20 -top-20 w-64 h-64 rounded-full bg-surface/10 blur-3xl',
              )}
            />
            <div
              aria-hidden="true"
              className={cm.cn('absolute -left-20 -bottom-20 w-64 h-64 rounded-full blur-3xl')}
              style={{ background: 'color-mix(in oklab, var(--color-tertiary) 30%, transparent)' }}
            />
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight relative z-10">
              {t('landing.ctaTitle', {}, { defaultValue: 'One day at a time. Every day.' })}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mt', 4),
                'text-on-gradient/85 relative z-10',
                cm.maxW('xl'),
                cm.mxAuto,
              )}
            >
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'Free forever for up to five habits. Pro unlocks unlimited streaks, advanced stats, and freezes.',
                },
              )}
            </p>
            <Link
              to="/signup"
              data-mol-id="landing-footer-cta"
              className={cm.cn(
                cm.sp('px', 8),
                cm.sp('py', 4),
                cm.sp('mt', 8),
                cm.fontWeight('bold'),
                'inline-flex items-center gap-2 rounded-full bg-surface text-primary shadow-lg hover:shadow-xl transition-shadow relative z-10',
              )}
            >
              {t('landing.ctaButton', {}, { defaultValue: 'Start your first streak' })}
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
