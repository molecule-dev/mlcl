import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useAuth, useHttpClient, useTranslation, useVerifyPaymentReturn } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, LoadErrorBanner, Spinner } from '@molecule/app-ui-react'

import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface BillingStatus {
  planKey?: string
  name?: string
  status?: string
}

export function PlanUpdated() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { state } = useAuth()
  const http = useHttpClient()
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  // The checkout provider returns the buyer here with the payment id in the
  // query (`?provider=…&sessionId=…`). Confirming it from THIS origin, where
  // the session cookie applies, is what actually grants the plan.
  const verification = useVerifyPaymentReturn()

  useEffect(() => {
    // Reading the plan before the checkout return is confirmed would show the
    // pre-purchase plan; re-runs once verification settles.
    if (verification.status === 'verifying') return
    if (!state.initialized) return
    let cancelled = false
    async function load() {
      try {
        const res = await http.get('/api/billing/status')
        if (cancelled) return
        setStatus((res.data as BillingStatus) ?? null)
      } catch (_error) {
        // billing status fetch failed; show empty state
        if (!cancelled) setStatus(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http, state.initialized, verification.status])

  if (!state.initialized) {
    return (
      <Flex align="center" justify="center" className={cm.sp('py', 12)}>
        <Spinner />
      </Flex>
    )
  }

  const planLabel =
    status?.name ??
    status?.planKey ??
    t('planUpdated.fallbackPlan', {}, { defaultValue: 'your plan' })

  if (verification.status === 'verifying') {
    return (
      <ContentPageShell
        dataMolId="page-plan-updated"
        header={<Header />}
        footer={<Footer />}
        eyebrow={t('settings.billing', {}, { defaultValue: 'Billing' })}
        title={t('planUpdated.verifying', {}, { defaultValue: 'Confirming your payment…' })}
      >
        <Flex align="center" justify="center" className={cm.sp('py', 12)}>
          <Spinner />
        </Flex>
      </ContentPageShell>
    )
  }

  if (verification.status === 'failed') {
    return (
      <ContentPageShell
        dataMolId="page-plan-updated"
        header={<Header />}
        footer={<Footer />}
        eyebrow={t('settings.billing', {}, { defaultValue: 'Billing' })}
        title={t(
          'planUpdated.verifyFailed',
          {},
          { defaultValue: 'We could not confirm your payment yet.' },
        )}
      >
        <LoadErrorBanner
          data-mol-id="plan-updated-error"
          message={t(
            'planUpdated.verifyFailedBody',
            {},
            { defaultValue: 'Your payment may still be processing. Try again in a moment.' },
          )}
          onRetry={verification.retry}
          retryLabel={t('planUpdated.retry', {}, { defaultValue: 'Try again' })}
          retryMolId="plan-updated-retry"
        />
      </ContentPageShell>
    )
  }

  return (
    <ContentPageShell
      dataMolId="page-plan-updated"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('settings.billing', {}, { defaultValue: 'Billing' })}
      title={t(
        'planUpdated.heading',
        { plan: planLabel },
        { defaultValue: 'Your celebration workspace is now unlimited.' },
      )}
      subtitle={
        loading
          ? t('planUpdated.loading', {}, { defaultValue: 'Confirming your subscription…' })
          : t(
              'planUpdated.thankYou',
              { plan: planLabel },
              {
                defaultValue:
                  'Welcome to the {{plan}} suite. All limits on your guest list, RSVPs, and seating studio have been lifted — you can return to the dashboard or get back to the checklist.',
              },
            )
      }
    >
      <div className={cm.cn(cm.textCenter, cm.stack(4))}>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'mx-auto h-16 w-16 rounded-full bg-primary/10 text-primary',
          )}
          aria-hidden="true"
        >
          <span className={cm.cn('material-symbols-outlined')} style={{ fontSize: '2rem' }}>
            check_circle
          </span>
        </span>
        <Flex align="center" justify="center" className={cm.cn(cm.sp('mt', 2), 'gap-3')}>
          <Link to="/dashboard" data-mol-id="plan-updated-back">
            <Button>{t('planUpdated.toDashboard', {}, { defaultValue: 'Go to dashboard' })}</Button>
          </Link>
          <Link to="/">
            <Button variant="outline">
              {t('planUpdated.returnHome', {}, { defaultValue: 'Return home' })}
            </Button>
          </Link>
        </Flex>
      </div>

      {/* Immediate next steps in your suite */}
      <section className={cm.cn(cm.stack(3), 'mt-4')} data-mol-id="plan-updated-next-steps">
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
          {t(
            'planUpdated.nextStepsTitle',
            {},
            { defaultValue: 'Immediate next steps in your suite' },
          )}
        </h2>
        <ul className={cm.cn('grid gap-3 sm:grid-cols-2')}>
          {(
            [
              {
                key: 'guests',
                to: '/guests',
                icon: 'group',
                defaultTitle: 'Unlimited guest list & RSVPs',
                defaultBody: 'Keep adding guests — the free-tier cap is gone from your account.',
              },
              {
                key: 'seating',
                to: '/seating',
                icon: 'table_restaurant',
                defaultTitle: 'Interactive seating studio',
                defaultBody:
                  'Draw every table and seat the full guest list with live capacity checks.',
              },
              {
                key: 'vendors',
                to: '/vendors',
                icon: 'storefront',
                defaultTitle: 'Vendor pipeline & milestones',
                defaultBody: 'Track every artisan from first research to the final paid invoice.',
              },
              {
                key: 'budget',
                to: '/budget',
                icon: 'savings',
                defaultBody: 'Log deposits and installments against every estimate as they land.',
                defaultTitle: 'Budget & installment tracker',
              },
            ] as const
          ).map((step) => (
            <li key={step.key}>
              <Link
                to={step.to}
                data-mol-id={`plan-updated-step-${step.key}`}
                className={cm.cn(
                  cm.sp('p', 5),
                  'flex items-start gap-3 rounded-2xl bg-surface border border-outline-variant/40 shadow-sm hover:border-primary/50 transition-colors',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-10 h-10 shrink-0 rounded-xl bg-primary-fixed/40 text-primary',
                  )}
                >
                  <span className="material-symbols-outlined text-xl" aria-hidden="true">
                    {step.icon}
                  </span>
                </span>
                <span className="min-w-0 text-left">
                  <span className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), 'block')}>
                    {t(
                      `planUpdated.step.${step.key}.title`,
                      {},
                      { defaultValue: step.defaultTitle },
                    )}
                  </span>
                  <span
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant block mt-0.5')}
                  >
                    {t(`planUpdated.step.${step.key}.body`, {}, { defaultValue: step.defaultBody })}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Atelier suite details — the plan on record */}
      <section className={cm.cn(cm.stack(2), 'mt-4')} data-mol-id="plan-updated-suite">
        <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {t('planUpdated.suiteTitle', {}, { defaultValue: 'Everly Atelier Suite Details' })}
        </h3>
        <dl
          className={cm.cn(
            cm.sp('p', 5),
            'rounded-2xl bg-surface-container-low border border-outline-variant/40',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', wrap: 'wrap' }),
              'gap-2',
            )}
          >
            <dt className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('planUpdated.suitePlan', {}, { defaultValue: 'Plan' })}
            </dt>
            <dd className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>{planLabel}</dd>
          </div>
          {!loading && status ? (
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', wrap: 'wrap' }),
                'gap-2 mt-2',
              )}
            >
              <dt className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('planUpdated.suiteStatus', {}, { defaultValue: 'Status' })}
              </dt>
              <dd
                className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}
                style={{ color: 'var(--color-success)' }}
              >
                {t('planUpdated.suiteActive', {}, { defaultValue: 'Active' })}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>
    </ContentPageShell>
  )
}
