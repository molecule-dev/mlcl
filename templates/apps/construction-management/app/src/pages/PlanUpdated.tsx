import { useEffect } from 'react'

import { ContentPageShell, PlanUpdatedPage } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

/**
 * Returned-from-Stripe confirmation page. Wraps the canonical
 * `@molecule/app-legal-pages-react` `PlanUpdatedPage` with our app-specific
 * keys + defaults so the wording can be localized per-app without forking
 * the shared component.
 *
 * @returns The rendered plan-updated page.
 */
export function PlanUpdated() {
  const { t } = useTranslation()
  const heading = t('planUpdated.heading', {}, { defaultValue: 'Your plan has been updated' })

  useEffect(() => {
    document.title = heading
  }, [heading])

  return (
    <ContentPageShell
      dataMolId="page-plan-updated"
      eyebrow={t('settings.billing', {}, { defaultValue: 'Billing' })}
      title={heading}
      subtitle={t('planUpdated.subheading', {}, { defaultValue: 'Thank you!' })}
      bare
    >
      <PlanUpdatedPage
        messageKey="planUpdated.heading"
        messageDefault={heading}
        thankYouKey="planUpdated.subheading"
        thankYouDefault="Thank you!"
        actionKey="planUpdated.returnButton"
        actionDefault="Return home"
      />
    </ContentPageShell>
  )
}

export default PlanUpdated
