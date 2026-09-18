import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  getPricingTiers,
  type RentalMarketplaceLimits,
  rentalMarketplacePlanKeys,
} from '../tiers.js'

export default createBillingRouter<RentalMarketplaceLimits>({
  getPricingTiers,
  planKeys: rentalMarketplacePlanKeys,
})
