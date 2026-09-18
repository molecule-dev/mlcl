import { useEffect } from 'react'

import { ContentPageShell, PlanUpdatedPage } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

export function PlanUpdated() {
  const { t } = useTranslation()
  useEffect(() => {
    document.title = t(
      'planUpdated.pageTitle',
      { appName: APP_NAME },
      { defaultValue: 'Plan updated — {{appName}} Support' },
    )
  }, [t])
  return (
    <ContentPageShell
      dataMolId="page-plan-updated"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('settings.billing', {}, { defaultValue: 'Billing' })}
      title={t('planUpdated.title', {}, { defaultValue: 'Plan updated' })}
      subtitle={t('planUpdated.subtitle', {}, { defaultValue: 'Thank you' })}
    >
      <PlanUpdatedPage
        messageKey="planUpdated.title"
        messageDefault="Plan updated"
        thankYouKey="planUpdated.subtitle"
        thankYouDefault="Thank you"
        actionKey="planUpdated.homeButton"
        actionDefault="Return home"
      />
    </ContentPageShell>
  )
}

export default PlanUpdated
