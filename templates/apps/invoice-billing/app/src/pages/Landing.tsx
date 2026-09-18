import { Link, useNavigate } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ActivityFeed, type ActivityItem } from '../components/ActivityFeed.js'
import { Footer } from '../components/Footer.js'
import { RevenueHeroCard } from '../components/RevenueHeroCard.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

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

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div
      data-mol-id="page-landing"
      className={cm.cn(cm.flex({ direction: 'col' }))}
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--mol-color-primary-light)',
        color: 'var(--mol-color-text)',
      }}
    >
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}
        style={{
          padding: '20px 40px',
          backgroundColor: 'transparent',
        }}
      >
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <span
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                backgroundColor: 'var(--color-primary-dark)',
                color: 'var(--color-sidebar-text-active)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '18px',
                letterSpacing: '0.05em',
                boxShadow: '0 6px 18px rgba(13, 115, 119, 0.25)',
              }}
            >
              R
            </span>
            <span
              style={{
                fontSize: '22px',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--color-primary-dark)',
              }}
            >
              {APP_NAME}
            </span>
          </div>
        </Link>
        <nav
          className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}
          style={{ fontSize: '14px' }}
        >
          <a
            href="#features"
            style={{ color: 'var(--mol-color-text)', textDecoration: 'none', fontWeight: 500 }}
          >
            {t('nav.features', {}, { defaultValue: 'Features' })}
          </a>
          <Link
            to="/pricing"
            style={{ color: 'var(--mol-color-text)', textDecoration: 'none', fontWeight: 500 }}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'var(--color-sidebar-text-active)',
                padding: '10px 20px',
                borderRadius: '9999px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 6px 18px var(--color-accent-shadow)',
              }}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                style={{
                  color: 'var(--color-primary-dark)',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-sidebar-text-active)',
                  padding: '10px 20px',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 6px 18px var(--color-accent-shadow)',
                }}
              >
                {t('common.startFree', {}, { defaultValue: 'Start free' })}
              </Link>
            </>
          )}
        </nav>
      </header>

      <section
        style={{
          padding: '40px 40px 80px',
          maxWidth: '1280px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div
          className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}
          style={{ marginBottom: '24px' }}
        >
          <span
            style={{
              fontSize: '11px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-primary-dark)',
              fontWeight: 700,
            }}
          >
            {t('landing.hero.eyebrow', {}, { defaultValue: 'Invoicing for small businesses' })}
          </span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: '32px',
            alignItems: 'stretch',
          }}
        >
          <div style={{ gridColumn: 'span 7' }}>
            <h1
              className={cm.cn('text-5xl md:text-6xl lg:text-7xl tracking-tight font-extrabold')}
              style={{
                lineHeight: 0.95,
                letterSpacing: '-0.03em',
                color: 'var(--color-primary-dark)',
                margin: 0,
              }}
            >
              {t('landing.hero.title', {}, { defaultValue: 'Send invoices.\nGet paid faster.' })}
            </h1>
            <p
              style={{
                marginTop: '24px',
                fontSize: '18px',
                lineHeight: 1.55,
                color: 'var(--mol-color-text-secondary)',
                maxWidth: '540px',
              }}
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
              className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('mt', 8))}
              style={{ flexWrap: 'wrap' }}
            >
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className={cm.cn(cm.fontWeight('bold'))}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-dark) 100%)',
                  color: 'var(--color-sidebar-text-active)',
                  border: 'none',
                  padding: '14px 30px',
                  borderRadius: '9999px',
                  fontSize: '15px',
                  cursor: 'pointer',
                  boxShadow: '0 14px 32px var(--color-accent-shadow)',
                }}
              >
                {t('landing.hero.cta', {}, { defaultValue: 'Send your first invoice' })}
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className={cm.cn(cm.fontWeight('semibold'))}
                style={{
                  background: 'transparent',
                  color: 'var(--color-primary-dark)',
                  border: '2px solid var(--color-primary-dark)',
                  padding: '12px 24px',
                  borderRadius: '9999px',
                  fontSize: '15px',
                  cursor: 'pointer',
                }}
              >
                {t('landing.hero.secondary', {}, { defaultValue: 'See a sample invoice' })}
              </button>
            </div>
            <div
              className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), cm.sp('mt', 8))}
              style={{ flexWrap: 'wrap' }}
            >
              {[
                { icon: 'verified', label: 'Stripe-backed payments' },
                { icon: 'shield_lock', label: 'Bank-grade encryption' },
                { icon: 'autorenew', label: 'Recurring billing' },
              ].map((item) => (
                <div
                  key={item.label}
                  className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}
                  style={{ fontSize: '13px', color: 'var(--mol-color-text-secondary)' }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '18px', color: 'var(--color-sidebar-hover)' }}
                  >
                    {item.icon}
                  </span>
                  {t(`landing.trust.${item.icon}`, {}, { defaultValue: item.label })}
                </div>
              ))}
            </div>
          </div>

          <div style={{ gridColumn: 'span 5' }}>
            <div
              style={{
                position: 'relative',
                padding: '14px',
                background:
                  'linear-gradient(180deg, rgba(13,115,119,0.10) 0%, rgba(13,115,119,0.02) 100%)',
                borderRadius: '32px',
              }}
            >
              <RevenueHeroCard
                outstandingCents={1284000}
                collectedCents={4392500}
                changePct={12.4}
                invoicesOpen={18}
              />
            </div>
          </div>
        </div>
      </section>

      <section
        id="features"
        style={{
          padding: '80px 40px',
          backgroundColor: 'var(--mol-color-surface)',
          borderTop: '1px solid var(--mol-color-border)',
          borderBottom: '1px solid var(--mol-color-border)',
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <span
            style={{
              fontSize: '11px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-primary-dark)',
              fontWeight: 700,
            }}
          >
            {t('landing.features.eyebrow', {}, { defaultValue: 'Built for cash flow' })}
          </span>
          <h2
            className={cm.cn('text-4xl md:text-5xl tracking-tight font-extrabold')}
            style={{
              marginTop: '8px',
              color: 'var(--color-primary-dark)',
              letterSpacing: '-0.02em',
            }}
          >
            {t(
              'landing.features.title',
              {},
              { defaultValue: 'Everything to bill, collect, and reconcile.' },
            )}
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '20px',
              marginTop: '40px',
            }}
          >
            {[
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
            ].map((feat) => (
              <div
                key={feat.title}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface rounded-2xl shadow-sm hover:shadow-md transition-all',
                )}
                style={{ border: '1px solid var(--mol-color-border)' }}
              >
                <span
                  className={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--mol-color-primary-light)',
                    color: 'var(--color-primary-dark)',
                    marginBottom: '16px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                    {feat.icon}
                  </span>
                </span>
                <h3
                  className={cm.cn(cm.fontWeight('bold'))}
                  style={{
                    fontSize: '16px',
                    color: 'var(--color-primary-dark)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {t(`landing.features.${feat.icon}.title`, {}, { defaultValue: feat.title })}
                </h3>
                <p
                  style={{
                    marginTop: '6px',
                    fontSize: '13px',
                    color: 'var(--mol-color-text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  {t(`landing.features.${feat.icon}.body`, {}, { defaultValue: feat.body })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        style={{
          padding: '80px 40px',
          maxWidth: '1280px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr',
            gap: '40px',
            alignItems: 'start',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '11px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--color-primary-dark)',
                fontWeight: 700,
              }}
            >
              {t('landing.activity.eyebrow', {}, { defaultValue: 'A real ledger, in real time' })}
            </span>
            <h2
              className={cm.cn('text-4xl md:text-5xl tracking-tight font-extrabold')}
              style={{
                marginTop: '8px',
                color: 'var(--color-primary-dark)',
                letterSpacing: '-0.02em',
              }}
            >
              {t(
                'landing.activity.title',
                {},
                { defaultValue: 'See every payment, the moment it lands.' },
              )}
            </h2>
            <p
              style={{
                marginTop: '16px',
                fontSize: '16px',
                color: 'var(--mol-color-text-secondary)',
                lineHeight: 1.55,
              }}
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

      <section
        id="pricing"
        style={{
          padding: '80px 40px',
          backgroundColor: 'var(--color-primary-dark)',
          color: 'var(--color-sidebar-text-active)',
        }}
      >
        <div style={{ maxWidth: '960px', margin: '0 auto', textAlign: 'center' }}>
          <h2
            className={cm.cn('text-4xl md:text-5xl tracking-tight font-extrabold')}
            style={{ letterSpacing: '-0.02em', color: 'var(--color-sidebar-text-active)' }}
          >
            {t(
              'landing.cta.title',
              {},
              { defaultValue: 'Start free. Send your first invoice in two minutes.' },
            )}
          </h2>
          <p style={{ marginTop: '14px', fontSize: '16px', color: 'rgba(255,255,255,0.78)' }}>
            {t(
              'landing.cta.body',
              {},
              {
                defaultValue: 'No credit card. The free plan includes 25 invoices and 25 clients.',
              },
            )}
          </p>
          <Link
            to="/signup"
            className={cm.cn(cm.fontWeight('bold'))}
            style={{
              display: 'inline-block',
              marginTop: '32px',
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-sidebar-text-active)',
              padding: '16px 36px',
              borderRadius: '9999px',
              textDecoration: 'none',
              fontSize: '16px',
              boxShadow: '0 14px 36px var(--color-accent-shadow)',
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

      <Footer />
    </div>
  )
}

export default Landing
