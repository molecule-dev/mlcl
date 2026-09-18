import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { PlanUpdated as PlanUpdatedShared } from '@molecule/app-plan-updated-page-react'
import { useTranslation } from '@molecule/app-react'

/**
 * Post-checkout landing. Rendered inside the authenticated
 * FeatureFlagManagerLayout (sidebar + top bar), so it must NOT mount its
 * own Header/Footer — that would stack a second app header inside the shell.
 */
export function PlanUpdated() {
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-plan-updated"
      eyebrow={t('settings.billing', {}, { defaultValue: 'Billing' })}
      title={t('planUpdated.message', {}, { defaultValue: 'Your plan has been updated.' })}
      subtitle={t('planUpdated.thankYou', {}, { defaultValue: 'Thank you!' })}
      bare
    >
      <PlanUpdatedShared />
    </ContentPageShell>
  )
}

export default PlanUpdated
