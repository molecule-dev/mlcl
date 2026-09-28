import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingNav } from '../components/LandingNav.js'

const FEATURES = [
  {
    key: 'stages',
    defaultTitle: 'Real-time stages',
    defaultBody:
      'Watch deep, light and REM stages stack as you sleep — with a hypnogram for every night.',
    icon: 'graphic_eq',
    tone: 'light' as const,
  },
  {
    key: 'recovery',
    defaultTitle: 'Daily recovery score',
    defaultBody:
      'Heart-rate, HRV, and stage balance roll up into a single 0–100 score every morning.',
    icon: 'favorite',
    tone: 'awake' as const,
  },
  {
    key: 'alarm',
    defaultTitle: 'Smart wake windows',
    defaultBody:
      'Wake during light sleep — never groggy. Custom windows, sounds, and gentle haptics.',
    icon: 'alarm',
    tone: 'rem' as const,
  },
  {
    key: 'coaching',
    defaultTitle: 'Coaching that actually fits',
    defaultBody:
      'Personalized programs adapt to your chronotype and the patterns {{appName}} spots in your data.',
    icon: 'self_improvement',
    tone: 'deep' as const,
  },
]

/* Feature-card icon tone → [glyph color, corner-bloom color]. Stage colors
 * carry the design's per-card accent treatment (icon tile + corner bloom). */
const FEATURE_TONES: Record<string, { glyph: string; bloom: string }> = {
  light: { glyph: 'text-stage-light', bloom: 'bg-stage-light/10' },
  awake: { glyph: 'text-stage-awake', bloom: 'bg-stage-awake/10' },
  rem: { glyph: 'text-stage-rem', bloom: 'bg-stage-rem/10' },
  deep: { glyph: 'text-stage-deep', bloom: 'bg-stage-deep/10' },
}

const SCIENCE = [
  { key: 'duration', value: '8.2 hrs', label: 'Avg user duration' },
  { key: 'remAccuracy', value: '92%', label: 'REM stage accuracy' },
  { key: 'nights', value: '3.4M', label: 'Nights logged' },
  { key: 'rating', value: '4.9', label: 'App Store rating', star: true },
]

