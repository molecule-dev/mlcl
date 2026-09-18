import { ContentPageShell, PlanUpdatedPage } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

export function PlanUpdated() {
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-plan-updated"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('settings.billing', {}, { defaultValue: 'Billing' })}
      title={t('planUpdated.message', {}, { defaultValue: 'Your plan has been updated.' })}
      subtitle={t('planUpdated.thankYou', {}, { defaultValue: 'Thank you!' })}
      bare
    >
      <PlanUpdatedPage
        messageKey="planUpdated.message"
        thankYouKey="planUpdated.thankYou"
        actionKey="planUpdated.returnHome"
        aria-label={t('planUpdated.pageLabel', {}, { defaultValue: 'Plan updated confirmation' })}
      />
    </ContentPageShell>
  )
}

export default PlanUpdated
