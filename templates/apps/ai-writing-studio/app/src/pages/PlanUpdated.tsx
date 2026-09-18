import { ContentPageShell, PlanUpdatedPage } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/**
 * Returned-from-Stripe confirmation page. Wraps the canonical
 * `@molecule/app-legal-pages-react` `PlanUpdatedPage` (two confirmation
 * headings + a single return-home action) with our branded shell and
 * app-specific i18n keys/defaults, so the wording can be localized per-app
 * without forking the shared component.
 *
 * @returns The rendered plan-updated page.
 */
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
        thankYouKey="planUpdated.thankYou"
        thankYouDefault={t('planUpdated.thankYou', {}, { defaultValue: 'Thank you!' })}
        actionKey="planUpdated.returnHome"
        actionDefault={t('planUpdated.returnHome', {}, { defaultValue: 'Return home' })}
      />
    </ContentPageShell>
  )
}

export default PlanUpdated