/* "Tonight's Architecture" hypnogram segments (design hero card). */
const HYPNOGRAM = [
  { stage: 'Deep', pct: 25, cls: 'bg-stage-deep' },
  { stage: 'Light', pct: 45, cls: 'bg-stage-light' },
  { stage: 'REM', pct: 25, cls: 'bg-stage-rem' },
  { stage: 'Awake', pct: 5, cls: 'bg-stage-awake' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <LandingNav />

      <main>
        {/* Hero — aurora backdrop, split copy/ring composition */}
        <section className={cm.cn('landing-aurora relative overflow-hidden')}>
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.sp('px', 6),
              cm.sp('py', 16),
              'grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10 lg:pt-24 lg:pb-28',
              cm.mxAuto,
            )}
          >
            <div className={cm.cn(cm.maxW('2xl'))}>
              <p
                className={cm.cn(
                  cm.sp('mb', 6),
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'uppercase tracking-widest text-accent-amber-text',
                )}
              >
                <span aria-hidden="true" className={cm.cn('h-px w-8 bg-accent-amber')} />
                {t('landing.eyebrow', {}, { defaultValue: 'Master your nights' })}
              </p>
              <h1
                className={cm.cn(
                  'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight',
                  cm.sp('mb', 6),
                )}
              >
                {t('landing.heroTitle', {}, { defaultValue: 'Sleep isn’t luck.' })}
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-stage-light to-stage-rem">
                  {t('landing.heroTitleAccent', {}, { defaultValue: 'It’s a pattern.' })}
                </span>
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('xl'),
                  'text-night-muted leading-relaxed font-light',
                  cm.sp('mb', 10),
                )}
              >
                {t(
                  'landing.heroSubtitle',
                  { app: APP_NAME },
                  {
                    defaultValue:
                      'Decode your nights with clinical-grade precision. {{app}} syncs your favorite wearables and uncovers the patterns holding back your true restorative rest.',
                  },
                )}
              </p>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  'flex-col sm:flex-row flex-wrap',
                  cm.sp('mb', 12),
                )}
              >
                <Link
                  to="/signup"
                  data-mol-id="landing-hero-cta"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    cm.fontWeight('semibold'),
                    cm.textSize('lg'),
                    'whitespace-nowrap bg-primary text-on-primary rounded-full shadow-lg hover:shadow-xl transition-all inline-flex items-center justify-center gap-2',
                  )}
                >
                  {t('landing.heroCta', {}, { defaultValue: 'Start tracking' })}
                  <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
                    arrow_forward
                  </span>
                </Link>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    cm.fontWeight('semibold'),
                    cm.textSize('lg'),
                    'whitespace-nowrap rounded-full border border-night-edge bg-surface/50 hover:bg-surface backdrop-blur-sm transition-colors inline-flex items-center justify-center',
                  )}
                >
                  {t('landing.heroCtaSecondary', {}, { defaultValue: 'See how it works' })}
                </Link>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'lg' }),
                  'flex-wrap text-night-muted text-sm font-medium opacity-80',
                )}
              >
                <span>
                  {t('landing.syncsWith', {}, { defaultValue: 'Syncs seamlessly with:' })}
                </span>
                <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                  {['watch', 'smart_toy', 'favorite'].map((icon) => (
                    <span
                      key={icon}
                      aria-hidden="true"
                      className={cm.cn('material-symbols-outlined text-2xl')}
                    >
                      {icon}
                    </span>
                  ))}
                </span>
              </div>
            </div>

            {/* Sleep score ring + tonight's architecture card */}
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center', gap: 'lg' }),
                'lg:items-end',
              )}
            >
              <div className={cm.cn('sleep-ring', cm.sp('mb', 4))}>
                <div className={cm.cn('sleep-ring-inner', cm.textCenter)}>
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'uppercase tracking-widest text-stage-light',
                      cm.sp('mb', 1),
                    )}
                  >
                    {t('landing.sleepScore', {}, { defaultValue: 'Sleep Score' })}
                  </span>
                  <div className={cm.cn('text-5xl font-bold tabular-nums')}>
                    87<span className={cm.cn('text-2xl text-night-muted')}>/100</span>
                  </div>
                  <div
                    className={cm.cn(
                      cm.sp('mt', 4),
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.textSize('xs'),
                      cm.fontWeight('medium'),
                      'px-3 py-1 bg-night-deep rounded-full border border-night-edge',
                    )}
                  >
                    <span aria-hidden="true" className={cm.cn('h-2 w-2 rounded-full bg-success')} />
                    <span className={cm.cn('text-success')}>
                      {t('landing.scoreDelta', {}, { defaultValue: '+4 vs last week' })}
                    </span>
                  </div>
                </div>
              </div>
              <div
                className={cm.cn(
                  'w-full max-w-md bg-night-surface p-6 rounded-2xl border border-night-edge shadow-2xl',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'end', justify: 'between' }),
                    cm.sp('mb', 4),
                    cm.textSize('sm'),
                  )}
                >
                  <span className={cm.cn(cm.fontWeight('medium'))}>
                    {t(
                      'landing.tonightsArchitecture',
                      {},
                      { defaultValue: 'Tonight’s Architecture' },
                    )}
                  </span>
                  <span className={cm.cn('text-night-muted tabular-nums')}>7h 42m total</span>
                </div>
                <div className={cm.cn('hypnogram-track', cm.sp('mb', 3))}>
                  {HYPNOGRAM.map((seg) => (
                    <div
                      key={seg.stage}
                      title={`${seg.stage} (${seg.pct}%)`}
                      className={seg.cls}
                      style={{ width: `${seg.pct}%` }}
                    />
                  ))}
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ justify: 'between' }),
                    cm.textSize('xs'),
                    'text-night-muted tabular-nums',
                  )}
                >
                  <span>11:30 PM</span>
                  <span>3:00 AM</span>
                  <span>7:12 AM</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Science strip — floating stat band overlapping the hero */}
        <section className={cm.cn(cm.sp('px', 6), 'relative z-20 lg:-mt-10', cm.sp('pb', 4))}>
          <div
            className={cm.cn(
              cm.maxW('6xl'),
              cm.mxAuto,
              'rounded-2xl border border-night-edge bg-night-chart/80 backdrop-blur-sm',
              cm.sp('py', 8),
              'shadow-lg',
            )}
          >
            <div
              className={cm.cn(
                'grid grid-cols-2 md:grid-cols-4 gap-6 px-8 md:divide-x divide-night-edge',
              )}
            >
              {SCIENCE.map((s) => (
                <div key={s.key} className={cm.cn(cm.textCenter, 'px-4')}>
                  <div
                    className={cm.cn(
                      'text-3xl font-bold tabular-nums text-on-surface',
                      cm.sp('mb', 1),
                      'flex items-center justify-center',
                    )}
                  >
                    {s.value}
                    {s.star && (
                      <span
                        aria-hidden="true"
                        className={cm.cn(
                          'material-symbols-outlined text-stage-awake ml-1 text-2xl',
                        )}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                    )}
                  </div>
                  <div className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                    {t(`landing.science.${s.key}`, {}, { defaultValue: s.label })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features grid — design card treatment (icon tile + corner bloom + lift) */}
        <section className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 24), cm.mxAuto)}>
          <div className={cm.cn(cm.textCenter, cm.maxW('2xl'), cm.mxAuto, cm.sp('mb', 16))}>
            <h2 className={cm.cn('text-3xl md:text-4xl font-bold tracking-tight')}>
              {t('landing.featuresTitle', {}, { defaultValue: 'Engineered for Rest' })}
            </h2>
            <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 4), 'text-on-surface-variant')}>
              {t(
                'landing.featuresBody',
                {},
                {
                  defaultValue:
                    'Pro-level metrics distilled into calm, actionable insights that don’t disrupt your wind-down routine.',
                },
              )}
            </p>
          </div>
          <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8')}>
            {FEATURES.map((f) => {
              const tone = FEATURE_TONES[f.tone]
              return (
                <div
                  key={f.key}
                  className={cm.cn(
                    cm.sp('p', 8),
                    'bg-night-surface rounded-2xl border border-night-edge shadow-lg hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden group',
                  )}
                >
                  <div
                    aria-hidden="true"
                    className={cm.cn(
                      'absolute top-0 right-0 w-32 h-32 rounded-bl-full -mr-4 -mt-4 transition-all group-hover:opacity-100 opacity-50',
                      tone.bloom,
                    )}
                  />
                  {/* Icon tile: separate flex tile element — never size/center the
                      glyph span itself (icon-font cascade pins it top-left). */}
                  <div
                    className={cm.cn(
                      'flex h-14 w-14 items-center justify-center rounded-xl bg-night-deep border border-night-edge mb-6',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-3xl', tone.glyph)}
                      aria-hidden="true"
                    >
                      {f.icon}
                    </span>
                  </div>
                  <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 3))}>
                    {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                  </h3>
                  <p
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}
                  >
                    {t(
                      `landing.feature.${f.key}.body`,
                      { appName: APP_NAME },
                      { defaultValue: f.defaultBody },
                    )}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        {/* CTA band — gradient panel with dot texture and amber button */}
        <section className={cm.cn(cm.sp('py', 20), cm.sp('px', 6))}>
          <div
            className={cm.cn(
              cm.maxW('5xl'),
              cm.mxAuto,
              cm.sp('p', 12),
              cm.textCenter,
              'rounded-3xl relative overflow-hidden shadow-2xl border border-night-edge',
            )}
            style={{
              background:
                'linear-gradient(to right, var(--color-band-from), var(--color-band-via) 50%, var(--color-band-to))',
            }}
          >
            <div aria-hidden="true" className={cm.cn('landing-dots absolute inset-0 opacity-50')} />
            <div className={cm.cn('relative z-10')}>
              <h2
                className={cm.cn(
                  'text-3xl md:text-5xl font-bold tracking-tight text-white',
                  cm.sp('mb', 6),
                )}
              >
                {t('landing.ctaTitle', {}, { defaultValue: 'Tonight is a chance to recover.' })}
              </h2>
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.sp('mb', 10),
                  cm.maxW('2xl'),
                  cm.mxAuto,
                  'text-white font-light',
                )}
              >
                {t(
                  'landing.ctaBody',
                  {},
                  {
                    defaultValue:
                      'Join thousands who have unlocked their peak performance by mastering their nighttime patterns. Free for nightly tracking.',
                  },
                )}
              </p>
              <Link
                to="/signup"
                data-mol-id="landing-cta-band-button"
                className={cm.cn(
                  cm.sp('px', 10),
                  cm.sp('py', 4),
                  cm.fontWeight('bold'),
                  cm.textSize('lg'),
                  'inline-flex items-center whitespace-nowrap rounded-full bg-stage-awake text-night-deep shadow-lg hover:brightness-105 transition-all',
                )}
              >
                {t('landing.ctaButton', {}, { defaultValue: 'Start tracking free' })}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
