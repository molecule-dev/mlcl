import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useHttpClient, useTranslation, useVerifyPaymentReturn } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Flex, LoadErrorBanner, Spinner } from '@molecule/app-ui-react'

import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface BillingStatus {
  planKey?: string
  name?: string
  category?: string
}

export function PlanUpdated() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [status, setStatus] = useState<BillingStatus | null>(null)
  // The checkout provider returns the buyer here with the payment id in the
  // query (`?provider=…&sessionId=…`). Confirming it from THIS origin, where
  // the session cookie applies, is what actually grants the plan.
  const verification = useVerifyPaymentReturn()

  useEffect(() => {
    // Reading the plan before the checkout return is confirmed would show the
    // pre-purchase plan; re-runs once verification settles.
    if (verification.status === 'verifying') return
    let cancelled = false
    http
      .get<BillingStatus>('/api/billing/status')
      .then((res) => {
        if (cancelled) return
        const body = (res as { data?: BillingStatus }).data ?? (res as unknown as BillingStatus)
        setStatus(body)
      })
      .catch(() => {
        if (!cancelled) setStatus({})
      })
    return () => {
      cancelled = true
    }
  }, [http, verification.status])

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
          retryLabel={t('planUpdated.retry', {}, { defaultValue: 'Try again' })}
          retryMolId="plan-updated-retry"
          onRetry={verification.retry}
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
        { plan: status?.name ?? '' },
        { defaultValue: status?.name ? `You're on ${status.name}` : 'Subscription updated' },
      )}
      subtitle={t(
        'planUpdated.body',
        {},
        {
          defaultValue:
            'Welcome aboard. Higher retention, larger ingest budgets, and more saved searches are now available.',
        },
      )}
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
        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'md' }), 'flex-wrap')}
        >
          <Link
            to="/dashboard"
            data-mol-id="plan-updated-back"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'inline-flex items-center gap-2 rounded-xl bg-primary text-on-primary shadow-md hover:shadow-lg transition-shadow',
            )}
          >
            {t('planUpdated.openDashboard', {}, { defaultValue: 'Open dashboard' })}
          </Link>
          <Link
            to="/streams"
            data-mol-id="plan-updated-streams"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'inline-flex items-center gap-2 rounded-xl border border-outline-variant hover:bg-surface-container-low transition-colors',
            )}
          >
            {t('planUpdated.openStreams', {}, { defaultValue: 'Manage streams' })}
          </Link>
        </div>
      </div>
    </ContentPageShell>
  )
}
