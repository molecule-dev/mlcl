import { PlanUpdated as PlanUpdatedPage } from '@molecule/app-plan-updated-page-solid'

/**
 * The page a checkout returns to: it confirms the purchase with the API before thanking the
 * user. This app has no billing page, so the receipt link is left out.
 */
export function PlanUpdated() {
  return <PlanUpdatedPage receiptHref={null} />
}
