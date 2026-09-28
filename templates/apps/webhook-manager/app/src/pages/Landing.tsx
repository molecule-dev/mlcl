import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
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
    tint: 'bg-primary/15 text-primary',
  },
  {
    key: 'retries',
    defaultTitle: 'Smart retries with backoff',
    defaultBody:
      'Configurable exponential backoff per endpoint. Replay any failed delivery with one click, or pause a flapping endpoint without losing the queue.',
    icon: 'autorenew',
    tint: 'bg-accent/15 text-accent',
  },
  {
    key: 'inspector',
    defaultTitle: 'Pretty payload inspector',
    defaultBody:
      'Syntax-highlighted JSON, collapsible nesting, copy-as-curl, and request signing checks. Diff payloads across retries to debug faster.',
    icon: 'data_object',
    tint: 'bg-primary/15 text-primary',
  },
  {
    key: 'security',
    defaultTitle: 'Signed, rotated, audited',
    defaultBody:
      'HMAC signing on every outbound payload. Rotate secrets with zero downtime. Every config change lands in a signed, immutable audit log.',
    icon: 'verified_user',
    tint: 'bg-accent/15 text-accent',
  },
  {
    key: 'events',
    defaultTitle: 'First-class event catalog',
    defaultBody:
      'Document every event your platform emits. Browse JSON schemas, sample payloads, and the endpoints subscribed — all from one console.',
    icon: 'menu_book',
    tint: 'bg-primary/15 text-primary',
  },
  {
    key: 'cli',
    defaultTitle: 'CLI + Terraform native',
    defaultBody:
      '{{app}} endpoints are config — version them in git, ship via Terraform, automate replay drills from your CI. The dashboard is just one view.',
    icon: 'terminal',
    tint: 'bg-accent/15 text-accent',
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

/* The design's terminal block, tokenized. Each fragment carries a tone that
   maps to a token class — cmd/flag → primary, quoted value → primary, JSON
   key → muted, number → accent (the design's indigo). */
const TERMINAL_LINES = [
  [
    { key: 'curl', defaultText: 'curl', tone: 'text-primary' },
    { key: 'method', defaultText: ' -X POST ', tone: 'text-on-surface' },
    { key: 'url', defaultText: 'https://api.relay.dev/v1/endpoints \\\n', tone: 'text-primary' },
  ],
  [
    { key: 'flagH1', defaultText: '  -H ', tone: 'text-on-surface' },
    { key: 'auth', defaultText: '"Authorization: Bearer sk_live_..." \\\n', tone: 'text-primary' },
  ],
  [
    { key: 'flagH2', defaultText: '  -H ', tone: 'text-on-surface' },
    {
      key: 'contentType',
      defaultText: '"Content-Type: application/json" \\\n',
      tone: 'text-primary',
    },
  ],
  [
    { key: 'flagD', defaultText: '  -d ', tone: 'text-on-surface' },
    { key: 'quoteOpen', defaultText: "'{\n", tone: 'text-primary' },
  ],
  [
    { key: 'urlKey', defaultText: '    "url"', tone: 'text-on-surface-variant' },
    { key: 'colon1', defaultText: ': ', tone: 'text-on-surface' },
    { key: 'urlValue', defaultText: '"https://yourapp.com/webhooks"', tone: 'text-primary' },
    { key: 'comma1', defaultText: ',\n', tone: 'text-on-surface' },
  ],
  [
    { key: 'eventsKey', defaultText: '    "events"', tone: 'text-on-surface-variant' },
    { key: 'colon2', defaultText: ': ', tone: 'text-on-surface' },
    {
      key: 'eventsValue',
      defaultText: '["payment.succeeded", "invoice.paid"]',
      tone: 'text-primary',
    },
    { key: 'comma2', defaultText: ',\n', tone: 'text-on-surface' },
  ],
  [
    { key: 'rateKey', defaultText: '    "rate_limit"', tone: 'text-on-surface-variant' },
    { key: 'colon3', defaultText: ': ', tone: 'text-on-surface' },
    { key: 'rateValue', defaultText: '100', tone: 'text-accent' },
    { key: 'newline', defaultText: '\n', tone: 'text-on-surface' },
  ],
  [{ key: 'quoteClose', defaultText: "  '", tone: 'text-primary' }],
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(cm.minH('screen'), 'antialiased bg-background text-on-surface font-body')}
    >
      <LandingTopNavBar />

      <main>
        <section className={cm.cn('relative overflow-hidden')}>
          <div className="hero-glow absolute inset-0 pointer-events-none" aria-hidden="true" />
          <div
            className="grid-overlay absolute inset-0 opacity-[0.06] pointer-events-none"
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
              <div className={cm.cn('lg:col-span-7 flex flex-col gap-6')}>
                <p
                  className={cm.cn(
                    'font-mono text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-1',
                  )}
                >
                  {'> '}
                  {t(
                    'landing.kicker',
                    { app: APP_NAME.toLowerCase() },
                    { defaultValue: 'webhook infrastructure' },
                  )}
                </p>
                <h1
                  className={cm.cn(
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight',
                  )}
                >
                  {t('landing.heroTitleHead', {}, { defaultValue: 'Every payload,' })}
                  <br />
                  {t('landing.heroTitleTail', {}, { defaultValue: 'delivered' })}
                  <span className="text-primary">.</span>
                </h1>
                <p className={cm.cn('text-lg max-w-xl leading-relaxed text-on-surface-variant')}>
                  {t(
                    'landing.heroSubtitle',
                    { tagline: APP_TAGLINE },
                    {
                      defaultValue:
                        'The webhook control plane built for backend engineers — live delivery observability, smart retries, signed audit, and a payload inspector that actually shows you the JSON.',
                    },
                  )}
                </p>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
                    'gap-4 pt-4',
                  )}
                >
                  <Link
                    to="/signup"
                    data-mol-id="landing-hero-signup"
                    className={cm.cn(
                      'inline-flex items-center gap-2 px-6 py-3 font-semibold rounded-lg bg-primary text-on-primary hover:bg-primary-light transition-colors shadow-lg shadow-primary/25',
                    )}
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
                      'inline-flex items-center gap-2 px-6 py-3 font-medium rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface hover:border-primary transition-all',
                    )}
                  >
                    {t('landing.viewDocs', {}, { defaultValue: 'Read the docs' })}
                    <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                      arrow_forward
                    </span>
                  </a>
                </div>

                {/* Terminal block (design signature under the hero CTAs) */}
                <div
                  className="code-block p-4 mt-6 w-full overflow-x-auto"
                  role="img"
                  aria-label={t(
                    'landing.terminalLabel',
                    { app: APP_NAME },
                    { defaultValue: 'Example {{app}} API request' },
                  )}
                >
                  <div className="flex items-center gap-2 mb-3 text-on-surface-variant font-mono text-xs">
                    <span className="w-3 h-3 rounded-full bg-on-surface/15" aria-hidden="true" />
                    <span className="w-3 h-3 rounded-full bg-on-surface/15" aria-hidden="true" />
                    <span className="w-3 h-3 rounded-full bg-on-surface/15" aria-hidden="true" />
                    <span className="ml-2">
                      {t('landing.terminalShell', {}, { defaultValue: 'bash' })}
                    </span>
                  </div>
                  <pre className="font-mono text-sm leading-relaxed whitespace-pre">
                    <code>
                      {TERMINAL_LINES.map((line, li) => (
                        <span key={li}>
                          {line.map((tok) => (
                            <span key={tok.key} className={tok.tone}>
                              {t(
                                `landing.terminal.${tok.key}`,
                                {},
                                { defaultValue: tok.defaultText },
                              )}
                            </span>
                          ))}
                        </span>
                      ))}
                    </code>
                  </pre>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
                  <p
                    className={cm.cn(
                      'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('landing.socialProof', {}, { defaultValue: 'Trusted by platforms at' })}
                  </p>
                  {['Northwind', 'Stratafy', 'Helix', 'Kepler'].map((brand) => (
                    <span
                      key={brand}
                      className={cm.cn('font-mono text-sm font-bold text-on-surface-variant')}
                    >
                      {brand}
                    </span>
                  ))}
                </div>
              </div>

              <div className={cm.cn('lg:col-span-5 w-full')}>
                <div
                  className={cm.cn(
                    'rounded-lg shadow-2xl overflow-hidden border border-outline-variant bg-surface',
                  )}
                >
                  <div
                    className={cm.cn(
                      'flex items-center gap-2 px-4 py-2.5 border-b border-outline-variant',
                    )}
                  >
                    <span className="w-3 h-3 rounded-full bg-on-surface/15" aria-hidden="true" />
                    <span className="w-3 h-3 rounded-full bg-on-surface/15" aria-hidden="true" />
                    <span className="w-3 h-3 rounded-full bg-on-surface/15" aria-hidden="true" />
                    <span
                      className={cm.cn(
                        'ml-3 font-mono text-[11px] font-medium text-on-surface-variant',
                      )}
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
                    className={cm.cn(
                      'px-4 py-3 border-t border-outline-variant flex items-center justify-between bg-background/40',
                    )}
                  >
                    <div
                      className={cm.cn(
                        'flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest font-extrabold text-on-surface-variant',
                      )}
                    >
                      <span>
                        {t('landing.feedTabs.headers', {}, { defaultValue: 'Headers (3)' })}
                      </span>
                      <span>{t('landing.feedTabs.body', {}, { defaultValue: 'Body' })}</span>
                      <span>
                        {t('landing.feedTabs.response', {}, { defaultValue: 'Response' })}
                      </span>
                      <span>{t('landing.feedTabs.retries', {}, { defaultValue: 'Retries' })}</span>
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
              'text-center font-mono text-xs font-semibold uppercase tracking-widest mb-3 text-primary',
            )}
          >
            {t('landing.featuresEyebrow', {}, { defaultValue: '// engineering grade' })}
          </p>
          <h2
            className={cm.cn(
              'mb-12 text-center text-3xl md:text-4xl font-extrabold tracking-tight',
            )}
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
                  'group rounded-lg p-6 bg-surface border border-outline-variant transition-all hover:border-primary hover:-translate-y-0.5 hover:shadow-xl',
                )}
              >
                <div
                  className={cm.cn(
                    'inline-flex h-12 w-12 items-center justify-center rounded-lg group-hover:scale-110 transition-transform',
                    f.tint,
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-2xl')} aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3 className={cm.cn('text-lg font-extrabold mt-5 mb-2')}>
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn('text-sm leading-relaxed text-on-surface-variant')}>
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

        <section className={cm.cn('py-20 border-t border-outline-variant bg-background-secondary')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.mxAuto)}>
            <p
              className={cm.cn(
                'text-center font-mono text-xs font-semibold uppercase tracking-widest mb-3 text-primary',
              )}
            >
              {t('landing.pricingEyebrow', {}, { defaultValue: '// $ pricing --plain' })}
            </p>
            <h2
              className={cm.cn(
                'text-center text-3xl md:text-4xl font-extrabold tracking-tight mb-12',
              )}
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
                      'relative rounded-lg p-7 bg-surface transition-all hover:-translate-y-1',
                      featured
                        ? 'border-2 border-primary shadow-xl shadow-primary/20'
                        : 'border border-outline-variant',
                    )}
                  >
                    {featured ? (
                      <span
                        className={cm.cn(
                          'absolute -top-3 left-1/2 -translate-x-1/2 inline-flex px-3 py-0.5 rounded-full font-mono text-[10px] font-black uppercase tracking-widest bg-primary text-on-primary',
                        )}
                      >
                        {t('status.mostPopular', {}, { defaultValue: 'Most popular' })}
                      </span>
                    ) : null}
                    <p
                      className={cm.cn(
                        'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t(`landing.pricing.${p.tier}.label`, {}, { defaultValue: p.defaultLabel })}
                    </p>
                    <p className={cm.cn('mt-3 font-mono')}>
                      <span className={cm.cn('text-5xl font-extrabold tracking-tighter')}>
                        {p.price}
                      </span>
                      <span className={cm.cn('ml-1 text-sm font-medium text-on-surface-variant')}>
                        /mo
                      </span>
                    </p>
                    <p className={cm.cn('mt-2 text-sm text-on-surface-variant')}>
                      {t(`landing.pricing.${p.tier}.desc`, {}, { defaultValue: p.defaultDesc })}
                    </p>
                    <ul className={cm.cn('mt-5 space-y-2.5')}>
                      {p.features.map((feat) => (
                        <li key={feat} className={cm.cn('flex items-center gap-2.5 text-sm')}>
                          <span
                            className={cm.cn(
                              'material-symbols-outlined text-base shrink-0 text-primary',
                            )}
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
                        'mt-6 block w-full text-center px-4 py-3 rounded-lg font-mono font-semibold transition-colors',
                        featured
                          ? 'bg-primary text-on-primary hover:bg-primary-light'
                          : 'border border-outline-variant text-on-surface hover:border-primary',
                      )}
                    >
                      {t('landing.choosePlan', {}, { defaultValue: 'Choose plan' })}
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className={cm.cn('border-t border-outline-variant')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight mb-4')}>
              {t('landing.ctaHeading', {}, { defaultValue: 'Stop guessing. Start delivering.' })}
            </h3>
            <p className={cm.cn('text-base max-w-xl mx-auto mb-8 text-on-surface-variant')}>
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
              data-mol-id="landing-final-signup"
              className={cm.cn(
                'inline-flex items-center gap-2 px-8 py-3 font-semibold rounded-lg bg-primary text-on-primary hover:bg-primary-light transition-colors shadow-lg shadow-primary/25',
              )}
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
