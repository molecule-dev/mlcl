import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ACCENT_COLOR, APP_NAME, APP_TAGLINE, BRAND_COLOR } from '../branding.js'
import { DeliveryRow } from '../components/DeliveryRow.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingTopNavBar } from '../components/LandingTopNavBar.js'
import { MethodBadge } from '../components/MethodBadge.js'
import { StatusPill } from '../components/StatusPill.js'

const FEATURES = [
  {
    key: 'observability',
    defaultTitle: 'Live delivery observability',
    defaultBody:
      'Watch every payload land in real time. Filter by endpoint, event, status, latency — drill into headers, body, and response in two clicks.',
    icon: 'monitoring',
    tint: BRAND_COLOR,
  },
  {
    key: 'retries',
    defaultTitle: 'Smart retries with backoff',
    defaultBody:
      'Configurable exponential backoff per endpoint. Replay any failed delivery with one click, or pause a flapping endpoint without losing the queue.',
    icon: 'autorenew',
    tint: ACCENT_COLOR,
  },
  {
    key: 'inspector',
    defaultTitle: 'Pretty payload inspector',
    defaultBody:
      'Syntax-highlighted JSON, collapsible nesting, copy-as-curl, and request signing checks. Diff payloads across retries to debug faster.',
    icon: 'data_object',
    tint: BRAND_COLOR,
  },
  {
    key: 'security',
    defaultTitle: 'Signed, rotated, audited',
    defaultBody:
      'HMAC signing on every outbound payload. Rotate secrets with zero downtime. Every config change lands in a signed, immutable audit log.',
    icon: 'verified_user',
    tint: ACCENT_COLOR,
  },
  {
    key: 'events',
    defaultTitle: 'First-class event catalog',
    defaultBody:
      'Document every event your platform emits. Browse JSON schemas, sample payloads, and the endpoints subscribed — all from one console.',
    icon: 'menu_book',
    tint: BRAND_COLOR,
  },
  {
    key: 'cli',
    defaultTitle: 'CLI + Terraform native',
    defaultBody:
      '{{app}} endpoints are config — version them in git, ship via Terraform, automate replay drills from your CI. The dashboard is just one view.',
    icon: 'terminal',
    tint: ACCENT_COLOR,
  },
] as const

// Mirrors api/src/tiers.ts (Free / Pro / Team) so the landing page, the
// /settings/billing plan cards, and the enforced limits never disagree.
const PRICING = [
  {
    tier: 'free',
    price: '$0',
    defaultLabel: 'Free',
    defaultDesc: 'For solo developers and side projects',
    features: ['5 endpoints', '5 deliveries / mo', '90-day retention'],
  },
  {
    tier: 'pro',
    price: '$15',
    defaultLabel: 'Pro',
    defaultDesc: 'For shipping teams that need headroom',
    features: [
      '500 endpoints',
      '500 deliveries / mo',
      '365-day retention + replay',
      'Audit log export',
    ],
  },
  {
    tier: 'team',
    price: '$49',
    defaultLabel: 'Team',
    defaultDesc: 'For platforms running at scale',
    features: [
      'Unlimited endpoints',
      'Unlimited deliveries',
      'Unlimited retention',
      'Audit log export',
    ],
  },
] as const

