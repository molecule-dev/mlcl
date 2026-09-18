import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BalanceHeroCard } from '../components/BalanceHeroCard.js'
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

const SAMPLE_HISTORY = [
  { date: '2026-01-26', net_worth_cents: 6620000 },
  { date: '2026-02-04', net_worth_cents: 6740000 },
  { date: '2026-02-15', net_worth_cents: 6810000 },
  { date: '2026-02-26', net_worth_cents: 6870000 },
  { date: '2026-03-08', net_worth_cents: 6950000 },
  { date: '2026-03-19', net_worth_cents: 7000000 },
  { date: '2026-03-30', net_worth_cents: 7060000 },
  { date: '2026-04-09', net_worth_cents: 7110000 },
  { date: '2026-04-25', net_worth_cents: 7172210 },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      {/* §14.1 Top nav bar */}
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
            <span
              className={cm.cn(cm.textSize('xl'), cm.fontWeight('extrabold'), 'tracking-tight')}
            >
              {APP_NAME}
            </span>
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-full bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm hover:shadow-md',
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
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'rounded-full bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm hover:shadow-md',
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
        {/* §1.2 Marketing editorial hero + §14.4 social proof */}
        <section className={cm.cn(cm.sp('pt', 20), cm.sp('pb', 16))}>
          <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.mxAuto)}>
            <div className={cm.cn(cm.grid({ cols: 12, gap: 'lg' }), 'items-center')}>
              <div className={cm.cn('col-span-12 lg:col-span-7 space-y-6')}>
                <span
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.roundedFull,
                    'inline-flex items-center gap-2 bg-primary/10 text-primary text-[11px] font-extrabold uppercase tracking-widest',
                  )}
                >
                  <span className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}>
                    stars
                  </span>
                  {t('landing.eyebrow', {}, { defaultValue: 'Zero-based monthly budgeting' })}
                </span>
                <h1
                  className={cm.cn(
                    'text-5xl md:text-6xl lg:text-7xl tracking-tighter leading-[0.95] font-extrabold text-on-surface',
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
                    cm.textSize('xl'),
                    'text-on-surface-variant max-w-2xl leading-relaxed',
                  )}
                >
                  {t(
                    'landing.heroSubtitle',
                    { appName: APP_NAME },
                    {
                      defaultValue:
                        '{{appName}} is the envelope-budget app for households who plan their month before it spends them. Income in, jobs assigned, every category accounted for.',
                    },
                  )}
                </p>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'flex-wrap')}>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      cm.fontWeight('extrabold'),
                      cm.textSize('base'),
                      'rounded-full bg-primary text-white hover:bg-primary/90 shadow-md hover:shadow-lg transition-all inline-flex items-center gap-2',
                    )}
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Start budgeting free' })}
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </Link>
                  <Link
                    to="/login"
                    className={cm.cn(
                      cm.sp('px', 6),
                      cm.sp('py', 4),
                      cm.fontWeight('bold'),
                      cm.textSize('base'),
                      'rounded-full border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors',
                    )}
                  >
                    {t('landing.heroSecondaryCta', {}, { defaultValue: 'See your money' })}
                  </Link>
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'lg' }),
                    'flex-wrap pt-4 text-on-surface-variant text-sm',
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

              {/* Sample card mirrors the auth'd hero so a logged-out visitor sees what's inside */}
              <div className={cm.cn('col-span-12 lg:col-span-5')}>
                <BalanceHeroCard
                  monthLabel={t('landing.demoMonth', {}, { defaultValue: 'April' })}
                  availableCents={7200}
                  incomeCents={825600}
                  spentCents={396712}
                  assignedCents={818400}
                  netWorthChangeCents={184220}
                  history={SAMPLE_HISTORY}
                />
              </div>
            </div>
          </div>
        </section>

        {/* §14.2 Feature quad */}
        <section className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 16), cm.mxAuto)}>
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
                  'bg-surface-container-lowest rounded-2xl shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all',
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

        {/* CTA band */}
        <section className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 16), cm.mxAuto)}>
          <div
            className={cm.cn(
              cm.sp('p', 12),
              'rounded-[2rem] bg-gradient-to-br from-primary to-primary-container text-white text-center relative overflow-hidden',
            )}
          >
            <span
              className={cm.cn(
                cm.w(80),
                cm.h(80),
                cm.roundedFull,
                'absolute -right-32 -bottom-32 bg-surface/10 blur-3xl pointer-events-none',
              )}
              aria-hidden="true"
            />
            <h2
              className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight relative z-10')}
            >
              {t('landing.ctaTitle', {}, { defaultValue: 'Ready to give your dollars a job?' })}
            </h2>
            <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 3), 'text-white/85 relative z-10')}>
              {t('landing.ctaBody', {}, { defaultValue: 'Start a free month — no card required.' })}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 8),
                cm.sp('py', 4),
                cm.sp('mt', 8),
                cm.fontWeight('extrabold'),
                cm.textSize('base'),
                'inline-flex rounded-full bg-surface text-primary hover:bg-surface/90 shadow-md transition-all relative z-10',
              )}
            >
              {t('landing.ctaButton', {}, { defaultValue: 'Create your free account' })}
            </Link>
          </div>
        </section>
      </main>

      {/* §14.5 Marketing footer */}
      <footer
        className={cm.cn(
          cm.sp('py', 8),
          cm.textCenter,
          cm.textSize('sm'),
          'bg-surface border-t border-outline-variant text-on-surface-variant',
        )}
      >
        <p>
          {t(
            'common.copyrightBuiltWithMolecule',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '© {{year}} {{app}}. Built with Molecule.' },
          )}
        </p>
        <nav
          className={cm.cn(
            cm.flex({ wrap: 'wrap', align: 'center', justify: 'center', gap: 'md' }),
            cm.sp('mt', 3),
          )}
        >
          <Link
            to="/about"
            className={cm.cn(cm.fontWeight('semibold'), 'hover:text-on-surface transition-colors')}
          >
            {t('nav.about', {}, { defaultValue: 'About' })}
          </Link>
          <LegalModalLinks
            linkClassName={cm.cn(
              cm.fontWeight('semibold'),
              'hover:text-on-surface transition-colors',
            )}
            appName={APP_NAME}
            loadContent={loadContent}
            privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
          />
        </nav>
      </footer>
    </div>
  )
}
