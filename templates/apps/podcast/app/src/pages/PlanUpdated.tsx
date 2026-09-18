import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { PlanUpdated as PlanUpdatedPage } from '@molecule/app-plan-updated-page-react'
import { useTranslation } from '@molecule/app-react'

import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

export function PlanUpdated() {
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-plan-updated"
      header={<AuthBrandHeader />}
      footer={<Footer />}
      eyebrow={t('settings.billing', {}, { defaultValue: 'Billing' })}
      title={t('planUpdated.message', {}, { defaultValue: 'Your plan was updated' })}
      subtitle={t('planUpdated.thankYou', {}, { defaultValue: 'Thank you for your support!' })}
      bare
    >
      <PlanUpdatedPage
        messageDefault={t('planUpdated.message', {}, { defaultValue: 'Your plan was updated' })}
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
