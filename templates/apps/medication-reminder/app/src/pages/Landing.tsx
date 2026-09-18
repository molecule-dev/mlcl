import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { TodayHeroCard } from '../components/TodayHeroCard.js'

const FEATURES = [
  {
    key: 'reminders',
    icon: 'notifications_active',
    defaultTitle: 'Reminders that respect you',
    defaultBody:
      'Push, text, or quiet — your choice. Snoozable, escalatable to caregivers if missed.',
  },
  {
    key: 'refills',
    icon: 'inventory_2',
    defaultTitle: 'Never out of meds',
    defaultBody:
      'Pill counts tracked in real time. Refill warnings fire 5 days before you run out.',
  },
  {
    key: 'adherence',
    icon: 'insights',
    defaultTitle: 'Adherence that proves it',
    defaultBody: 'Weekly + monthly charts you can share with your care team. Dose-by-dose history.',
  },
  {
    key: 'caregivers',
    icon: 'group',
    defaultTitle: 'Family loop, no app required',
    defaultBody: 'Email/SMS digest to caregivers. Read-only view; you control what they see.',
  },
] as const

const PROOF = [
  { key: 'doses', defaultLabel: 'Doses tracked', value: '8,341' },
  { key: 'adherence', defaultLabel: 'Avg adherence', value: '94%' },
  { key: 'streak', defaultLabel: 'Longest streak', value: '187 days' },
  { key: 'refills', defaultLabel: 'Stockouts avoided', value: '23' },
]

