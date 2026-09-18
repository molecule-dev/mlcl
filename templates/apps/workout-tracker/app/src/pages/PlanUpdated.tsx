import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useAuth, useHttpClient, useTranslation, useVerifyPaymentReturn } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Spinner } from '@molecule/app-ui-react'

import { Footer } from '../components/Footer.js'

interface BillingStatus {
  planKey?: string
  category?: string
  name?: string
  isFree?: boolean
}

/**
 * Post-checkout landing page. Stripe redirects here on completed checkout
 * (success_url) and on cancel. We re-fetch /api/billing/status so the
 * displayed plan reflects the new entitlement (driven by the
 * `payment-notification/stripe` webhook on the server).
 */
export function PlanUpdated() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { state, refresh } = useAuth()
  const http = useHttpClient()
  const [params] = useSearchParams()
  const cancelled = params.get('cancelled') === 'true' || params.get('cancelled') === '1'
  // The checkout provider returns the buyer here with the payment id in the
  // query (`?provider=…&sessionId=…`). Confirming it from THIS origin, where
  // the session cookie applies, is what actually grants the plan.
  const verification = useVerifyPaymentReturn()

  useEffect(() => {
    // Reading the plan before the checkout return is confirmed would show the
    // pre-purchase plan; re-runs once verification settles.
    if (verification.status === 'verifying') return
    void refresh().catch(() => null)
    void http.get<BillingStatus>('/billing/status').catch(() => null)
  }, [http, refresh, verification.status])

  if (verification.status === 'verifying') {
    return (
      <ContentPageShell
        dataMolId="page-plan-updated"
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
        footer={<Footer />}
        eyebrow={t('settings.billing', {}, { defaultValue: 'Billing' })}
        title={t(
          'planUpdated.verifyFailed',
          {},
          { defaultValue: 'We could not confirm your payment yet.' },
        )}
      >
        <div className={cm.cn(cm.textCenter, cm.stack(4))} data-mol-id="plan-updated-error">
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'planUpdated.verifyFailedBody',
              {},
              { defaultValue: 'Your payment may still be processing. Try again in a moment.' },
            )}
          </p>
          <Button onClick={verification.retry} data-mol-id="plan-updated-retry">
            {t('planUpdated.retry', {}, { defaultValue: 'Try again' })}
          </Button>
        </div>
      </ContentPageShell>
    )
  }

  return (
    <ContentPageShell
      dataMolId="page-plan-updated"
      footer={<Footer />}
      eyebrow={t('settings.billing', {}, { defaultValue: 'Billing' })}
      title={
        cancelled
          ? t('planUpdated.cancelled.title', {}, { defaultValue: 'Checkout cancelled' })
          : t('planUpdated.success.title', {}, { defaultValue: 'Plan updated' })
      }
      subtitle={
        cancelled
          ? t(
              'planUpdated.cancelled.body',
              {},
              { defaultValue: "No charges were made. You can pick a plan whenever you're ready." },
            )
          : t(
              'planUpdated.success.body',
              {},
              {
                defaultValue: 'Thanks for upgrading. Your new entitlements are active right away.',
              },
            )
      }
    >
      <div className={cm.cn(cm.textCenter, cm.stack(4))} data-testid="plan-updated">
        {state.initialized ? (
          <div className={cm.cn(cm.flex({ gap: 'sm', justify: 'center' }))}>
            <Link
              to="/dashboard"
              data-mol-id="plan-updated-back"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                'rounded-full bg-primary text-on-primary hover:bg-primary-light transition-colors uppercase tracking-wide',
              )}
            >
              {t('auth.backToDashboard', {}, { defaultValue: 'Back to dashboard' })}
            </Link>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                'rounded-full border border-outline text-on-surface hover:bg-surface-variant transition-colors uppercase tracking-wide',
              )}
            >
              {t('planUpdated.viewPlans', {}, { defaultValue: 'View plans' })}
            </Link>
          </div>
        ) : null}
      </div>
    </ContentPageShell>
  )
}
