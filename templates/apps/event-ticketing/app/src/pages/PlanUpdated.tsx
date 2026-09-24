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
        {/* data-mol-id + the old retry button's id ride along so existing
            locators keep working; the banner owns the retry pending state. */}
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
        { defaultValue: 'Welcome to {{plan}}.' },
      )}
      subtitle={
        loading
          ? t('planUpdated.loading', {}, { defaultValue: 'Confirming your subscription…' })
          : t(
              'planUpdated.thankYou',
              {},
              {
                defaultValue:
                  'Your account has been updated. You can return to the dashboard or browse upcoming events now.',
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
    </ContentPageShell>
  )
}
