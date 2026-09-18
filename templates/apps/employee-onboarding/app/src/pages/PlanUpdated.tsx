import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useAuth, useHttpClient, useTranslation, useVerifyPaymentReturn } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Spinner } from '@molecule/app-ui-react'

import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface BillingStatus {
  planKey?: string
  name?: string
  category?: string
  isFree?: boolean
}

export function PlanUpdated() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { state } = useAuth()
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
    if (!http) return
    let cancelled = false
    http
      .get<BillingStatus>('/api/billing/status')
      .then((r) => {
        if (!cancelled) setStatus(r.data ?? null)
      })
      .catch(() => {
        if (!cancelled) setStatus(null)
      })
    return () => {
      cancelled = true
    }
  }, [http, verification.status])

  const planTitle = state.initialized
    ? status?.name
      ? t(
          'planUpdated.heading',
          { plan: status.name },
          { defaultValue: `You're on ${status.name}` },
        )
      : t('planUpdated.message', {}, { defaultValue: "You're all set." })
    : t('planUpdated.preparing', {}, { defaultValue: 'Updating your plan…' })

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
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('settings.billing', {}, { defaultValue: 'Billing' })}
      title={planTitle}
      subtitle={t(
        'planUpdated.thankYou',
        {},
        { defaultValue: 'Thanks for upgrading — your team gets the unlocks immediately.' },
      )}
    >
      <div className={cm.cn(cm.textCenter, cm.stack(6))}>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'mx-auto h-16 w-16 rounded-full bg-primary/10 text-primary',
          )}
          aria-hidden="true"
          style={{ background: 'color-mix(in srgb, var(--mol-color-primary) 10%, transparent)' }}
        >
          <span className={cm.cn('material-symbols-outlined')} style={{ fontSize: '2rem' }}>
            {state.initialized ? 'check_circle' : 'autorenew'}
          </span>
        </span>
        <Link
          to="/dashboard"
          data-mol-id="plan-updated-back"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'mx-auto inline-flex items-center gap-2 rounded-xl bg-primary text-on-primary shadow-md hover:shadow-lg transition-shadow',
          )}
        >
          {t('planUpdated.returnHome', {}, { defaultValue: 'Back to your dashboard' })}
        </Link>
      </div>
    </ContentPageShell>
  )
}
