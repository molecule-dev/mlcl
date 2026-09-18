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
      title={t('planUpdated.confirmation', {}, { defaultValue: 'Your plan has been updated' })}
      subtitle={t('planUpdated.thankYou', {}, { defaultValue: 'Thank you!' })}
      bare
    >
      <PlanUpdatedPage
        messageKey="planUpdated.confirmation"
        messageDefault={t(
          'planUpdated.confirmation',
          {},
          {
            defaultValue: 'Your plan has been updated',
          },
        )}
        thankYouKey="planUpdated.thankYou"
        thankYouDefault={t('planUpdated.thankYou', {}, { defaultValue: 'Thank you!' })}
        actionKey="common.returnHome"
        actionDefault={t('planUpdated.returnHome', {}, { defaultValue: 'Return home' })}
      />
    </ContentPageShell>
  )
}

export default PlanUpdated
