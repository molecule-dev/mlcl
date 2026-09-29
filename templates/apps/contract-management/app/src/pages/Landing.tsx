import { Link } from 'react-router'

import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
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
            'flex-wrap gap-x-4 gap-y-2',
            cm.mxAuto,
          )}
        >
          <BrandWordmark />
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'min-w-0')}>
            <a
              href="#features"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'hidden sm:inline-flex whitespace-nowrap items-center py-2 border-b-2 tracking-tight',
              )}
              style={{
                // amber fails WCAG AA as text (2.62:1) — it stays as the
                // active-tab underline accent; the label reads in brand primary
                color: 'var(--color-primary)',
                borderColor: 'var(--color-status-pending)',
              }}
            >
              {t('nav.product', {}, { defaultValue: 'Product' })}
            </a>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'hidden sm:inline-flex whitespace-nowrap items-center px-3 py-2 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors tracking-tight',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            <Link
              to="/about"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'hidden md:inline-flex whitespace-nowrap items-center px-3 py-2 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors tracking-tight',
              )}
            >
              {t('nav.resources', {}, { defaultValue: 'Resources' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'whitespace-nowrap shrink-0',
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
                    // Tap-target floor: bare text links measured 20px tall on phones.
                    'inline-flex whitespace-nowrap items-center py-2 text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2.5),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'whitespace-nowrap shrink-0 rounded-lg shadow-sm transition-transform hover:scale-[0.98]',
                  )}
                  style={{
                    background: 'var(--color-status-pending)',
                    color: 'var(--color-sidebar-bg)',
                  }}
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Request Demo' })}
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
                    cm.fontWeight('normal'),
                    'text-5xl tracking-tight text-primary md:text-6xl lg:text-7xl leading-tight',
                  )}
                  style={{ fontFamily: 'var(--font-headline)' }}
                >
                  {t(
                    'landing.heroTitle',
                    {},
                    { defaultValue: 'Seal every deal with absolute certainty.' },
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
                    { appName: APP_NAME },
                    {
                      defaultValue:
                        '{{appName}} is the ultimate system of record for legal operations. Create, route, and audit contracts with a platform designed for defensibility and permanence.',
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
                      cm.fontWeight('medium'),
                      'rounded-lg bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-lg transition-all hover:opacity-90',
                    )}
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Start free' })}
                  </Link>
                  <Link
                    to="/about"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      cm.fontWeight('medium'),
                      'rounded-lg bg-surface-container-highest text-on-surface hover:bg-surface-container-high transition-colors inline-flex items-center justify-center gap-2',
                    )}
                  >
                    {t('landing.heroSecondary', {}, { defaultValue: 'Watch demo' })}
                    <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                      play_arrow
                    </span>
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

        {/* Trust strip (Stitch design: serif wordmarks, grayscale) */}
        <section
          className={cm.cn(
            'border-y border-outline-variant bg-surface-container-low/50 py-12 px-6',
          )}
          data-mol-id="landing-trust-strip"
        >
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.flex({ align: 'center', justify: 'between' }),
              'flex-col md:flex-row gap-8',
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant uppercase tracking-widest',
              )}
            >
              {t('landing.trustStrip', {}, { defaultValue: 'Trusted by leading legal teams' })}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center' }),
                'flex-wrap justify-center gap-8 lg:gap-16 opacity-50 grayscale transition-all',
              )}
            >
              {['Axiom', 'Nexus', 'Stratagem', 'Vanguard', 'Horizon'].map((name) => (
                <span
                  key={name}
                  className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}
                  style={{ fontFamily: 'var(--font-headline)' }}
                >
                  {name}
                </span>
              ))}
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
                  {/* Tile is a separate flex box: sizing/centering utilities on the
                      glyph span itself lose the cascade to .material-symbols-outlined's
                      `display: inline-block` (icon font CSS loads after utilities),
                      which left the glyph pinned top-left. */}
                  <span
                    className={
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sidebar-bg'
                    }
                    aria-hidden="true"
                  >
                    <span
                      className="material-symbols-outlined text-[var(--color-status-pending)]"
                      style={{ fontSize: '1.5rem' }}
                    >
                      {f.icon}
                    </span>
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
                  cm.fontWeight('medium'),
                  'rounded-lg bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-lg transition-all hover:opacity-90',
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
            cm.sp('py', 12),
            cm.mxAuto,
            cm.grid({ cols: 1, gap: 'lg' }),
            'md:grid-cols-4 text-sm',
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-4')}>
            <BrandWordmark as="span" size="sm" footer />
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'tracking-wide uppercase text-on-surface-variant mt-auto',
              )}
            >
              {t(
                'landing.copyright',
                { year: new Date().getFullYear(), app: APP_NAME },
                {
                  defaultValue:
                    '© {{year}} {{app}} Operations. All rights reserved. Part of the Sovereign Archive.',
                },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            <button
              type="button"
              onClick={openPrivacy}
              className={cm.cn(
                'cursor-pointer text-left underline text-on-surface-variant hover:text-primary transition-colors py-1',
              )}
              // Tap-target floor for footer links on phones.
              style={{ paddingTop: '0.25rem', paddingBottom: '0.25rem' }}
            >
              {t('nav.privacy', {}, { defaultValue: 'Privacy Policy' })}
            </button>
            <button
              type="button"
              onClick={openTerms}
              className={cm.cn(
                'cursor-pointer text-left underline text-on-surface-variant hover:text-primary transition-colors',
              )}
              style={{ paddingTop: '0.25rem', paddingBottom: '0.25rem' }}
            >
              {t('nav.terms', {}, { defaultValue: 'Terms of Service' })}
            </button>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            <Link
              to="/about"
              className={cm.cn(
                'underline text-on-surface-variant hover:text-primary transition-colors py-1',
              )}
            >
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
            <Link
              to="/pricing"
              className={cm.cn(
                'underline text-on-surface-variant hover:text-primary transition-colors py-1',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            <Link
              to="/signup"
              className={cm.cn(
                'underline text-on-surface-variant hover:text-primary transition-colors py-1',
              )}
            >
              {t('landing.getStarted', {}, { defaultValue: 'Request Demo' })}
            </Link>
            <Link
              to="/login"
              className={cm.cn(
                'underline text-on-surface-variant hover:text-primary transition-colors py-1',
              )}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Log In' })}
            </Link>
          </div>
        </div>
      </footer>
      {modals}
    </div>
  )
}
