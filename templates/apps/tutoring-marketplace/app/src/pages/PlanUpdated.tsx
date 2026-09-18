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
        messageDefault={t(
          'planUpdated.message',
          {},
          { defaultValue: 'Your plan has been updated.' },
        )}
        thankYouKey="planUpdated.body"
        thankYouDefault={t(
          'planUpdated.body',
          {},
          {
            defaultValue:
              'Your billing change is now active. You can manage your plan any time from the billing page.',
          },
        )}
        actionKey="planUpdated.returnHome"
        actionDefault={t('planUpdated.returnHome', {}, { defaultValue: 'Return Home' })}
        actionHref="/"
      />
    </ContentPageShell>
  )
}

export default PlanUpdated
