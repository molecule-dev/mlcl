import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { WorkoutHeroCard } from '../components/WorkoutHeroCard.js'

interface FeatureCard {
  icon: string
  titleKey: string
  defaultTitle: string
  bodyKey: string
  defaultBody: string
}

const FEATURES: FeatureCard[] = [
  {
    icon: 'fitness_center',
    titleKey: 'forja.landing.features.sets.title',
    defaultTitle: 'Set-by-set logging',
    bodyKey: 'forja.landing.features.sets.body',
    defaultBody: 'Log every weight × reps with auto-suggested next-session targets.',
  },
  {
    icon: 'show_chart',
    titleKey: 'forja.landing.features.progression.title',
    defaultTitle: 'Progressive overload',
    bodyKey: 'forja.landing.features.progression.body',
    defaultBody: 'Per-exercise progression charts and 1RM estimates without spreadsheets.',
  },
  {
    icon: 'list_alt',
    titleKey: 'forja.landing.features.templates.title',
    defaultTitle: 'Templates that adapt',
    bodyKey: 'forja.landing.features.templates.body',
    defaultBody: 'Push/Pull/Legs, Upper/Lower, and custom splits with per-set rep schemas.',
  },
]

const SOCIAL_PROOF = [
  { value: '12.4M+', key: 'sets', defaultLabel: 'sets logged' },
  { value: '4.9 ★', key: 'rating', defaultLabel: 'App Store' },
  { value: '92,000', key: 'lifters', defaultLabel: 'lifters tracking' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div
      className={cm.cn(
        'bg-surface text-on-surface antialiased selection:bg-primary selection:text-on-primary',
      )}
    >
      <nav
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 4),
          'fixed top-0 inset-x-0 z-50 bg-surface/85 backdrop-blur-md border-b border-outline',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            'max-w-7xl mx-auto h-14',
          )}
        >
          <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined text-primary')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              fitness_center
            </span>
            <span className={cm.cn('text-2xl font-black text-primary tracking-tighter')}>
              {APP_NAME}
            </span>
          </Link>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'hidden md:flex')}>
            <a
              href="#features"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-on-surface-variant hover:text-primary transition-colors uppercase tracking-wide',
              )}
            >
              {t('nav.features', {}, { defaultValue: 'Features' })}
            </a>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-on-surface-variant hover:text-primary transition-colors uppercase tracking-wide',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            <Link
              to="/about"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-on-surface-variant hover:text-primary transition-colors uppercase tracking-wide',
              )}
            >
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-mol-id="nav-go-to-dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'bg-primary text-on-primary rounded-full hover:bg-primary-light transition-colors uppercase tracking-wide',
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
                    'text-on-surface-variant hover:text-primary transition-colors uppercase tracking-wide',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'bg-primary text-on-primary rounded-full hover:bg-primary-light transition-colors uppercase tracking-wide',
                  )}
                >
                  {t('common.startFree', {}, { defaultValue: 'Start free' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className={cm.cn('pt-24 pb-16')}>
        <section
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 12),
            'max-w-7xl mx-auto md:py-20 grid lg:grid-cols-2 gap-12 items-center',
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                'inline-flex w-fit rounded-full bg-pr-light text-pr-text font-black uppercase tracking-[0.22em]',
              )}
            >
              <span
                aria-hidden="true"
                className={cm.cn('material-symbols-outlined text-sm')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                local_fire_department
              </span>
              {t('forja.landing.hero.eyebrow', {}, { defaultValue: 'Built for serious lifters' })}
            </span>
            <h1
              className={cm.cn(
                'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] text-on-surface',
              )}
            >
              {t('forja.landing.hero.title1', {}, { defaultValue: 'Forge your' })}
              <br />
              <span className={cm.cn('text-primary')}>
                {t('forja.landing.hero.title2', {}, { defaultValue: 'strongest self.' })}
              </span>
            </h1>
            <p
              className={cm.cn(
                cm.textSize('xl'),
                'text-on-surface-variant max-w-lg leading-relaxed',
              )}
            >
              {t(
                'forja.landing.hero.body',
                {},
                {
                  defaultValue:
                    'A purpose-built strength tracker for lifters who care about progressive overload. Log every set, see every PR, never miss a rep.',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'sm:flex-row')}>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  cm.textSize('lg'),
                  'bg-primary text-on-primary rounded-full hover:bg-primary-light transition-colors shadow-lg shadow-primary/30 uppercase tracking-wide',
                )}
              >
                {t('forja.landing.hero.primary', {}, { defaultValue: 'Start logging — free' })}
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
                {t('forja.landing.hero.secondary', {}, { defaultValue: 'See how it works' })}
              </a>
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'lg' }),
                'flex-wrap text-on-surface-variant',
              )}
            >
              {SOCIAL_PROOF.map((s) => (
                <div key={s.key}>
                  <div
                    className={cm.cn(
                      'text-2xl font-extrabold text-on-surface tabular-nums tracking-tight',
                    )}
                  >
                    {s.value}
                  </div>
                  <div
                    className={cm.cn(cm.textSize('xs'), 'font-bold uppercase tracking-[0.18em]')}
                  >
                    {t(`forja.landing.proof.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <WorkoutHeroCard
            eyebrow={t('forja.landing.preview.eyebrow', {}, { defaultValue: 'Sample · This Week' })}
            totalVolume={42180}
            unit="kg"
            change={{ value: '+12.4%', direction: 'up' }}
            trend={[8200, 7400, 9100, 7980, 11250, 7640, 8420]}
            workouts={5}
            setsLogged={108}
          />
        </section>

        <section
          id="features"
          className={cm.cn(cm.sp('px', 6), cm.sp('py', 16), 'bg-accent text-white')}
        >
          <div className={cm.cn('max-w-7xl mx-auto')}>
            <div
              className={cm.cn(
                cm.textCenter,
                cm.sp('mb', 12),
                cm.flex({ direction: 'col', gap: 'sm' }),
                'max-w-2xl mx-auto',
              )}
            >
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-black uppercase tracking-[0.32em] text-primary-light',
                )}
              >
                {t('forja.landing.features.eyebrow', {}, { defaultValue: 'The toolkit' })}
              </span>
              <h2
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-4xl md:text-5xl tracking-tight text-white',
                )}
              >
                {t(
                  'forja.landing.features.heading',
                  {},
                  { defaultValue: 'Strength data, no spreadsheets.' },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('lg'), 'text-white/70')}>
                {t(
                  'forja.landing.features.body',
                  {},
                  {
                    defaultValue:
                      'Three tools you actually use: log sets, see progress, plan the next session.',
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
                    'bg-accent-container/50 backdrop-blur-sm rounded-2xl border border-surface/10 hover:border-primary/40 transition-colors group',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.sp('mb', 6),
                      'w-14 h-14 bg-primary/20 rounded-2xl text-primary group-hover:scale-110 transition-transform',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cm.cn('material-symbols-outlined text-3xl')}
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
                      'text-white',
                    )}
                  >
                    {t(f.titleKey, {}, { defaultValue: f.defaultTitle })}
                  </h3>
                  <p className={cm.cn('text-white/70 leading-relaxed')}>
                    {t(f.bodyKey, {}, { defaultValue: f.defaultBody })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          className={cm.cn(cm.sp('px', 6), cm.sp('py', 16), 'max-w-4xl mx-auto text-center')}
        >
          <div
            className={cm.cn(
              cm.sp('p', 12),
              'bg-gradient-to-br from-primary to-primary-dark rounded-3xl shadow-xl relative overflow-hidden',
            )}
          >
            <div
              className={cm.cn(
                'absolute -top-24 -right-24 w-64 h-64 bg-surface/10 rounded-full blur-3xl',
              )}
              aria-hidden="true"
            />
            <div
              className={cm.cn(
                'absolute -bottom-24 -left-24 w-64 h-64 bg-accent/30 rounded-full blur-3xl',
              )}
              aria-hidden="true"
            />
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'lg' }),
                'relative z-10 text-white',
              )}
            >
              <h2
                className={cm.cn(cm.fontWeight('extrabold'), 'text-4xl md:text-5xl tracking-tight')}
              >
                {t('forja.landing.cta.title', {}, { defaultValue: 'Pick the bar up.' })}
              </h2>
              <p className={cm.cn(cm.textSize('xl'), 'text-white/90 max-w-xl mx-auto')}>
                {t(
                  'forja.landing.cta.body',
                  {},
                  {
                    defaultValue:
                      'Free forever for lifters tracking up to 5 templates. Pro unlocks 500 workouts, advanced progression, and CSV export.',
                  },
                )}
              </p>
              <div className={cm.cn(cm.flex({ justify: 'center', gap: 'sm' }))}>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    'bg-surface text-primary-dark rounded-full hover:bg-surface/95 transition-colors shadow-lg uppercase tracking-wide',
                  )}
                >
                  {t('forja.landing.cta.primary', {}, { defaultValue: 'Create free account' })}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn(cm.sp('px', 6), cm.sp('py', 12), 'bg-accent border-t border-surface/10')}
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', justify: 'between', align: 'center', gap: 'lg' }),
            'max-w-7xl mx-auto md:flex-row',
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', align: 'center' }), 'md:items-start')}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                'text-2xl font-black text-primary tracking-tighter',
              )}
            >
              <span
                aria-hidden="true"
                className={cm.cn('material-symbols-outlined')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                fitness_center
              </span>
              {APP_NAME}
            </span>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'text-white/60 font-bold uppercase tracking-[0.22em] mt-2',
              )}
            >
              {t(
                'forja.landing.footer.tagline',
                { appName: APP_NAME, tagline: APP_TAGLINE },
                { defaultValue: '© {{appName}} — {{tagline}}.' },
              )}
            </p>
          </div>
          <div
            className={cm.cn(
              cm.flex({ gap: 'lg' }),
              cm.textSize('sm'),
              'text-white/70 font-semibold',
            )}
          >
            <Link to="/pricing" className={cm.cn('hover:text-primary transition-colors')}>
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            <Link to="/about" className={cm.cn('hover:text-primary transition-colors')}>
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
            <Link to="/login" className={cm.cn('hover:text-primary transition-colors')}>
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
            <Link to="/signup" className={cm.cn('hover:text-primary transition-colors')}>
              {t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
