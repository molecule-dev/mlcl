import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingNav } from '../components/LandingNav.js'
import { SleepScoreHeroCard } from '../components/SleepScoreHeroCard.js'

const FEATURES = [
  {
    key: 'stages',
    defaultTitle: 'Real-time stages',
    defaultBody:
      'Watch deep, light and REM stages stack as you sleep — with a hypnogram for every night.',
    icon: 'graphic_eq',
  },
  {
    key: 'recovery',
    defaultTitle: 'Daily recovery score',
    defaultBody:
      'Heart-rate, HRV, and stage balance roll up into a single 0–100 score every morning.',
    icon: 'favorite',
  },
  {
    key: 'alarm',
    defaultTitle: 'Smart wake windows',
    defaultBody:
      'Wake during light sleep — never groggy. Custom windows, sounds, and gentle haptics.',
    icon: 'alarm',
  },
  {
    key: 'coaching',
    defaultTitle: 'Coaching that actually fits',
    defaultBody:
      'Personalized programs adapt to your chronotype and the patterns {{appName}} spots in your data.',
    icon: 'self_improvement',
  },
] as const

const STATS = [
  { key: 'avgScore', defaultLabel: 'Avg sleep score', value: '83' },
  { key: 'deep', defaultLabel: 'Deep sleep / night', value: '1h 38m' },
  { key: 'rhr', defaultLabel: 'Resting HR', value: '54 bpm' },
  { key: 'streak', defaultLabel: 'Tracked-night streak', value: '124' },
]

const SOCIAL_PROOF = [
  { value: '90M+', label: 'Nights analysed' },
  { value: '4.9★', label: 'iOS App Store rating' },
  { value: '93%', label: 'Wake more refreshed' },
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
            style={{ background: 'rgba(108, 92, 231, 0.28)' }}
          />
          <div
            className={cm.cn(
              'absolute -bottom-40 -left-40 w-[28rem] h-[28rem] rounded-full blur-3xl',
            )}
            style={{ background: 'rgba(167, 139, 250, 0.28)' }}
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
                'inline-flex items-center gap-2 rounded-full text-xs uppercase tracking-widest',
              )}
              style={{ backgroundColor: 'rgba(108, 92, 231, 0.14)', color: 'var(--color-primary)' }}
            >
              <span
                className={cm.cn('material-symbols-outlined text-base')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                nights_stay
              </span>
              {t('landing.eyebrow', {}, { defaultValue: 'Sleep, decoded' })}
            </span>
            <h1
              className={cm.cn(
                'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] font-extrabold',
              )}
            >
              {t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}.' })}
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
                { app: APP_NAME },
                {
                  defaultValue:
                    '{{app}} pairs with your wearable to chart every stage of every night, score your recovery, and wake you at the right moment in your cycle.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'md' }),
                'flex-wrap',
              )}
            >
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('bold'),
                  cm.textSize('base'),
                  'whitespace-nowrap',
                  'bg-primary text-on-primary rounded-full shadow-lg hover:shadow-xl transition-shadow inline-flex items-center gap-2',
                )}
              >
                {t('landing.heroCta', {}, { defaultValue: 'Track your first night' })}
                <span className={cm.cn('material-symbols-outlined')}>arrow_forward</span>
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 4),
                  cm.fontWeight('semibold'),
                  cm.textSize('base'),
                  'whitespace-nowrap',
                  'rounded-full border-2 border-outline-variant hover:border-primary hover:bg-primary-container/30 transition-colors',
                )}
              >
                {t('landing.heroCtaSecondary', {}, { defaultValue: 'See it in action' })}
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
                  <span
                    className={cm.cn(cm.textSize('xl'), cm.fontWeight('extrabold'))}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {s.value}
                  </span>
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

        {/* Sample auth'd hero — mirrors the Dashboard SleepScoreHeroCard so a
            logged-out visitor sees what the app looks like inside. */}
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
          <SleepScoreHeroCard
            score={87}
            quality="excellent"
            durationMinutes={7 * 60 + 32}
            bedtime="2026-04-29T23:14:00Z"
            wakeTime="2026-04-30T06:46:00Z"
            insight={t(
              'landing.previewInsight',
              {},
              {
                defaultValue:
                  'Deep sleep was up 22 minutes vs. your weekly average — your wind-down ritual is working.',
              },
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
                  'bg-surface-container-lowest rounded-2xl shadow-sm border-l-4 text-center hover:-translate-y-0.5 transition-transform',
                )}
                style={{ borderLeftColor: 'var(--color-border-focus)' }}
              >
                <p
                  className={cm.cn('text-4xl font-extrabold tracking-tight')}
                  style={{ color: 'var(--color-border-focus)', fontVariantNumeric: 'tabular-nums' }}
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
              {t('landing.featuresTitle', {}, { defaultValue: 'Built for restorative nights' })}
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
                    'Stage-level tracking, recovery scoring, and a smart alarm — designed to be calm, never noisy.',
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
                  'bg-surface-container-lowest rounded-2xl shadow-sm border-t-4 hover:-translate-y-0.5 transition-transform',
                )}
                style={{ borderTopColor: 'var(--color-stage-rem)' }}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-3xl')}
                  aria-hidden="true"
                  style={{ color: 'var(--color-border-focus)', fontVariationSettings: "'FILL' 1" }}
                >
                  {f.icon}
                </span>
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mt', 3))}>
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
                  {t(
                    `landing.feature.${f.key}.body`,
                    { appName: APP_NAME },
                    { defaultValue: f.defaultBody },
                  )}
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
                'linear-gradient(135deg, var(--color-hero-gradient-start) 0%, var(--color-primary) 50%, #6c5ce7 100%)',
            }}
          >
            <div
              className={cm.cn(
                'absolute -right-20 -top-20 w-64 h-64 rounded-full bg-surface/10 blur-3xl',
              )}
            />
            <div
              className={cm.cn('absolute -left-20 -bottom-20 w-64 h-64 rounded-full blur-3xl')}
              style={{ background: 'rgba(167, 139, 250, 0.4)' }}
            />
            <h2
              className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight relative z-10')}
            >
              {t(
                'landing.ctaTitle',
                {},
                { defaultValue: 'Tonight is data. Tomorrow is recovery.' },
              )}
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
                    'Free for nightly tracking. Pro unlocks coaching programs, exports, and family sharing.',
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
                'inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-surface text-primary shadow-lg hover:shadow-xl transition-shadow relative z-10',
              )}
              style={{ color: 'var(--color-primary)' }}
            >
              {t('landing.ctaButton', {}, { defaultValue: 'Track your first night' })}
              <span className={cm.cn('material-symbols-outlined')}>arrow_forward</span>
            </Link>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
