import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { FlagRow, type FlagRowData } from '../components/FlagRow.js'

const SURFACE_DARK = 'var(--color-background)'
const SURFACE_PANEL = 'var(--color-surface)'
const NAV_BG = 'var(--color-overlay, rgba(12, 18, 34, 0.85))'
const HAIRLINE = 'var(--color-outline-variant)'
const PRIMARY_GLOW = 'color-mix(in srgb, var(--color-primary) 45%, transparent)'

const FEATURES = [
  {
    key: 'targeting',
    defaultTitle: 'Surgical targeting',
    defaultBody: 'Roll out by user, segment, plan tier, or country with attribute rules.',
    icon: 'gps_fixed',
    tint: 'var(--color-success)',
  },
  {
    key: 'rollouts',
    defaultTitle: 'Gradual rollouts',
    defaultBody: 'Move from 0 → 100% on a slider with sticky bucketing and instant kill.',
    icon: 'tune',
    tint: 'var(--color-accent)',
  },
  {
    key: 'environments',
    defaultTitle: 'First-class envs',
    defaultBody: 'Promote flag config across development → staging → production safely.',
    icon: 'cloud',
    tint: 'var(--color-warning)',
  },
  {
    key: 'audit',
    defaultTitle: 'Full audit trail',
    defaultBody: 'Every toggle, rule change, and rollout tweak — who, what, when, why.',
    icon: 'history',
    tint: 'var(--color-info)',
  },
] as const

// Mirror api/src/tiers.ts so the marketing copy matches what users actually
// pay. Editing prices/limits here without updating tiers.ts (or vice-versa)
// is a contract violation — the public landing must agree with the live
// /api/billing/tiers response.
const PRICING = [
  {
    tier: 'free',
    price: '$0',
    defaultLabel: 'Free',
    defaultDesc: 'For solo builders kicking the tires',
    features: ['5 flags', '5 environments', '90-day audit retention', 'Community support'],
  },
  {
    tier: 'pro',
    price: '$15/mo',
    defaultLabel: 'Pro',
    defaultDesc: 'For small teams shipping daily',
    features: [
      '500 flags',
      '500 environments',
      '1-year audit retention',
      'Advanced targeting',
      'Data export',
    ],
  },
  {
    tier: 'team',
    price: '$49/mo',
    defaultLabel: 'Team',
    defaultDesc: 'For platform teams running production',
    features: [
      'Unlimited flags',
      'Unlimited environments',
      'Unlimited audit retention',
      'Advanced targeting',
      'Data export',
    ],
  },
] as const

