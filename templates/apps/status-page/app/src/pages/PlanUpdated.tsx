import { useEffect } from 'react'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useAuth, useHttpClient, useTranslation, useVerifyPaymentReturn } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, LoadErrorBanner, Spinner } from '@molecule/app-ui-react'

import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

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

  // Stripe webhook updates `users.planKey` asynchronously after Checkout.
  // The page lands here while the cached user record still reflects the
  // pre-checkout plan. Re-fetch the canonical user via the cookie-backed http
  // client (post-M1-1 the bearer is in-memory + an httpOnly cookie, NOT
  // localStorage — never hand-attach a token), rewrite the cached copy so the
  // next mount of any page (Dashboard, Profile, etc.) picks up the new plan,
  // then call refresh() to wake any in-memory subscribers. The hard reload on
  // "Return home" below also re-inits the running auth client from storage.
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
          // localStorage write failures are non-fatal — refresh() still wakes subscribers.
        }
        await refresh().catch(() => null)
      } catch (_error) {
        // Network blip — the next page mount will see whatever the cache holds.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId, http, refresh, verification.status])

  // Hard navigation forces the molecule auth client to re-init from the
  // refreshed localStorage so consuming pages observe the new planKey.
  const handleReturn = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    window.location.assign('/')
  }

  if (!state.initialized) {
    return (
      <ContentPageShell header={<Header />} footer={<Footer />}>
        <Flex align="center" justify="center" className={cm.sp('py', 12)}>
          <Spinner />
        </Flex>
      </ContentPageShell>
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
        <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'planUpdated.body',
            {},
            {
              defaultValue:
                'Your billing change is now active. You can manage your plan any time from the billing page.',
            },
          )}
        </p>
        <a
          href="/"
          data-mol-id="plan-updated-back"
          onClick={handleReturn}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'mx-auto inline-flex items-center gap-2 rounded-xl bg-primary text-on-primary shadow-md hover:shadow-lg transition-shadow',
          )}
        >
          <Button>{t('planUpdated.returnHome', {}, { defaultValue: 'Return Home' })}</Button>
        </a>
      </div>
    </ContentPageShell>
  )
}
