import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  getPricingTiers,
  type TutoringMarketplaceLimits,
  tutoringMarketplacePlanKeys,
} from '../tiers.js'

export default createBillingRouter<TutoringMarketplaceLimits>({
  getPricingTiers,
  planKeys: tutoringMarketplacePlanKeys,
})
