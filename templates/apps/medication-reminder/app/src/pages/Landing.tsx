import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

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

/** Static hero card — adherence ring + today's schedule (Stitch design). */
function HeroAdherenceCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const schedule = [
    {
      key: 'taken',
      icon: 'check_circle',
      tone: 'var(--color-success)',
      time: '8:00 AM',
      name: 'Levothyroxine 50mcg',
      detail: 'Taken · 7:42 AM',
    },
    {
      key: 'upcoming',
      icon: 'schedule',
      tone: 'var(--color-primary)',
      time: '1:00 PM',
      name: 'Metformin 850mg',
      detail: 'Upcoming · with lunch',
    },
    {
      key: 'missed',
      icon: 'error',
      tone: 'var(--color-dose-missed)',
      time: '9:00 AM',
      name: 'Vitamin D 1000 IU',
      detail: 'Snoozed · escalate at noon',
    },
  ] as const
  return (
    <div
      className={cm.cn(
        cm.sp('p', 8),
        'relative z-10 bg-surface rounded-3xl shadow-xl border border-outline-variant/60 flex flex-col gap-8',
      )}
    >
      {/* Adherence ring */}
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'md' }),
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-low',
        )}
      >
        <div className={cm.cn('relative w-24 h-24 flex items-center justify-center shrink-0')}>
          <svg className={cm.cn('w-full h-full -rotate-90')} viewBox="0 0 36 36" aria-hidden="true">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="var(--color-outline-variant)"
              strokeDasharray="100, 100"
              strokeWidth="4"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="var(--color-primary)"
              strokeDasharray="92, 100"
              strokeLinecap="round"
              strokeWidth="4"
            />
          </svg>
          <div className={cm.cn('absolute text-center')}>
            <span
              className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'block text-on-surface')}
            >
              92%
            </span>
          </div>
        </div>
        <div>
          <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
            {t('landing.ringTitle', {}, { defaultValue: 'Weekly Adherence' })}
          </h3>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('landing.ringBody', {}, { defaultValue: 'Great job staying on track!' })}
          </p>
          <span
            className={cm.cn(
              'mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-accent text-on-accent',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-sm')}
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              local_fire_department
            </span>
            {t('landing.streakPill', {}, { defaultValue: '23 day streak' })}
          </span>
        </div>
      </div>
      {/* Today's schedule */}
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <h4 className={cm.cn(cm.fontWeight('semibold'), cm.sp('px', 2), 'text-on-surface')}>
          {t('landing.scheduleTitle', {}, { defaultValue: "Today's Schedule" })}
        </h4>
        {schedule.map((row) => (
          <div
            key={row.key}
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xs' }),
              cm.sp('p', 4),
              'bg-surface rounded-xl border-l-4 shadow-sm',
            )}
            style={{ borderLeftColor: row.tone }}
          >
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'gap-2')}>
              <span
                className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), 'text-on-surface')}
              >
                {row.name}
              </span>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {row.time}
              </span>
            </div>
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(`landing.schedule.${row.key}`, {}, { defaultValue: row.detail })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

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
                  'rounded-full bg-accent text-on-accent hover:bg-accent-hover transition-colors shadow-sm',
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
                    'rounded-full bg-accent text-on-accent hover:bg-accent-hover transition-colors shadow-sm',
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
        {/* §1.2 Marketing hero — left copy, right adherence card (Stitch design) */}
        <section className={cm.cn('relative overflow-hidden', cm.sp('pt', 20), cm.sp('pb', 16))}>
          <div
            aria-hidden="true"
            className={cm.cn(
              'absolute top-0 right-0 -z-10 w-[800px] h-[800px] bg-accent-light rounded-full blur-3xl opacity-50 -translate-y-1/4 translate-x-1/4 pointer-events-none',
            )}
          />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.sp('px', 6),
              cm.mxAuto,
              'grid lg:grid-cols-2 gap-12 lg:gap-16 items-center',
            )}
          >
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-primary-dark dark:text-primary',
                )}
              >
                {t('landing.eyebrow', {}, { defaultValue: 'Medication adherence, made caring' })}
              </p>
              <h1
                className={cm.cn(
                  'text-5xl lg:text-7xl font-bold tracking-tight text-on-surface leading-[1.1]',
                )}
              >
                {t('landing.heroTitle', {}, { defaultValue: 'Every dose,' })}
                <br />
                <span className="text-primary">
                  {t('landing.heroTitleAccent', {}, { defaultValue: 'on time' })}
                </span>
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.maxW('lg'),
                  'text-on-surface-variant leading-relaxed',
                )}
              >
                {t(
                  'landing.heroSubtitle',
                  {},
                  {
                    defaultValue:
                      'A caring, reliable medication reminder for peace of mind. Manage complex schedules effortlessly, track adherence, and share updates with loved ones.',
                  },
                )}
              </p>
              {/* §14.3 Hero CTA buttons */}
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), 'sm:flex-row pt-2')}>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    cm.fontWeight('semibold'),
                    cm.textSize('lg'),
                    'rounded-full bg-accent text-on-accent hover:bg-accent-hover transition-colors shadow-md text-center',
                  )}
                >
                  {t('landing.heroCta', {}, { defaultValue: 'Start free' })}
                </Link>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    cm.fontWeight('semibold'),
                    cm.textSize('lg'),
                    'rounded-full border-2 border-outline-variant hover:border-outline text-on-surface transition-colors',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                    play_circle
                  </span>
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
                  cm.sp('pt', 6),
                  cm.sp('mt', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant border-t border-outline-variant/60',
                )}
              >
                {t(
                  'landing.heroProof',
                  {},
                  {
                    defaultValue:
                      'Trusted by patients, caregivers, and care teams in 40+ countries',
                  },
                )}
              </p>
            </div>
            <div className="relative">
              <div
                aria-hidden="true"
                className={cm.cn(
                  'absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent rounded-3xl -rotate-3 scale-105 pointer-events-none',
                )}
              />
              <HeroAdherenceCard />
            </div>
          </div>
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
              'rounded-[2rem] bg-gradient-to-br from-[color:var(--color-cta-gradient-from)] to-[color:var(--color-cta-gradient-to)] text-white relative overflow-hidden',
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
                'text-white/90 relative z-10',
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
                'rounded-full bg-accent text-on-accent hover:bg-accent-hover transition-colors inline-block relative z-10',
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
            {' — Built with '}
            <a
              href="https://molecule.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline font-medium"
            >
              Molecule.dev
            </a>
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
