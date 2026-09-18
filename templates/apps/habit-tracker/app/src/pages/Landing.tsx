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
  { value: '47k+', label: 'Streaks alive today' },
  { value: '4.8★', label: 'iOS App Store rating' },
  { value: '92%', label: 'Renew month-over-month' },
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
              style={{ backgroundColor: 'rgba(249, 115, 22, 0.12)', color: 'var(--color-flame)' }}
            >
              <span
                className={cm.cn('material-symbols-outlined text-base')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                local_fire_department
              </span>
              {t('landing.eyebrow', {}, { defaultValue: 'Build the chain. Don’t break it.' })}
            </span>
            <h1
              className={cm.cn(
                'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] font-extrabold',
              )}
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
                    'Build habits the way they actually stick: small commitments, daily streaks, and the visceral pleasure of a long unbroken chain.',
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
                {t('landing.heroCta', {}, { defaultValue: 'Start your first streak' })}
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

        {/* Sample auth'd hero — mirrors the Dashboard StreakHeroCard */}
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
            <h2 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight')}>
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
              style={{ background: 'rgba(249, 115, 22, 0.3)' }}
            />
            <h2
              className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight relative z-10')}
            >
              {t('landing.ctaTitle', {}, { defaultValue: 'One day at a time. Every day.' })}
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
                    'Free forever for up to five habits. Pro unlocks unlimited streaks, advanced stats, and freezes.',
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
