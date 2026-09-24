import { useEffect } from 'react'
import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useAuth, useHttpClient, useTranslation, useVerifyPaymentReturn } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Flex, LoadErrorBanner, Spinner } from '@molecule/app-ui-react'

import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

export function PlanUpdated() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { state, refresh } = useAuth()
  const http = useHttpClient()
  const userId = (state.user as { id?: string } | null | undefined)?.id
  // The checkout provider returns the buyer here with the payment id in the
  // query (`?provider=…&sessionId=…`). Confirming it from THIS origin, where
  // the session cookie applies, is what actually grants the plan.
  const verification = useVerifyPaymentReturn()

  // After returning from Stripe Checkout the user's planKey/tier is stale —
  // explicitly refetch the user record so the rest of the app sees the new
  // plan immediately. We update the cached snapshot in localStorage so a
  // page reload re-hydrates with the new plan, then call refresh() to wake
  // any in-memory subscribers.
  useEffect(() => {
    // Reading the plan before the checkout return is confirmed would show the
    // pre-purchase plan; re-runs once verification settles.
    if (verification.status === 'verifying') return
    if (!userId) return
    let cancelled = false
    void (async () => {
      try {
        const res = await http.get(`/api/users/${userId}`)
        if (cancelled) return
        const body = (res?.data ?? res) as Record<string, unknown> | null
        if (!body) return
        try {
          const raw = window.localStorage.getItem('molecule:auth:user')
          if (raw) {
            const parsed = JSON.parse(raw) as Record<string, unknown>
            const props = (body.props ?? body) as Record<string, unknown>
            const next = { ...parsed, ...props }
            window.localStorage.setItem('molecule:auth:user', JSON.stringify(next))
          }
        } catch (_error) {
          // localStorage write failures are non-fatal.
        }
        await refresh().catch(() => null)
      } catch (_error) {
        // Network failure — non-fatal, the rest of the page still renders.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId, http, refresh, verification.status])

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
        header={<AuthBrandHeader />}
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
        header={<AuthBrandHeader />}
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
      header={<AuthBrandHeader />}
      footer={<Footer />}
      eyebrow={t('settings.billing', {}, { defaultValue: 'Billing' })}
      title={t('planUpdated.message', {}, { defaultValue: 'Plan updated' })}
      subtitle={t('planUpdated.thankYou', {}, { defaultValue: 'Thank you for upgrading.' })}
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
        <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'planUpdated.body',
            {},
            {
              defaultValue:
                'Your billing change is now active. You can manage your plan any time from the pricing page.',
            },
          )}
        </p>
        <Link
          to="/"
          data-mol-id="plan-updated-back"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            cm.roundedFull,
            'mx-auto inline-flex items-center bg-primary text-on-primary hover:bg-primary/90 transition-colors',
          )}
        >
          {t('planUpdated.returnHome', {}, { defaultValue: 'Return home' })}
        </Link>
      </div>
    </ContentPageShell>
  )
}
