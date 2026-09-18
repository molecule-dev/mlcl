import { ContentPageShell, PlanUpdatedPage } from '@molecule/app-legal-pages-react'
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
      title={t('planUpdated.message', {}, { defaultValue: 'Your plan has been updated.' })}
      subtitle={t('planUpdated.thankYou', {}, { defaultValue: 'Thank you!' })}
      bare
    >
      <PlanUpdatedPage
        messageDefault={t(
          'planUpdated.message',
          {},
          { defaultValue: 'Your plan has been updated.' },
        )}
        thankYouDefault={t('planUpdated.thankYou', {}, { defaultValue: 'Thank you!' })}
        actionDefault={t('planUpdated.returnHome', {}, { defaultValue: 'Return Home' })}
      />
    </ContentPageShell>
  )
}

export default PlanUpdated
