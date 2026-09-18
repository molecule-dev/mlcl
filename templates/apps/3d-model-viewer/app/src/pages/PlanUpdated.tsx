import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useAuth, useTranslation, useVerifyPaymentReturn } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Spinner } from '@molecule/app-ui-react'

import LandingFooter from '../components/LandingFooter.js'
import TopNavBar from '../components/TopNavBar.js'

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
      <ContentPageShell
        dataMolId="page-plan-updated"
        header={<TopNavBar />}
        footer={<LandingFooter />}
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
        header={<TopNavBar />}
        footer={<LandingFooter />}
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
      header={<TopNavBar />}
      footer={<LandingFooter />}
      eyebrow={t('settings.billing', {}, { defaultValue: 'Billing' })}
      title={t('planUpdated.message', {}, { defaultValue: 'Your plan has been updated.' })}
      subtitle={t('planUpdated.thankYou', {}, { defaultValue: 'Thank you for your subscription!' })}
    >
      <div className={cm.cn(cm.textCenter, cm.stack(4))}>
        {!state.initialized ? (
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
            <Link to="/">
              <Button data-mol-id="plan-updated-back">
                {t('common.returnHome', {}, { defaultValue: 'Return to Home' })}
              </Button>
            </Link>
          </>
        )}
      </div>
    </ContentPageShell>
  )
}