const SAMPLE_TREND = [0.875, 1, 0.875, 1, 0.875, 1, 0.5]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      {/* §14.1 Top nav bar */}
      <nav
        className={cm.cn(
          'sticky top-0 z-50 bg-surface/80 backdrop-blur border-b border-outline-variant',
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
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'shadow-sm',
              )}
              style={{
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
              }}
              aria-hidden="true"
            >
              <span
                className={cm.cn('material-symbols-outlined text-on-primary text-base')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                medication
              </span>
            </span>
            <span
              className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-primary')}
            >
              {APP_NAME}
            </span>
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-on-surface-variant hover:text-on-surface transition-colors',
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
                  cm.textSize('sm'),
                  'rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity shadow-sm shadow-primary/30',
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
                    cm.fontWeight('semibold'),
                    'text-on-surface-variant hover:text-on-surface transition-colors',
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
                    cm.textSize('sm'),
                    'rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity shadow-sm shadow-primary/30',
                  )}
                >
                  {t('common.getStarted', {}, { defaultValue: 'Get started' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* §1.2 Marketing editorial hero */}
        <section className={cm.cn(cm.sp('pt', 24), cm.sp('pb', 16))}>
          <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.mxAuto, cm.textCenter)}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 4),
                'uppercase tracking-widest text-primary-dark dark:text-primary',
              )}
            >
              {t('landing.eyebrow', {}, { defaultValue: 'Medication adherence, made caring' })}
            </p>
            <h1
              className={cm.cn(
                'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95]',
              )}
            >
              {t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}' })}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('xl'),
                cm.sp('mt', 6),
                cm.maxW('2xl'),
                cm.mxAuto,
                'text-on-surface-variant leading-relaxed',
              )}
            >
              {t(
                'landing.heroSubtitle',
                {},
                {
                  defaultValue:
                    'Schedules, reminders, refills, and a real-time adherence record you can share with the people who care about you.',
                },
              )}
            </p>
            {/* §14.3 Hero CTA buttons */}
            <div
              className={cm.cn(
                cm.sp('mt', 10),
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
                  'rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity shadow-md shadow-primary/30',
                )}
              >
                {t('landing.heroCta', {}, { defaultValue: 'Set up your meds' })}
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('semibold'),
                  cm.textSize('base'),
                  'rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors',
                )}
              >
                {t(
                  'landing.heroSecondary',
                  { appName: APP_NAME },
                  { defaultValue: 'I already use {{appName}}' },
                )}
              </Link>
            </div>
            {/* §14.4 Hero social proof bar */}
            <p
              className={cm.cn(
                cm.sp('mt', 8),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              {t(
                'landing.heroProof',
                {},
                {
                  defaultValue: 'Trusted by patients, caregivers, and care teams in 40+ countries',
                },
              )}
            </p>
          </div>
        </section>

        {/* Sample auth'd hero — same gradient hero a logged-in user would see */}
        <section className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('pb', 16), cm.mxAuto)}>
          <TodayHeroCard
            takenCount={4}
            totalDoses={8}
            upcomingCount={4}
            currentStreak={47}
            weekTrend={SAMPLE_TREND}
            todayLabel={t('landing.sampleDate', {}, { defaultValue: 'Sunday, April 26' })}
          />
        </section>

        {/* Social proof stats */}
        <section className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
          <div className={cm.cn('grid grid-cols-2 md:grid-cols-4 gap-6')}>
            {PROOF.map((s) => (
              <div
                key={s.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.textCenter,
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/40',
                )}
              >
                <p className={cm.cn('text-4xl font-extrabold tracking-tight text-primary')}>
                  {s.value}
                </p>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('mt', 2),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(`landing.stat.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* §14.2 Feature quad */}
        <section className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 16), cm.mxAuto)}>
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 12))}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 3),
                'uppercase tracking-widest text-primary-dark dark:text-primary',
              )}
            >
              {t('landing.featureEyebrow', {}, { defaultValue: 'What you get' })}
            </p>
            <h2 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}>
              {t(
                'landing.featureHeading',
                {},
                { defaultValue: 'Everything you need to never miss another dose' },
              )}
            </h2>
          </div>
          <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6')}>
            {FEATURES.map((f) => (
              <article
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface-container-lowest hover:-translate-y-0.5 hover:shadow-md transition-all',
                )}
              >
                <span
                  className={cm.cn(
                    cm.w(12),
                    cm.h(12),
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.sp('mb', 4),
                    'bg-primary/10 text-primary',
                  )}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined">{f.icon}</span>
                </span>
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('bold'),
                    cm.sp('mb', 2),
                    'tracking-tight',
                  )}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 20), cm.mxAuto)}>
          <div
            className={cm.cn(
              cm.sp('p', 12),
              cm.textCenter,
              'rounded-[2rem] bg-gradient-to-br from-primary to-primary-container text-on-primary relative overflow-hidden',
            )}
          >
            <h2
              className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight relative z-10')}
            >
              {t(
                'landing.ctaTitle',
                {},
                { defaultValue: 'Set up your first reminder in two minutes' },
              )}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mt', 4),
                cm.maxW('2xl'),
                cm.mxAuto,
                'text-on-primary opacity-90 relative z-10',
              )}
            >
              {t(
                'landing.ctaSubtitle',
                {},
                { defaultValue: 'Free to start. Add caregivers anytime. Cancel from settings.' },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 8),
                cm.sp('py', 4),
                cm.sp('mt', 8),
                cm.fontWeight('bold'),
                'rounded-full bg-surface text-primary-dark dark:text-primary hover:opacity-95 transition-opacity inline-block relative z-10',
              )}
            >
              {t('landing.ctaButton', {}, { defaultValue: 'Get started — it\u2019s free' })}
            </Link>
            <div
              className={cm.cn(
                cm.w(80),
                cm.h(80),
                cm.roundedFull,
                'absolute -right-20 -bottom-20 bg-surface/10 blur-3xl',
              )}
              aria-hidden="true"
            />
            <div
              className={cm.cn(
                cm.w(20),
                cm.h(20),
                cm.roundedFull,
                'absolute right-10 top-10 bg-surface/15 blur-xl',
              )}
              aria-hidden="true"
            />
          </div>
        </section>
      </main>

      {/* §14.5 Marketing footer */}
      <footer className={cm.cn(cm.sp('py', 10), 'border-t border-outline-variant bg-surface')}>
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.mxAuto,
            cm.flex({ align: 'center', justify: 'between' }),
            'flex-wrap gap-4',
          )}
        >
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'landing.copyright',
              { year: new Date().getFullYear(), app: APP_NAME },
              { defaultValue: '\u00a9 {{year}} {{app}}. Caring for your routine.' },
            )}
          </p>
          <Link
            to="/about"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-on-surface-variant hover:text-on-surface transition-colors',
            )}
          >
            {t('landing.about', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
          </Link>
        </div>
      </footer>
    </div>
  )
}
