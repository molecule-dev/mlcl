import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { CategoryTile } from '../components/CategoryTile.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingNav } from '../components/LandingNav.js'
import type { CategoryTone } from '../lib/categoryTone.js'

interface FeatureCard {
  icon: string
  titleKey: string
  defaultTitle: string
  bodyKey: string
  defaultBody: string
}

const FEATURES: FeatureCard[] = [
  {
    icon: 'self_improvement',
    titleKey: 'stillpoint.landing.features.guided.title',
    defaultTitle: 'Guided meditations',
    bodyKey: 'stillpoint.landing.features.guided.body',
    defaultBody: '600+ teacher-led sessions for any moment of your day.',
  },
  {
    icon: 'air',
    titleKey: 'stillpoint.landing.features.breath.title',
    defaultTitle: 'Breathwork',
    bodyKey: 'stillpoint.landing.features.breath.body',
    defaultBody: 'Box-breath, 4-7-8, and coherent breathing in one tap.',
  },
  {
    icon: 'bedtime',
    titleKey: 'stillpoint.landing.features.sleep.title',
    defaultTitle: 'Sleep stories',
    bodyKey: 'stillpoint.landing.features.sleep.body',
    defaultBody: 'Drift off to slow narratives over ambient soundscapes.',
  },
]

