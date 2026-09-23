import { useEffect } from 'react'

import { track } from '@molecule/app-analytics'
import { ContentPageShell, PlanUpdatedPage } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

export function PlanUpdated() {
  const { t } = useTranslation()
  // Domain event: this route is the post-checkout return — the completion
  // point of the subscription funnel.
  useEffect(() => {
    void track({ name: 'billing.plan_updated' })
  }, [])
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
