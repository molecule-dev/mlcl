import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  ACCENT_COLOR,
  APP_NAME,
  APP_TAGLINE,
  BRAND_COLOR,
  SURFACE_DARK,
  SURFACE_PANEL,
} from '../branding.js'
import { MethodBadge } from '../components/MethodBadge.js'
import { RequestRow } from '../components/RequestRow.js'
import { SafeLink } from '../components/SafeLink.js'
import { StatusPill } from '../components/StatusPill.js'

const NAV_BG = 'color-mix(in srgb, var(--color-background) 85%, transparent)'
const PANEL_BORDER = 'var(--color-border)'

const FEATURES = [
  {
    key: 'collections',
    defaultTitle: 'Collections & Environments',
    defaultBody:
      'Organise requests into folders and switch contexts with first-class environment variables.',
    icon: 'dataset',
    tint: BRAND_COLOR,
  },
  {
    key: 'tests',
    defaultTitle: 'Automated tests',
    defaultBody:
      'Assert status codes, schema, response time — write expectations in plain JavaScript and run them per request.',
    icon: 'bug_report',
    tint: ACCENT_COLOR,
  },
  {
    key: 'mocks',
    defaultTitle: 'Mock servers',
    defaultBody:
      'Spin up deterministic mocks from any collection in seconds — unblock front-end work and CI runs.',
    icon: 'dns',
    tint: BRAND_COLOR,
  },
  {
    key: 'cli',
    defaultTitle: 'CLI & CI integration',
    defaultBody:
      'Run suites headlessly with the {{app}} runner. Plug it into GitHub Actions, GitLab, CircleCI in one line.',
    icon: 'terminal',
    tint: ACCENT_COLOR,
  },
  {
    key: 'chains',
    defaultTitle: 'Variable chaining',
    defaultBody:
      'Extract values from one response and pipe them into the next. Build complex auth + workflow chains visually.',
    icon: 'link',
    tint: BRAND_COLOR,
  },
  {
    key: 'keyboard',
    defaultTitle: 'Keyboard-native',
    defaultBody:
      'Every action has a shortcut. Open the command palette with ⌘K and never lift your hands.',
    icon: 'keyboard',
    tint: ACCENT_COLOR,
  },
] as const

// Mirrors the real tier ladder in api/src/tiers.ts (Free / Pro / Team) — keep
// the two in sync so the landing page never promises limits the API refuses.
const PRICING = [
  {
    tier: 'free',
    price: '$0',
    defaultLabel: 'Free',
    defaultDesc: 'For solo developers and learning',
    features: [
      { key: 'collections', defaultLabel: '5 collections & 5 saved requests' },
      { key: 'environments', defaultLabel: '5 environments' },
      { key: 'assertions', defaultLabel: 'Built-in test assertions' },
      { key: 'retention', defaultLabel: '90-day history retention' },
    ],
  },
  {
    tier: 'pro',
    price: '$15',
    defaultLabel: 'Pro',
    defaultDesc: 'For engineers shipping every day',
    features: [
      { key: 'collections', defaultLabel: '500 collections & saved requests' },
      { key: 'environments', defaultLabel: '500 environments' },
      { key: 'advanced', defaultLabel: 'Mock servers, tests & monitors' },
      { key: 'export', defaultLabel: 'Data export' },
      { key: 'retention', defaultLabel: '1-year history retention' },
    ],
  },
  {
    tier: 'team',
    price: '$49',
    defaultLabel: 'Team',
    defaultDesc: 'For platform & QA teams',
    features: [
      { key: 'collections', defaultLabel: 'Unlimited collections & requests' },
      { key: 'environments', defaultLabel: 'Unlimited environments' },
      { key: 'advanced', defaultLabel: 'Mock servers, tests & monitors' },
      { key: 'export', defaultLabel: 'Data export' },
      { key: 'retention', defaultLabel: 'Unlimited history retention' },
    ],
  },
] as const

