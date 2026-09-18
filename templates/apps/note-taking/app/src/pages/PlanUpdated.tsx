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
      title={t('planUpdated.confirmation', {}, { defaultValue: 'Your plan has been updated' })}
    >
      <PlanUpdatedPage
        messageKey="planUpdated.body"
        messageDefault={t(
          'planUpdated.body',
          {},
          { defaultValue: 'Your subscription is now active.' },
        )}
        thankYouDefault={t(
          'planUpdated.thankYou',
          {},
          { defaultValue: 'Thank you for your support!' },
        )}
        actionDefault={t('planUpdated.returnHome', {}, { defaultValue: 'Return home' })}
      />
    </ContentPageShell>
  )
}

export default PlanUpdated
