import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { getPricingTiers, type OnlineStoreLimits, onlineStorePlanKeys } from '../tiers.js'

export default createBillingRouter<OnlineStoreLimits>({
  getPricingTiers,
  planKeys: onlineStorePlanKeys,
})
