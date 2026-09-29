import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'

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

const FOOTER_LINKS = [
  { to: '/pricing', key: 'nav.pricing', defaultLabel: 'Pricing' },
  { to: '/about', key: 'nav.about', defaultLabel: 'About' },
  { to: '/privacy', key: 'nav.privacy', defaultLabel: 'Privacy Policy' },
  { to: '/terms', key: 'nav.terms', defaultLabel: 'Terms of Service' },
  { to: '/login', key: 'auth.login.signInButton', defaultLabel: 'Sign in' },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  const ctaClass = 'bg-primary text-on-primary rounded hover:bg-primary-hover transition-colors'

  return (
    <div
      className={cm.cn(
        'bg-surface-muted text-on-surface antialiased selection:bg-primary selection:text-on-primary',
      )}
    >
      <nav
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 4),
          'fixed top-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-md border-b border-surface-divider shadow-sm',
        )}
      >
        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'max-w-7xl mx-auto')}
        >
          <BrandWordmark size="md" />
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'hidden md:flex gap-6')}>
            <a
              href="#features"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('nav.features', {}, { defaultValue: 'Features' })}
            </a>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            <Link
              to="/about"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
          </div>
          <div
            className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'flex items-center gap-4')}
          >
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-mol-id="nav-go-to-dashboard"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  ctaClass,
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
                    cm.fontWeight('medium'),
                    'hidden md:block text-on-surface-variant hover:text-primary transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    ctaClass,
                  )}
                >
                  {t('common.startFree', {}, { defaultValue: 'Get started' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className={cm.cn('pt-24 pb-20')}>
        {/* Hero */}
        <section
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 12),
            'max-w-7xl mx-auto md:py-24 grid md:grid-cols-2 gap-12 items-center',
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), 'max-w-xl')}>
            <h1
              className={cm.cn(
                'text-5xl md:text-6xl font-extrabold tracking-tight leading-tight text-on-surface',
              )}
            >
              {t('forja.landing.hero.title1', {}, { defaultValue: 'Forge your' })}{' '}
              <span className={cm.cn('text-primary')}>
                {t('forja.landing.hero.title2', {}, { defaultValue: 'strongest' })}
              </span>{' '}
              {t('forja.landing.hero.title3', {}, { defaultValue: 'self.' })}
            </h1>
            <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant mb-8 leading-relaxed')}>
              {t(
                'forja.landing.hero.body',
                {},
                {
                  defaultValue:
                    'A pure strength-training tracker built around sets, reps, and PRs — no calorie tracking, no social feed, just the lift.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'md' }),
                'flex-col sm:flex-row gap-4',
              )}
            >
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  cm.textSize('base'),
                  ctaClass,
                  'text-center',
                )}
              >
                {t('forja.landing.hero.primary', {}, { defaultValue: 'Start your first workout' })}
              </Link>
              <a
                href="#features"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.fontWeight('medium'),
                  cm.textSize('base'),
                  'rounded text-center bg-surface border border-outline hover:border-on-surface-variant text-on-surface transition-colors',
                )}
              >
                {t('forja.landing.hero.secondary', {}, { defaultValue: 'See a sample workout' })}
              </a>
            </div>
          </div>

          {/* Phone mockup — the design's live-workout frame */}
          <div className="relative flex justify-center">
            <div
              className="w-full max-w-sm bg-surface rounded-[2rem] shadow-2xl border-8 border-on-surface overflow-hidden relative"
              style={{ aspectRatio: '9 / 19', maxHeight: 640 }}
              data-mol-id="landing-hero-mockup"
            >
              <div className="bg-primary text-on-primary p-4 flex justify-between items-center">
                <span className={cm.fontWeight('semibold')}>
                  {t('forja.landing.mock.title', {}, { defaultValue: 'Squat Day' })}
                </span>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    'flex items-center gap-2 tabular-nums',
                  )}
                >
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">
                    timer
                  </span>
                  <span>{t('forja.landing.mock.timer', {}, { defaultValue: '01:45' })}</span>
                </div>
              </div>
              <div className="p-4 bg-surface-muted">
                <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'mb-2')}>
                  {t('forja.landing.mock.exercise', {}, { defaultValue: 'Barbell Back Squat' })}
                </h3>
                <div className="space-y-2 mb-6">
                  {[
                    { set: '1', weight: '315', reps: '5', done: true, pr: false },
                    { set: '2', weight: '315', reps: '5', done: true, pr: false },
                    { set: '3', weight: '325', reps: '3', done: false, pr: true },
                  ].map((s) => (
                    <div
                      key={s.set}
                      className={cm.cn(
                        'flex items-center justify-between bg-surface p-3 rounded-lg shadow-sm',
                        s.pr
                          ? 'border border-primary relative overflow-hidden'
                          : 'border border-surface-divider',
                      )}
                    >
                      {s.pr ? (
                        <span className="absolute top-0 right-0 bg-primary text-on-primary text-[10px] font-bold px-2 py-0.5 rounded-bl">
                          {t('forja.landing.mock.pr', {}, { defaultValue: 'PR' })}
                        </span>
                      ) : null}
                      <span
                        className={cm.cn('text-on-surface-variant font-medium w-6 text-center')}
                      >
                        {s.set}
                      </span>
                      <span
                        className={cm.cn(
                          'tabular-nums w-12 text-right',
                          cm.fontWeight(s.pr ? 'bold' : 'semibold'),
                          // text-safe primary — raw #e05030 is 3.92:1 on white
                          s.pr ? 'text-primary-text' : '',
                        )}
                      >
                        {s.weight}
                      </span>
                      <span className="text-on-surface-variant text-sm">
                        {t('forja.landing.mock.lbs', {}, { defaultValue: 'lbs' })}
                      </span>
                      <span className={cm.cn('tabular-nums font-semibold w-8 text-right')}>
                        {s.reps}
                      </span>
                      <span className="text-on-surface-variant text-sm">
                        {t('forja.landing.mock.reps', {}, { defaultValue: 'reps' })}
                      </span>
                      {s.done ? (
                        <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
                          <span
                            className="material-symbols-outlined text-primary text-sm"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                            aria-hidden="true"
                          >
                            check
                          </span>
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded border border-outline" aria-hidden="true" />
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="w-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-medium py-2 rounded text-sm transition-colors"
                >
                  {t('forja.landing.mock.addSet', {}, { defaultValue: 'Add Set' })}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Stat band */}
        <section className="bg-accent text-on-accent w-full py-12 mb-20">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { value: '3.2M', key: 'sets', defaultLabel: 'sets logged' },
              { value: '47k', key: 'prs', defaultLabel: 'PRs broken' },
              { value: '128k', key: 'streaks', defaultLabel: 'streaks active' },
            ].map((s) => (
              <div key={s.key} className="flex flex-col items-center">
                <span className="font-extrabold text-4xl mb-2 tabular-nums">{s.value}</span>
                <span className="text-on-accent/70 font-medium text-lg">
                  {t(`forja.landing.proof.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                </span>
                <div className="w-8 h-1 bg-primary rounded-full mt-3" aria-hidden="true" />
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className={cm.cn(cm.sp('px', 6), cm.sp('py', 16), 'bg-surface-muted')}
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
                  // text-safe primary — #e05030 on #fafafa is 3.75:1 (axe fail)
                  'font-bold uppercase tracking-[0.32em] text-primary-text',
                )}
              >
                {t('forja.landing.features.eyebrow', {}, { defaultValue: 'The toolkit' })}
              </span>
              <h2
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-4xl md:text-5xl tracking-tight text-on-surface',
                )}
              >
                {t(
                  'forja.landing.features.heading',
                  {},
                  { defaultValue: 'Strength data, no spreadsheets.' },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
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
                    'bg-surface rounded-xl border border-surface-divider shadow-sm hover:border-primary/40 transition-colors group',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.sp('mb', 6),
                      'w-14 h-14 bg-primary/15 rounded-full text-primary group-hover:scale-110 transition-transform',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cm.cn('material-symbols-outlined text-3xl')}
                    >
                      {f.icon}
                    </span>
                  </div>
                  <h3
                    className={cm.cn(
                      cm.textSize('xl'),
                      cm.fontWeight('bold'),
                      cm.sp('mb', 2),
                      'text-on-surface',
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
          </div>
        </section>

        {/* Closing CTA */}
        <section
          className={cm.cn(cm.sp('px', 6), cm.sp('py', 16), 'max-w-4xl mx-auto text-center')}
        >
          <div
            className={cm.cn(
              cm.sp('p', 12),
              'bg-accent text-on-accent rounded-xl shadow-xl relative overflow-hidden',
            )}
          >
            <div
              className={cm.cn(
                'absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-3xl',
              )}
              aria-hidden="true"
            />
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), 'relative z-10')}>
              <h2
                className={cm.cn(cm.fontWeight('extrabold'), 'text-4xl md:text-5xl tracking-tight')}
              >
                {t('forja.landing.cta.title', {}, { defaultValue: 'Pick the bar up.' })}
              </h2>
              <p className={cm.cn(cm.textSize('xl'), 'text-on-accent/80 max-w-xl mx-auto')}>
                {t(
                  'forja.landing.cta.body',
                  {},
                  {
                    defaultValue:
                      'Free forever for lifters tracking up to 5 templates. Pro unlocks 500 workouts, advanced progression, and CSV export.',
                  },
                )}
              </p>
              <div className={cm.flex({ justify: 'center', gap: 'sm' })}>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 3),
                    cm.fontWeight('semibold'),
                    ctaClass,
                    'shadow-lg',
                  )}
                >
                  {t('forja.landing.cta.primary', {}, { defaultValue: 'Create free account' })}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-accent border-t border-on-accent/5">
        <div className="flex flex-col items-center py-16 px-8 text-center w-full max-w-7xl mx-auto">
          <span
            className="wordmark-outline text-8xl font-black tracking-tighter mb-8 block select-none"
            aria-hidden="true"
          >
            {APP_NAME.toUpperCase()}
          </span>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12 w-full text-left md:text-center justify-items-center text-xs uppercase tracking-widest">
            {FOOTER_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="text-on-accent/60 hover:text-primary transition-colors"
              >
                {t(l.key, {}, { defaultValue: l.defaultLabel })}
              </Link>
            ))}
          </div>
          <p className="text-on-accent/50 mt-8 text-xs">
            {t(
              'forja.landing.footer.tagline',
              { appName: APP_NAME, tagline: APP_TAGLINE },
              { defaultValue: '© {{appName}} — {{tagline}}.' },
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
        </div>
      </footer>
    </div>
  )
}