const DEMO_FLAGS: FlagRowData[] = [
  {
    key: 'onboarding-revamp-v3',
    name: 'Onboarding revamp v3',
    description: 'New 3-step welcome flow with personalised checklist',
    flag_type: 'boolean',
    state: 'on',
    rollout_percentage: 75,
    environments: ['production', 'staging'],
    updated_at: new Date(Date.now() - 12 * 60_000).toISOString(),
  },
  {
    key: 'pricing-test-q4',
    name: 'Q4 pricing experiment',
    description: 'A/B/C variant test on /pricing — 3 layouts',
    flag_type: 'multivariate',
    state: 'on',
    rollout_percentage: 50,
    environments: ['production'],
    updated_at: new Date(Date.now() - 4 * 3600_000).toISOString(),
  },
  {
    key: 'killswitch-checkout',
    name: 'Checkout killswitch',
    description: 'Emergency disable for the v2 checkout funnel',
    flag_type: 'boolean',
    state: 'killed',
    rollout_percentage: 0,
    environments: ['production'],
    updated_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    stale_days: 0,
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div
      className={cm.cn(cm.minH('screen'), 'antialiased font-body')}
      style={{ backgroundColor: SURFACE_DARK, color: 'var(--color-text-code)' }}
    >
      <nav
        className={cm.cn('sticky top-0 z-50 backdrop-blur-md border-b')}
        style={{ backgroundColor: NAV_BG, borderColor: HAIRLINE }}
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
          <BrandWordmark />
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <Link
              to="/pricing"
              className={cm.cn(
                'hidden md:inline text-sm font-medium text-white/70 hover:text-white transition-colors',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={cm.cn(
                  'px-5 py-2 font-mono font-semibold text-sm rounded-md transition-all hover:opacity-90 shadow-lg',
                )}
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-on-primary-cta)',
                  boxShadow: `0 8px 24px -8px ${PRIMARY_GLOW}`,
                }}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn(
                    'inline-flex min-h-[28px] items-center text-sm font-medium text-white/70 hover:text-white transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    'px-5 py-2 font-mono font-semibold text-sm rounded-md transition-all hover:opacity-90 shadow-lg',
                  )}
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'var(--color-on-primary-cta)',
                    boxShadow: `0 8px 24px -8px ${PRIMARY_GLOW}`,
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
        {/* Hero — terminal aesthetic with embedded sample flag list */}
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn('absolute inset-0 pointer-events-none')}
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 25%, color-mix(in srgb, var(--color-primary) 22%, transparent), transparent 50%),' +
                'radial-gradient(circle at 80% 60%, var(--color-accent-chip-bg), transparent 45%)',
            }}
            aria-hidden="true"
          />
          <div
            className={cm.cn('absolute inset-0 opacity-[0.07] pointer-events-none')}
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'relative py-20 md:py-24 lg:py-28',
            )}
          >
            <div
              className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center')}
            >
              <div className={cm.cn('lg:col-span-7')}>
                <p
                  className={cm.cn('font-mono text-sm font-bold uppercase tracking-widest mb-5')}
                  style={{ color: 'var(--color-text-link)' }}
                >
                  {t(
                    'landing.kicker',
                    { appName: APP_NAME },
                    { defaultValue: '$ {{appName}} flag toggle --safely' },
                  )}
                </p>
                <h1
                  className={cm.cn(
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] mb-6 text-white',
                  )}
                >
                  {t(
                    'landing.heroTitle',
                    { tagline: APP_TAGLINE },
                    { defaultValue: '{{tagline}}' },
                  )}
                </h1>
                <p className={cm.cn('text-lg text-white/75 max-w-xl leading-relaxed mb-10')}>
                  {t(
                    'landing.heroSubtitle',
                    {},
                    {
                      defaultValue:
                        'Toggle, target, and audit feature flags across every environment — without redeploying.',
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      'inline-flex items-center gap-2 px-8 py-4 font-mono font-semibold rounded-md transition-all hover:opacity-90 shadow-xl',
                    )}
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: 'var(--color-on-primary-cta)',
                      boxShadow: `0 12px 32px -10px ${PRIMARY_GLOW}`,
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
                      'px-8 py-4 font-mono font-semibold rounded-md border transition-colors hover:bg-surface/5 text-white',
                    )}
                    style={{
                      borderColor: 'color-mix(in srgb, var(--color-on-surface) 18%, transparent)',
                    }}
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>

                {/* Social proof */}
                <div className={cm.cn('mt-10 flex flex-wrap items-center gap-x-8 gap-y-3')}>
                  <p className={cm.cn('text-xs font-bold uppercase tracking-widest text-white/40')}>
                    {t('landing.socialProof', {}, { defaultValue: 'Trusted by platform teams at' })}
                  </p>
                  {['Atlas', 'Northwind', 'Stratafy', 'Helix'].map((brand) => (
                    <span
                      key={brand}
                      className={cm.cn('font-mono text-sm font-bold text-white/55')}
                    >
                      {brand}
                    </span>
                  ))}
                </div>
              </div>

              {/* Embedded sample — mirrors the auth'd Flags page */}
              <div className={cm.cn('lg:col-span-5')}>
                <div
                  className={cm.cn('rounded-2xl overflow-hidden border')}
                  style={{
                    backgroundColor: SURFACE_PANEL,
                    borderColor: HAIRLINE,
                    boxShadow: 'var(--shadow-lg, 0 30px 80px -30px rgba(0, 0, 0, 0.7))',
                  }}
                >
                  <div
                    className={cm.cn('flex items-center gap-2 px-4 py-2.5 border-b')}
                    style={{
                      borderColor: HAIRLINE,
                      backgroundColor: 'var(--color-code-block)',
                    }}
                  >
                    <span
                      className={cm.cn('w-3 h-3 rounded-full bg-red-400/70')}
                      aria-hidden="true"
                    />
                    <span
                      className={cm.cn('w-3 h-3 rounded-full bg-amber-400/70')}
                      aria-hidden="true"
                    />
                    <span
                      className={cm.cn('w-3 h-3 rounded-full bg-emerald-400/70')}
                      aria-hidden="true"
                    />
                    <span className={cm.cn('ml-3 font-mono text-[11px] font-medium text-white/60')}>
                      {t(
                        'landing.terminalTitle',
                        { appName: APP_NAME.toLowerCase() },
                        { defaultValue: '{{appName}} · production' },
                      )}
                    </span>
                    <span className={cm.cn('ml-auto inline-flex items-center gap-1.5')}>
                      <span
                        className={cm.cn('inline-block h-2 w-2 rounded-full animate-pulse')}
                        style={{
                          backgroundColor: 'var(--color-primary)',
                          boxShadow: `0 0 0 3px color-mix(in srgb, var(--color-primary) 25%, transparent)`,
                        }}
                        aria-hidden="true"
                      />
                      <span
                        className={cm.cn(
                          'font-mono text-[10px] font-bold uppercase tracking-widest',
                        )}
                        style={{ color: 'var(--color-text-link)' }}
                      >
                        live
                      </span>
                    </span>
                  </div>
                  <div className={cm.cn('p-4 space-y-3')}>
                    {DEMO_FLAGS.map((f) => (
                      <FlagRow key={f.key} flag={f} linked={false} compact />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <p
            className={cm.cn(
              'text-center font-mono text-xs font-bold uppercase tracking-widest mb-3',
            )}
            style={{ color: 'var(--color-text-link)' }}
          >
            {t('landing.featuresEyebrow', {}, { defaultValue: '// platform features' })}
          </p>
          <h2
            className={cm.cn(
              'mb-12 text-center text-3xl md:text-4xl font-extrabold tracking-tight text-white',
            )}
          >
            {t('landing.featuresHeading', {}, { defaultValue: 'Built for shippers, by shippers' })}
          </h2>
          <div className={cm.cn('grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}>
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  'group rounded-2xl p-6 transition-all hover:-translate-y-0.5 hover:shadow-xl',
                )}
                style={{
                  backgroundColor: SURFACE_PANEL,
                  border: `1px solid ${HAIRLINE}`,
                }}
              >
                <div
                  className={cm.cn(
                    'inline-flex p-3 rounded-xl group-hover:scale-110 transition-transform',
                  )}
                  style={{
                    backgroundColor: `color-mix(in srgb, ${f.tint} 15%, transparent)`,
                    color: f.tint,
                  }}
                >
                  <span className={cm.cn('material-symbols-outlined text-3xl')} aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3 className={cm.cn('text-lg font-extrabold mt-5 mb-2 text-white')}>
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn('text-sm text-white/70 leading-relaxed')}>
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section
          className={cm.cn('py-20 border-t')}
          style={{
            borderColor: HAIRLINE,
            backgroundColor: 'var(--color-code-block)',
          }}
        >
          <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.mxAuto)}>
            <p
              className={cm.cn(
                'text-center font-mono text-xs font-bold uppercase tracking-widest mb-3',
              )}
              style={{ color: 'var(--color-text-link)' }}
            >
              {t('landing.pricingEyebrow', {}, { defaultValue: '// $ pricing --plain' })}
            </p>
            <h2
              className={cm.cn(
                'text-center text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-12',
              )}
            >
              {t('landing.pricingHeading', {}, { defaultValue: 'Simple, predictable pricing' })}
            </h2>
            <div className={cm.cn('grid gap-6 grid-cols-1 md:grid-cols-3')}>
              {PRICING.map((p, i) => {
                const featured = i === 1
                return (
                  <div
                    key={p.tier}
                    className={cm.cn(
                      'relative rounded-2xl p-7 transition-all hover:-translate-y-1',
                    )}
                    style={{
                      backgroundColor: SURFACE_PANEL,
                      border: featured ? `2px solid var(--color-primary)` : `1px solid ${HAIRLINE}`,
                      boxShadow: featured
                        ? `0 18px 50px -20px color-mix(in srgb, var(--color-primary) 50%, transparent)`
                        : undefined,
                    }}
                  >
                    {featured ? (
                      <span
                        className={cm.cn(
                          'absolute -top-3 left-1/2 -translate-x-1/2 inline-flex px-3 py-0.5 rounded-full font-mono text-[10px] font-black uppercase tracking-widest',
                        )}
                        style={{
                          backgroundColor: 'var(--color-primary)',
                          color: 'var(--color-on-primary-cta)',
                        }}
                      >
                        {t('status.mostPopular', {}, { defaultValue: 'Most popular' })}
                      </span>
                    ) : null}
                    <p
                      className={cm.cn(
                        'text-[10px] font-black uppercase tracking-widest text-white/55',
                      )}
                    >
                      {t(`landing.pricing.${p.tier}.label`, {}, { defaultValue: p.defaultLabel })}
                    </p>
                    <p className={cm.cn('mt-3 font-mono')}>
                      <span
                        className={cm.cn('text-5xl font-extrabold tracking-tighter text-white')}
                      >
                        {p.price}
                      </span>
                    </p>
                    <p className={cm.cn('mt-2 text-sm text-white/65')}>
                      {t(`landing.pricing.${p.tier}.desc`, {}, { defaultValue: p.defaultDesc })}
                    </p>
                    <ul className={cm.cn('mt-5 space-y-2.5')}>
                      {p.features.map((f) => (
                        <li
                          key={f}
                          className={cm.cn('flex items-center gap-2.5 text-sm text-white/85')}
                        >
                          <span
                            className={cm.cn('material-symbols-outlined text-base shrink-0')}
                            style={{ color: 'var(--color-text-link)' }}
                            aria-hidden="true"
                          >
                            check_circle
                          </span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      to="/signup"
                      className={cm.cn(
                        'mt-6 block w-full text-center px-4 py-3 rounded-md font-mono font-semibold transition-colors',
                      )}
                      style={
                        featured
                          ? {
                              backgroundColor: 'var(--color-primary)',
                              color: 'var(--color-on-primary-cta)',
                            }
                          : {
                              border:
                                '1px solid color-mix(in srgb, var(--color-on-surface) 18%, transparent)',
                              color: 'var(--color-foreground)',
                            }
                      }
                    >
                      {t('landing.choosePlan', {}, { defaultValue: 'Choose plan' })}
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className={cm.cn('border-t')} style={{ borderColor: HAIRLINE }}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3
              className={cm.cn(
                'text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-white',
              )}
            >
              {t('landing.ctaHeading', {}, { defaultValue: 'Ship fearlessly.' })}
            </h3>
            <p className={cm.cn('text-base text-white/70 max-w-xl mx-auto mb-8')}>
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'No credit card. No platform engineer required. Toggle your first flag in under a minute.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                'inline-flex items-center gap-2 px-10 py-4 font-mono font-semibold rounded-md transition-all hover:opacity-90 shadow-xl',
              )}
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-on-primary-cta)',
                boxShadow: `0 12px 32px -10px ${PRIMARY_GLOW}`,
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
        className={cm.cn('py-8 text-center text-sm border-t')}
        style={{ borderColor: HAIRLINE, color: 'var(--color-text-secondary)' }}
      >
        <p>
          {t(
            'landing.copyright',
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
