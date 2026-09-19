import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

const FEATURES = [
  {
    key: 'splits',
    icon: 'call_split',
    defaultTitle: 'Any split you need',
    defaultBody:
      'Equal, exact amounts, or weighted shares for couples and roommates — {{app}} computes every share to the cent.',
  },
  {
    key: 'balances',
    icon: 'account_balance',
    defaultTitle: 'Balances that add up',
    defaultBody:
      'Every group shows who owes whom. Your dashboard totals what you owe and what you are owed across all of them.',
  },
  {
    key: 'settle',
    icon: 'handshake',
    defaultTitle: 'Simplified settle-up',
    defaultBody:
      'The fewest transfers that zero a group out — record what actually moved and everyone lands on square.',
  },
  {
    key: 'activity',
    icon: 'notifications',
    defaultTitle: 'A feed of everything',
    defaultBody:
      'New expenses, members, and payments land in one chronological activity feed per group.',
  },
] as const

const PRESS_LOGOS = [
  'Alpine Club',
  'Harbor Flat 4B',
  'Costa Surf School',
  'Belem Tours',
  'Fernhaus Collective',
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
                call_split
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
                  {t(
                    'landing.eyebrow',
                    {},
                    { defaultValue: 'Group expenses, minus the awkwardness' },
                  )}
                </p>
                <h1
                  className={cm.cn(
                    cm.sp('mb', 6),
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95]',
                  )}
                >
                  {t('landing.heroTitle', {}, { defaultValue: 'Shared costs, settled simply.' })}
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
                        'Add an expense, split it however is fair, and Evenly keeps the running balances. When it is time to settle up, it suggests the fewest transfers that zero everyone out — no spreadsheet ceremony.',
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
                  {t('landing.socialProof', {}, { defaultValue: 'Trusted by groups like' })}
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
                        { defaultValue: 'Settled across your groups · this month' },
                      )}
                    </p>
                    <div className={cm.flex({ align: 'baseline', gap: 'sm' })}>
                      <span
                        className={cm.cn('text-5xl font-extrabold tracking-tighter tabular-nums')}
                      >
                        $2,340.75
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
                          handshake
                        </span>
                        3 groups
                      </span>
                    </div>
                    <p className={cm.cn('text-sm font-medium text-white/85 mt-4 max-w-xs')}>
                      {t(
                        'landing.sampleCardCaption',
                        {},
                        {
                          defaultValue:
                            'Zeroed out with 5 transfers instead of 12 — the simplify-debts engine at work.',
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
            {t('landing.featuresHeading', {}, { defaultValue: 'Splitting, in one calm workspace' })}
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
                { defaultValue: 'Ready to settle up, simply?' },
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
                    'Free for you and every group you start. No account needed for your friends.',
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
