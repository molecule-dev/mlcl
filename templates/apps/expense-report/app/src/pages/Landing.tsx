import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

const FEATURES = [
  {
    key: 'capture',
    icon: 'photo_camera',
    defaultTitle: 'Snap, attach, done',
    defaultBody:
      'Drop a photo of any receipt and {{app}} matches it to the right expense, line by line.',
  },
  {
    key: 'workflow',
    icon: 'approval_delegation',
    defaultTitle: 'Approvals that move',
    defaultBody:
      'Two-tier approval flow with reviewer notes, policy violation flags, and one-tap reimbursement marking.',
  },
  {
    key: 'policy',
    icon: 'policy',
    defaultTitle: 'Policy guardrails',
    defaultBody:
      'Daily caps, per-category limits, and receipt-required thresholds enforced at submission time.',
  },
  {
    key: 'export',
    icon: 'download',
    defaultTitle: 'Auditable exports',
    defaultBody:
      'CSV exports of every report, expense, and approval state — ready for your accounting team.',
  },
] as const

const PRESS_LOGOS = [
  'Atlas Travel',
  'Northwind Holdings',
  'Lumen Robotics',
  'Castle & Co.',
  'Fairhaven Group',
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div
      data-mol-id="page-landing"
      className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface antialiased')}
    >
      <nav
        className={cm.cn(
          'sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-outline-variant/40',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            'mx-auto',
          )}
        >
          <Link to="/" className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'h-8 w-8 rounded-lg shadow-sm',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--color-primary-hover), var(--color-gradient-end))',
              }}
            >
              <span
                className={cm.cn('material-symbols-outlined text-white text-base')}
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                receipt_long
              </span>
            </span>
            <span
              className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}
              style={{ color: 'var(--color-primary-hover)' }}
            >
              {APP_NAME}
            </span>
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
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
                  'rounded-full text-white transition-colors',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-primary-hover), var(--color-gradient-end))',
                }}
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
                    'rounded-full text-white transition-colors',
                  )}
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-primary-hover), var(--color-gradient-end))',
                  }}
                >
                  {t('common.startFree', {}, { defaultValue: 'Start free' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn(
              'absolute inset-0 pointer-events-none bg-gradient-to-br from-primary-container via-surface to-surface',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              'mx-auto',
              cm.sp('px', 6),
              'py-20 md:py-28 lg:py-32 relative',
            )}
          >
            <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-12 items-center')}>
              <div className={cm.cn('lg:col-span-7')}>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mb', 4),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest',
                  )}
                  style={{ color: 'var(--color-primary-hover)' }}
                >
                  {t('landing.eyebrow', {}, { defaultValue: 'Expense reports for finance teams' })}
                </p>
                <h1
                  className={cm.cn(
                    cm.sp('mb', 6),
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95]',
                  )}
                >
                  {t('landing.heroTitle', {}, { defaultValue: 'Every receipt, recovered.' })}
                </h1>
                <p
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.sp('mb', 10),
                    'text-on-surface-variant max-w-xl leading-relaxed',
                  )}
                >
                  {t(
                    'landing.heroSubtitle',
                    {},
                    {
                      defaultValue:
                        'Submit, approve, and reimburse business expenses without the spreadsheet ceremony. Receipt OCR, policy checks, and a transparent approval timeline — all in one calm workspace.',
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      cm.fontWeight('semibold'),
                      'rounded-full text-white inline-flex items-center gap-2 transition-colors shadow-lg shadow-primary/20',
                    )}
                    style={{
                      background:
                        'linear-gradient(135deg, var(--color-primary-hover), var(--color-gradient-end))',
                    }}
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
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      cm.fontWeight('semibold'),
                      'rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors',
                    )}
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('mt', 6),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('landing.socialProof', {}, { defaultValue: 'Trusted by finance teams at' })}
                </p>
                <ul
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
                    cm.sp('mt', 3),
                  )}
                >
                  {PRESS_LOGOS.map((name) => (
                    <li
                      key={name}
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-on-surface-variant tracking-wide',
                      )}
                    >
                      {name}
                    </li>
                  ))}
                </ul>
              </div>

              <div className={cm.cn('lg:col-span-5')}>
                <div
                  className={cm.cn(
                    cm.flex({ direction: 'col', justify: 'between' }),
                    cm.sp('p', 8),
                    'min-h-[320px] bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-white relative overflow-hidden shadow-2xl shadow-primary/20',
                  )}
                >
                  <div className={cm.cn('relative z-10')}>
                    <p
                      className={cm.cn(
                        'font-bold text-xs uppercase tracking-widest text-white/80 mb-2',
                      )}
                    >
                      {t(
                        'landing.sampleCardLabel',
                        {},
                        { defaultValue: 'Reimbursement recovered · Q2' },
                      )}
                    </p>
                    <div className={cm.flex({ align: 'baseline', gap: 'sm' })}>
                      <span
                        className={cm.cn('text-5xl font-extrabold tracking-tighter tabular-nums')}
                      >
                        $48,290.50
                      </span>
                      <span
                        className={cm.cn(
                          'px-2 py-1 rounded-full text-[11px] font-bold bg-surface/20 backdrop-blur-md inline-flex items-center gap-1',
                        )}
                      >
                        <span
                          className={cm.cn('material-symbols-outlined text-sm')}
                          aria-hidden="true"
                        >
                          trending_up
                        </span>
                        +$1,240
                      </span>
                    </div>
                    <p className={cm.cn('text-sm font-medium text-white/85 mt-4 max-w-xs')}>
                      {t(
                        'landing.sampleCardCaption',
                        {},
                        {
                          defaultValue:
                            'Reimbursement issued in the past 12 weeks across 17 approved reports.',
                        },
                      )}
                    </p>
                  </div>
                  <div className={cm.cn('relative z-10 mt-8 h-20')}>
                    <svg
                      className={cm.cn('w-full h-full')}
                      viewBox="0 0 400 100"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M0,80 Q50,60 100,70 T200,30 T300,50 T400,10 L400,100 L0,100 Z"
                        fill="white"
                        opacity="0.3"
                      />
                      <path
                        d="M0,80 Q50,60 100,70 T200,30 T300,50 T400,10"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                      />
                    </svg>
                  </div>
                  <div
                    className={cm.cn(
                      'absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-surface/10 blur-3xl',
                    )}
                  />
                  <div
                    className={cm.cn(
                      'absolute right-8 top-8 w-16 h-16 rounded-full bg-surface/15 blur-xl',
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), 'mx-auto', cm.sp('px', 6), 'py-20')}>
          <h2
            className={cm.cn(
              cm.sp('mb', 12),
              'text-center text-3xl md:text-4xl font-extrabold tracking-tight',
            )}
          >
            {t(
              'landing.featuresHeading',
              {},
              { defaultValue: 'Reimbursement, in one calm workspace' },
            )}
          </h2>
          <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6')}>
            {FEATURES.map((f) => (
              <article
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:shadow-xl hover:-translate-y-1 transition-all group',
                )}
              >
                <div
                  className={cm.cn(
                    cm.sp('p', 3),
                    'inline-flex rounded-xl shadow-sm group-hover:scale-110 transition-transform',
                  )}
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-primary-hover), var(--color-gradient-end))',
                    color: 'var(--color-surface)',
                  }}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-3xl')}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                  >
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.sp('mt', 5),
                    cm.sp('mb', 2),
                    cm.fontWeight('bold'),
                  )}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(
                    `landing.feature.${f.key}.body`,
                    { app: APP_NAME },
                    { defaultValue: f.defaultBody },
                  )}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className={cm.cn('border-t border-outline-variant/40 bg-surface-container-low')}>
          <div className={cm.cn(cm.maxW('7xl'), 'mx-auto', cm.sp('px', 6), 'py-16 text-center')}>
            <h3
              className={cm.cn(cm.textSize('3xl'), cm.sp('mb', 4), 'font-extrabold tracking-tight')}
            >
              {t(
                'landing.ctaHeading',
                { tagline: APP_TAGLINE },
                { defaultValue: 'Ready to recover what your team is owed?' },
              )}
            </h3>
            <p
              className={cm.cn(
                cm.textSize('base'),
                cm.sp('mb', 8),
                'text-on-surface-variant max-w-xl mx-auto',
              )}
            >
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'Free for the first 25 expenses each month. No credit card, no implementation call.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 10),
                cm.sp('py', 4),
                cm.fontWeight('semibold'),
                'rounded-full text-white inline-flex items-center gap-2 transition-colors shadow-lg shadow-primary/20',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--color-primary-hover), var(--color-gradient-end))',
              }}
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
          cm.sp('py', 8),
          cm.textCenter,
          cm.textSize('sm'),
          'bg-surface text-on-surface-variant border-t border-outline-variant',
        )}
      >
        <p>
          {t(
            'landing.copyright',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '© {{year}} {{app}}. Built with Molecule.dev.' },
          )}
        </p>
      </footer>
    </div>
  )
}
