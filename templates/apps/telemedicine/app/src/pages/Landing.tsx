import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

const FEATURES = [
  {
    key: 'visits',
    defaultTitle: 'Virtual visits in minutes',
    defaultBody:
      'Connect with a board-certified clinician without scheduling, transit, or waiting-room time.',
    icon: 'video_call',
    tint: 'text-primary',
  },
  {
    key: 'records',
    defaultTitle: 'Records in one place',
    defaultBody:
      'Lab results, prescriptions, visit notes, vitals — all merged into a single chronological timeline.',
    icon: 'folder_shared',
    tint: 'text-info',
  },
  {
    key: 'rx',
    defaultTitle: 'Send prescriptions same-day',
    defaultBody:
      'E-prescriptions delivered to the pharmacy of your choice. Refills resolve in under 60 seconds.',
    icon: 'medication',
    tint: 'text-success',
  },
  {
    key: 'continuity',
    defaultTitle: 'Continuity of care',
    defaultBody:
      'Build a longitudinal relationship with your provider. They see your history; nothing repeats.',
    icon: 'chronic',
    tint: 'text-tertiary',
  },
] as const

const TRUST_STATS = [
  { key: 'visits', defaultLabel: 'Visits this year', value: '4.2M' },
  { key: 'wait', defaultLabel: 'Avg wait time', value: '4 min' },
  { key: 'satisfied', defaultLabel: 'Member satisfied', value: '97%' },
  { key: 'states', defaultLabel: 'Licensed in', value: '50 states' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={
          'sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/40'
        }
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
          <Link to="/" className={'text-xl font-extrabold tracking-tight'}>
            {APP_NAME}
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <Link
              to="/pricing"
              className={'text-sm font-medium text-on-surface-variant hover:text-on-surface'}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={
                  'px-5 py-2 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors'
                }
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={'text-sm font-medium text-on-surface-variant hover:text-on-surface'}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={
                    'px-5 py-2 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors'
                  }
                >
                  {t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — calm teal radial wash with sample provider card */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 25% 30%, color-mix(in srgb, var(--color-primary) 20%, transparent), transparent 50%),' +
                'radial-gradient(circle at 78% 60%, color-mix(in srgb, var(--color-secondary) 15%, transparent), transparent 45%)',
            }}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'relative py-20 md:py-28 lg:py-32',
            )}
          >
            <div className={'grid grid-cols-1 lg:grid-cols-12 gap-12 items-center'}>
              <div className={'lg:col-span-7'}>
                <p className={'text-sm font-bold uppercase tracking-widest text-primary mb-4'}>
                  {t('landing.eyebrow', {}, { defaultValue: 'Telemedicine · HIPAA-compliant' })}
                </p>
                <h1
                  className={
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] mb-6'
                  }
                >
                  {t(
                    'landing.heroTitle',
                    { tagline: APP_TAGLINE },
                    { defaultValue: '{{tagline}}' },
                  )}
                </h1>
                <p className={'text-lg text-on-surface-variant max-w-xl leading-relaxed mb-10'}>
                  {t(
                    'landing.heroSubtitle',
                    {},
                    {
                      defaultValue:
                        'See a board-certified clinician in minutes. Records, vitals, and prescriptions, all in one calm place.',
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    className={
                      'inline-flex items-center gap-2 px-8 py-4 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors'
                    }
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Book a visit' })}
                    <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                      arrow_forward
                    </span>
                  </Link>
                  <Link
                    to="/login"
                    className={
                      'px-8 py-4 font-semibold rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors'
                    }
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>
              </div>

              {/* Sample provider hero card */}
              <div className={'lg:col-span-5'}>
                <div
                  className={
                    'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-primary/20'
                  }
                  style={{
                    backgroundColor: 'var(--color-hero-surface, #0f2937)',
                    minHeight: '420px',
                  }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle at 25% 30%, color-mix(in srgb, var(--color-primary) 45%, transparent) 0%, transparent 40%),' +
                        'radial-gradient(circle at 70% 70%, color-mix(in srgb, var(--color-accent) 30%, transparent) 0%, transparent 35%),' +
                        'linear-gradient(135deg, var(--color-hero-surface, #0f2937) 0%, var(--color-hero-surface-end, #134e4a) 100%)',
                    }}
                    aria-hidden="true"
                  />
                  <svg
                    className={'absolute left-0 right-0 top-1/2 -translate-y-1/2 w-full opacity-30'}
                    style={{ color: 'var(--color-accent)' }}
                    height="60"
                    viewBox="0 0 600 60"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M0,30 L150,30 L160,15 L170,45 L180,5 L190,45 L200,30 L350,30 L360,15 L370,45 L380,5 L390,45 L400,30 L600,30"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    />
                  </svg>

                  <div className={'relative z-10 p-7 flex flex-col justify-between min-h-[420px]'}>
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <span className={'relative flex h-3 w-3'}>
                        <span
                          className={
                            'absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping'
                          }
                        />
                        <span
                          className={'relative inline-flex rounded-full h-3 w-3 bg-emerald-400'}
                        />
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-300">
                        Available now · 4 min wait
                      </span>
                    </div>

                    <div
                      className={
                        'bg-surface text-on-surface rounded-2xl p-4 my-4 shadow-2xl shadow-black/20'
                      }
                    >
                      <div className={'flex items-start gap-3'}>
                        <div
                          className={
                            'w-14 h-14 rounded-full flex items-center justify-center text-on-primary font-bold shrink-0'
                          }
                          style={{
                            background:
                              'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)',
                          }}
                          aria-hidden="true"
                        >
                          MC
                        </div>
                        <div className={'flex-1 min-w-0'}>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                            Internal medicine
                          </p>
                          <h3 className={'text-base font-extrabold tracking-tight'}>
                            Dr. Mira Chen
                          </h3>
                          <p className={'text-[11px] text-on-surface-variant mt-1'}>
                            12 yrs · 1,800+ visits · 4.9 ★
                          </p>
                        </div>
                        <span
                          className={
                            'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-success/10 text-success shrink-0'
                          }
                        >
                          In
                        </span>
                      </div>
                      <div className={'grid grid-cols-3 gap-2 mt-3 text-center'}>
                        <div className={'bg-success/10 rounded-lg p-2'}>
                          <p className="text-[9px] font-bold text-on-surface-variant uppercase">
                            BP
                          </p>
                          <p
                            className={'text-sm font-mono font-extrabold tabular-nums text-success'}
                          >
                            118/76
                          </p>
                        </div>
                        <div className={'bg-success/10 rounded-lg p-2'}>
                          <p className="text-[9px] font-bold text-on-surface-variant uppercase">
                            HR
                          </p>
                          <p
                            className={'text-sm font-mono font-extrabold tabular-nums text-success'}
                          >
                            68
                          </p>
                        </div>
                        <div className={'bg-success/10 rounded-lg p-2'}>
                          <p className="text-[9px] font-bold text-on-surface-variant uppercase">
                            SpO2
                          </p>
                          <p
                            className={'text-sm font-mono font-extrabold tabular-nums text-success'}
                          >
                            98%
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-teal-300/80">
                        Next visit
                      </p>
                      <p className={'text-2xl font-extrabold mt-1'}>Today, 2:30 PM</p>
                    </div>
                  </div>
                  <div
                    className={
                      'absolute -right-16 -bottom-16 w-48 h-48 rounded-full bg-teal-500/20 blur-3xl'
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-12')}>
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 md:grid-cols-4')}>
            {TRUST_STATS.map((s) => (
              <div
                key={s.key}
                className={
                  'bg-surface-container-lowest rounded-2xl p-6 text-center hover:shadow-lg transition-shadow'
                }
              >
                <p
                  className={
                    'text-3xl md:text-4xl font-extrabold tracking-tight text-primary tabular-nums'
                  }
                >
                  {s.value}
                </p>
                <p
                  className={
                    'text-xs font-bold uppercase tracking-widest text-on-surface-variant mt-2'
                  }
                >
                  {t(`landing.stat.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Feature grid */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <h2 className={'mb-12 text-center text-3xl md:text-4xl font-extrabold tracking-tight'}>
            {t('landing.featuresHeading', {}, { defaultValue: 'Care that travels with you' })}
          </h2>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={
                  'bg-surface-container-lowest rounded-2xl p-6 hover:shadow-2xl hover:shadow-on-surface/5 transition-all group'
                }
              >
                <div
                  className={cm.cn(
                    'inline-flex p-3 bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
                    f.tint,
                  )}
                >
                  <span className="material-symbols-outlined text-3xl" aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3 className={'text-lg font-bold mt-5 mb-2'}>
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={'text-sm text-on-surface-variant leading-relaxed'}>
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={'border-t border-outline-variant/40'}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3 className={'text-3xl font-extrabold tracking-tight mb-4'}>
              {t('landing.ctaHeading', {}, { defaultValue: 'Visit a doctor today' })}
            </h3>
            <p className={'text-base text-on-surface-variant max-w-xl mx-auto mb-8'}>
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'No commute. No waiting room. Most insurance accepted; cash visits start at $59.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={
                'inline-flex items-center gap-2 px-10 py-4 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors'
              }
            >
              {t('landing.heroCta', {}, { defaultValue: 'Book a visit' })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer
        className={
          'py-8 text-center text-sm bg-surface text-on-surface-variant border-t border-outline-variant'
        }
      >
        <p>
          {t(
            'common.copyrightBuiltWithMolecule',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '© {{year}} {{app}}. Built with Molecule.' },
          )}
        </p>
      </footer>
    </div>
  )
}
