import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useAuth, useHttpClient, useTranslation, useVerifyPaymentReturn } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Spinner } from '@molecule/app-ui-react'

import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

type ConfirmStatus = 'pending' | 'confirming' | 'success' | 'unpaid' | 'error' | 'noop'

export function PlanUpdated() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { state } = useAuth()
  const http = useHttpClient()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const planKey = searchParams.get('planKey')
  const [status, setStatus] = useState<ConfirmStatus>(sessionId ? 'pending' : 'noop')
  const ranRef = useRef(false)
  // The checkout provider returns the buyer here with the payment id in the
  // query (`?provider=…&sessionId=…`). Confirming it from THIS origin, where
  // the session cookie applies, is what actually grants the plan.
  const verification = useVerifyPaymentReturn()

  useEffect(() => {
    if (ranRef.current) return
    if (!sessionId) return
    if (!state.initialized) return
    ranRef.current = true
    setStatus('confirming')
    // The user just returned from a successful Stripe Checkout. Tell
    // the backend to verify the session against Stripe and (if paid)
    // flip planKey + grant credits. Without this call, paying users
    // would never actually transition off the Starter plan in the DB.
    http
      .post<{ planKey?: string; confirmed?: boolean }>('/api/plans/confirm-checkout', {
        sessionId,
      })
      .then((res) => {
        if (res?.data?.confirmed) {
          setStatus('success')
        } else {
          setStatus('error')
        }
      })
      .catch((err: unknown) => {
        const code =
          err && typeof err === 'object' && 'status' in err
            ? Number((err as { status?: number }).status)
            : 0
        setStatus(code === 402 ? 'unpaid' : 'error')
      })
  }, [http, sessionId, state.initialized])

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
      title={t('planUpdated.message')}
    >
      <div className={cm.cn(cm.textCenter, cm.stack(4))}>
        {!state.initialized || status === 'confirming' ? (
          <Flex align="center" justify="center" className={cm.sp('py', 4)}>
            <Spinner />
          </Flex>
        ) : (
          <>
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
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'))}>
              {t('planUpdated.thankYou')}
            </h2>
            {status === 'success' && planKey ? (
              <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                {t(
                  'planUpdated.confirmed',
                  { planKey },
                  { defaultValue: 'Your {{planKey}} plan is active and credits have been added.' },
                )}
              </p>
            ) : null}
            {status === 'unpaid' ? (
              <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                {t(
                  'planUpdated.unpaid',
                  {},
                  {
                    defaultValue:
                      'Your checkout session has not been paid. Try again from Settings.',
                  },
                )}
              </p>
            ) : null}
            {status === 'error' ? (
              <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                {t(
                  'planUpdated.error',
                  {},
                  {
                    defaultValue:
                      'We could not confirm your upgrade automatically. Please contact support.',
                  },
                )}
              </p>
            ) : null}
            <Link to="/">
              <Button>{t('planUpdated.returnHome')}</Button>
            </Link>
          </>
        )}
      </div>
    </ContentPageShell>
  )
}
