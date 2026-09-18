import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type MessagingAppLimits, messagingAppPlanKeys } from '../tiers.js'

export default createBillingRouter<MessagingAppLimits>({
  getPricingTiers,
  planKeys: messagingAppPlanKeys,
})
