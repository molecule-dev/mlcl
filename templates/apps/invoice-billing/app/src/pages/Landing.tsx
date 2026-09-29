import { Link, useNavigate } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { ActivityFeed, type ActivityItem } from '../components/ActivityFeed.js'
import { Footer } from '../components/Footer.js'
import { ThemeToggle } from '../components/ThemeToggle.js'
import { useIsMobile } from '../components/useIsMobile.js'

const SAMPLE_ACTIVITY: ActivityItem[] = [
  {
    id: 'sample-1',
    kind: 'paid',
    invoice_number: 'INV-1042',
    client_name: 'Aperture Studio',
    message: 'Aperture Studio paid your invoice',
    amount_cents: 480000,
    occurred_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: 'sample-2',
    kind: 'viewed',
    invoice_number: 'INV-1041',
    client_name: 'Northwind Coffee Co',
    message: 'Northwind Coffee Co opened your invoice',
    occurred_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'sample-3',
    kind: 'sent',
    invoice_number: 'INV-1040',
    client_name: 'Vega Print Group',
    message: 'Invoice sent to Vega Print Group',
    amount_cents: 215000,
    occurred_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
]

const STATS = [
  { key: 'processed', metric: '$2.4B+', label: 'Processed annually', tone: 'accent' },
  { key: 'businesses', metric: '40k+', label: 'Businesses worldwide', tone: 'primary' },
  { key: 'paymentTime', metric: '3 days', label: 'Average payment time', tone: 'surface' },
] as const

const FEATURES = [
  {
    icon: 'edit_note',
    title: 'Polished invoices',
    body: 'A/B-tested layouts, your brand colors, and a one-tap "Pay" button.',
  },
  {
    icon: 'autorenew',
    title: 'Recurring billing',
    body: 'Schedule monthly retainers and watch them auto-collect via Stripe.',
  },
  {
    icon: 'analytics',
    title: 'Tax-ready reports',
    body: 'Revenue, aging, and tax summaries exportable to CSV or QBO.',
  },
  {
    icon: 'group',
    title: 'Client workspace',
    body: 'Outstanding balances, payment history, contact details — at a glance.',
  },
]

/** The design renders the headline's final word in brand coral
 *  ("Get paid <span class=text-primary>faster.</span>"). Splitting the
 *  translated string keeps the i18n contract intact; the newline in the
 *  key still breaks the line via whitespace-pre-line on the h1. */
function HeroTitle({ text }: { text: string }) {
  const idx = text.lastIndexOf(' ')
  if (idx <= 0) return <>{text}</>
  const head = text.slice(0, idx)
  const tail = text.slice(idx + 1)
  return (
    <>
      {head} <span style={{ color: 'var(--color-accent)' }}>{tail}</span>
    </>
  )
}

export function Landing() {
  const isMobile = useIsMobile()
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div
      data-mol-id="page-landing"
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-background text-on-surface antialiased',
      )}
    >
      {/* Top nav — flat translucent surface, near-black wordmark, coral CTA. */}
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', isMobile ? 5 : 10),
          cm.sp('py', 5),
          'sticky top-0 z-40 bg-surface/80 backdrop-blur-xl',
        )}
      >
        <BrandWordmark />
        <nav className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
          {isMobile ? null : (
            <>
              <a
                href="#features"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface/70 transition-colors hover:text-primary-dark',
                )}
              >
                {t('nav.features', {}, { defaultValue: 'Features' })}
              </a>
              <Link
                to="/pricing"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface/70 transition-colors hover:text-primary-dark',
                )}
              >
                {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
              </Link>
              <ThemeToggle />
            </>
          )}
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'rounded-xl text-on-primary',
                'transition-all active:scale-95 hover:opacity-90',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--color-accent-dark) 0%, var(--color-accent) 100%)',
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
                  'text-on-surface/70 transition-colors hover:text-primary-dark',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                data-mol-id="landing-nav-start-free"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'rounded-xl text-on-primary',
                  'transition-all active:scale-95 hover:opacity-90',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-accent-dark) 0%, var(--color-accent) 100%)',
                }}
              >
                {t('common.startFree', {}, { defaultValue: 'Start free' })}
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className={cm.cn('w-full mx-auto', cm.maxW('7xl'), cm.sp('px', isMobile ? 5 : 8))}>
        {/* Hero — 2-col: headline left, invoice mockup right. */}
        <section
          className={cm.cn(
            cm.grid({ gap: 'xl' }),
            'items-center grid-cols-1 lg:grid-cols-2',
            cm.sp('pt', isMobile ? 8 : 12),
            cm.sp('pb', 20),
          )}
        >
          <div className={cm.cn(cm.maxW('2xl'))}>
            <h1
              className={cm.cn(
                'whitespace-pre-line text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-[-0.02em] leading-[1.1] text-on-surface',
              )}
            >
              <HeroTitle
                text={t(
                  'landing.hero.title',
                  {},
                  { defaultValue: 'Send invoices.\nGet paid faster.' },
                )}
              />
            </h1>
            <p
              className={cm.cn(
                cm.textSize('xl'),
                cm.sp('mt', 6),
                cm.sp('mb', 10),
                'leading-relaxed text-on-surface-variant max-w-lg',
              )}
            >
              {t(
                'landing.hero.subtitle',
                { appName: APP_NAME },
                {
                  defaultValue:
                    '{{appName}} pairs polished invoices with built-in payments, recurring billing, and tax-ready reports. Bookkeeping-free.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md' }),
                cm.sp('mb', 12),
                'flex-wrap',
              )}
            >
              <button
                type="button"
                data-mol-id="landing-hero-start-trial"
                onClick={() => navigate('/signup')}
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.textSize('lg'),
                  cm.fontWeight('medium'),
                  'rounded-xl text-on-primary flex items-center justify-center',
                  'transition-all active:scale-95 hover:opacity-90',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-accent-dark) 0%, var(--color-accent) 100%)',
                }}
              >
                {t('landing.hero.cta', {}, { defaultValue: 'Send your first invoice' })}
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.textSize('lg'),
                  cm.fontWeight('medium'),
                  'rounded-xl border border-outline-variant text-on-surface',
                  'transition-colors hover:bg-surface-container-low',
                )}
              >
                {t('landing.hero.secondary', {}, { defaultValue: 'See a sample invoice' })}
              </button>
            </div>
            {/* Trusted-by strip — the design renders gray placeholder blocks.
                No opacity on the text: #1a1a2e at 60% over the #f0f9f9 page
                bg = 4.41:1 (axe serious). Full-opacity text is 15.9:1; the
                placeholder blocks keep the gray, washed look via `grayscale`
                alone (decorative, aria-hidden). */}
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'grayscale')}>
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'uppercase tracking-wider text-on-surface',
                )}
              >
                {t('landing.trustedBy', {}, { defaultValue: 'Trusted by' })}
              </span>
              <div className="flex gap-4" aria-hidden="true">
                <span className="h-6 w-20 rounded bg-outline-variant" />
                <span className="h-6 w-24 rounded bg-outline-variant" />
                <span className="h-6 w-16 rounded bg-outline-variant" />
              </div>
            </div>
          </div>

          {/* Invoice mockup — static presentational card (design: INV-2024-089,
              Paid chip, two line items, teal total). No /api calls. */}
          <div className={cm.cn('relative w-full max-w-lg lg:ml-auto')}>
            <div
              aria-hidden="true"
              className={cm.cn('absolute inset-0 rounded-full bg-primary/10 blur-[100px]')}
            />
            <div
              className={cm.cn(
                'relative rounded-3xl border border-outline-variant/15 bg-surface-container-lowest shadow-xl',
                cm.sp('p', 8),
              )}
              data-testid="landing-invoice-mock"
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('mb', 8),
                  cm.sp('pb', 4),
                  'items-start border-b border-surface-container',
                )}
              >
                <div>
                  <div
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'uppercase tracking-[0.05em] text-on-surface-variant',
                    )}
                  >
                    {t('landing.mock.invoiceLabel', {}, { defaultValue: 'Invoice' })}
                  </div>
                  <div
                    className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'text-on-surface')}
                  >
                    INV-2024-089
                  </div>
                </div>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 3),
                    'rounded-full py-1 text-sm font-semibold',
                  )}
                  style={{
                    backgroundColor: 'var(--color-paid-light)',
                    color: 'var(--color-paid)',
                  }}
                >
                  <span className="material-symbols-outlined text-base" aria-hidden="true">
                    check_circle
                  </span>
                  {t('landing.mock.paid', {}, { defaultValue: 'Paid' })}
                </span>
              </div>
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), cm.sp('mb', 8))}>
                {[
                  {
                    name: 'Design System Consultation',
                    meta: '40 hrs @ $150/hr',
                    amount: '$6,000.00',
                  },
                  {
                    name: 'Frontend Development',
                    meta: 'Milestone 1 completion',
                    amount: '$12,500.00',
                  },
                ].map((line) => (
                  <div
                    key={line.name}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      'rounded-xl bg-surface-container-low',
                      cm.sp('p', 4),
                    )}
                  >
                    <div>
                      <div className={cm.cn(cm.fontWeight('medium'), 'text-on-surface')}>
                        {t(`landing.mock.line.${line.name}`, {}, { defaultValue: line.name })}
                      </div>
                      <div
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.sp('mt', 1),
                          'text-on-surface-variant',
                        )}
                      >
                        {t(`landing.mock.meta.${line.name}`, {}, { defaultValue: line.meta })}
                      </div>
                    </div>
                    <div
                      className={cm.cn(
                        cm.textSize('lg'),
                        cm.fontWeight('semibold'),
                        'text-on-surface tabular-nums',
                      )}
                    >
                      {line.amount}
                    </div>
                  </div>
                ))}
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('pt', 4),
                  'items-end border-t border-surface-container',
                )}
              >
                <div className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('landing.mock.due', {}, { defaultValue: 'Due: Oct 15' })}
                </div>
                <div className="text-right">
                  <div
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      cm.sp('mb', 1),
                      'text-on-surface-variant',
                    )}
                  >
                    {t('landing.mock.totalLabel', {}, { defaultValue: 'Total Amount' })}
                  </div>
                  <div
                    className={cm.cn(
                      cm.textSize('4xl'),
                      cm.fontWeight('bold'),
                      'tracking-tight text-primary-dark tabular-nums',
                    )}
                  >
                    $18,500.00
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats trio — bordered cards on the page background. */}
        <section className={cm.cn(cm.sp('mb', 24))}>
          <div className={cm.cn('grid grid-cols-1 gap-8 md:grid-cols-3')}>
            {STATS.map((stat) => (
              <div
                key={stat.key}
                className={cm.cn(
                  'rounded-xl border border-outline-variant/15 bg-surface-container-low',
                  cm.sp('p', 8),
                )}
              >
                <div
                  className={cm.cn(
                    cm.textSize('5xl'),
                    cm.fontWeight('bold'),
                    'tracking-tight tabular-nums',
                  )}
                  style={{
                    color:
                      stat.tone === 'accent'
                        ? 'var(--color-accent)'
                        : stat.tone === 'primary'
                          ? 'var(--color-primary-dark)'
                          : 'var(--mol-color-text)',
                  }}
                >
                  {t(`landing.stat.${stat.key}.metric`, {}, { defaultValue: stat.metric })}
                </div>
                <div className={cm.cn(cm.fontWeight('medium'), 'text-on-surface-variant')}>
                  {t(`landing.stat.${stat.key}.label`, {}, { defaultValue: stat.label })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features grid */}
        <section id="features" className={cm.cn(cm.sp('mb', 24))}>
          <div className={cm.cn(cm.maxW('3xl'), cm.sp('mb', 12))}>
            <h2
              className={cm.cn(
                'text-4xl md:text-5xl font-extrabold tracking-[-0.02em] text-on-surface',
              )}
            >
              {t(
                'landing.features.title',
                {},
                { defaultValue: 'Everything to bill, collect, and reconcile.' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('xl'), cm.sp('mt', 3), 'text-on-surface-variant')}>
              {t(
                'landing.features.subtitle',
                {},
                { defaultValue: 'Everything you need to manage receivables without the clutter.' },
              )}
            </p>
          </div>
          <div className={cm.cn('grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4')}>
            {FEATURES.map((feat) => (
              <div
                key={feat.icon}
                className={cm.cn(
                  'rounded-xl border border-outline-variant/15 bg-surface-container-lowest shadow-lg transition-shadow hover:shadow-xl',
                  cm.sp('p', 6),
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.sp('mb', 4),
                    'h-12 w-12 rounded-xl bg-surface-container',
                  )}
                >
                  <span
                    className="material-symbols-outlined text-2xl text-primary-dark"
                    aria-hidden="true"
                  >
                    {feat.icon}
                  </span>
                </span>
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
                  {t(`landing.features.${feat.icon}.title`, {}, { defaultValue: feat.title })}
                </h3>
                <p
                  className={cm.cn(
                    cm.sp('mt', 2),
                    cm.textSize('sm'),
                    'leading-relaxed text-on-surface-variant',
                  )}
                >
                  {t(`landing.features.${feat.icon}.body`, {}, { defaultValue: feat.body })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Live ledger section — app content the design doesn't have; kept. */}
        <section className={cm.cn(cm.sp('mb', 24))}>
          <div
            className={cm.cn(
              cm.grid({ gap: 'xl' }),
              'items-start grid-cols-1 lg:grid-cols-[1.4fr_1fr]',
            )}
          >
            <div>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-[0.18em]',
                )}
                style={{ color: 'var(--color-accent)' }}
              >
                {t('landing.activity.eyebrow', {}, { defaultValue: 'A real ledger, in real time' })}
              </span>
              <h2
                className={cm.cn(
                  'text-4xl md:text-5xl tracking-tight font-extrabold text-on-surface',
                  cm.sp('mt', 2),
                )}
              >
                {t(
                  'landing.activity.title',
                  {},
                  { defaultValue: 'See every payment, the moment it lands.' },
                )}
              </h2>
              <p
                className={cm.cn(
                  cm.textSize('base'),
                  cm.sp('mt', 4),
                  'leading-relaxed text-on-surface-variant',
                )}
              >
                {t(
                  'landing.activity.body',
                  {},
                  {
                    defaultValue:
                      "When a client opens, prints, or pays an invoice, you'll know — without refreshing your inbox.",
                  },
                )}
              </p>
            </div>
            <ActivityFeed
              items={SAMPLE_ACTIVITY}
              title={t(
                'landing.activity.feedTitle',
                { appName: APP_NAME },
                { defaultValue: 'Today on {{appName}}' },
              )}
            />
          </div>
        </section>

        {/* Final CTA — teal band card, coral CTA. */}
        <section
          id="pricing"
          className={cm.cn(
            'rounded-3xl text-center',
            cm.sp('px', 6),
            cm.sp('py', 16),
            cm.sp('mb', 16),
            'text-on-primary',
          )}
          style={{ backgroundColor: 'var(--color-sidebar)' }}
        >
          <div className={cm.cn('mx-auto text-center', cm.maxW('3xl'))}>
            <h2 className={cm.cn('text-4xl md:text-5xl tracking-tight font-extrabold')}>
              {t(
                'landing.cta.title',
                {},
                { defaultValue: 'Start free. Send your first invoice in two minutes.' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('base'), cm.sp('mt', 4), 'text-on-primary/80')}>
              {t(
                'landing.cta.body',
                {},
                {
                  defaultValue:
                    'No credit card. The free plan includes 25 invoices and 25 clients.',
                },
              )}
            </p>
            <Link
              to="/signup"
              data-mol-id="landing-final-cta"
              className={cm.cn(
                'inline-block rounded-xl text-on-primary',
                cm.sp('px', 8),
                cm.sp('py', 4),
                cm.textSize('lg'),
                cm.fontWeight('medium'),
                cm.sp('mt', 8),
                'transition-all active:scale-95 hover:opacity-90',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--color-accent-dark) 0%, var(--color-accent) 100%)',
              }}
            >
              {t(
                'landing.cta.button',
                { appName: APP_NAME },
                { defaultValue: 'Create my {{appName}} account' },
              )}
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default Landing
