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
  category?: string
  name?: string
  isFree?: boolean
}

interface UserProfile {
  id: string
  email: string
  name?: string | null
  planKey?: string | null
}

export function PlanUpdated() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { state } = useAuth()
  const http = useHttpClient()
  const [planLabel, setPlanLabel] = useState<string | null>(null)
  // The checkout provider returns the buyer here with the payment id in the
  // query (`?provider=…&sessionId=…`). Confirming it from THIS origin, where
  // the session cookie applies, is what actually grants the plan.
  const verification = useVerifyPaymentReturn()

  // After a Stripe redirect the user's plan should reflect the new tier.
  // Re-fetch the profile + billing status so any client-side caches see
  // the current planKey and the user lands on a confirmation that
  // matches reality (not the stale 'free' label that an unfresh auth
  // store would show).
  useEffect(() => {
    // Reading the plan before the checkout return is confirmed would show the
    // pre-purchase plan; re-runs once verification settles.
    if (verification.status === 'verifying') return
    if (!state.initialized) return
    let cancelled = false
    Promise.all([
      http.get<UserProfile>('/api/users/me').catch(() => null),
      http.get<BillingStatus>('/api/billing/status').catch(() => null),
    ]).then(([profileRes, statusRes]) => {
      if (cancelled) return
      const status = statusRes?.data
      const profile = profileRes?.data
      const label =
        status?.name ||
        (status?.planKey && status.planKey.replace(/^./, (c) => c.toUpperCase())) ||
        (profile?.planKey && profile.planKey.replace(/^./, (c) => c.toUpperCase())) ||
        null
      setPlanLabel(label)
    })
    return () => {
      cancelled = true
    }
  }, [state.initialized, http, verification.status])

  if (!state.initialized) {
    return (
      <Flex align="center" justify="center" className={cm.sp('py', 12)}>
        <Spinner />
      </Flex>
    )
  }

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
      title={t('planUpdated.message', {}, { defaultValue: 'Your plan has been updated.' })}
      subtitle={t('planUpdated.thankYou', {}, { defaultValue: 'Thank you!' })}
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
        {planLabel && (
          <p
            className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}
            data-mol-id="plan-updated-current"
          >
            {t(
              'planUpdated.currentPlan',
              { plan: planLabel },
              { defaultValue: 'You are currently on the {{plan}} plan.' },
            )}
          </p>
        )}
        <Link to="/">
          <Button data-mol-id="plan-updated-back">
            {t('planUpdated.returnHome', {}, { defaultValue: 'Return home' })}
          </Button>
        </Link>
      </div>
    </ContentPageShell>
  )
}
