import { createBillingRouter } from '@molecule/api-bonds-default-express'

import { type AuctionPlatformLimits, auctionPlatformPlanKeys, getPricingTiers } from '../tiers.js'

export default createBillingRouter<AuctionPlatformLimits>({
  getPricingTiers,
  planKeys: auctionPlatformPlanKeys,
})
