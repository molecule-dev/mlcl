import { ContentPageShell, PlanUpdatedPage } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

export function PlanUpdated() {
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-plan-updated"
      eyebrow={t('settings.billing', {}, { defaultValue: 'Billing' })}
      title={t('planUpdated.message', {}, { defaultValue: 'Your plan has been updated.' })}
      subtitle={t('planUpdated.thankYou', {}, { defaultValue: 'Thank you!' })}
    >
      <PlanUpdatedPage />
    </ContentPageShell>
  )
}

export default PlanUpdated
