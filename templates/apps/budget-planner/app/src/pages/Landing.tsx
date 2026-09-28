import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { loadContent } from '../config.js'

const FEATURES = [
  {
    key: 'envelopes',
    icon: 'savings',
    defaultTitle: 'Envelope budgeting',
    defaultBody:
      'Give every dollar a job. Assign income to categories before the month begins so you spend on purpose, not by accident.',
  },
  {
    key: 'goals',
    icon: 'flag',
    defaultTitle: 'Goal tracking',
    defaultBody:
      'Save toward emergencies, vacations, and big purchases with monthly contribution targets and visible progress.',
  },
  {
    key: 'reports',
    icon: 'bar_chart',
    defaultTitle: 'Spending insight',
    defaultBody:
      'Trend lines and category breakdowns answer where the money actually went — not just where you thought it did.',
  },
  {
    key: 'import',
    icon: 'upload_file',
    defaultTitle: 'CSV import',
    defaultBody:
      'Drag in statements from any bank — {{appName}} dedupes, maps payees, and applies category rules automatically.',
  },
] as const

/* Decorative envelope rows for the hero mockup card (mirrors the Stitch
   design: "Available to budget" header + two funded envelopes). */
const ENVELOPES = [
  {
    key: 'groceries',
    icon: 'shopping_cart',
    iconClass: 'text-tertiary',
    nameKey: 'landing.mock.envelope1',
    defaultName: 'Groceries',
    amount: '$400.00',
    noteKey: 'landing.mock.leftToSpend',
    defaultNote: 'Left to spend',
    progress: 60,
  },
  {
    key: 'rent',
    icon: 'home',
    iconClass: 'text-primary',
    nameKey: 'landing.mock.envelope2',
    defaultName: 'Rent & Utilities',
    amount: '$0.00',
    noteKey: 'landing.mock.funded',
    defaultNote: 'Funded',
    progress: 100,
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      {/* Top nav bar */}
      <nav
        className={cm.cn(
          'sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            'h-16',
            cm.flex({ align: 'center', justify: 'between' }),
            cm.mxAuto,
          )}
        >
          <Link to="/" className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span
              className={cm.cn(
                cm.w(8),
                cm.h(8),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'bg-primary text-white',
              )}
              aria-hidden="true"
            >
              <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>savings</span>
            </span>
            <span className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tracking-tight')}>
              {APP_NAME}
            </span>
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors',
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
                    'text-primary hover:text-primary-hover transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('medium'),
                    cm.textSize('sm'),
                    'rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors',
                  )}
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Start budgeting' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — split panel: copy + envelope-budget mockup */}
        <section className={cm.cn(cm.sp('py', 20), cm.sp('px', 6))}>
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.sp('px', 6),
              cm.mxAuto,
              cm.flex({ direction: 'col', align: 'center', gap: 'xl' }),
              'md:flex-row',
            )}
          >
            <div className={cm.cn('md:w-1/2 space-y-8')}>
              <h1
                className={cm.cn(
                  'text-5xl md:text-[56px] leading-tight font-extrabold text-on-surface tracking-tight',
                )}
              >
                {t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}' })}
              </h1>
              <p className={cm.cn(cm.textSize('xl'), 'text-on-surface-variant max-w-lg')}>
                {t(
                  'landing.heroSubtitle',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      'A zero-based budget app that gives every dollar a job. Precise control for your peace of mind.',
                  },
                )}
              </p>
              <div
                className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'flex-col sm:flex-row')}
              >
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    cm.fontWeight('medium'),
                    cm.textSize('base'),
                    'rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors text-center shadow-sm inline-flex items-center gap-2',
                  )}
                >
                  {t('landing.heroCta', {}, { defaultValue: 'Get started — free' })}
                  <span className="material-symbols-outlined" aria-hidden="true">
                    arrow_forward
                  </span>
                </Link>
                <Link
                  to="/pricing"
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    cm.fontWeight('medium'),
                    cm.textSize('base'),
                    'rounded-lg border border-outline-variant text-primary hover:bg-primary/5 transition-colors text-center',
                  )}
                >
                  {t('landing.heroSecondaryCta', {}, { defaultValue: 'See how it works' })}
                </Link>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'lg' }),
                  'flex-wrap text-on-surface-variant text-sm',
                )}
              >
                <span className={cm.flex({ align: 'center', gap: 'xs' })}>
                  <span className={cm.cn('material-symbols-outlined text-success text-base')}>
                    check_circle
                  </span>
                  {t('landing.proof1', {}, { defaultValue: 'No ads, ever' })}
                </span>
                <span className={cm.flex({ align: 'center', gap: 'xs' })}>
                  <span className={cm.cn('material-symbols-outlined text-success text-base')}>
                    check_circle
                  </span>
                  {t('landing.proof2', {}, { defaultValue: 'Bank-grade encryption' })}
                </span>
                <span className={cm.flex({ align: 'center', gap: 'xs' })}>
                  <span className={cm.cn('material-symbols-outlined text-success text-base')}>
                    check_circle
                  </span>
                  {t('landing.proof3', {}, { defaultValue: '34,000+ households' })}
                </span>
              </div>
            </div>

            {/* Envelope-budget mockup — "Available to budget" + funded envelopes */}
            <div className="md:w-1/2 w-full">
              <div
                className={cm.cn(
                  cm.position('relative'),
                  'bg-surface-secondary border border-outline-variant rounded-xl p-6 shadow-xl overflow-hidden',
                )}
              >
                <div
                  aria-hidden="true"
                  className="absolute top-0 left-0 w-full h-2"
                  style={{
                    background:
                      'linear-gradient(90deg, var(--color-secondary), var(--color-primary))',
                  }}
                />
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('mb', 6),
                  )}
                >
                  <div>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        'text-on-surface-variant font-medium uppercase tracking-wider',
                      )}
                    >
                      {t(
                        'landing.mock.availableLabel',
                        {},
                        { defaultValue: 'Available to budget' },
                      )}
                    </p>
                    <p
                      className={cm.cn(
                        'text-3xl font-bold text-primary-dark tabular-nums',
                        cm.sp('mt', 1),
                      )}
                    >
                      $1,240.00
                    </p>
                  </div>
                  <div
                    className={cm.cn(
                      'h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary',
                    )}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined">account_balance_wallet</span>
                  </div>
                </div>
                <div className={cm.cn('space-y-4')}>
                  {ENVELOPES.map((env) => (
                    <div
                      key={env.key}
                      className={cm.cn(
                        'bg-surface p-4 rounded-lg border border-outline-variant/50 shadow-sm',
                        cm.flex({ align: 'center', justify: 'between' }),
                      )}
                    >
                      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                        <span
                          className={cm.cn('material-symbols-outlined', env.iconClass)}
                          aria-hidden="true"
                        >
                          {env.icon}
                        </span>
                        <div>
                          <p className={cm.cn(cm.fontWeight('medium'))}>
                            {t(env.nameKey, {}, { defaultValue: env.defaultName })}
                          </p>
                          <div
                            className={cm.cn(
                              'w-32 h-1.5 bg-surface-container rounded-full',
                              cm.sp('mt', 2),
                            )}
                          >
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${env.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className={cm.textRight}>
                        <p className={cm.cn(cm.fontWeight('medium'), 'tabular-nums')}>
                          {env.amount}
                        </p>
                        <p
                          className={cm.cn(
                            cm.textSize('xs'),
                            'text-on-surface-variant tabular-nums',
                            cm.sp('mt', 1),
                          )}
                        >
                          {t(env.noteKey, {}, { defaultValue: env.defaultNote })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature quad */}
        <section
          id="features"
          className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 16), cm.mxAuto)}
        >
          <div className={cm.cn('text-center max-w-2xl mx-auto mb-12 space-y-3')}>
            <p
              className={cm.cn(
                cm.fontWeight('extrabold'),
                'text-[11px] uppercase tracking-widest text-primary',
              )}
            >
              {t(
                'landing.featuresEyebrow',
                { appName: APP_NAME },
                { defaultValue: 'How {{appName}} works' },
              )}
            </p>
            <h2
              className={cm.cn(cm.fontWeight('extrabold'), 'text-3xl md:text-4xl tracking-tight')}
            >
              {t('landing.featuresTitle', {}, { defaultValue: 'A budget you can actually keep.' })}
            </h2>
          </div>
          <div className={cm.grid({ cols: 4, gap: 'md' })}>
            {FEATURES.map((f) => (
              <article
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-xl border border-outline-variant/40 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all',
                )}
              >
                <span
                  className={cm.cn(
                    cm.w(12),
                    cm.h(12),
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    'bg-primary/10 text-primary',
                  )}
                  aria-hidden="true"
                >
                  <span className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined')}>
                    {f.icon}
                  </span>
                </span>
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mt', 4))}>
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mt', 2),
                    'text-on-surface-variant leading-relaxed',
                  )}
                >
                  {t(
                    `landing.feature.${f.key}.body`,
                    { appName: APP_NAME },
                    { defaultValue: f.defaultBody },
                  )}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* CTA band — full-bleed brand gradient with email capture */}
        <section
          className="py-24 text-center px-6 w-full"
          style={{
            background:
              'linear-gradient(135deg, var(--color-primary-hover), var(--color-primary-dark))',
          }}
        >
          <div className={cm.cn('max-w-3xl mx-auto space-y-8')}>
            <h2 className={cm.cn('text-4xl font-bold text-on-primary')}>
              {t('landing.ctaTitle', {}, { defaultValue: 'Give every dollar a job' })}
            </h2>
            <p
              className={cm.cn(cm.textSize('lg'))}
              style={{
                color: 'color-mix(in srgb, var(--color-on-primary) 76%, var(--color-primary))',
              }}
            >
              {t(
                'landing.ctaBody',
                { appName: APP_NAME },
                {
                  defaultValue: `Join thousands of households taking control of their money with ${APP_NAME}.`,
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', justify: 'center', gap: 'md' }),
                'sm:flex-row max-w-md mx-auto',
              )}
            >
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder={t(
                  'landing.ctaEmailPlaceholder',
                  {},
                  { defaultValue: 'Your email address' },
                )}
                aria-label={t(
                  'landing.ctaEmailPlaceholder',
                  {},
                  { defaultValue: 'Your email address' },
                )}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-lg text-on-surface w-full bg-surface border-none focus:ring-2 focus:ring-tertiary focus:outline-none',
                )}
              />
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.fontWeight('medium'),
                  'rounded-lg text-white whitespace-nowrap transition-opacity hover:opacity-90 text-center',
                )}
                style={{ background: 'var(--color-tertiary)' }}
              >
                {t('landing.ctaButton', {}, { defaultValue: 'Start free' })}
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer — brand column + link groups on the tinted band */}
      <footer
        className={cm.cn(
          'w-full py-16 px-6 md:px-12 mt-24 bg-surface-secondary border-t border-outline-variant',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.grid({ cols: 1, gap: 'lg' }),
            'grid-cols-2 md:grid-cols-4',
          )}
        >
          <div className="col-span-2">
            <span
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('bold'),
                'text-primary-dark',
                cm.sp('mb', 4),
                'block',
              )}
            >
              {APP_NAME}
            </span>
            <p className={cm.cn('text-on-surface-variant', cm.sp('mt', 2), cm.textSize('sm'))}>
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
          </div>
          <div>
            <h4 className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface', cm.sp('mb', 4))}>
              {t('landing.footer.product', {}, { defaultValue: 'Product' })}
            </h4>
            <ul className="space-y-3 text-sm text-on-surface-variant">
              <li>
                <a href="#features" className="hover:text-primary transition-colors">
                  {t('landing.footer.features', {}, { defaultValue: 'Features' })}
                </a>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-primary transition-colors">
                  {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface', cm.sp('mb', 4))}>
              {t('landing.footer.legal', {}, { defaultValue: 'Legal' })}
            </h4>
            <ul className="space-y-3 text-sm text-on-surface-variant">
              <li>
                <Link to="/about" className="hover:text-primary transition-colors">
                  {t('nav.about', {}, { defaultValue: 'About' })}
                </Link>
              </li>
              <li className="flex flex-wrap gap-3">
                <LegalModalLinks
                  linkClassName="hover:text-primary transition-colors"
                  appName={APP_NAME}
                  loadContent={loadContent}
                  privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
                  termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
                />
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
