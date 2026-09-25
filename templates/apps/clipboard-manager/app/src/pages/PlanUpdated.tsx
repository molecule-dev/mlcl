import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useAuth, useTranslation, useVerifyPaymentReturn } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Flex, LoadErrorBanner, Spinner } from '@molecule/app-ui-react'

import { ACCENT_COLOR } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { KbdBadge } from '../components/KbdBadge.js'

export function PlanUpdated() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { state } = useAuth()
  // The checkout provider returns the buyer here with the payment id in the
  // query (`?provider=…&sessionId=…`). Confirming it from THIS origin, where
  // the session cookie applies, is what actually grants the plan.
  const verification = useVerifyPaymentReturn()

  if (!state.initialized) {
    return (
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.sp('py', 24))}>
        <span
          className="material-symbols-outlined text-3xl text-on-surface-variant animate-spin"
          aria-hidden="true"
        >
          progress_activity
        </span>
      </div>
    )
  }

  if (verification.status === 'verifying') {
    return (
      <ContentPageShell
        dataMolId="page-plan-updated"
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
      footer={<Footer />}
      eyebrow={t('settings.billing', {}, { defaultValue: 'Billing' })}
      title={t('planUpdated.message', {}, { defaultValue: 'Plan updated.' })}
      subtitle={t(
        'planUpdated.thankYou',
        {},
        { defaultValue: 'Thanks for upgrading — every device is already on the new tier.' },
      )}
    >
      <div
        className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'lg' }), cm.textCenter)}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'w-16 h-16 rounded-full',
          )}
          style={{ background: ACCENT_COLOR }}
        >
          <span className="material-symbols-outlined text-4xl text-white" aria-hidden="true">
            check
          </span>
        </div>
        <Link
          to="/clips"
          data-mol-id="plan-updated-back"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'rounded-md text-white transition-all hover:opacity-90 active:scale-[0.98]',
          )}
          style={{ background: 'var(--color-primary)' }}
        >
          <span>{t('planUpdated.returnHome', {}, { defaultValue: 'Back to your clips' })}</span>
          <KbdBadge>↵</KbdBadge>
        </Link>
      </div>
    </ContentPageShell>
  )
}

export default PlanUpdated
export { PlanUpdated as PlanUpdatedPage }
