import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { PlanUpdated as PlanUpdatedPage } from '@molecule/app-plan-updated-page-react'
import { useTranslation } from '@molecule/app-react'

import { Footer } from '../components/Footer.js'

export function PlanUpdated() {
  const { t } = useTranslation()
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