const CATEGORIES: {
  tone: CategoryTone
  key: string
  defaultLabel: string
  sessions: number
  description: string
}[] = [
  {
    tone: 'mindfulness',
    key: 'mindfulness',
    defaultLabel: 'Mindfulness',
    sessions: 124,
    description: 'Stay present, one breath at a time.',
  },
  {
    tone: 'sleep',
    key: 'sleep',
    defaultLabel: 'Sleep',
    sessions: 86,
    description: 'Wind down with stories and slow breathing.',
  },
  {
    tone: 'focus',
    key: 'focus',
    defaultLabel: 'Focus',
    sessions: 58,
    description: 'Sharpen attention before deep work.',
  },
  {
    tone: 'stress',
    key: 'stress',
    defaultLabel: 'Stress relief',
    sessions: 72,
    description: 'Soft sessions for tense afternoons.',
  },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        'bg-surface text-on-surface antialiased selection:bg-primary selection:text-on-primary',
      )}
    >
      <LandingNav />

      <main className={cm.cn('pb-16')}>
        {/* Hero */}
        <section
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 12),
            'max-w-7xl mx-auto md:py-24 grid md:grid-cols-2 gap-12 items-center',
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
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
                'text-5xl md:text-6xl lg:text-7xl tracking-tight text-on-surface leading-[0.95]',
              )}
            >
              {t('stillpoint.landing.hero.title1', {}, { defaultValue: 'Find your' })}
              <br />
              <span className={cm.cn('text-primary')}>
                {t('stillpoint.landing.hero.title2', {}, { defaultValue: 'still center.' })}
              </span>
            </h1>
            <p
              className={cm.cn(
                cm.textSize('xl'),
                'text-on-surface-variant max-w-lg leading-relaxed',
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
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'sm:flex-row')}>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  cm.textSize('lg'),
                  'bg-accent text-on-accent rounded-full hover:bg-accent/90 transition-colors shadow-md',
                )}
              >
                {t(
                  'stillpoint.landing.hero.primary',
                  {},
                  { defaultValue: 'Start free — 7-day trial' },
                )}
              </Link>
              <a
                href="#features"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                  cm.sp('px', 8),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  cm.textSize('lg'),
                  'rounded-full text-on-surface bg-surface border border-outline hover:bg-surface-variant transition-colors',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cm.cn('material-symbols-outlined text-primary')}
                >
                  play_circle
                </span>
                {t('stillpoint.landing.hero.secondary', {}, { defaultValue: 'See how it works' })}
              </a>
            </div>
          </div>

          {/* Sample card mirroring the auth'd hero. */}
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', justify: 'between' }),
              cm.sp('p', 8),
              'min-h-[360px] bg-gradient-to-br from-[var(--color-hero-from)] via-primary to-[var(--color-cat-mindfulness)] rounded-[2rem] text-white relative overflow-hidden shadow-xl',
            )}
          >
            <div className={cm.cn('relative z-10')}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-white/70',
                )}
              >
                {t('stillpoint.landing.sample.eyebrow', {}, { defaultValue: "Today's session" })}
              </span>
              <p
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-3xl md:text-4xl tracking-tight leading-[1.1] mt-2 max-w-xs',
                )}
              >
                {t(
                  'stillpoint.landing.sample.title',
                  {},
                  { defaultValue: 'Letting go of tension' },
                )}
              </p>
              <p
                className={cm.cn(cm.textSize('sm'), 'text-white/80 mt-3 max-w-xs leading-relaxed')}
              >
                {t(
                  'stillpoint.landing.sample.body',
                  {},
                  {
                    defaultValue:
                      'A guided body scan to soften the shoulders, jaw, and breath. Best with eyes closed.',
                  },
                )}
              </p>
            </div>
            <div
              className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'relative z-10 flex-wrap')}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.roundedFull,
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'bg-surface/15 backdrop-blur-md uppercase tracking-widest',
                )}
              >
                <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                  schedule
                </span>
                {t('stillpoint.landing.sample.duration', {}, { defaultValue: '12 min' })}
              </span>
              <span
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.roundedFull,
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'bg-surface/15 backdrop-blur-md uppercase tracking-widest',
                )}
              >
                {t('stillpoint.landing.sample.category', {}, { defaultValue: 'Stress relief' })}
              </span>
              <span className={cm.cn(cm.textSize('sm'), 'text-white/85 font-medium')}>
                {t('stillpoint.landing.sample.with', {}, { defaultValue: 'with Maya Iyer' })}
              </span>
            </div>
            <svg
              aria-hidden="true"
              className={cm.cn('absolute -right-20 -bottom-20 w-[360px] h-[360px] opacity-30')}
              viewBox="0 0 100 100"
            >
              {[14, 22, 30, 38, 46].map((r) => (
                <circle
                  key={r}
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  stroke="white"
                  strokeWidth="0.6"
                  strokeOpacity={0.6 - r / 100}
                />
              ))}
            </svg>
            <div
              className={cm.cn(
                'absolute -right-32 -bottom-32 w-80 h-80 bg-accent/30 rounded-full blur-3xl',
              )}
            />
            <div
              className={cm.cn(
                'absolute -top-16 -left-10 w-64 h-64 bg-surface/15 rounded-full blur-3xl',
              )}
            />
          </div>
        </section>

        {/* Stats strip */}
        <section
          className={cm.cn(
            'bg-gradient-to-r from-[var(--color-hero-strip-from)] to-primary py-12 text-white',
          )}
        >
          <div
            className={cm.cn(
              cm.sp('px', 6),
              'max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:divide-x divide-white/30',
            )}
          >
            {[
              { value: '320,000+', key: 'users', defaultLabel: 'mindful members' },
              { value: '8.6M+', key: 'minutes', defaultLabel: 'minutes meditated' },
              { value: '4.9 ★', key: 'rating', defaultLabel: 'App Store rating' },
            ].map((s) => (
              <div key={s.key} className={cm.cn('pt-6 md:pt-0')}>
                <p className={cm.cn('text-4xl font-black tabular-nums tracking-tight')}>
                  {s.value}
                </p>
                <p className={cm.cn('text-white/85 mt-2 font-medium')}>
                  {t(`stillpoint.landing.stats.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Feature triad */}
        <section
          id="features"
          className={cm.cn(cm.sp('px', 6), cm.sp('py', 16), 'max-w-7xl mx-auto')}
        >
          <div
            className={cm.cn(
              cm.textCenter,
              cm.sp('mb', 12),
              cm.flex({ direction: 'col', gap: 'sm' }),
              'max-w-2xl mx-auto',
            )}
          >
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-3xl md:text-4xl tracking-tight text-on-surface',
              )}
            >
              {t(
                'stillpoint.landing.features.heading',
                {},
                { defaultValue: 'A practice that grows with you' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
              {t(
                'stillpoint.landing.features.body',
                {},
                {
                  defaultValue:
                    'Calm tools for every moment — morning focus, midday reset, bedtime wind-down.',
                },
              )}
            </p>
          </div>
          <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-6')}>
            {FEATURES.map((f) => (
              <div
                key={f.icon}
                className={cm.cn(
                  cm.sp('p', 8),
                  'bg-surface-container-lowest rounded-2xl border border-outline/30 shadow-sm hover:shadow-md transition-shadow',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.sp('mb', 6),
                    'w-14 h-14 bg-primary-container rounded-2xl text-primary',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cm.cn('material-symbols-outlined text-2xl')}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn(
                    cm.textSize('xl'),
                    cm.fontWeight('bold'),
                    cm.sp('mb', 2),
                    'text-on-surface tracking-tight',
                  )}
                >
                  {t(f.titleKey, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn('text-on-surface-variant leading-relaxed')}>
                  {t(f.bodyKey, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section className={cm.cn(cm.sp('px', 6), cm.sp('py', 8), 'max-w-7xl mx-auto')}>
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-2xl md:text-3xl tracking-tight text-on-surface mb-6',
            )}
          >
            {t('stillpoint.landing.categories.heading', {}, { defaultValue: 'Browse by mood' })}
          </h2>
          <div className={cm.cn('grid grid-cols-2 md:grid-cols-4 gap-4')}>
            {CATEGORIES.map((c) => (
              <CategoryTile
                key={c.key}
                category={c.tone}
                label={t(
                  `stillpoint.landing.categories.${c.key}`,
                  {},
                  { defaultValue: c.defaultLabel },
                )}
                sessionCount={c.sessions}
                description={t(
                  `stillpoint.landing.categoryBody.${c.key}`,
                  {},
                  { defaultValue: c.description },
                )}
                to={`/library?category=${c.tone}`}
              />
            ))}
          </div>
        </section>

        {/* CTA */}
        <section
          className={cm.cn(cm.sp('px', 6), cm.sp('py', 16), 'max-w-4xl mx-auto text-center')}
        >
          <div
            className={cm.cn(
              cm.sp('p', 12),
              'bg-primary-container rounded-3xl border border-primary/20 shadow-sm relative overflow-hidden',
            )}
          >
            <div
              className={cm.cn(
                'absolute -top-24 -right-24 w-64 h-64 bg-primary/30 rounded-full mix-blend-multiply blur-3xl opacity-50',
              )}
              aria-hidden="true"
            />
            <div
              className={cm.cn(
                'absolute -bottom-24 -left-24 w-64 h-64 bg-accent/30 rounded-full mix-blend-multiply blur-3xl opacity-50',
              )}
              aria-hidden="true"
            />
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), 'relative z-10')}>
              <h2
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-4xl md:text-5xl text-on-surface tracking-tight',
                )}
              >
                {t(
                  'stillpoint.landing.cta.title',
                  {},
                  { defaultValue: 'Begin your stillness today' },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('xl'), 'text-on-primary-container max-w-xl mx-auto')}>
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
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 3),
                    cm.fontWeight('semibold'),
                    'bg-accent text-on-accent rounded-full hover:bg-accent/90 transition-colors shadow-sm',
                  )}
                >
                  {t(
                    'stillpoint.landing.cta.primary',
                    {},
                    { defaultValue: 'Create your free account' },
                  )}
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
