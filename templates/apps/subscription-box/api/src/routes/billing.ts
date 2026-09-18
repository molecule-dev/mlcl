import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type SubscriptionBoxLimits, subscriptionBoxPlanKeys } from '../tiers.js'

export default createBillingRouter<SubscriptionBoxLimits>({
  getPricingTiers,
  planKeys: subscriptionBoxPlanKeys,
})
