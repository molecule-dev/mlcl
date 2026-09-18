import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { useAuth, useTranslation, useVerifyPaymentReturn } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Spinner } from '@molecule/app-ui-react'

import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/** Page frame shared by the confirmation, verifying, and failed states. */
function PlanUpdatedFrame({ children }: { children: ReactNode }) {
  const cm = getClassMap()

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-background text-on-surface font-body',
      )}
    >
      <Header />
      <main
        data-mol-id="page-plan-updated"
        data-testid="plan-updated"
        className={cm.cn(
          cm.flex1,
          cm.mxAuto,
          'w-full max-w-2xl',
          cm.sp('px', 6),
          cm.sp('py', 12),
          cm.flex({ align: 'center', justify: 'center' }),
        )}
      >
        <div className={cm.cn('max-w-md text-center', cm.stack(4))}>{children}</div>
      </main>
      <Footer />
    </div>
  )
}

export function PlanUpdated() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { state } = useAuth()
  // The checkout provider returns the buyer here with the payment id in the
  // query (`?provider=…&sessionId=…`). Confirming it from THIS origin, where
  // the session cookie applies, is what actually grants the plan.
  const verification = useVerifyPaymentReturn()

  if (verification.status === 'verifying') {
    return (
      <PlanUpdatedFrame>
        <Flex align="center" justify="center" className={cm.sp('py', 4)}>
          <Spinner />
        </Flex>
        <h1 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight font-display')}>
          {t('planUpdated.verifying', {}, { defaultValue: 'Confirming your payment…' })}
        </h1>
      </PlanUpdatedFrame>
    )
  }

  if (verification.status === 'failed') {
    return (
      <PlanUpdatedFrame>
        <h1
          className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight font-display')}
          data-mol-id="plan-updated-error"
        >
          {t(
            'planUpdated.verifyFailed',
            {},
            { defaultValue: 'We could not confirm your payment yet.' },
          )}
        </h1>
        <p className={cm.cn('text-sm text-on-surface-variant')}>
          {t(
            'planUpdated.verifyFailedBody',
            {},
            { defaultValue: 'Your payment may still be processing. Try again in a moment.' },
          )}
        </p>
        <Button onClick={verification.retry} data-mol-id="plan-updated-retry">
          {t('planUpdated.retry', {}, { defaultValue: 'Try again' })}
        </Button>
      </PlanUpdatedFrame>
    )
  }

  return (
    <PlanUpdatedFrame>
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
      <h1 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight font-display')}>
        {t('planUpdated.message', {}, { defaultValue: 'Your plan is live.' })}
      </h1>
      <p className={cm.cn('text-sm text-on-surface-variant')}>
        {t(
          'planUpdated.thankYou',
          {},
          {
            defaultValue:
              'Thanks for upgrading. New limits unlock immediately for you and your players.',
          },
        )}
      </p>
      {state.initialized ? (
        <Link
          to="/discover"
          data-testid="plan-updated-back"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'mx-auto inline-flex items-center gap-2 rounded-xl bg-primary text-on-primary shadow-md hover:shadow-lg transition-shadow',
          )}
        >
          {t('planUpdated.returnHome', {}, { defaultValue: 'Back to discover' })}
        </Link>
      ) : (
        <Link
          to="/"
          data-testid="plan-updated-back"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'mx-auto inline-flex items-center gap-2 rounded-xl bg-primary text-on-primary shadow-md hover:shadow-lg transition-shadow',
          )}
        >
          {t('auth.backToHome', {}, { defaultValue: 'Back to home' })}
        </Link>
      )}
    </PlanUpdatedFrame>
  )
}

export default PlanUpdated
