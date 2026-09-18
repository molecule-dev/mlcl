import { ContentPageShell, PlanUpdatedPage } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { Footer } from '../components/Footer.js'

/**
 * Rendered inside FlightSearchLayout, which already provides the app
 * header (brand + nav + user menu) — so no `header` slot is passed here.
 */
export function PlanUpdated() {
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-plan-updated"
      footer={<Footer />}
      eyebrow={t('settings.billing', {}, { defaultValue: 'Billing' })}
      title={t('planUpdated.message', {}, { defaultValue: 'Your plan has been updated.' })}
      subtitle={t('planUpdated.thankYou', {}, { defaultValue: 'Thank you!' })}
    >
      <PlanUpdatedPage />
    </ContentPageShell>
  )
}

export default PlanUpdated
