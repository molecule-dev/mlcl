import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type WebhookManagerLimits, webhookManagerPlanKeys } from '../tiers.js'

export default createBillingRouter<WebhookManagerLimits>({
  getPricingTiers,
  planKeys: webhookManagerPlanKeys,
})
