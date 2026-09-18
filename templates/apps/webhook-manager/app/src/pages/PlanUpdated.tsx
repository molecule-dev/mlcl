import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useAuth, useTranslation, useVerifyPaymentReturn } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Spinner } from '@molecule/app-ui-react'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

export function PlanUpdated() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { state } = useAuth()
  const initialized = state.initialized
  // The checkout provider returns the buyer here with the payment id in the
  // query (`?provider=…&sessionId=…`). Confirming it from THIS origin, where
  // the session cookie applies, is what actually grants the plan.
  const verification = useVerifyPaymentReturn()

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
      title={t('planUpdated.message', {}, { defaultValue: 'Your plan has been updated.' })}
      subtitle={t(
        'planUpdated.thankYou',
        {},
        {
          defaultValue: "Thanks for upgrading. Every payload counts — let's deliver them.",
        },
      )}
    >
      <div className={cm.cn(cm.textCenter, cm.stack(6))}>
        <div
          className={cm.cn(
            'mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full',
          )}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--mol-color-primary) 15%, transparent)',
            color: BRAND_COLOR,
            boxShadow: '0 0 0 6px color-mix(in srgb, var(--mol-color-primary) 10%, transparent)',
          }}
        >
          <span className={cm.cn('material-symbols-outlined text-4xl')} aria-hidden="true">
            task_alt
          </span>
        </div>
        <p
          className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
          style={{ color: BRAND_COLOR }}
        >
          {t('planUpdated.eyebrow', { app: APP_NAME }, { defaultValue: '{{app}} · subscription' })}
        </p>
        <Link
          to={initialized ? '/dashboard' : '/'}
          data-mol-id="plan-updated-back"
          className={cm.cn(
            'mx-auto inline-flex items-center gap-2 px-6 py-3 font-mono font-semibold rounded-md transition-all hover:opacity-90 shadow-xl',
          )}
          style={{
            backgroundColor: BRAND_COLOR,
            color: 'var(--color-on-primary)',
            boxShadow:
              '0 12px 32px -10px color-mix(in srgb, var(--mol-color-primary) 45%, transparent)',
          }}
        >
          {t('auth.backToDashboard', {}, { defaultValue: 'Back to dashboard' })}
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_forward
          </span>
        </Link>
      </div>
    </ContentPageShell>
  )
}
