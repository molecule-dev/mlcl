import { Link } from 'react-router'

import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { VellumPortfolioHero } from '../components/VellumPortfolioHero.js'
import { loadContent } from '../config.js'

const FEATURES = [
  {
    key: 'templates',
    icon: 'article',
    defaultTitle: 'Templates that don\u2019t age',
    defaultBody:
      'Clause-by-clause templates with version history. Roll out updates and watch what propagates.',
  },
  {
    key: 'esign',
    icon: 'edit_document',
    defaultTitle: 'E-signing in any seat',
    defaultBody:
      'Send for signature in two clicks. Track view, sign, and decline events with timestamped receipts.',
  },
  {
    key: 'audit',
    icon: 'shield',
    defaultTitle: 'Defensible audit trail',
    defaultBody: 'Every edit, send, view, and signature recorded for legal evidentiary use.',
  },
  {
    key: 'renewal',
    icon: 'event_repeat',
    defaultTitle: 'Never miss a renewal',
    defaultBody:
      'Auto-alerts at 90 / 60 / 30 / 15 days. Pipeline view rolls up by counterparty and amount.',
  },
] as const

const PROOF = [
  { key: 'gc', defaultLabel: 'General Counsel\u2019s Office' },
  { key: 'procurement', defaultLabel: 'Strategic Procurement' },
  { key: 'revops', defaultLabel: 'Revenue Operations' },
  { key: 'compliance', defaultLabel: 'Compliance & Risk' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  // Privacy/Terms open IN-PLACE modals (bonded legal HTML pre-loaded via
  // `loadContent`); the standalone `/privacy` + `/terms` routes still exist
  // for direct/deep links.
  const { openPrivacy, openTerms, modals } = useLegalModals({
    appName: APP_NAME,
    loadContent,
  })

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface antialiased')}>
      <nav
        className={'sticky top-0 z-50 border-b border-outline-variant bg-surface/95 backdrop-blur'}
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
          <Link
            to="/"
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('extrabold'),
              'tracking-tight text-on-surface',
            )}
          >
            {APP_NAME}
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-on-surface-variant hover:text-on-surface',
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
                  'rounded-full bg-gradient-to-br from-sidebar-bg to-[var(--mol-color-primary)] text-white shadow-md transition-transform hover:-translate-y-0.5',
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
                    'text-on-surface-variant hover:text-on-surface',
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
                    'rounded-full bg-gradient-to-br from-sidebar-bg to-[var(--mol-color-primary)] text-white shadow-md transition-transform hover:-translate-y-0.5',
                  )}
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Request demo' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className={
              'pointer-events-none absolute -right-32 -top-40 h-[28rem] w-[28rem] rounded-full bg-[var(--mol-color-primary)]/10 blur-3xl'
            }
          />
          <div
            aria-hidden="true"
            className={
              'pointer-events-none absolute -left-32 top-40 h-[24rem] w-[24rem] rounded-full bg-[var(--color-status-pending)]/15 blur-3xl'
            }
          />

          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.sp('px', 6),
              cm.sp('pt', 24),
              cm.sp('pb', 16),
              cm.mxAuto,
            )}
          >
            <div className={cm.cn(cm.grid({ cols: 12, gap: 'xl' }), 'items-center')}>
              <div className={'col-span-12 lg:col-span-7'}>
                <span
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.fontWeight('extrabold'),
                    'inline-flex rounded-full bg-[var(--color-status-pending)]/15 text-[10px] uppercase tracking-widest text-[var(--mol-color-secondary)]',
                  )}
                >
                  {t('landing.eyebrow', {}, { defaultValue: 'For Legal Ops & Procurement' })}
                </span>
                <h1
                  className={cm.cn(
                    cm.sp('mt', 5),
                    cm.fontWeight('extrabold'),
                    'text-5xl tracking-tight text-on-surface md:text-6xl lg:text-7xl leading-[0.95]',
                  )}
                >
                  {t(
                    'landing.heroTitle',
                    {},
                    { defaultValue: 'A defensible record of every signed deal.' },
                  )}
                </h1>
                <p
                  className={cm.cn(
                    cm.sp('mt', 6),
                    cm.textSize('lg'),
                    cm.maxW('2xl'),
                    'leading-relaxed text-on-surface-variant',
                  )}
                >
                  {t(
                    'landing.heroSubtitle',
                    { tagline: APP_TAGLINE },
                    {
                      defaultValue:
                        '{{tagline}}. Templates, e-signing, expiry alerts, and an evidentiary audit trail your General Counsel can stand behind.',
                    },
                  )}
                </p>
                <div
                  className={cm.cn(
                    cm.sp('mt', 8),
                    cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
                  )}
                >
                  <Link
                    to="/signup"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      cm.fontWeight('extrabold'),
                      'rounded-full bg-gradient-to-br from-sidebar-bg to-[var(--mol-color-primary)] text-white shadow-lg shadow-sidebar-bg/20 transition-all hover:-translate-y-0.5 hover:shadow-xl',
                    )}
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Request demo' })}
                  </Link>
                  <Link
                    to="/login"
                    className={cm.cn(
                      cm.sp('px', 6),
                      cm.sp('py', 4),
                      cm.fontWeight('semibold'),
                      'rounded-full border border-outline text-on-surface hover:bg-surface-container',
                    )}
                  >
                    {t('landing.heroSecondary', {}, { defaultValue: 'Sign in to your account' })}
                  </Link>
                </div>

                <div className={cm.cn(cm.sp('mt', 10))}>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('extrabold'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t(
                      'landing.proofHeading',
                      {},
                      { defaultValue: 'Built for the teams that bear the risk' },
                    )}
                  </p>
                  <ul className={cm.cn(cm.sp('mt', 4), cm.flex({ wrap: 'wrap', gap: 'md' }))}>
                    {PROOF.map((p) => (
                      <li
                        key={p.key}
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 2),
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          'rounded-full bg-surface-container text-on-surface-variant',
                        )}
                      >
                        {t(`landing.proof.${p.key}`, {}, { defaultValue: p.defaultLabel })}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className={'col-span-12 lg:col-span-5'}>
                <VellumPortfolioHero
                  totalValueCents={38400000}
                  activeCount={28}
                  pendingCount={5}
                  expiringCount={3}
                />
              </div>
            </div>
          </div>
        </section>

        <section className={'border-t border-outline-variant bg-surface-container-low'}>
          <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 20), cm.mxAuto)}>
            <div className={cm.cn(cm.maxW('2xl'), cm.mxAuto, cm.textCenter)}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('extrabold'),
                  'uppercase tracking-widest text-[var(--mol-color-secondary)]',
                )}
              >
                {t('landing.featuresEyebrow', {}, { defaultValue: 'What you get' })}
              </p>
              <h2
                className={cm.cn(
                  cm.sp('mt', 3),
                  cm.textSize('4xl'),
                  cm.fontWeight('extrabold'),
                  'tracking-tight text-on-surface',
                )}
              >
                {t(
                  'landing.featuresHeading',
                  {},
                  { defaultValue: 'A workspace that respects the paper.' },
                )}
              </h2>
              <p className={cm.cn(cm.sp('mt', 4), cm.textSize('lg'), 'text-on-surface-variant')}>
                {t(
                  'landing.featuresSubtitle',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      '{{appName}} keeps the gravity of an executed contract while moving at the speed of revenue.',
                  },
                )}
              </p>
            </div>

            <div className={cm.cn(cm.sp('mt', 12), cm.grid({ cols: 4, gap: 'md' }))}>
              {FEATURES.map((f) => (
                <div
                  key={f.key}
                  className={cm.cn(
                    cm.sp('p', 6),
                    'rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant transition-transform hover:-translate-y-1 hover:shadow-lg',
                  )}
                >
                  <span
                    className={
                      'material-symbols-outlined inline-flex h-12 w-12 items-center justify-center rounded-xl bg-sidebar-bg text-[var(--color-status-pending)]'
                    }
                    aria-hidden="true"
                    style={{ fontSize: '1.5rem' }}
                  >
                    {f.icon}
                  </span>
                  <h3
                    className={cm.cn(cm.sp('mt', 4), cm.textSize('lg'), cm.fontWeight('extrabold'))}
                  >
                    {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                  </h3>
                  <p
                    className={cm.cn(
                      cm.sp('mt', 2),
                      cm.textSize('sm'),
                      'leading-relaxed text-on-surface-variant',
                    )}
                  >
                    {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={'border-t border-outline-variant'}>
          <div
            className={cm.cn(
              cm.maxW('5xl'),
              cm.sp('px', 6),
              cm.sp('py', 20),
              cm.mxAuto,
              cm.textCenter,
            )}
          >
            <h2
              className={cm.cn(
                cm.textSize('4xl'),
                cm.fontWeight('extrabold'),
                'tracking-tight text-on-surface',
              )}
            >
              {t(
                'landing.ctaHeading',
                {},
                { defaultValue: 'See your portfolio close on day one.' },
              )}
            </h2>
            <p className={cm.cn(cm.sp('mt', 4), cm.textSize('lg'), 'text-on-surface-variant')}>
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'Onboarding in a week. Migrate templates, import legacy records, and start sending in days.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.sp('mt', 8),
                cm.flex({ align: 'center', justify: 'center', gap: 'md' }),
              )}
            >
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('extrabold'),
                  'rounded-full bg-gradient-to-br from-sidebar-bg to-[var(--mol-color-primary)] text-white shadow-lg transition-transform hover:-translate-y-0.5',
                )}
              >
                {t('landing.ctaPrimary', {}, { defaultValue: 'Start a workspace' })}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className={'border-t border-outline-variant bg-surface-container-low'}>
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 8),
            cm.mxAuto,
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          )}
        >
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'landing.copyright',
              { year: new Date().getFullYear(), app: APP_NAME },
              { defaultValue: '\u00a9 {{year}} {{app}}. Built with Molecule.' },
            )}
          </p>
          <ul className={cm.cn(cm.flex({ gap: 'md', align: 'center' }), cm.textSize('sm'))}>
            <li>
              <Link to="/about" className={'text-on-surface-variant hover:text-on-surface'}>
                {t('nav.about', {}, { defaultValue: 'About' })}
              </Link>
            </li>
            <li>
              <Link to="/pricing" className={'text-on-surface-variant hover:text-on-surface'}>
                {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={openPrivacy}
                className={
                  'cursor-pointer border-0 bg-transparent p-0 text-on-surface-variant hover:text-on-surface'
                }
              >
                {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={openTerms}
                className={
                  'cursor-pointer border-0 bg-transparent p-0 text-on-surface-variant hover:text-on-surface'
                }
              >
                {t('nav.terms', {}, { defaultValue: 'Terms' })}
              </button>
            </li>
          </ul>
        </div>
      </footer>
      {modals}
    </div>
  )
}
