import { Link, Navigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

const FEATURES = [
  {
    key: 'today',
    defaultTitle: 'Today, focused',
    defaultBody: 'See exactly what matters today. Quick-add anywhere with the ⌘K command palette.',
    icon: 'today',
    tint: 'text-primary',
  },
  {
    key: 'projects',
    defaultTitle: 'Projects + sections',
    defaultBody: 'Group tasks under projects and sections. Drag to reorder; nothing gets lost.',
    icon: 'folder',
    tint: 'text-warning',
  },
  {
    key: 'recurring',
    defaultTitle: 'Recurring & reminders',
    defaultBody:
      'Daily, weekly, monthly — or natural-language ("every Tue at 3pm"). Push reminders.',
    icon: 'event_repeat',
    tint: 'text-success',
  },
  {
    key: 'labels',
    defaultTitle: 'Labels & priorities',
    defaultBody:
      'Three priority tiers, unlimited labels. Filter by combinations across all projects.',
    icon: 'label',
    tint: 'text-pink-500',
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { isAuthenticated, state } = useAuth()

  // Once auth has hydrated, signed-in visitors land in the app, not the
  // marketing page. Without this, post-signup/login navigations to "/"
  // dump authenticated users back into the public landing instead of
  // /today, making the product feel broken.
  if (state.initialized && isAuthenticated) {
    return <Navigate to="/today" replace />
  }

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={cm.cn(
          'sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/40',
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
          <Link to="/" className={cm.cn('text-xl font-extrabold tracking-tight')}>
            {APP_NAME}
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <Link
              to="/pricing"
              className={cm.cn('text-sm font-medium text-on-surface-variant hover:text-on-surface')}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            <Link
              to="/login"
              className={cm.cn('text-sm font-medium text-on-surface-variant hover:text-on-surface')}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
            <Link
              to="/signup"
              className={cm.cn(
                'px-5 py-2 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors',
              )}
            >
              {t('common.getStarted', {}, { defaultValue: 'Get started' })}
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — indigo-violet wash with sample task list */}
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn('absolute inset-0 pointer-events-none')}
            style={{
              backgroundImage:
                'radial-gradient(circle at 25% 30%, rgba(79, 70, 229, 0.20), transparent 50%),' +
                'radial-gradient(circle at 78% 60%, rgba(192, 38, 211, 0.15), transparent 45%)',
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
            <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-12 items-center')}>
              <div className={cm.cn('lg:col-span-7')}>
                <p
                  className={cm.cn('text-sm font-bold uppercase tracking-widest text-primary mb-4')}
                >
                  {t('landing.eyebrow', {}, { defaultValue: 'Focused task manager' })}
                </p>
                <h1
                  className={cm.cn(
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] mb-6',
                  )}
                >
                  {t(
                    'landing.heroTitle',
                    { tagline: APP_TAGLINE },
                    { defaultValue: '{{tagline}}' },
                  )}
                </h1>
                <p
                  className={cm.cn(
                    'text-lg text-on-surface-variant max-w-xl leading-relaxed mb-10',
                  )}
                >
                  {t(
                    'landing.heroSubtitle',
                    {},
                    {
                      defaultValue:
                        'A lightweight task manager built for the days that need momentum. Quick add, projects, recurring tasks, focus mode.',
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      'inline-flex items-center gap-2 px-8 py-4 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors',
                    )}
                  >
                    {t('common.startFree', {}, { defaultValue: 'Start free' })}
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      arrow_forward
                    </span>
                  </Link>
                  <Link
                    to="/login"
                    className={cm.cn(
                      'px-8 py-4 font-semibold rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors',
                    )}
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>
              </div>

              {/* Sample task list card with progress ring */}
              <div className={cm.cn('lg:col-span-5')}>
                <div
                  className={cm.cn(
                    'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-primary/20',
                  )}
                  style={{
                    background:
                      'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #be185d 100%)' /* #ec4899 was 3.53:1 (FAIL); #be185d = 6.04:1 */,
                    minHeight: '420px',
                  }}
                >
                  <div
                    className={cm.cn(
                      'absolute -right-16 -bottom-16 w-56 h-56 rounded-full bg-surface/15 blur-3xl',
                    )}
                  />
                  <div
                    className={cm.cn(
                      'absolute right-12 top-12 w-20 h-20 rounded-full bg-pink-400/40 blur-2xl',
                    )}
                  />

                  <div
                    className={cm.cn(
                      'relative z-10 p-7 flex flex-col justify-between min-h-[420px]',
                    )}
                  >
                    <div className={cm.cn('flex items-center justify-between')}>
                      <span
                        className={cm.cn(
                          'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface/20 backdrop-blur-md',
                        )}
                      >
                        Today
                      </span>
                      <span
                        className={cm.cn(
                          'inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-amber-400/30 backdrop-blur-md text-amber-100',
                        )}
                      >
                        <span
                          className={cm.cn('material-symbols-outlined text-sm')}
                          aria-hidden="true"
                        >
                          local_fire_department
                        </span>
                        12-day streak
                      </span>
                    </div>

                    <div className={cm.cn('flex items-center gap-5 my-4')}>
                      <div className={cm.cn('relative w-28 h-28 shrink-0')}>
                        <svg
                          className={cm.cn('w-full h-full -rotate-90')}
                          viewBox="0 0 100 100"
                          aria-hidden="true"
                        >
                          <circle
                            cx="50"
                            cy="50"
                            r="44"
                            fill="none"
                            stroke="rgba(255,255,255,0.18)"
                            strokeWidth="8"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="44"
                            fill="none"
                            stroke="white"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray="276"
                            strokeDashoffset="138"
                          />
                        </svg>
                        <div
                          className={cm.cn(
                            'absolute inset-0 flex flex-col items-center justify-center',
                          )}
                        >
                          <p className={cm.cn('text-2xl font-extrabold tabular-nums')}>50%</p>
                          <p
                            className={cm.cn(
                              'text-[8px] font-bold uppercase tracking-widest text-white/70',
                            )}
                          >
                            done
                          </p>
                        </div>
                      </div>
                      <div className={cm.cn('flex-1 min-w-0')}>
                        <p className={cm.cn('text-3xl font-extrabold tracking-tight')}>3 left</p>
                        <p className={cm.cn('text-[11px] opacity-80 mt-1')}>
                          3 of 6 today, 1 overdue
                        </p>
                      </div>
                    </div>

                    <div
                      className={cm.cn(
                        'bg-surface/15 backdrop-blur-md rounded-2xl divide-y divide-white/10',
                      )}
                    >
                      {[
                        {
                          title: 'Review the launch runbook',
                          priority: 'P1',
                          done: false,
                          label: 'work',
                        },
                        { title: 'Pay April rent', priority: 'P2', done: false, label: 'home' },
                        { title: '30 minute walk', priority: 'P4', done: true, label: 'health' },
                      ].map((t, i) => (
                        <div key={i} className={cm.cn('flex items-center gap-3 px-3 py-2.5')}>
                          <span
                            className={cm.cn(
                              'w-4 h-4 rounded-full ring-2 ring-offset-1 flex items-center justify-center text-[10px]',
                              t.done
                                ? 'bg-emerald-400 ring-emerald-400 text-on-surface'
                                : 'ring-white/40 bg-transparent',
                            )}
                          >
                            {t.done && '✓'}
                          </span>
                          <span
                            className={cm.cn(
                              'text-[12px] font-medium flex-1 truncate',
                              t.done && 'line-through opacity-60',
                            )}
                          >
                            {t.title}
                          </span>
                          <span className={cm.cn('text-[9px] font-bold opacity-70')}>
                            {t.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <h2
            className={cm.cn(
              'mb-12 text-center text-3xl md:text-4xl font-extrabold tracking-tight',
            )}
          >
            {t('landing.featuresHeading', {}, { defaultValue: 'Built for momentum' })}
          </h2>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  'bg-surface-container-lowest rounded-2xl p-6 hover:shadow-2xl hover:shadow-on-surface/5 transition-all group',
                )}
              >
                <div
                  className={cm.cn(
                    'inline-flex p-3 bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
                    f.tint,
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-3xl')} aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3 className={cm.cn('text-lg font-bold mt-5 mb-2')}>
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn('text-sm text-on-surface-variant leading-relaxed')}>
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={cm.cn('border-t border-outline-variant/40')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3 className={cm.cn('text-3xl font-extrabold tracking-tight mb-4')}>
              {t('landing.ctaHeading', {}, { defaultValue: 'Master your momentum' })}
            </h3>
            <p className={cm.cn('text-base text-on-surface-variant max-w-xl mx-auto mb-8')}>
              {t(
                'landing.ctaBody',
                {},
                { defaultValue: 'Free forever for personal use. Pro plan when you grow.' },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                'inline-flex items-center gap-2 px-10 py-4 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors',
              )}
            >
              {t('common.startFree', {}, { defaultValue: 'Start free' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn(
          'py-8 text-center text-sm bg-surface text-on-surface-variant border-t border-outline-variant',
        )}
      >
        <p>
          {t(
            'common.copyrightBuiltWithMolecule',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '© {{year}} {{app}}' },
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
      </footer>
    </div>
  )
}