const DEMO_DELIVERIES = [
  {
    id: 'demo-1',
    method: 'POST' as const,
    url: 'https://api.acme.dev/webhooks/orders',
    status_code: 200,
    status_text: 'OK',
    duration_ms: 142,
    event_type: 'order.completed',
    delivered_at: new Date(Date.now() - 4 * 60_000).toISOString(),
  },
  {
    id: 'demo-2',
    method: 'POST' as const,
    url: 'https://payments.northwind.io/notify',
    status_code: 502,
    status_text: 'Bad Gateway',
    duration_ms: 8200,
    event_type: 'payment.refunded',
    retry_count: 2,
    delivered_at: new Date(Date.now() - 12 * 60_000).toISOString(),
  },
  {
    id: 'demo-3',
    method: 'POST' as const,
    url: 'https://hooks.stratafy.app/billing',
    status_code: 201,
    status_text: 'Created',
    duration_ms: 318,
    event_type: 'invoice.paid',
    delivered_at: new Date(Date.now() - 36 * 60_000).toISOString(),
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(cm.minH('screen'), 'antialiased font-body')}
      style={{ backgroundColor: 'var(--mol-color-background)', color: 'var(--mol-color-text)' }}
    >
      <LandingTopNavBar />

      <main>
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn('absolute inset-0 pointer-events-none')}
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 25%, rgba(16, 185, 129, 0.20), transparent 50%),' +
                'radial-gradient(circle at 80% 60%, rgba(99, 102, 241, 0.18), transparent 45%)',
            }}
            aria-hidden="true"
          />
          <div
            className={cm.cn('absolute inset-0 opacity-[0.06] pointer-events-none')}
            style={{
              backgroundImage:
                'linear-gradient(color-mix(in srgb, var(--mol-color-text) 5%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--mol-color-text) 5%, transparent) 1px, transparent 1px)',
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
                  style={{ color: BRAND_COLOR }}
                >
                  {t(
                    'landing.kicker',
                    { app: APP_NAME.toLowerCase() },
                    { defaultValue: '$ {{app}} deliver --watch' },
                  )}
                </p>
                <h1
                  className={cm.cn(
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] mb-6',
                  )}
                  style={{ color: 'var(--mol-color-text)' }}
                >
                  <span style={{ color: BRAND_COLOR }}>Every</span> payload,
                  <br />
                  delivered.
                </h1>
                <p
                  className={cm.cn('text-lg max-w-xl leading-relaxed mb-10')}
                  style={{ color: 'var(--mol-color-text-secondary)' }}
                >
                  {t(
                    'landing.heroSubtitle',
                    { tagline: APP_TAGLINE },
                    {
                      defaultValue:
                        'The webhook control plane built for backend engineers — live delivery observability, smart retries, signed audit, and a payload inspector that actually shows you the JSON.',
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
                      backgroundColor: BRAND_COLOR,
                      color: 'var(--color-on-primary)',
                      boxShadow:
                        '0 12px 32px -10px color-mix(in srgb, var(--mol-color-primary) 45%, transparent)',
                    }}
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Start free — no card' })}
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      arrow_forward
                    </span>
                  </Link>
                  <a
                    href="https://github.com/molecule-dev"
                    className={cm.cn(
                      'inline-flex items-center gap-2 px-8 py-4 font-mono font-semibold rounded-md border transition-colors hover:bg-surface/5',
                    )}
                    style={{
                      borderColor: 'var(--mol-color-border)',
                      color: 'var(--mol-color-text)',
                    }}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      code
                    </span>
                    {t('landing.viewDocs', {}, { defaultValue: 'Read the docs' })}
                  </a>
                </div>

                <div className={cm.cn('mt-10 flex flex-wrap items-center gap-x-8 gap-y-3')}>
                  <p
                    className={cm.cn('text-xs font-bold uppercase tracking-widest')}
                    style={{ color: 'var(--mol-color-text-tertiary)' }}
                  >
                    {t('landing.socialProof', {}, { defaultValue: 'Trusted by platforms at' })}
                  </p>
                  {['Northwind', 'Stratafy', 'Helix', 'Kepler'].map((brand) => (
                    <span
                      key={brand}
                      className={cm.cn('font-mono text-sm font-bold')}
                      style={{ color: 'var(--mol-color-text-tertiary)' }}
                    >
                      {brand}
                    </span>
                  ))}
                </div>
              </div>

              <div className={cm.cn('lg:col-span-5')}>
                <div
                  className={cm.cn('rounded-2xl shadow-2xl overflow-hidden border')}
                  style={{
                    backgroundColor: 'var(--mol-color-surface)',
                    borderColor: 'var(--mol-color-border)',
                    boxShadow: '0 30px 80px -30px rgba(0,0,0,0.7)',
                  }}
                >
                  <div
                    className={cm.cn('flex items-center gap-2 px-4 py-2.5 border-b')}
                    style={{
                      borderColor: 'var(--mol-color-border)',
                      backgroundColor: 'var(--mol-color-background)',
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
                      style={{ color: 'var(--mol-color-text-secondary)' }}
                    >
                      {APP_NAME.toLowerCase()} · production
                    </span>
                    <span className={cm.cn('ml-auto inline-flex items-center')}>
                      <StatusPill status="live" pulse label="LIVE" />
                    </span>
                  </div>
                  <div className={cm.cn('p-4 space-y-3')}>
                    {DEMO_DELIVERIES.map((delivery) => (
                      <DeliveryRow key={delivery.id} delivery={delivery} interactive={false} />
                    ))}
                  </div>
                  <div
                    className={cm.cn('px-4 py-3 border-t flex items-center justify-between')}
                    style={{
                      borderColor: 'var(--mol-color-border)',
                      backgroundColor:
                        'color-mix(in srgb, var(--mol-color-background) 40%, transparent)',
                    }}
                  >
                    <div
                      className={cm.cn(
                        'flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest font-extrabold',
                      )}
                    >
                      <span style={{ color: 'var(--mol-color-text-secondary)' }}>Headers (3)</span>
                      <span style={{ color: 'var(--mol-color-text-secondary)' }}>Body</span>
                      <span style={{ color: 'var(--mol-color-text-secondary)' }}>Response</span>
                      <span style={{ color: 'var(--mol-color-text-secondary)' }}>Retries</span>
                    </div>
                    <MethodBadge method="POST" density="default" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <p
            className={cm.cn(
              'text-center font-mono text-xs font-bold uppercase tracking-widest mb-3',
            )}
            style={{ color: BRAND_COLOR }}
          >
            {t('landing.featuresEyebrow', {}, { defaultValue: '// engineering grade' })}
          </p>
          <h2
            className={cm.cn(
              'mb-12 text-center text-3xl md:text-4xl font-extrabold tracking-tight',
            )}
            style={{ color: 'var(--mol-color-text)' }}
          >
            {t(
              'landing.featuresHeading',
              {},
              { defaultValue: 'Built for teams who depend on webhooks' },
            )}
          </h2>
          <div className={cm.cn('grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  'group rounded-2xl p-6 transition-all hover:-translate-y-0.5 hover:shadow-xl',
                )}
                style={{
                  backgroundColor: 'var(--mol-color-surface)',
                  border: '1px solid var(--mol-color-border)',
                }}
              >
                <div
                  className={cm.cn(
                    'inline-flex p-3 rounded-xl group-hover:scale-110 transition-transform',
                  )}
                  style={{ backgroundColor: `${f.tint}22`, color: f.tint }}
                >
                  <span className={cm.cn('material-symbols-outlined text-3xl')} aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn('text-lg font-extrabold mt-5 mb-2')}
                  style={{ color: 'var(--mol-color-text)' }}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p
                  className={cm.cn('text-sm leading-relaxed')}
                  style={{ color: 'var(--mol-color-text-secondary)' }}
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

        <section
          className={cm.cn('py-20 border-t')}
          style={{
            borderColor: 'var(--mol-color-border)',
            backgroundColor: 'var(--mol-color-background-secondary)',
          }}
        >
          <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.mxAuto)}>
            <p
              className={cm.cn(
                'text-center font-mono text-xs font-bold uppercase tracking-widest mb-3',
              )}
              style={{ color: BRAND_COLOR }}
            >
              {t('landing.pricingEyebrow', {}, { defaultValue: '// $ pricing --plain' })}
            </p>
            <h2
              className={cm.cn(
                'text-center text-3xl md:text-4xl font-extrabold tracking-tight mb-12',
              )}
              style={{ color: 'var(--mol-color-text)' }}
            >
              {t(
                'landing.pricingHeading',
                {},
                { defaultValue: 'Pricing that scales with your delivery volume' },
              )}
            </h2>
            <div className={cm.cn('grid gap-6 grid-cols-1 md:grid-cols-3')}>
              {PRICING.map((p, i) => {
                const featured = i === 1
                return (
                  <div
                    key={p.tier}
                    // Stable per-tier hook (fleet convention) so the pricing cards can be
                    // located precisely — a bare text match for /Free|Pro|Team/ lands on the
                    // header "Start free" CTA long before it reaches this section.
                    data-mol-id={`landing-pricing-${p.tier}`}
                    className={cm.cn(
                      'relative rounded-2xl p-7 transition-all hover:-translate-y-1',
                    )}
                    style={{
                      backgroundColor: 'var(--mol-color-surface)',
                      border: featured
                        ? `2px solid ${BRAND_COLOR}`
                        : '1px solid var(--mol-color-border)',
                      boxShadow: featured ? `0 18px 50px -20px ${BRAND_COLOR}80` : undefined,
                    }}
                  >
                    {featured ? (
                      <span
                        className={cm.cn(
                          'absolute -top-3 left-1/2 -translate-x-1/2 inline-flex px-3 py-0.5 rounded-full font-mono text-[10px] font-black uppercase tracking-widest',
                        )}
                        style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
                      >
                        {t('status.mostPopular', {}, { defaultValue: 'Most popular' })}
                      </span>
                    ) : null}
                    <p
                      className={cm.cn('text-[10px] font-black uppercase tracking-widest')}
                      style={{ color: 'var(--mol-color-text-tertiary)' }}
                    >
                      {t(`landing.pricing.${p.tier}.label`, {}, { defaultValue: p.defaultLabel })}
                    </p>
                    <p className={cm.cn('mt-3 font-mono')}>
                      <span
                        className={cm.cn('text-5xl font-extrabold tracking-tighter')}
                        style={{ color: 'var(--mol-color-text)' }}
                      >
                        {p.price}
                      </span>
                      <span
                        className={cm.cn('ml-1 text-sm font-medium')}
                        style={{ color: 'var(--mol-color-text-tertiary)' }}
                      >
                        /mo
                      </span>
                    </p>
                    <p
                      className={cm.cn('mt-2 text-sm')}
                      style={{ color: 'var(--mol-color-text-secondary)' }}
                    >
                      {t(`landing.pricing.${p.tier}.desc`, {}, { defaultValue: p.defaultDesc })}
                    </p>
                    <ul className={cm.cn('mt-5 space-y-2.5')}>
                      {p.features.map((feat) => (
                        <li
                          key={feat}
                          className={cm.cn('flex items-center gap-2.5 text-sm')}
                          style={{ color: 'var(--mol-color-text)' }}
                        >
                          <span
                            className={cm.cn('material-symbols-outlined text-base shrink-0')}
                            style={{ color: BRAND_COLOR }}
                            aria-hidden="true"
                          >
                            check_circle
                          </span>
                          <span>{feat}</span>
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
                          ? { backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }
                          : {
                              border: '1px solid var(--mol-color-border)',
                              color: 'var(--mol-color-text)',
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

        <section className={cm.cn('border-t')} style={{ borderColor: 'var(--mol-color-border)' }}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3
              className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight mb-4')}
              style={{ color: 'var(--mol-color-text)' }}
            >
              {t('landing.ctaHeading', {}, { defaultValue: 'Stop guessing. Start delivering.' })}
            </h3>
            <p
              className={cm.cn('text-base max-w-xl mx-auto mb-8')}
              style={{ color: 'var(--mol-color-text-secondary)' }}
            >
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'Wire up your first endpoint in under five minutes. Replay 30 days of history. Sleep through the next 502 storm.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                'inline-flex items-center gap-2 px-10 py-4 font-mono font-semibold rounded-md transition-all hover:opacity-90 shadow-xl',
              )}
              style={{
                backgroundColor: BRAND_COLOR,
                color: 'var(--color-on-primary)',
                boxShadow:
                  '0 12px 32px -10px color-mix(in srgb, var(--mol-color-primary) 45%, transparent)',
              }}
            >
              {t('landing.heroCta', {}, { defaultValue: 'Start free — no card' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