const HERO_PREVIEW_ROWS = [
  {
    id: 'preview-users',
    method: 'GET' as const,
    url: 'https://api.example.com/v1/account',
    status_code: 200,
    status_text: 'OK',
    duration_ms: 142,
    size_bytes: 1240,
    collection: 'Account API',
    ran_at: new Date(Date.now() - 4 * 60_000).toISOString(),
  },
  {
    id: 'preview-orders-create',
    method: 'POST' as const,
    url: 'https://api.example.com/v1/orders',
    status_code: 201,
    status_text: 'Created',
    duration_ms: 318,
    size_bytes: 2840,
    collection: 'Orders API',
    ran_at: new Date(Date.now() - 12 * 60_000).toISOString(),
  },
  {
    id: 'preview-orders-delete',
    method: 'DELETE' as const,
    url: 'https://api.example.com/v1/orders/last',
    status_code: 404,
    status_text: 'Not Found',
    duration_ms: 87,
    size_bytes: 156,
    collection: 'Orders API',
    ran_at: new Date(Date.now() - 36 * 60_000).toISOString(),
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div
      className={cm.cn(cm.minH('screen'), 'antialiased font-body')}
      style={{ backgroundColor: SURFACE_DARK, color: 'var(--color-text-primary)' }}
    >
      <nav
        className={cm.cn('sticky top-0 z-50 backdrop-blur-md border-b')}
        style={{ backgroundColor: NAV_BG, borderColor: PANEL_BORDER }}
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
          <SafeLink
            to="/"
            className={cm.cn('flex items-center gap-2 text-xl font-extrabold tracking-tight')}
            style={{ color: 'var(--color-text)' }}
          >
            <span
              className={cm.cn('inline-flex h-8 w-8 items-center justify-center rounded-lg')}
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
              aria-hidden="true"
            >
              <span className={cm.cn('material-symbols-outlined text-[20px]')}>terminal</span>
            </span>
            <span>
              {APP_NAME}
              <span style={{ color: 'var(--color-primary)' }}>.</span>
            </span>
          </SafeLink>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/workspace"
                className={cm.cn(
                  'px-5 py-2 font-mono font-semibold text-sm rounded-md transition-all hover:opacity-90 shadow-lg',
                )}
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-on-primary)',
                  boxShadow:
                    '0 8px 24px -8px color-mix(in srgb, var(--color-primary) 40%, transparent)',
                }}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn('text-sm font-medium transition-colors hover:opacity-90')}
                  style={{ color: 'var(--color-text-secondary)' }}
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
                    color: 'var(--color-on-primary)',
                    boxShadow:
                      '0 8px 24px -8px color-mix(in srgb, var(--color-primary) 40%, transparent)',
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
        {/* Hero */}
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn('absolute inset-0 pointer-events-none')}
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 25%, color-mix(in srgb, var(--color-success) 20%, transparent), transparent 50%),' +
                'radial-gradient(circle at 80% 60%, color-mix(in srgb, var(--color-method-patch) 18%, transparent), transparent 45%)',
            }}
            aria-hidden="true"
          />
          <div
            className={cm.cn('absolute inset-0 opacity-[0.07] pointer-events-none')}
            style={{
              backgroundImage:
                'linear-gradient(color-mix(in srgb, var(--color-text) 50%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--color-text) 50%, transparent) 1px, transparent 1px)',
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
                  style={{ color: 'var(--color-primary)' }}
                >
                  {t('landing.kicker', {}, { defaultValue: '$ pylon send --watch' })}
                </p>
                <h1
                  className={cm.cn(
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] mb-6',
                  )}
                  style={{ color: 'var(--color-text)' }}
                >
                  <span style={{ color: 'var(--color-primary)' }}>
                    {t('landing.heroTitleAccent', {}, { defaultValue: 'Fire' })}
                  </span>{' '}
                  {t('landing.heroTitleRest', {}, { defaultValue: 'requests,' })}
                  <br />
                  {t('landing.heroTitleLine2', {}, { defaultValue: 'forge confidence.' })}
                </h1>
                <p
                  className={cm.cn('text-lg max-w-xl leading-relaxed mb-10')}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t(
                    'landing.heroSubtitle',
                    { tagline: APP_TAGLINE },
                    {
                      defaultValue:
                        'The lightning-fast API testing workbench built for engineers who live in terminals.',
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
                      color: 'var(--color-on-primary)',
                      boxShadow:
                        '0 12px 32px -10px color-mix(in srgb, var(--color-primary) 45%, transparent)',
                    }}
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Download free' })}
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      arrow_forward
                    </span>
                  </Link>
                  <Link
                    to="/pricing"
                    className={cm.cn(
                      'inline-flex items-center gap-2 px-8 py-4 font-mono font-semibold rounded-md border transition-colors hover:bg-surface/5',
                    )}
                    style={{
                      borderColor: 'color-mix(in srgb, var(--color-text) 18%, transparent)',
                      color: 'var(--color-text)',
                    }}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      sell
                    </span>
                    {t('landing.viewPricing', {}, { defaultValue: 'See plans' })}
                  </Link>
                </div>

                <div className={cm.cn('mt-10 flex flex-wrap items-center gap-x-8 gap-y-3')}>
                  <p
                    className={cm.cn('text-xs font-bold uppercase tracking-widest')}
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {t('landing.socialProof', {}, { defaultValue: 'Trusted by API teams at' })}
                  </p>
                  {['Atlas', 'Northwind', 'Stratafy', 'Helix'].map((brand) => (
                    <span
                      key={brand}
                      className={cm.cn('font-mono text-sm font-bold')}
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {brand}
                    </span>
                  ))}
                </div>
              </div>

              {/* Embedded sample */}
              <div className={cm.cn('lg:col-span-5')}>
                <div
                  className={cm.cn('rounded-2xl shadow-2xl overflow-hidden border')}
                  style={{
                    backgroundColor: SURFACE_PANEL,
                    borderColor: PANEL_BORDER,
                    boxShadow: '0 30px 80px -30px rgba(0,0,0,0.7)',
                  }}
                >
                  <div
                    className={cm.cn('flex items-center gap-2 px-4 py-2.5 border-b')}
                    style={{
                      borderColor: PANEL_BORDER,
                      backgroundColor: 'var(--color-background)',
                    }}
                  >
                    <span
                      className={cm.cn('w-3 h-3 rounded-full')}
                      style={{ backgroundColor: 'rgba(248, 113, 113, 0.7)' }}
                      aria-hidden="true"
                    />
                    <span
                      className={cm.cn('w-3 h-3 rounded-full')}
                      style={{ backgroundColor: 'rgba(251, 191, 36, 0.7)' }}
                      aria-hidden="true"
                    />
                    <span
                      className={cm.cn('w-3 h-3 rounded-full')}
                      style={{ backgroundColor: 'rgba(52, 211, 153, 0.7)' }}
                      aria-hidden="true"
                    />
                    <span
                      className={cm.cn('ml-3 font-mono text-[11px] font-medium')}
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      pylon · production-api
                    </span>
                    <span className={cm.cn('ml-auto inline-flex items-center gap-1.5')}>
                      <StatusPill status="passed" pulse label="LIVE" />
                    </span>
                  </div>
                  <div className={cm.cn('p-4 space-y-3')}>
                    {HERO_PREVIEW_ROWS.map((req) => (
                      <RequestRow key={req.id} request={req} interactive={false} />
                    ))}
                  </div>
                  <div
                    className={cm.cn('px-4 py-3 border-t flex items-center justify-between')}
                    style={{
                      borderColor: PANEL_BORDER,
                      backgroundColor:
                        'color-mix(in srgb, var(--color-background) 40%, transparent)',
                    }}
                  >
                    <div
                      className={cm.cn(
                        'flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest font-extrabold',
                      )}
                    >
                      <span style={{ color: 'var(--color-text-secondary)' }}>Tab</span>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Headers (2)</span>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Body</span>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Tests</span>
                    </div>
                    <MethodBadge method="GET" density="default" />
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
            style={{ color: 'var(--color-primary)' }}
          >
            {t('landing.featuresEyebrow', {}, { defaultValue: '// engineering grade' })}
          </p>
          <h2
            className={cm.cn(
              'mb-12 text-center text-3xl md:text-4xl font-extrabold tracking-tight',
            )}
            style={{ color: 'var(--color-text)' }}
          >
            {t('landing.featuresHeading', {}, { defaultValue: 'Built for shippers, by shippers' })}
          </h2>
          <div className={cm.cn('grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn('group rounded-2xl p-6 hover:shadow-xl')}
                style={{
                  backgroundColor: SURFACE_PANEL,
                  border: `1px solid ${PANEL_BORDER}`,
                }}
              >
                <div
                  className={cm.cn(
                    'inline-flex p-3 rounded-xl group-hover:scale-110 transition-transform',
                  )}
                  style={{
                    backgroundColor: `color-mix(in srgb, ${f.tint} 13%, transparent)`,
                    color: f.tint,
                  }}
                >
                  <span className={cm.cn('material-symbols-outlined text-3xl')} aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn('text-lg font-extrabold mt-5 mb-2')}
                  style={{ color: 'var(--color-text)' }}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p
                  className={cm.cn('text-sm leading-relaxed')}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t(
                    `landing.feature.${f.key}.body`,
                    { app: APP_NAME },
                    { defaultValue: f.defaultBody },
                  )}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section
          className={cm.cn('py-20 border-t')}
          style={{ borderColor: PANEL_BORDER, backgroundColor: 'var(--color-background)' }}
        >
          <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.mxAuto)}>
            <p
              className={cm.cn(
                'text-center font-mono text-xs font-bold uppercase tracking-widest mb-3',
              )}
              style={{ color: 'var(--color-primary)' }}
            >
              {t('landing.pricingEyebrow', {}, { defaultValue: '// $ pricing --plain' })}
            </p>
            <h2
              className={cm.cn(
                'text-center text-3xl md:text-4xl font-extrabold tracking-tight mb-12',
              )}
              style={{ color: 'var(--color-text)' }}
            >
              {t('landing.pricingHeading', {}, { defaultValue: 'Simple, predictable pricing' })}
            </h2>
            <div className={cm.cn('grid gap-6 grid-cols-1 md:grid-cols-3')}>
              {PRICING.map((p, i) => {
                const featured = i === 1
                return (
                  <div
                    key={p.tier}
                    className={cm.cn('relative rounded-2xl p-7')}
                    style={{
                      backgroundColor: SURFACE_PANEL,
                      border: featured ? `2px solid ${BRAND_COLOR}` : `1px solid ${PANEL_BORDER}`,
                      boxShadow: featured
                        ? `0 18px 50px -20px color-mix(in srgb, ${BRAND_COLOR} 50%, transparent)`
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
                          color: 'var(--color-on-primary)',
                        }}
                      >
                        {t('status.mostPopular', {}, { defaultValue: 'Most popular' })}
                      </span>
                    ) : null}
                    <p
                      className={cm.cn('text-[10px] font-black uppercase tracking-widest')}
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {t(`landing.pricing.${p.tier}.label`, {}, { defaultValue: p.defaultLabel })}
                    </p>
                    <p className={cm.cn('mt-3 font-mono')}>
                      <span
                        className={cm.cn('text-5xl font-extrabold tracking-tighter')}
                        style={{ color: 'var(--color-text)' }}
                      >
                        {p.price}
                      </span>
                      <span
                        className={cm.cn('ml-1 text-sm font-medium')}
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        /mo
                      </span>
                    </p>
                    <p
                      className={cm.cn('mt-2 text-sm')}
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {t(`landing.pricing.${p.tier}.desc`, {}, { defaultValue: p.defaultDesc })}
                    </p>
                    <ul className={cm.cn('mt-5 space-y-2.5')}>
                      {p.features.map((feat) => (
                        <li
                          key={feat.key}
                          className={cm.cn('flex items-center gap-2.5 text-sm')}
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          <span
                            className={cm.cn('material-symbols-outlined text-base shrink-0')}
                            style={{ color: 'var(--color-primary)' }}
                            aria-hidden="true"
                          >
                            check_circle
                          </span>
                          <span>
                            {t(
                              `landing.pricing.${p.tier}.feature.${feat.key}`,
                              {},
                              { defaultValue: feat.defaultLabel },
                            )}
                          </span>
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
                              color: 'var(--color-on-primary)',
                            }
                          : {
                              border:
                                '1px solid color-mix(in srgb, var(--color-text) 18%, transparent)',
                              color: 'var(--color-text-primary)',
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
        <section className={cm.cn('border-t')} style={{ borderColor: PANEL_BORDER }}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3
              className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight mb-4')}
              style={{ color: 'var(--color-text)' }}
            >
              {t('landing.ctaHeading', {}, { defaultValue: 'Forge confidence.' })}
            </h3>
            <p
              className={cm.cn('text-base max-w-xl mx-auto mb-8')}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'No credit card. No platform engineer required. Open ⌘K and ship your first request in under five minutes.',
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
                color: 'var(--color-on-primary)',
                boxShadow:
                  '0 12px 32px -10px color-mix(in srgb, var(--color-primary) 45%, transparent)',
              }}
            >
              {t('landing.heroCta', {}, { defaultValue: 'Download free' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn('py-8 text-center text-sm border-t')}
        style={{
          borderColor: PANEL_BORDER,
          color: 'var(--color-text-muted)',
        }}
      >
        <p>
          {t(
            'landing.copyright',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '© {{year}} {{app}} Engineering. Forge confidence.' },
          )}
        </p>
      </footer>
    </div>
  )
}
