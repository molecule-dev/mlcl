import { useEffect } from 'react'

import { track } from '@molecule/app-analytics'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { PlanUpdated as PlanUpdatedPage } from '@molecule/app-plan-updated-page-react'
import { useTranslation } from '@molecule/app-react'

import { Footer } from '../components/Footer.js'

export function PlanUpdated() {
  const { t } = useTranslation()
  // Conversion-flow confirmation surface (the Stripe-return landing): record
  // the completed plan change once on mount. No-op without a provider bonded —
  // and never a business-API call.
  useEffect(() => {
    void track({ name: 'plan.updated' })
  }, [])
  return (
    <ContentPageShell
      dataMolId="page-plan-updated"
      bare
      footer={<Footer />}
      eyebrow={t('settings.billing', {}, { defaultValue: 'Billing' })}
      title={t('planUpdated.message', {}, { defaultValue: 'Your plan was updated' })}
    >
      <PlanUpdatedPage />
    </ContentPageShell>
  )
}

export default PlanUpdated
